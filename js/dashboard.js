import { supabase } from './supabase.js';

// ─────────────────────────────────────────────────────────────
// ESTADO GLOBAL
// ─────────────────────────────────────────────────────────────
let pieChart, subPieChart, barChart, methodChart;
const palette = ['#c9a84c','#7a8c70','#c05c3a','#5e7a8c','#8c6b5e','#a8a87a','#6b8c8c','#8c7a5e','#5e6b8c','#8c5e7a'];

// Cache para el drawer de edición
let _currentUserId   = null;
let _allCats         = [];   // { id_cat, name_cat }
let _allCards        = [];   // { id_card, name_card, type_card }
let _reloadCallback  = null; // función para recargar el dashboard tras guardar/eliminar

// ─────────────────────────────────────────────────────────────
// 1. INICIALIZACIÓN
// ─────────────────────────────────────────────────────────────
async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return window.location.href = 'login.html';

    // Sidebar profile
    const { data: profile } = await supabase
        .from('users').select('firstname_user').eq('id_user', user.id).single();
    if (profile) {
        const nameEl  = document.getElementById('user-name');
        const initEl  = document.getElementById('sb-initial');
        if (nameEl) nameEl.innerText = profile.firstname_user;
        if (initEl) initEl.innerText = profile.firstname_user.charAt(0).toUpperCase();
    }

    _currentUserId  = user.id;
    _reloadCallback = () => loadDashboardData(user.id);

    await Promise.all([loadCategories(user.id), loadCards(user.id)]);
    initDrawer();

    // Listeners de filtros
    document.getElementById('filter-cat').addEventListener('change', e => loadSubcategories(e.target.value, user.id));
    document.getElementById('btn-apply-filters').addEventListener('click', () => loadDashboardData(user.id));
    document.getElementById('btn-reset').addEventListener('click', () => {
        document.getElementById('filter-from').value   = '';
        document.getElementById('filter-to').value     = '';
        document.getElementById('filter-cat').value    = '';
        document.getElementById('filter-subcat').value = '';
        document.getElementById('filter-card').value   = '';
        document.getElementById('filter-method').value = '';
        document.getElementById('filter-type').value   = 'all';
        document.getElementById('filter-subcat').disabled = true;
        setDefaultPeriod();
        loadDashboardData(user.id);
    });

    // Chips de periodo rápido
    document.querySelectorAll('.period-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.period-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            applyPeriodChip(chip.dataset.period);
            loadDashboardData(user.id);
        });
    });

    // Carga inicial
    setDefaultPeriod();
    // Marcar chip "Este mes" como activo
    document.querySelector('[data-period="month"]')?.classList.add('active');
    await loadDashboardData(user.id);
}

// ─────────────────────────────────────────────────────────────
// 2. SELECTORES DINÁMICOS
// ─────────────────────────────────────────────────────────────
async function loadCategories(userId) {
    const { data } = await supabase.from('categories')
        .select('id_cat, name_cat').eq('id_user', userId).eq('deleted_cat', false)
        .order('name_cat', { ascending: true });
    _allCats = data || [];
    const sel = document.getElementById('filter-cat');
    _allCats.forEach(c => sel.add(new Option(c.name_cat, c.id_cat)));
}

async function loadSubcategories(catId, userId) {
    const sel = document.getElementById('filter-subcat');
    sel.innerHTML = '<option value="">Todas</option>';
    if (!catId) { sel.disabled = true; return; }
    const { data } = await supabase.from('subcategories')
        .select('id_subcat, name_subcat')
        .eq('id_category', catId).eq('id_user', userId).eq('deleted_subcat', false);
    data?.forEach(s => sel.add(new Option(s.name_subcat, s.id_subcat)));
    sel.disabled = false;
}

async function loadCards(userId) {
    const { data } = await supabase.from('cards')
        .select('id_card, name_card, type_card')
        .eq('id_user', userId).eq('deleted_card', false)
        .order('name_card', { ascending: true });
    _allCards = data || [];
    const sel = document.getElementById('filter-card');
    _allCards.forEach(c => sel.add(new Option(c.name_card, c.id_card)));
}

