import { supabase } from './supabase.js';

const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return window.location.href = 'login.html';

    // --- CORRECCIÓN DEL BOTÓN AÑADIR ---
    // Usamos querySelector para capturar la clase .btn-add que tienes en el HTML
    const btnAdd = document.querySelector('.btn-add');
    
    if (btnAdd) {
        btnAdd.addEventListener('click', () => {
            console.log("Redirigiendo a nuevoPresupuesto.html..."); // Debug para consola
            window.location.href = 'nuevoPresupuesto.html';
        });
    } else {
        console.error("No se encontró el botón con la clase .btn-add");
    }

    // Cargar el resto de los datos mensuales
    loadMonthlyConsolidatedData(user.id);
}

async function loadMonthlyConsolidatedData(userId) {
    // Traemos presupuestos e ingresos en paralelo
    const [budgetsRes, incomesRes] = await Promise.all([
        supabase.from('budgets')
            .select('month_budget, year_budget, total_budget, currency_budget')
            .eq('id_user', userId)
            .eq('deleted_budget', false),
        supabase.from('monthly_incomes')
            .select('amount_income, date_income')
            .eq('id_user', userId)
    ]);

    if (budgetsRes.error || incomesRes.error) {
        return console.error("Error cargando datos:", budgetsRes.error || incomesRes.error);
    }

    const monthlyData = {};

    // 1. Procesar Presupuestos (Metas)
    budgetsRes.data.forEach(b => {
        const key = `${b.month_budget}-${b.year_budget}`;
        if (!monthlyData[key]) {
            monthlyData[key] = { month: b.month_budget, year: b.year_budget, totalBudget: 0, totalIncome: 0, currency: b.currency_budget };
        }
        monthlyData[key].totalBudget += parseFloat(b.total_budget);
    });

    // 2. Procesar Ingresos Reales (Monto disponible para gastar)
    incomesRes.data.forEach(i => {
        // El formato es 2026-04-01, extraemos mes y año
        const dateParts = i.date_income.split('-');
        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]);
        
        const key = `${month}-${year}`;
        if (!monthlyData[key]) {
            // Si hay ingresos en un mes sin presupuesto, creamos la entrada
            monthlyData[key] = { month, year, totalBudget: 0, totalIncome: 0, currency: 'PEN' };
        }
        monthlyData[key].totalIncome += parseFloat(i.amount_income);
    });

    renderMonthlyCards(Object.values(monthlyData));
}

function renderMonthlyCards(data) {
    const container = document.querySelector('.cards-grid');
    if (!container) return;

    if (data.length === 0) {
        container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--muted);">No hay registros encontrados.</div>`;
        return;
    }

    // Ordenar cronológicamente (más reciente primero)
    data.sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month));

    container.innerHTML = data.map(m => {
        const saldoDisponible = m.totalIncome - m.totalBudget;
        const porcentajeUso = m.totalIncome > 0 ? (m.totalBudget / m.totalIncome) * 100 : 0;
        
        return `
        <div class="budget-card monthly-summary">
            <div class="card-header">
                <h3 style="font-family: 'Fraunces', serif;">Presupuesto ${monthNames[m.month - 1]} ${m.year}</h3>
                <div style="text-align: right;">
                    <div class="amount" style="color: var(--gold); font-weight: 600; font-size: 1.2rem;">
                        ${m.currency}
                    </div>
                    <div style="font-size: 0.75rem; color: var(--muted); font-weight: 500;">
                        Ingresos: S/ ${m.totalIncome.toLocaleString()}
                    </div>
                </div>
            </div>
            
            <div class="card-body" style="margin-top: 15px;">
                <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 8px;">
                    <span>Saldo Libre:</span>
                    <span style="font-weight: 600; color: ${saldoDisponible < 0 ? 'var(--rust)' : 'var(--sage)'}">
                        S/ ${saldoDisponible.toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </span>
                </div>
                
                <div class="progress-track" style="height:8px; background:rgba(0,0,0,0.05); border-radius:4px; overflow:hidden;">
                    <div style="width:${Math.min(porcentajeUso, 100)}%; height:100%; background:${porcentajeUso > 100 ? 'var(--rust)' : 'var(--gold)'}; transition: width 0.3s ease;"></div>
                </div>
            </div>

            <div class="card-footer" style="margin-top: 20px; border-top: 1px solid var(--line); padding-top: 15px;">
                <button class="btn-detail" 
                        onclick="window.location.href='nuevoPresupuesto.html?m=${m.month}&y=${m.year}'" 
                        style="width: 100%; padding: 0.8rem; background: var(--ink); color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: 500;">
                    Gestionar Planificación
                </button>
            </div>
        </div>
    `}).join('');
}

init();