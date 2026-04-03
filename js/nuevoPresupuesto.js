import { supabase } from './supabase.js';

let categories    = [];
let subCategories = [];   // Todas las subcategorías del usuario, filtradas en el front por id_category
let rowCounter    = 0;
let ingresosMes   = 0;
let gastosMes     = 0;

async function init() {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return window.location.href = 'login.html';

    const urlParams = new URLSearchParams(window.location.search);
    document.getElementById('filter-month').value = urlParams.get('m') || (new Date().getMonth() + 1);
    document.getElementById('filter-year').value  = urlParams.get('y') || new Date().getFullYear();

    // ── Cargar Categorías ────────────────────────────────────────
    const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('id_cat, name_cat')
        .eq('id_user', user.id)
        .eq('deleted_cat', false);

    if (catError) console.error('[categories] Error:', catError.message);
    categories = catData || [];

    // ── Cargar Subcategorías (todas de una vez) ──────────────────
    // Las filtramos en el front cuando el usuario cambia de categoría,
    // así evitamos una query por cada fila del formulario.
    const { data: subData, error: subError } = await supabase
        .from('subcategories')
        .select('id_subcat, id_category, name_subcat')
        .eq('id_user', user.id)
        .eq('deleted_subcat', false);

    if (subError) console.error('[subcategories] Error:', subError.message);
    subCategories = subData || [];

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

    // ── 1. Ingresos del mes ──────────────────────────────────────
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

    // ── 2. Presupuestos del mes ──────────────────────────────────
    const { data: budData, error: budError } = await supabase
        .from('budgets')
        .select('*')
        .eq('id_user', userId)
        .eq('month_budget', month)
        .eq('year_budget', year);

    if (budError) console.error('[budgets] Error:', budError.message);

    gastosMes = budData?.reduce((acc, curr) => acc + parseFloat(curr.total_budget), 0) ?? 0;

    updateTotals();

    if (budData && budData.length > 0) {
        budData.forEach(b => addBudgetRow(b));
    } else {
        addBudgetRow();
    }
}

// Devuelve el HTML de las <option> de subcategoría para una categoría dada.
// Si selectedId está definido, marca esa opción como seleccionada.
function buildSubcatOptions(idCategory, selectedId = null) {
    const subs = subCategories.filter(s => s.id_category === idCategory);
    if (subs.length === 0) return '<option value="">— Sin subcategorías —</option>';
    return `<option value="">Seleccionar...</option>` +
        subs.map(s =>
            `<option value="${s.id_subcat}" ${selectedId === s.id_subcat ? 'selected' : ''}>${s.name_subcat}</option>`
        ).join('');
}

// Llamada desde el oninput del <select> de categoría para refrescar el select de subcategoría
function onCategoryChange(selectEl) {
    const row     = selectEl.closest('.budget-row');
    const subSel  = row.querySelector('.row-subcat');
    const catId   = selectEl.value;
    subSel.innerHTML = catId
        ? buildSubcatOptions(catId)
        : '<option value="">Primero elige categoría</option>';
}

function addBudgetRow(data = null) {
    const container = document.getElementById('budget-rows-container');
    const rowId     = `row-${rowCounter++}`;

    // Opciones de subcategoría precargadas si viene con datos guardados
    const subcatHtml = data?.id_category
        ? buildSubcatOptions(data.id_category, data.id_subcat ?? null)
        : '<option value="">Primero elige categoría</option>';

    const rowHtml = `
        <div class="budget-row" id="${rowId}">
            <div class="field">
                <label>Categoría</label>
                <select class="row-cat" required onchange="onCategoryChange(this)">
                    <option value="">Seleccionar...</option>
                    ${categories.map(c =>
                        `<option value="${c.id_cat}" ${data?.id_category === c.id_cat ? 'selected' : ''}>${c.name_cat}</option>`
                    ).join('')}
                </select>
            </div>
            <div class="field">
                <label>Subcategoría</label>
                <select class="row-subcat">
                    ${subcatHtml}
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

function updateTotals() {
    const incomeEl = document.getElementById('monthly-income');
    if (incomeEl) incomeEl.innerText = `S/ ${ingresosMes.toFixed(2)}`;

    const rows = document.querySelectorAll('.row-amount');
    const totalFormulario = Array.from(rows).reduce((acc, input) => acc + (parseFloat(input.value) || 0), 0);
    const totalGastos = rows.length > 0 ? totalFormulario : gastosMes;
    const disponible  = ingresosMes - totalGastos;

    const display = document.getElementById('available-amount');
    if (display) {
        display.innerText   = `S/ ${disponible.toFixed(2)}`;
        display.style.color = disponible < 0 ? 'var(--rust)' : 'var(--sage)';
    }
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
        const cat    = row.querySelector('.row-cat').value;
        const subcat = row.querySelector('.row-subcat').value || null;   // puede ser vacío
        const amt    = parseFloat(row.querySelector('.row-amount').value);
        const name   = row.querySelector('.row-name').value;

        if (cat && amt > 0) {
            dataToInsert.push({
                id_user:         userId,
                id_category:     cat,
                id_subcat:       subcat,          // columna añadida vía ALTER TABLE
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
        console.error('[budgets] Error al insertar:', insError.message);
        alert('Error: ' + insError.message);
    }
}

window.updateTotals      = updateTotals;
window.onCategoryChange  = onCategoryChange;
init();