// ─────────────────────────────────────────────────────────────
// 3. CHIPS DE PERIODO
// ─────────────────────────────────────────────────────────────
function applyPeriodChip(period) {
    const now   = new Date();
    const year  = now.getFullYear();
    const month = now.getMonth(); // 0-indexed

    // Limpiar fechas manuales
    document.getElementById('filter-from').value = '';
    document.getElementById('filter-to').value   = '';

    if (period === 'month') {
        document.getElementById('filter-month').value = String(month + 1).padStart(2, '0');
        document.getElementById('filter-year').value  = year;
    } else if (period === 'quarter') {
        // Trimestre actual: del primer día del trimestre al hoy
        const qStart = new Date(year, Math.floor(month / 3) * 3, 1);
        document.getElementById('filter-from').value = qStart.toISOString().split('T')[0];
        document.getElementById('filter-to').value   = now.toISOString().split('T')[0];
        document.getElementById('filter-month').value = '';
        document.getElementById('filter-year').value  = '';
    } else if (period === 'year') {
        document.getElementById('filter-from').value = `${year}-01-01`;
        document.getElementById('filter-to').value   = `${year}-12-31`;
        document.getElementById('filter-month').value = '';
        document.getElementById('filter-year').value  = '';
    }
}

function setDefaultPeriod() {
    const now = new Date();
    document.getElementById('filter-year').value  = now.getFullYear();
    document.getElementById('filter-month').value = String(now.getMonth() + 1).padStart(2, '0');
}

// ─────────────────────────────────────────────────────────────
// 4. CONSTRUCCIÓN DE RANGO DE FECHAS
// ─────────────────────────────────────────────────────────────
function buildDateRange(filters) {
    // Prioridad 1: fechas manuales (from/to)
    if (filters.from || filters.to) {
        return { from: filters.from || null, to: filters.to || null };
    }
    // Prioridad 2: mes + año
    if (filters.month && filters.year) {
        const lastDay = new Date(parseInt(filters.year), parseInt(filters.month), 0).getDate();
        return {
            from: `${filters.year}-${filters.month}-01`,
            to:   `${filters.year}-${filters.month}-${String(lastDay).padStart(2, '0')}`
        };
    }
    return { from: null, to: null };
}

// ─────────────────────────────────────────────────────────────
// 5. FETCH GASTOS
//    Columnas reales del schema:
//    installments (no installments_exp), installment_amt, deleted_exp
// ─────────────────────────────────────────────────────────────
async function fetchExpenses(userId, filters, dateRange) {
    let q = supabase.from('expenses')
        .select('*, categories(name_cat), subcategories(name_subcat), cards(name_card)')
        .eq('id_user', userId)
        .eq('deleted_exp', false);

    if (dateRange.from) q = q.gte('date_exp', dateRange.from);
    if (dateRange.to)   q = q.lte('date_exp', dateRange.to);
    if (filters.cat)    q = q.eq('id_category', filters.cat);
    if (filters.subcat) q = q.eq('id_subcat',   filters.subcat);
    if (filters.card)   q = q.eq('id_card',     filters.card);
    if (filters.method) q = q.eq('payment_method', filters.method);

    const { data, error } = await q.order('date_exp', { ascending: false });
    if (error) console.error('[expenses]', error.message);
    return data || [];
}

// ─────────────────────────────────────────────────────────────
// 6. FETCH INGRESOS
//    incomes: no tiene deleted_inc, sí tiene id_category
// ─────────────────────────────────────────────────────────────
async function fetchIncomes(userId, filters, dateRange) {
    let q = supabase.from('incomes')
        .select('*, categories(name_cat)')
        .eq('id_user', userId);

    if (dateRange.from) q = q.gte('date_inc', dateRange.from);
    if (dateRange.to)   q = q.lte('date_inc', dateRange.to);
    // Método de pago en incomes: solo Cash / Debit
    if (filters.method && ['Cash','Debit'].includes(filters.method)) {
        q = q.eq('payment_method', filters.method);
    }

    const { data, error } = await q.order('date_inc', { ascending: false });
    if (error) console.error('[incomes]', error.message);
    return data || [];
}

// ─────────────────────────────────────────────────────────────
// 7. FETCH PRESUPUESTOS DEL MES (para comparar con gastos reales)
// ─────────────────────────────────────────────────────────────
async function fetchBudgets(userId, month, year) {
    if (!month || !year) return [];
    const { data, error } = await supabase.from('budgets')
        .select('*, categories(name_cat)')
        .eq('id_user', userId)
        .eq('month_budget', parseInt(month))
        .eq('year_budget',  parseInt(year));
    if (error) console.error('[budgets]', error.message);
    return data || [];
}

