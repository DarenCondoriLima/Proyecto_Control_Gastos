import { supabase } from './supabase.js';

let categories = [];
let rowCounter = 0;
let ingresosMes = 0;
let gastosMes   = 0;   // Suma de total_budget del periodo, leída desde la DB

async function init() {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return window.location.href = 'login.html';

    const urlParams = new URLSearchParams(window.location.search);
    document.getElementById('filter-month').value = urlParams.get('m') || (new Date().getMonth() + 1);
    document.getElementById('filter-year').value  = urlParams.get('y') || new Date().getFullYear();

    const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('id_cat, name_cat')
        .eq('id_user', user.id)
        .eq('deleted_cat', false);

    if (catError) console.error('[categories] Error:', catError.message);
    categories = catData || [];

    document.getElementById('btn-add-row').onclick     = () => addBudgetRow();
    document.getElementById('btn-load-period').onclick = () => loadPeriodData(user.id);
    document.getElementById('btn-save-all').onclick    = () => saveAllBudgets(user.id);

    await loadPeriodData(user.id);
}

async function loadPeriodData(userId) {
    const month = parseInt(document.getElementById('filter-month').value);
    const year  = parseInt(document.getElementById('filter-year').value);
    const container = document.getElementById('budget-rows-container');

    container.innerHTML = '';
    rowCounter = 0;

    // ─── 1. INGRESOS DEL MES (tabla: incomes) ───────────────────
    const lastDay   = new Date(year, month, 0).getDate();
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate   = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

    const { data: incData, error: incError } = await supabase
        .from('incomes')
        .select('amount_inc, payment_method')
        .eq('id_user', userId)
        .gte('date_inc', startDate)
        .lte('date_inc', endDate);

    if (incError) console.error('[incomes] Error:', incError.message);

    const filteredIncomes = incData?.filter(i =>
        i.payment_method === 'Cash' || i.payment_method === 'Debit'
    ) || [];

    ingresosMes = filteredIncomes.reduce((acc, curr) => acc + parseFloat(curr.amount_inc), 0);
    console.log('[incomes] ingresosMes:', ingresosMes);

    // ─── 2. GASTOS PLANIFICADOS DEL MES (tabla: budgets) ────────
    //    gastosMes = suma de total_budget para el mes/año seleccionado
    //    Este valor alimenta "Ingreso Restante (Disponible)"
    const { data: budData, error: budError } = await supabase
        .from('budgets')
        .select('*')
        .eq('id_user', userId)
        .eq('month_budget', month)
        .eq('year_budget', year);

    if (budError) console.error('[budgets] Error:', budError.message);

    gastosMes = budData?.reduce((acc, curr) => acc + parseFloat(curr.total_budget), 0) ?? 0;
    console.log('[budgets] gastosMes:', gastosMes);

    // Mostrar disponible con valores reales de la DB antes de renderizar el form
    updateTotals();

    // Renderizar filas del formulario
    if (budData && budData.length > 0) {
        budData.forEach(b => addBudgetRow(b));
    } else {
        addBudgetRow();
    }
}

function updateTotals() {
    // monthly-income → ingresosMes (suma de incomes del periodo)
    const incomeEl = document.getElementById('monthly-income');
    if (incomeEl) incomeEl.innerText = `S/ ${ingresosMes.toFixed(2)}`;

    // available-amount → ingresosMes − gastosMes (suma de budgets del periodo en DB)
    // Además se recalcula en tiempo real sumando las filas actuales del formulario,
    // para que el número responda al instante cuando el usuario edita o añade filas.
    const rows = document.querySelectorAll('.row-amount');
    const totalFormulario = Array.from(rows).reduce((acc, input) => acc + (parseFloat(input.value) || 0), 0);

    // Si hay filas en el formulario (usuario editando), usamos su suma en vivo.
    // Si no hay filas aún (primera carga), usamos gastosMes de la DB.
    const totalGastos = rows.length > 0 ? totalFormulario : gastosMes;
    const disponible  = ingresosMes - totalGastos;

    const display = document.getElementById('available-amount');
    if (display) {
        display.innerText   = `S/ ${disponible.toFixed(2)}`;
        display.style.color = disponible < 0 ? 'var(--rust)' : 'var(--sage)';
    }
}

function addBudgetRow(data = null) {
    const container = document.getElementById('budget-rows-container');
    const rowId = `row-${rowCounter++}`;

    const rowHtml = `
        <div class="budget-row" id="${rowId}">
            <div class="field">
                <label>Categoría</label>
                <select class="row-cat" required>
                    <option value="">Seleccionar...</option>
                    ${categories.map(c => `<option value="${c.id_cat}" ${data?.id_category === c.id_cat ? 'selected' : ''}>${c.name_cat}</option>`).join('')}
                </select>
            </div>
            <div class="field">
                <label>Monto Tope (S/)</label>
                <input type="number" class="row-amount" value="${data?.total_budget || 0}" step="0.01" oninput="updateTotals()">
            </div>
            <div class="field">
                <label>Etiqueta</label>
                <input type="text" class="row-name" value="${data?.name_budget || ''}" placeholder="Ej: Pago Cibertec">
            </div>
            <button type="button" class="btn-remove" onclick="this.parentElement.remove(); updateTotals();">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg>
            </button>
        </div>`;
    container.insertAdjacentHTML('beforeend', rowHtml);
}

async function saveAllBudgets(userId) {
    const month = parseInt(document.getElementById('filter-month').value);
    const year  = parseInt(document.getElementById('filter-year').value);

    const { error: delError } = await supabase
        .from('budgets')
        .delete()
        .eq('id_user', userId)
        .eq('month_budget', month)
        .eq('year_budget', year);

    if (delError) return alert('Error al limpiar datos: ' + delError.message);

    const rows = document.querySelectorAll('.budget-row');
    const dataToInsert = [];

    rows.forEach(row => {
        const cat  = row.querySelector('.row-cat').value;
        const amt  = parseFloat(row.querySelector('.row-amount').value);
        const name = row.querySelector('.row-name').value;

        if (cat && amt > 0) {
            dataToInsert.push({
                id_user:         userId,
                id_category:     cat,
                name_budget:     name || 'Plan',
                month_budget:    month,
                year_budget:     year,
                total_budget:    amt,
                currency_budget: 'PEN'
            });
        }
    });

    if (dataToInsert.length === 0) return alert('No hay datos válidos para guardar.');

    const { error: insError } = await supabase.from('budgets').insert(dataToInsert);

    if (!insError) {
        alert('Planificación guardada.');
        window.location.href = 'presupuestos.html';
    } else {
        alert('Error: ' + insError.message);
    }
}

window.updateTotals = updateTotals;
init();