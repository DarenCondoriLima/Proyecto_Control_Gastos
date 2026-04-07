import { supabase } from './supabase.js';

async function loadCreditDashboard() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: cards } = await supabase.from('cards')
        .select('*')
        .eq('id_user', user.id)
        .eq('type_card', 'Credit')
        .eq('deleted_card', false);

    const container = document.getElementById('credit-summary-grid');
    container.innerHTML = '';

    for (const card of cards) {
        // --- CÁLCULO DE FECHAS DEL CICLO ---
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const cutoffDay = card.cutoff_day || 20; // Si no hay, por defecto 20

        let startDate, endDate;

        if (now.getDate() > cutoffDay) {
            // Si ya pasamos el cierre, el ciclo empezó el cierre de este mes y termina el cierre del próximo
            startDate = new Date(year, month, cutoffDay + 1);
            endDate = new Date(year, month + 1, cutoffDay);
        } else {
            // Si no hemos llegado al cierre, el ciclo empezó el cierre del mes pasado
            startDate = new Date(year, month - 1, cutoffDay + 1);
            endDate = new Date(year, month, cutoffDay);
        }

        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];

        // --- DENTRO DEL BUCLE FOR DE LAS TARJETAS ---

        // 1. Obtener TODOS los gastos históricos de esta tarjeta
        const { data: allExpenses, error: expError } = await supabase.from('expenses')
            .select('amount_exp')
            .eq('id_card', card.id_card)
            .eq('deleted_exp', false);

        if (expError) console.error("Error en gastos:", expError);
        const totalExpensesHistorico = allExpenses?.reduce((acc, curr) => acc + parseFloat(curr.amount_exp), 0) || 0;

        // 2. Obtener TODOS los pagos históricos realizados a esta tarjeta
        const { data: allPayments, error: payError } = await supabase.from('credit_card_payments')
            .select('amount_paid')
            .eq('id_card', card.id_card);

        if (payError) console.error("Error en pagos:", payError);
        const totalPaidHistorico = allPayments?.reduce((acc, curr) => acc + parseFloat(curr.amount_paid), 0) || 0;

        // 3. Cálculos Finales (Lo que realmente debes hoy)
        const currentDebt = totalExpensesHistorico - totalPaidHistorico;
        const available = card.limit_card - currentDebt;
        const usagePercent = (currentDebt / card.limit_card) * 100;

        // 4. (Opcional) Calcular cuánto se ha pagado solo en el ciclo actual para mostrarlo como info extra
        const firstDayCiclo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        const pagosCicloActual = allPayments?.filter(p => p.date_payment >= firstDayCiclo)
            .reduce((acc, curr) => acc + parseFloat(curr.amount_paid), 0) || 0;

        console.log(`Card: ${card.name_card} | Total Gastado: ${totalExpensesHistorico} | Total Pagado: ${totalPaidHistorico} | Saldo Pendiente: ${currentDebt}`);

        // --- RENDERIZADO EN EL HTML ---
        container.innerHTML += `
            <div class="credit-card-ui" onclick="window.location.href='detalleTarjeta.html?id=${card.id_card}'" style="cursor:pointer">
                <div class="status-badge ${usagePercent > 80 ? 'status-warning' : 'status-ok'}">
                    TEA: ${card.tea_card}%
                </div>
                <div style="margin-bottom: 2rem;">
                    <div class="card-label">${card.name_card}</div>
                    <div class="card-value">**** **** **** ${card.id_card.slice(-4)}</div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div>
                        <div class="card-label">Total a Pagar</div>
                        <div class="card-value">S/ ${Math.max(0, currentDebt).toFixed(2)}</div>
                        <div style="font-size: 0.65rem; color: var(--gold); margin-top: 4px;">
                            Abonado este mes: S/ ${pagosCicloActual.toFixed(2)}
                        </div>
                    </div>
                    <div>
                        <div class="card-label">Disponible</div>
                        <div class="card-value">S/ ${available.toFixed(2)}</div>
                    </div>
                </div>
                </div>
        `;
    }
}

document.addEventListener('DOMContentLoaded', loadCreditDashboard);