// ─────────────────────────────────────────────────────────────
// 8. CARGA PRINCIPAL
// ─────────────────────────────────────────────────────────────
async function loadDashboardData(userId) {
    const filters = {
        from:   document.getElementById('filter-from').value,
        to:     document.getElementById('filter-to').value,
        month:  document.getElementById('filter-month').value,
        year:   document.getElementById('filter-year').value,
        cat:    document.getElementById('filter-cat').value,
        subcat: document.getElementById('filter-subcat').value,
        card:   document.getElementById('filter-card').value,
        method: document.getElementById('filter-method').value,
        type:   document.getElementById('filter-type').value
    };

    const dateRange = buildDateRange(filters);

    const [expenses, incomes, debtsRes, budgets] = await Promise.all([
        filters.type !== 'income'   ? fetchExpenses(userId, filters, dateRange) : [],
        filters.type !== 'expense'  ? fetchIncomes(userId, filters, dateRange)  : [],
        supabase.from('debts').select('amount_debt, amount_paid')
            .eq('id_user', userId).eq('deleted_debt', false).neq('status_debt', 'Paid'),
        fetchBudgets(userId, filters.month, filters.year)
    ]);

    const debts = debtsRes.data || [];

    // ── KPIs ────────────────────────────────────────────────
    const totalExp  = expenses.reduce((s, e) => s + parseFloat(e.amount_exp),  0);
    const totalInc  = incomes.reduce( (s, i) => s + parseFloat(i.amount_inc),  0);
    const totalDebt = debts.reduce(   (s, d) => s + parseFloat(d.amount_debt) - parseFloat(d.amount_paid), 0);

    // Cuotas: usa installment_amt (columna real) con fallback a división
    const gastosCuota = expenses.filter(e => parseInt(e.installments) > 1);
    const cuotasMes   = gastosCuota.reduce((s, e) => {
        const amt = e.installment_amt != null
            ? parseFloat(e.installment_amt)
            : parseFloat(e.amount_exp) / parseInt(e.installments);
        return s + amt;
    }, 0);

    updateKPIs(totalExp, totalInc, totalDebt, cuotasMes, expenses.length, incomes.length, gastosCuota.length);

    // ── Renderizado ─────────────────────────────────────────
    renderTable(expenses, incomes);
    renderBarChart(expenses, incomes, dateRange, filters);
    renderPieChart(expenses);
    renderSubPieChart(expenses);
    renderMethodChart(expenses);
    renderInstallments(gastosCuota, cuotasMes);
    renderBudgetBars(budgets, expenses, filters);
}

// ─────────────────────────────────────────────────────────────
// 9. KPIs
// ─────────────────────────────────────────────────────────────
function updateKPIs(exp, inc, debt, cuotas, expCount, incCount, quotCount) {
    const fmt = n => n.toLocaleString('es-PE', { minimumFractionDigits: 2 });
    const net = inc - exp;

    document.getElementById('total-exp-display').innerText         = `S/ ${fmt(exp)}`;
    document.getElementById('total-inc-display').innerText         = `S/ ${fmt(inc)}`;
    document.getElementById('card-installments-display').innerText = `S/ ${fmt(cuotas)}`;
    document.getElementById('debt-total-display').innerText        = `S/ ${fmt(debt)}`;
    document.getElementById('exp-count').innerText                 = `${expCount} registros`;
    document.getElementById('inc-count').innerText                 = `${incCount} registros`;
    document.getElementById('quot-count').innerText                = `${quotCount} pagos en cuotas`;

    const netEl = document.getElementById('net-balance-display');
    netEl.innerText   = `S/ ${fmt(net)}`;
    netEl.style.color = net < 0 ? 'var(--rust)' : (net > 0 ? 'var(--sage)' : 'var(--ink)');

    const trendEl = document.getElementById('net-trend');
    if (exp > 0) {
        const pct = ((inc - exp) / exp * 100).toFixed(1);
        trendEl.innerText = net >= 0
            ? `Ahorro del ${pct}% sobre gastos`
            : `Déficit del ${Math.abs(pct)}% sobre ingresos`;
        trendEl.style.color = net >= 0 ? 'var(--sage)' : 'var(--rust)';
    } else {
        trendEl.innerText = '—';
    }
}

