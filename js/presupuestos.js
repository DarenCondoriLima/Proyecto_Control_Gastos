import { supabase } from './supabase.js';

const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return window.location.href = 'login.html';

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Listener para el botón añadir
    const btnAdd = document.querySelector('.btn-add');
    if (btnAdd) {
        btnAdd.addEventListener('click', () => {
            window.location.href = 'nuevoPresupuesto.html';
        });
    }

    loadBudgetsData(user.id, currentMonth, currentYear);
}

async function loadBudgetsData(userId, month, year) {
    // Usamos nombres de tabla y columnas en minúsculas para evitar errores de caché
    const [budgetsRes, expensesRes] = await Promise.all([
        supabase.from('budgets')
            .select('*')
            .eq('id_user', userId)
            .eq('month_budget', month)
            .eq('year_budget', year)
            .eq('deleted_budget', false),
        supabase.from('expenses')
            .select('amount_exp')
            .eq('id_user', userId)
            .gte('date_exp', `${year}-${String(month).padStart(2, '0')}-01`)
            .lte('date_exp', `${year}-${String(month).padStart(2, '0')}-31`)
            .eq('deleted_exp', false)
    ]);

    if (budgetsRes.error) return console.error(budgetsRes.error);

    const budgets = budgetsRes.data || [];
    const expenses = expensesRes.data || [];
    const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount_exp, 0);

    renderBudgets(budgets, totalSpent);
}

function renderBudgets(budgets, totalSpent) {
    const container = document.querySelector('.cards-grid');
    if (!container) return;
    
    if (budgets.length === 0) {
        container.innerHTML = `<div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--muted);">No hay presupuestos registrados para este mes.</div>`;
        return;
    }

    container.innerHTML = budgets.map(b => {
        // Cálculo de progreso basado en el gasto real
        const percent = Math.min((totalSpent / b.total_budget) * 100, 100);
        const remaining = b.total_budget - totalSpent;
        
        return `
            <div class="budget-card" data-id="${b.id_budget}" style="cursor: pointer;">
                <div class="card-header">
                    <h3 style="font-family: 'Fraunces', serif;">${b.name_budget}</h3>
                    <span class="amount" style="color: var(--gold); font-weight: 600;">
                        ${b.currency_budget} ${b.total_budget.toLocaleString()}
                    </span>
                </div>
                <div class="card-body">
                    <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 0.5rem;">
                        <span>Consumido: ${percent.toFixed(1)}%</span>
                        <span style="color: ${remaining < 0 ? 'var(--rust)' : 'var(--sage, #7a8c70)'}">
                            ${remaining < 0 ? 'Excedido' : 'Disponible'}: S/ ${Math.abs(remaining).toFixed(2)}
                        </span>
                    </div>
                    <div class="progress-track" style="height:8px; background:rgba(0,0,0,0.05); border-radius:4px; overflow:hidden;">
                        <div style="width:${percent}%; height:100%; background:${percent >= 90 ? 'var(--rust)' : 'var(--gold)'}; transition: width 0.4s ease;"></div>
                    </div>
                </div>
                <div class="card-footer" style="margin-top: 15px; display: flex; gap: 10px;">
                    <button class="btn-edit" data-id="${b.id_budget}" style="flex:1;">Editar</button>
                    <button class="btn-delete" data-id="${b.id_budget}" style="flex:1;">Eliminar</button>
                </div>
            </div>`;
    }).join('');

    attachEventListeners();
}

function attachEventListeners() {
    document.querySelectorAll('.budget-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') return;
            window.location.href = `detallePresupuesto.html?id=${card.dataset.id}`;
        });
    });

    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            window.location.href = `editarPresupuesto.html?id=${btn.dataset.id}`;
        });
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm('¿Eliminar este presupuesto?')) {
                // Actualizamos el borrado lógico en minúsculas
                const { error } = await supabase.from('budgets').update({ deleted_budget: true }).eq('id_budget', btn.dataset.id);
                if (!error) init();
            }
        });
    });
}

init();