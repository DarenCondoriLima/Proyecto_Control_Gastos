import { supabase } from './supabase.js';

let pieChart, subPieChart;
const palette = ['#c9a84c', '#7a8c70', '#c05c3a', '#5e7a8c', '#8c6b5e', '#a8a87a'];

// --- 1. INICIALIZACIÓN ---
async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return window.location.href = 'login.html';

    // Perfil en Sidebar
    const { data: profile } = await supabase.from('users').select('firstname_user').eq('id_user', user.id).single();
    if (profile) {
        document.getElementById('user-name').innerText = profile.firstname_user;
        document.getElementById('sb-initial').innerText = profile.firstname_user.charAt(0).toUpperCase();
    }

    // Cargar Selectores (Categorías y Tarjetas)
    await Promise.all([
        loadCategories(user.id),
        loadCards(user.id)
    ]);
    
    // Listener para subcategorías dinámicas
    document.getElementById('filter-cat').addEventListener('change', (e) => {
        loadSubcategories(e.target.value, user.id);
    });

    // Listeners de botones
    document.getElementById('btn-apply-filters').addEventListener('click', () => loadDashboardData(user.id));
    
    document.getElementById('btn-reset').addEventListener('click', () => {
        setTimeout(() => {
            setDefaultDates();
            loadDashboardData(user.id);
        }, 10);
    });

    // Carga Inicial
    setDefaultDates();
    loadDashboardData(user.id);
}

// --- 2. SELECTORES DINÁMICOS ---
async function loadCategories(userId) {
    const { data } = await supabase.from('categories').select('id_cat, name_cat').eq('id_user', userId).eq('deleted_cat', false);
    const select = document.getElementById('filter-cat');
    data?.forEach(c => select.add(new Option(c.name_cat, c.id_cat)));
}

async function loadSubcategories(catId, userId) {
    const subSelect = document.getElementById('filter-subcat');
    subSelect.innerHTML = '<option value="">Subcategoría</option>';
    
    if (!catId) {
        subSelect.disabled = true;
        return;
    }

    const { data } = await supabase.from('subcategories').select('id_subcat, name_subcat').eq('id_category', catId).eq('id_user', userId).eq('deleted_subcat', false);
    data?.forEach(s => subSelect.add(new Option(s.name_subcat, s.id_subcat)));
    subSelect.disabled = false;
}

async function loadCards(userId) {
    const { data } = await supabase.from('cards').select('id_card, name_card').eq('id_user', userId).eq('deleted_card', false);
    const select = document.getElementById('filter-card');
    data?.forEach(c => select.add(new Option(c.name_card, c.id_card)));
}

// --- 3. LOGICA DE FILTRADO (CORREGIDA) ---
async function fetchFilteredData(table, userId, filters) {
    const isExp = table === 'expenses';
    const dateCol = isExp ? 'date_exp' : 'date_inc';
    
    // 1. Configurar selección básica
    let selectQuery = isExp 
        ? '*, categories(name_cat), subcategories(name_subcat), cards(name_card)' 
        : '*'; 

    let query = supabase.from(table).select(selectQuery).eq('id_user', userId);

    // 2. Filtros de fecha
    if (filters.from) query = query.gte(dateCol, filters.from);
    if (filters.to) query = query.lte(dateCol, filters.to);

    // ... (mantén tu lógica de filtros por mes/año aquí)

    // 3. Filtros específicos por tabla
    if (isExp) {
        if (filters.cat) query = query.eq('id_category', filters.cat);
        if (filters.subcat) query = query.eq('id_subcat', filters.subcat);
        if (filters.card) query = query.eq('id_card', filters.card);
        query = query.eq('deleted_exp', false); // Esta sí existe en expenses
    } else {
        // ELIMINAMOS query.eq('deleted_inc', false) porque no existe
        // Solo filtramos ingresos por fecha y usuario
    }

    const result = await query.order(dateCol, { ascending: false });
    
    if (result.error) {
        console.error(`Error en ${table}:`, result.error.message);
    }
    return result;
}