// ─────────────────────────────────────────────────────────────
// 10. TABLA DE TRANSACCIONES
// ─────────────────────────────────────────────────────────────
function renderTable(expenses, incomes) {
    const body = document.getElementById('transactions-body');

    const rows = [
        ...expenses.map(e => ({
            id:     e.id_exp,
            date:   e.date_exp,
            type:   'expense',
            cat:    e.categories?.name_cat    || 'Sin categoría',
            subcat: e.subcategories?.name_subcat || '',
            desc:   e.description_exp,
            amount: parseFloat(e.amount_exp),
            method: e.payment_method,
            cuotas: parseInt(e.installments) > 1
                ? `${e.installments} cuotas · S/ ${e.installment_amt != null ? parseFloat(e.installment_amt).toFixed(2) : (parseFloat(e.amount_exp)/parseInt(e.installments)).toFixed(2)}/c`
                : null,
            raw: e   // objeto completo para el drawer
        })),
        ...incomes.map(i => ({
            id:     i.id_inc,
            date:   i.date_inc,
            type:   'income',
            cat:    i.categories?.name_cat || 'Ingreso',
            subcat: '',
            desc:   i.description_inc,
            amount: parseFloat(i.amount_inc),
            method: i.payment_method,
            cuotas: null,
            raw: i
        }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    document.getElementById('transaction-count').innerText = `${rows.length} registros`;

    if (rows.length === 0) {
        body.innerHTML = `<tr><td colspan="6" style="padding:2rem;text-align:center;color:var(--muted);font-size:0.8rem;">No hay transacciones para el periodo seleccionado</td></tr>`;
        return;
    }

    const methodLabel = { Cash: 'Efectivo', Debit: 'Débito', Credit: 'Crédito' };

    body.innerHTML = rows.map(t => `
        <tr class="tx-row" data-id="${t.id}" data-type="${t.type}">
            <td style="white-space:nowrap; color:var(--muted);">${t.date}</td>
            <td><span class="tx-badge ${t.type}">${t.type === 'income' ? 'Ingreso' : 'Gasto'}</span></td>
            <td>
                <span class="tx-badge">${t.cat}</span>
                ${t.subcat ? `<span class="tx-badge" style="margin-left:3px;background:var(--cream2);">${t.subcat}</span>` : ''}
            </td>
            <td>
                <div style="font-size:0.78rem;">${t.desc || '—'}</div>
                ${t.cuotas ? `<div style="font-size:0.62rem;color:var(--gold);margin-top:1px;">🗓 ${t.cuotas}</div>` : ''}
                ${t.method ? `<div style="font-size:0.62rem;color:var(--muted);">${methodLabel[t.method] || t.method}</div>` : ''}
            </td>
            <td class="amount-cell ${t.type}">
                ${t.type === 'income' ? '+' : '−'} S/ ${t.amount.toFixed(2)}
            </td>
            <td class="actions-cell">
                <button class="btn-edit-tx" data-id="${t.id}" data-type="${t.type}" title="Editar">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="btn-del-tx" data-id="${t.id}" data-type="${t.type}" title="Eliminar">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                </button>
            </td>
        </tr>
    `).join('');

    // Eventos: editar
    body.querySelectorAll('.btn-edit-tx').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id   = btn.dataset.id;
            const type = btn.dataset.type;
            const row  = rows.find(r => r.id === id);
            if (row) openDrawer(row.raw, type);
        });
    });

    // Eventos: eliminar
    body.querySelectorAll('.btn-del-tx').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await deleteTransaction(btn.dataset.id, btn.dataset.type);
        });
    });
}

// ─────────────────────────────────────────────────────────────
// 11. GRÁFICO DE BARRAS — Ingresos vs Gastos por periodo
// ─────────────────────────────────────────────────────────────
function renderBarChart(expenses, incomes, dateRange, filters) {
    if (barChart) barChart.destroy();

    // Agrupar por semana si hay un mes, por mes si hay año completo / trimestre
    let labels = [], incData = [], expData = [];
    const groupByMonth = !filters.month; // si no hay mes específico, agrupa por mes

    if (groupByMonth) {
        // Agrupar por mes (YYYY-MM)
        const incMap = {}, expMap = {};
        incomes.forEach(i => {
            const key = i.date_inc?.substring(0, 7);
            if (key) incMap[key] = (incMap[key] || 0) + parseFloat(i.amount_inc);
        });
        expenses.forEach(e => {
            const key = e.date_exp?.substring(0, 7);
            if (key) expMap[key] = (expMap[key] || 0) + parseFloat(e.amount_exp);
        });
        const allKeys = Array.from(new Set([...Object.keys(incMap), ...Object.keys(expMap)])).sort();
        const monthNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
        labels  = allKeys.map(k => { const [y, m] = k.split('-'); return `${monthNames[parseInt(m)-1]} ${y}`; });
        incData = allKeys.map(k => incMap[k] || 0);
        expData = allKeys.map(k => expMap[k] || 0);
        document.getElementById('bar-chart-label').innerText = 'Por mes';
    } else {
        // Agrupar por día dentro del mes
        const incMap = {}, expMap = {};
        incomes.forEach(i => {
            if (i.date_inc) incMap[i.date_inc] = (incMap[i.date_inc] || 0) + parseFloat(i.amount_inc);
        });
        expenses.forEach(e => {
            if (e.date_exp) expMap[e.date_exp] = (expMap[e.date_exp] || 0) + parseFloat(e.amount_exp);
        });
        const allKeys = Array.from(new Set([...Object.keys(incMap), ...Object.keys(expMap)])).sort();
        labels  = allKeys.map(k => k.substring(5)); // MM-DD
        incData = allKeys.map(k => incMap[k] || 0);
        expData = allKeys.map(k => expMap[k] || 0);
        document.getElementById('bar-chart-label').innerText = 'Por día';
    }

    if (labels.length === 0) {
        document.getElementById('bar-chart-label').innerText = 'Sin datos';
        return;
    }

    barChart = new Chart(document.getElementById('barChart'), {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Ingresos',
                    data: incData,
                    backgroundColor: 'rgba(122,140,112,0.75)',
                    borderColor: '#7a8c70',
                    borderWidth: 1.5,
                    borderRadius: 5,
                    borderSkipped: false
                },
                {
                    label: 'Gastos',
                    data: expData,
                    backgroundColor: 'rgba(192,92,58,0.75)',
                    borderColor: '#c05c3a',
                    borderWidth: 1.5,
                    borderRadius: 5,
                    borderSkipped: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { font: { family: 'DM Sans', size: 11 }, boxWidth: 10, padding: 16 }
                },
                tooltip: {
                    callbacks: {
                        label: ctx => ` S/ ${parseFloat(ctx.raw).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`
                    }
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { font: { family: 'DM Sans', size: 10 } } },
                y: {
                    grid: { color: 'rgba(15,14,13,0.05)' },
                    ticks: {
                        font: { family: 'DM Sans', size: 10 },
                        callback: v => `S/ ${v.toLocaleString('es-PE')}`
                    }
                }
            }
        }
    });
}

