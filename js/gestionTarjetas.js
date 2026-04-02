import { supabase } from './supabase.js';

async function loadCreditDashboard() {
    const { data: { user } } = await supabase.auth.getUser();
    
    // 1. Obtener tarjetas de tipo 'Credit'
    const { data: cards } = await supabase.from('cards')
        .select('*')
        .eq('id_user', user.id)
        .eq('type_card', 'Credit')
        .eq('deleted_card', false);

    const container = document.getElementById('credit-summary-grid');
    container.innerHTML = '';

    for (const card of cards) {
        // 2. Calcular deuda actual (Gastos del mes que no son pagos)
        const { data: expenses } = await supabase.from('expenses')
            .select('amount_exp')
            .eq('id_card', card.id_card)
            .eq('deleted_exp', false);

        const currentDebt = expenses?.reduce((acc, curr) => acc + parseFloat(curr.amount_exp), 0) || 0;
        const available = card.limit_card - currentDebt;
        const usagePercent = (currentDebt / card.limit_card) * 100;

        // 3. Determinar días restantes para el pago
        const today = new Date().getDate();
        const daysToPay = card.due_day >= today ? card.due_day - today : "Vencido";

        container.innerHTML += `
            <div class="credit-card-ui" onclick="window.location.href='detalleTarjeta.html?id=${card.id_card}'" style="cursor:pointer;">
                <div class="status-badge ${usagePercent > 80 ? 'status-warning' : 'status-ok'}">
                    TEA: ${card.tea_card}%
                </div>
                <div style="margin-bottom: 2rem;">
                    <div class="card-label">${card.name_card}</div>
                    <div class="card-value">**** **** **** ${card.id_card.slice(-4)}</div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div>
                        <div class="card-label">Deuda Actual</div>
                        <div class="card-value">S/ ${currentDebt.toFixed(2)}</div>
                    </div>
                    <div>
                        <div class="card-label">Disponible</div>
                        <div class="card-value">S/ ${available.toFixed(2)}</div>
                    </div>
                </div>

                <div style="margin-top: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.7rem; margin-bottom: 5px;">
                        <span>Uso de Línea: ${usagePercent.toFixed(1)}%</span>
                        <span>Pagar en: ${daysToPay} días</span>
                    </div>
                    <div class="progress-track" style="background: rgba(255,255,255,0.1); height: 6px;">
                        <div style="width: ${Math.min(usagePercent, 100)}%; background: var(--gold); height: 100%;"></div>
                    </div>
                </div>
            </div>
        `;
    }
}

// Inicializar
loadCreditDashboard();