// --- 4. CARGA Y PROCESAMIENTO ---
async function loadDashboardData(userId) {
    const filters = {
        from: document.getElementById('filter-from').value,
        to: document.getElementById('filter-to').value,
        month: document.getElementById('filter-month').value,
        year: document.getElementById('filter-year').value,
        cat: document.getElementById('filter-cat').value,
        subcat: document.getElementById('filter-subcat').value,
        card: document.getElementById('filter-card').value,
        method: document.getElementById('filter-method').value,
        type: document.getElementById('filter-type').value
    };

    const [expRes, incRes, debtsRes] = await Promise.all([
        filters.type !== 'income' ? fetchFilteredData('expenses', userId, filters) : { data: [] },
        filters.type !== 'expense' ? fetchFilteredData('incomes', userId, filters) : { data: [] },
        supabase.from('debts').select('amount_debt, amount_paid').eq('id_user', userId).eq('deleted_debt', false).neq('status_debt', 'Paid')
    ]);

    const expenses = expRes.data || [];
    const incomes = incRes.data || [];
    const debts = debtsRes.data || [];

    // Cálculos de KPIs
    const totalExp = expenses.reduce((acc, curr) => acc + curr.amount_exp, 0);
    const totalInc = incomes.reduce((acc, curr) => acc + curr.amount_inc, 0);
    const totalDebtToCollect = debts.reduce((acc, curr) => acc + (curr.amount_debt - curr.amount_paid), 0);

    // Lógica de Cuotas (Cálculo mensual)
    const installmentSum = expenses.filter(e => e.installments_exp > 1)
        .reduce((acc, curr) => acc + (curr.amount_exp / curr.installments_exp), 0);

    updateKPIs(totalExp, totalInc, totalDebtToCollect, installmentSum);

    // Renderizado de UI
    let transactions = [
        ...expenses.map(e => ({ date: e.date_exp, cat: e.categories?.name_cat, desc: e.description_exp, amount: e.amount_exp, type: 'expense' })),
        ...incomes.map(i => ({ date: i.date_inc, cat: i.categories?.name_cat, desc: i.description_inc, amount: i.amount_inc, type: 'income' }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    renderTable(transactions);
    renderPieChart(expenses); 
    renderSubPieChart(expenses);
    renderInstallmentList(expenses.filter(e => e.installments_exp > 1));
}

// --- 5. RENDERIZADO DE UI ---
function updateKPIs(exp, inc, debt, installments) {
    document.getElementById('total-exp-display').innerText = `S/ ${exp.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
    document.getElementById('total-inc-display').innerText = `S/ ${inc.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
    document.getElementById('net-balance-display').innerText = `S/ ${(inc - exp).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
    document.getElementById('debt-total-display').innerText = `S/ ${debt.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
    document.getElementById('card-installments-display').innerText = `S/ ${installments.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
}

function renderTable(list) {
    const body = document.getElementById('transactions-body');
    document.getElementById('transaction-count').innerText = `${list.length} registros`;
    
    body.innerHTML = list.map(t => `
        <tr>
            <td style="padding: 1rem 0.5rem; color: var(--muted); border-bottom: 1px solid var(--line);">${t.date}</td>
            <td style="padding: 1rem 0.5rem; border-bottom: 1px solid var(--line);"><span class="chart-badge">${t.cat || 'General'}</span></td>
            <td style="padding: 1rem 0.5rem; border-bottom: 1px solid var(--line);">${t.desc || '-'}</td>
            <td style="padding: 1rem 0.5rem; border-bottom: 1px solid var(--line); text-align: right; font-weight: 600; color: ${t.type === 'income' ? 'var(--sage)' : 'var(--rust)'};">
                ${t.type === 'income' ? '+' : '-'} S/ ${t.amount.toFixed(2)}
            </td>
        </tr>
    `).join('');
}

function renderInstallmentList(list) {
    const body = document.getElementById('installments-body');
    if (list.length === 0) {
        body.innerHTML = '<tr><td colspan="2" style="color:var(--muted); padding:1rem; font-size:0.7rem;">No hay cuotas este periodo</td></tr>';
        return;
    }

    body.innerHTML = list.map(e => `
        <tr>
            <td style="padding: 0.5rem 0;">
                <div style="font-weight:500;">${e.description_exp}</div>
                <div style="font-size:0.6rem; color:var(--muted);">${e.cards?.name_card || 'Tarjeta'}</div>
            </td>
            <td style="text-align:right; font-weight:600; color:var(--rust);">
                S/ ${(e.amount_exp / e.installments_exp).toFixed(2)}
            </td>
        </tr>
    `).join('');
}

function renderPieChart(expenses) {
    const catMap = {};
    expenses.forEach(e => {
        const name = e.categories?.name_cat || 'Otros';
        catMap[name] = (catMap[name] || 0) + e.amount_exp;
    });

    if (pieChart) pieChart.destroy();
    const labels = Object.keys(catMap);
    const values = Object.values(catMap);

    pieChart = new Chart(document.getElementById('pieChart'), {
        type: 'doughnut',
        data: { labels: labels, datasets: [{ data: values, backgroundColor: palette, borderWidth: 2, borderColor: '#ffffff' }] },
        options: { cutout: '75%', plugins: { legend: { display: false } } }
    });

    const legend = document.getElementById('pie-legend');
    legend.innerHTML = labels.map((label, i) => `
        <div class="legend-item">
            <div class="legend-left"><span class="legend-dot" style="background:${palette[i % palette.length]}"></span><span>${label}</span></div>
            <span class="legend-val">S/ ${values[i].toFixed(2)}</span>
        </div>`).join('');
}

function renderSubPieChart(expenses) {
    const subMap = {};
    expenses.forEach(e => {
        const name = e.subcategories?.name_subcat || 'Sin subcategoría';
        subMap[name] = (subMap[name] || 0) + e.amount_exp;
    });

    if (subPieChart) subPieChart.destroy();
    const labels = Object.keys(subMap);
    const values = Object.values(subMap);

    subPieChart = new Chart(document.getElementById('subPieChart'), {
        type: 'doughnut',
        data: { labels: labels, datasets: [{ data: values, backgroundColor: palette, borderWidth: 2, borderColor: '#ffffff' }] },
        options: { cutout: '75%', plugins: { legend: { display: false } } }
    });

    const legend = document.getElementById('subpie-legend');
    legend.innerHTML = labels.map((label, i) => `
        <div class="legend-item">
            <div class="legend-left"><span class="legend-dot" style="background:${palette[i % palette.length]}"></span><span>${label}</span></div>
            <span class="legend-val">S/ ${values[i].toFixed(2)}</span>
        </div>`).join('');
}

function setDefaultDates() {
    const now = new Date();
    document.getElementById('filter-year').value = now.getFullYear();
    document.getElementById('filter-month').value = String(now.getMonth() + 1).padStart(2, '0');
}

init();