// ─────────────────────────────────────────────────────────────
// 12. DONA — Categorías
// ─────────────────────────────────────────────────────────────
function renderPieChart(expenses) {
    if (pieChart) pieChart.destroy();

    const map = {};
    expenses.forEach(e => {
        const k = e.categories?.name_cat || 'Sin categoría';
        map[k]  = (map[k] || 0) + parseFloat(e.amount_exp);
    });
    const labels = Object.keys(map);
    const values = Object.values(map);
    const total  = values.reduce((s, v) => s + v, 0);

    const legendEl = document.getElementById('pie-legend');

    if (labels.length === 0) {
        legendEl.innerHTML = '<div style="color:var(--muted);font-size:0.75rem;text-align:center;padding:1rem;">Sin gastos</div>';
        return;
    }

    pieChart = new Chart(document.getElementById('pieChart'), {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{ data: values, backgroundColor: palette, borderWidth: 2, borderColor: '#fff' }]
        },
        options: {
            cutout: '68%',
            plugins: { legend: { display: false }, tooltip: {
                callbacks: { label: ctx => ` S/ ${parseFloat(ctx.raw).toFixed(2)} (${(ctx.raw/total*100).toFixed(1)}%)` }
            }}
        }
    });

    legendEl.innerHTML = labels.map((lbl, i) => `
        <div class="legend-item">
            <div class="legend-left">
                <span class="legend-dot" style="background:${palette[i % palette.length]}"></span>
                <span class="legend-name">${lbl}</span>
                <span class="legend-pct">${(values[i]/total*100).toFixed(1)}%</span>
            </div>
            <span class="legend-val">S/ ${values[i].toFixed(2)}</span>
        </div>`).join('');
}

// ─────────────────────────────────────────────────────────────
// 13. DONA — Subcategorías
// ─────────────────────────────────────────────────────────────
function renderSubPieChart(expenses) {
    if (subPieChart) subPieChart.destroy();

    const map = {};
    expenses.forEach(e => {
        const k = e.subcategories?.name_subcat || 'Sin subcategoría';
        map[k]  = (map[k] || 0) + parseFloat(e.amount_exp);
    });
    const labels = Object.keys(map);
    const values = Object.values(map);
    const total  = values.reduce((s, v) => s + v, 0);

    const legendEl = document.getElementById('subpie-legend');

    if (labels.length === 0) {
        legendEl.innerHTML = '<div style="color:var(--muted);font-size:0.75rem;text-align:center;padding:1rem;">Sin gastos</div>';
        return;
    }

    subPieChart = new Chart(document.getElementById('subPieChart'), {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{ data: values, backgroundColor: palette.slice().reverse(), borderWidth: 2, borderColor: '#fff' }]
        },
        options: {
            cutout: '68%',
            plugins: { legend: { display: false }, tooltip: {
                callbacks: { label: ctx => ` S/ ${parseFloat(ctx.raw).toFixed(2)} (${(ctx.raw/total*100).toFixed(1)}%)` }
            }}
        }
    });

    legendEl.innerHTML = labels.map((lbl, i) => `
        <div class="legend-item">
            <div class="legend-left">
                <span class="legend-dot" style="background:${palette.slice().reverse()[i % palette.length]}"></span>
                <span class="legend-name">${lbl}</span>
                <span class="legend-pct">${(values[i]/total*100).toFixed(1)}%</span>
            </div>
            <span class="legend-val">S/ ${values[i].toFixed(2)}</span>
        </div>`).join('');
}

// ─────────────────────────────────────────────────────────────
// 14. DONA — Método de Pago (NUEVO)
// ─────────────────────────────────────────────────────────────
function renderMethodChart(expenses) {
    if (methodChart) methodChart.destroy();

    const methodLabel = { Cash: 'Efectivo', Debit: 'Débito', Credit: 'Crédito' };
    const methodColors = { Cash: '#7a8c70', Debit: '#5e7a8c', Credit: '#c9a84c' };
    const map = {};
    expenses.forEach(e => {
        const k = e.payment_method || 'Otro';
        map[k]  = (map[k] || 0) + parseFloat(e.amount_exp);
    });

    const labels     = Object.keys(map);
    const values     = Object.values(map);
    const colors     = labels.map(l => methodColors[l] || '#8c6b5e');
    const total      = values.reduce((s, v) => s + v, 0);
    const legendEl   = document.getElementById('method-legend');

    if (labels.length === 0) {
        legendEl.innerHTML = '<div style="color:var(--muted);font-size:0.75rem;text-align:center;padding:1rem;">Sin gastos</div>';
        return;
    }

    methodChart = new Chart(document.getElementById('methodChart'), {
        type: 'doughnut',
        data: {
            labels: labels.map(l => methodLabel[l] || l),
            datasets: [{ data: values, backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }]
        },
        options: {
            cutout: '68%',
            plugins: { legend: { display: false }, tooltip: {
                callbacks: { label: ctx => ` S/ ${parseFloat(ctx.raw).toFixed(2)} (${(ctx.raw/total*100).toFixed(1)}%)` }
            }}
        }
    });

    legendEl.innerHTML = labels.map((lbl, i) => `
        <div class="legend-item">
            <div class="legend-left">
                <span class="legend-dot" style="background:${colors[i]}"></span>
                <span class="legend-name">${methodLabel[lbl] || lbl}</span>
                <span class="legend-pct">${(values[i]/total*100).toFixed(1)}%</span>
            </div>
            <span class="legend-val">S/ ${values[i].toFixed(2)}</span>
        </div>`).join('');
}

// ─────────────────────────────────────────────────────────────
// 15. CUOTAS PENDIENTES
// ─────────────────────────────────────────────────────────────
function renderInstallments(list, totalCuotas) {
    const container = document.getElementById('installments-container');
    document.getElementById('quot-total-label').innerText = `S/ ${totalCuotas.toFixed(2)} total`;

    if (list.length === 0) {
        container.innerHTML = '<div class="trend-empty">Sin cuotas en este periodo</div>';
        return;
    }

    container.innerHTML = list.map(e => {
        const totalQ = parseInt(e.installments);
        const cuota  = e.installment_amt != null
            ? parseFloat(e.installment_amt)
            : parseFloat(e.amount_exp) / totalQ;
        return `
        <div class="installment-row">
            <div>
                <div class="inst-name">${e.description_exp}</div>
                <div class="inst-sub">
                    ${e.cards?.name_card || 'Tarjeta'} · ${totalQ} cuotas
                    · Total S/ ${parseFloat(e.amount_exp).toFixed(2)}
                </div>
            </div>
            <div class="inst-amt">S/ ${cuota.toFixed(2)}<span style="font-weight:400;font-size:0.6rem;color:var(--muted);">/c</span></div>
        </div>`;
    }).join('');
}

// ─────────────────────────────────────────────────────────────
// 16. PRESUPUESTO VS REAL (NUEVO)
// ─────────────────────────────────────────────────────────────
function renderBudgetBars(budgets, expenses, filters) {
    const container = document.getElementById('budget-bars-container');
    const labelEl   = document.getElementById('budget-period-label');

    if (!filters.month || !filters.year || budgets.length === 0) {
        container.innerHTML = '<div class="trend-empty">Selecciona un mes para ver el presupuesto</div>';
        labelEl.innerText = '—';
        return;
    }

    const monthNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    labelEl.innerText = `${monthNames[parseInt(filters.month)-1]} ${filters.year}`;

    // Agrupar gastos reales por categoría
    const realBycat = {};
    expenses.forEach(e => {
        const catId = e.id_category;
        realBycat[catId] = (realBycat[catId] || 0) + parseFloat(e.amount_exp);
    });

    container.innerHTML = budgets.map(b => {
        const presup  = parseFloat(b.total_budget);
        const real    = realBycat[b.id_category] || 0;
        const pct     = presup > 0 ? Math.min((real / presup) * 100, 100) : 0;
        const over    = real > presup;
        const barColor = over ? 'var(--rust)' : pct > 80 ? 'var(--gold)' : 'var(--sage)';
        const catName  = b.categories?.name_cat || b.name_budget || 'Categoría';

        return `
        <div class="budget-item">
            <div class="budget-item-header">
                <span style="font-weight:500;">${catName}</span>
                <span style="color:${over ? 'var(--rust)' : 'var(--muted)'};">
                    S/ ${real.toFixed(2)} / S/ ${presup.toFixed(2)}
                    ${over ? ' ⚠️' : ''}
                </span>
            </div>
            <div class="budget-bar-track">
                <div class="budget-bar-fill" style="width:${pct}%; background:${barColor};"></div>
            </div>
        </div>`;
    }).join('');
}

// ─────────────────────────────────────────────────────────────
// CRUD — DRAWER DE EDICIÓN
// ─────────────────────────────────────────────────────────────

function initDrawer() {
    // Cerrar al hacer clic en el overlay
    document.getElementById('drawer-overlay').addEventListener('click', closeDrawer);
    // Cerrar con botón X
    document.getElementById('drawer-close').addEventListener('click', closeDrawer);
    // Cerrar con Escape
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });

    // Cambio de método en el drawer → actualizar tarjetas y sección cuotas
    document.getElementById('d-method').addEventListener('change', e => {
        const method = e.target.value;
        const cardRow  = document.getElementById('d-card-row');
        const instRow  = document.getElementById('d-inst-row');
        cardRow.style.display = (method === 'Debit' || method === 'Credit') ? 'block' : 'none';
        instRow.style.display = method === 'Credit' ? 'block' : 'none';
        if (method !== 'Credit') {
            document.getElementById('d-installments').value = 1;
            document.getElementById('d-inst-amt').value     = '';
        }
        populateDrawerCards(method);
    });

    // Cambio de categoría → recargar subcategorías
    document.getElementById('d-cat').addEventListener('change', async e => {
        await populateDrawerSubcats(e.target.value);
    });

    // Formulario de edición
    document.getElementById('drawer-form').addEventListener('submit', async e => {
        e.preventDefault();
        await saveDrawer();
    });
}

// Abre el drawer con los datos del registro
async function openDrawer(raw, type) {
    const drawer  = document.getElementById('crud-drawer');
    const overlay = document.getElementById('drawer-overlay');
    const title   = document.getElementById('drawer-title');

    document.getElementById('d-id').value   = type === 'expense' ? raw.id_exp   : raw.id_inc;
    document.getElementById('d-type').value = type;

    if (type === 'expense') {
        title.textContent = 'Editar Gasto';
        document.getElementById('d-amount').value  = parseFloat(raw.amount_exp).toFixed(2);
        document.getElementById('d-date').value    = raw.date_exp;
        document.getElementById('d-desc').value    = raw.description_exp || '';
        document.getElementById('d-method').value  = raw.payment_method || 'Cash';

        // Secciones condicionales
        const method = raw.payment_method;
        document.getElementById('d-card-row').style.display = (method === 'Debit' || method === 'Credit') ? 'block' : 'none';
        document.getElementById('d-inst-row').style.display = method === 'Credit' ? 'block' : 'none';

        // Categorías
        populateDrawerCats(raw.id_category);
        await populateDrawerSubcats(raw.id_category, raw.id_subcat);

        // Tarjetas filtradas por tipo
        populateDrawerCards(method, raw.id_card);

        // Cuotas
        document.getElementById('d-installments').value = raw.installments || 1;
        document.getElementById('d-inst-amt').value     = raw.installment_amt != null ? parseFloat(raw.installment_amt).toFixed(2) : '';

        // Ocultar campo ingreso
        document.getElementById('d-income-only').style.display = 'none';
        document.getElementById('d-expense-only').style.display = 'block';

    } else {
        title.textContent = 'Editar Ingreso';
        document.getElementById('d-amount').value  = parseFloat(raw.amount_inc).toFixed(2);
        document.getElementById('d-date').value    = raw.date_inc;
        document.getElementById('d-desc').value    = raw.description_inc || '';
        document.getElementById('d-method').value  = raw.payment_method || 'Cash';

        // Para ingresos no hay cuotas ni categoría de gastos
        document.getElementById('d-card-row').style.display  = 'none';
        document.getElementById('d-inst-row').style.display  = 'none';
        document.getElementById('d-income-only').style.display   = 'block';
        document.getElementById('d-expense-only').style.display  = 'none';
    }

    // Animar apertura
    overlay.classList.add('visible');
    drawer.classList.add('open');
}

function closeDrawer() {
    document.getElementById('crud-drawer').classList.remove('open');
    document.getElementById('drawer-overlay').classList.remove('visible');
}

// Poblar categorías en el drawer
function populateDrawerCats(selectedId = null) {
    const sel = document.getElementById('d-cat');
    sel.innerHTML = '<option value="">Sin categoría</option>';
    _allCats.forEach(c => {
        const opt = new Option(c.name_cat, c.id_cat);
        if (c.id_cat === selectedId) opt.selected = true;
        sel.add(opt);
    });
}

// Poblar subcategorías en el drawer
async function populateDrawerSubcats(catId, selectedId = null) {
    const sel = document.getElementById('d-subcat');
    sel.innerHTML = '<option value="">Sin subcategoría</option>';
    if (!catId) return;

    const { data } = await supabase.from('subcategories')
        .select('id_subcat, name_subcat')
        .eq('id_category', catId)
        .eq('deleted_subcat', false)
        .order('name_subcat', { ascending: true });

    data?.forEach(s => {
        const opt = new Option(s.name_subcat, s.id_subcat);
        if (s.id_subcat === selectedId) opt.selected = true;
        sel.add(opt);
    });
}

// Poblar tarjetas filtradas por tipo en el drawer
function populateDrawerCards(method, selectedId = null) {
    const sel = document.getElementById('d-card');
    sel.innerHTML = '<option value="">Sin tarjeta</option>';
    const typeFilter = method === 'Debit' ? 'Debit' : 'Credit';
    _allCards.filter(c => c.type_card === typeFilter).forEach(c => {
        const opt = new Option(c.name_card, c.id_card);
        if (c.id_card === selectedId) opt.selected = true;
        sel.add(opt);
    });
}

// Guardar cambios (UPDATE)
async function saveDrawer() {
    const id    = document.getElementById('d-id').value;
    const type  = document.getElementById('d-type').value;
    const btn   = document.getElementById('drawer-save-btn');

    btn.disabled    = true;
    btn.textContent = 'Guardando...';

    try {
        if (type === 'expense') {
            const method       = document.getElementById('d-method').value;
            const totalAmount  = parseFloat(document.getElementById('d-amount').value);
            const installments = parseInt(document.getElementById('d-installments').value) || 1;
            const instAmt      = parseFloat(document.getElementById('d-inst-amt').value);

            // Respetar el CHECK: installment_amt null si installments = 1
            const installmentAmt = installments > 1 && !isNaN(instAmt) && instAmt > 0
                ? instAmt
                : null;

            const updates = {
                amount_exp:     totalAmount,
                date_exp:       document.getElementById('d-date').value,
                description_exp: document.getElementById('d-desc').value.trim() || 'Sin descripción',
                payment_method: method,
                id_category:    document.getElementById('d-cat').value   || null,
                id_subcat:      document.getElementById('d-subcat').value || null,
                id_card:        method === 'Cash' ? null : (document.getElementById('d-card').value || null),
                installments:   installments,
                installment_amt: installmentAmt,
                updated_at:     new Date().toISOString()
            };

            const { error } = await supabase.from('expenses').update(updates).eq('id_exp', id);
            if (error) throw error;

        } else {
            const updates = {
                amount_inc:    parseFloat(document.getElementById('d-amount').value),
                date_inc:      document.getElementById('d-date').value,
                description_inc: document.getElementById('d-desc').value.trim() || null,
                payment_method: document.getElementById('d-method').value
            };

            const { error } = await supabase.from('incomes').update(updates).eq('id_inc', id);
            if (error) throw error;
        }

        closeDrawer();
        showToast('✓ Guardado correctamente', 'success');
        if (_reloadCallback) await _reloadCallback();

    } catch (err) {
        console.error('[drawer] Error al guardar:', err.message);
        showToast('Error: ' + err.message, 'error');
    } finally {
        btn.disabled    = false;
        btn.textContent = 'Guardar cambios';
    }
}

// Eliminar transacción (soft delete para expenses, delete para incomes)
async function deleteTransaction(id, type) {
    const label = type === 'expense' ? 'este gasto' : 'este ingreso';
    if (!confirm(`¿Eliminar ${label}? Esta acción no se puede deshacer.`)) return;

    try {
        let error;
        if (type === 'expense') {
            // expenses tiene deleted_exp — usar soft delete
            ({ error } = await supabase.from('expenses')
                .update({ deleted_exp: true, updated_at: new Date().toISOString() })
                .eq('id_exp', id));
        } else {
            // incomes no tiene deleted — delete real
            ({ error } = await supabase.from('incomes').delete().eq('id_inc', id));
        }

        if (error) throw error;
        showToast('🗑 Eliminado correctamente', 'success');
        if (_reloadCallback) await _reloadCallback();

    } catch (err) {
        console.error('[delete] Error:', err.message);
        showToast('Error al eliminar: ' + err.message, 'error');
    }
}

// Toast de notificación
function showToast(msg, kind = 'success') {
    let toast = document.getElementById('crud-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'crud-toast';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.className   = `crud-toast ${kind}`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

init();