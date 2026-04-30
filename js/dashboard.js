import { supabase } from './supabase.js';

// ─────────────────────────────────────────────────────────────
// ESTADO GLOBAL
// ─────────────────────────────────────────────────────────────
let pieChart, subPieChart, barChart, methodChart, cycleChart;
const palette = ['#c9a84c','#7a8c70','#c05c3a','#5e7a8c','#8c6b5e','#a8a87a','#6b8c8c','#8c7a5e','#5e6b8c','#8c5e7a'];

let _currentUserId  = null;
let _allCats        = [];
let _allSubcats     = {};  // catId → subcats[]
let _allCards       = [];
let _reloadCallback = null;
let _activeTab      = 'all'; // 'all' | 'expense' | 'income' | 'credit'
let _sortField      = 'date';
let _sortDir        = 'desc';
let _searchQuery    = '';
let _currentPage    = 1;
let _currentDrawerRaw = null;
let _currentDrawerType = null;
const PAGE_SIZE     = 25;

// ─────────────────────────────────────────────────────────────
// 1. INICIALIZACIÓN
// ─────────────────────────────────────────────────────────────
async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return window.location.href = 'login.html';

    const { data: profile } = await supabase
        .from('users').select('firstname_user, lastname_user').eq('id_user', user.id).single();
    if (profile) {
        const nameEl = document.getElementById('user-name');
        const initEl = document.getElementById('sb-initial');
        if (nameEl) nameEl.innerText = profile.firstname_user;
        if (initEl) initEl.innerText = profile.firstname_user.charAt(0).toUpperCase();
    }

    _currentUserId  = user.id;
    _reloadCallback = () => loadDashboardData(user.id);

    await Promise.all([loadCategories(user.id), loadCards(user.id)]);
    initDrawer();
    initFilters(user.id);
    initTabs();
    initSearch();
    initCycleSelector();

    setDefaultPeriod();
    document.querySelector('[data-period="month"]')?.classList.add('active');
    await loadDashboardData(user.id);
}

// ─────────────────────────────────────────────────────────────
// 2. SELECTORES DINÁMICOS
// ─────────────────────────────────────────────────────────────
async function loadCategories(userId) {
    const { data } = await supabase.from('categories')
        .select('id_cat, name_cat, type_cat')
        .eq('id_user', userId).eq('deleted_cat', false)
        .order('name_cat', { ascending: true });
    _allCats = data || [];

    const gastosCats = _allCats.filter(c => c.type_cat === 'gasto' || !c.type_cat);
    const sel = document.getElementById('filter-cat');
    if (sel) {
        sel.innerHTML = '<option value="">Todas las categorías</option>';
        gastosCats.forEach(c => sel.add(new Option(c.name_cat, c.id_cat)));
    }

    const dSel = document.getElementById('d-cat');
    if (dSel) {
        dSel.innerHTML = '<option value="">Sin categoría</option>';
        gastosCats.forEach(c => {
            const opt = new Option(c.name_cat, c.id_cat);
            dSel.add(opt);
        });
    }
}

async function loadSubcategories(catId, userId, targetSel = 'filter-subcat') {
    const sel = document.getElementById(targetSel);
    if (!sel) return;
    sel.innerHTML = '<option value="">Todas</option>';
    if (!catId) { sel.disabled = true; return; }

    if (!_allSubcats[catId]) {
        const { data } = await supabase.from('subcategories')
            .select('id_subcat, name_subcat')
            .eq('id_category', catId).eq('id_user', userId).eq('deleted_subcat', false)
            .order('name_subcat', { ascending: true });
        _allSubcats[catId] = data || [];
    }
    _allSubcats[catId].forEach(s => sel.add(new Option(s.name_subcat, s.id_subcat)));
    sel.disabled = false;
}

async function loadCards(userId) {
    const { data } = await supabase.from('cards')
        .select('id_card, name_card, type_card, current_balance, limit_card')
        .eq('id_user', userId).eq('deleted_card', false)
        .order('name_card', { ascending: true });
    _allCards = data || [];

    const sel = document.getElementById('filter-card');
    if (sel) {
        sel.innerHTML = '<option value="">Todas las cuentas</option>';
        _allCards.forEach(c => sel.add(new Option(`${c.name_card} (${c.type_card})`, c.id_card)));
    }

    // Populate cycle credit card selector
    const cycleCardSel = document.getElementById('cycle-card-select');
    if (cycleCardSel) {
        const credits = _allCards.filter(c => c.type_card === 'Credit');
        cycleCardSel.innerHTML = '<option value="">Todas las TC</option>';
        credits.forEach(c => cycleCardSel.add(new Option(c.name_card, c.id_card)));
    }
}

// ─────────────────────────────────────────────────────────────
// 3. INICIALIZAR FILTROS
// ─────────────────────────────────────────────────────────────
function initFilters(userId) {
    document.getElementById('filter-cat')?.addEventListener('change', e => {
        loadSubcategories(e.target.value, userId);
    });
    document.getElementById('btn-apply-filters')?.addEventListener('click', () => {
        _currentPage = 1;
        loadDashboardData(userId);
    });
    document.getElementById('btn-reset')?.addEventListener('click', () => {
        resetFilters();
        setDefaultPeriod();
        _currentPage = 1;
        loadDashboardData(userId);
    });

    document.querySelectorAll('.period-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.period-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            applyPeriodChip(chip.dataset.period);
            _currentPage = 1;
            loadDashboardData(userId);
        });
    });

    document.getElementById('toggle-advanced')?.addEventListener('click', function() {
        const adv = document.getElementById('advanced-filters');
        const isHidden = adv.classList.toggle('hidden');
        this.textContent = isHidden ? '+ Avanzados' : '− Ocultar';
    });
}

function resetFilters() {
    ['filter-from','filter-to','filter-cat','filter-subcat','filter-card','filter-method'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const typeEl = document.getElementById('filter-type');
    if (typeEl) typeEl.value = 'all';
    const subcatEl = document.getElementById('filter-subcat');
    if (subcatEl) subcatEl.disabled = true;
    _searchQuery = '';
    const searchEl = document.getElementById('tx-search');
    if (searchEl) searchEl.value = '';
}

// ─────────────────────────────────────────────────────────────
// 4. TABS DE TRANSACCIONES
// ─────────────────────────────────────────────────────────────
function initTabs() {
    document.querySelectorAll('.tx-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tx-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            _activeTab = tab.dataset.tab;
            _currentPage = 1;
            renderTableFromCache();
        });
    });
}

// ─────────────────────────────────────────────────────────────
// 5. BÚSQUEDA EN TABLA
// ─────────────────────────────────────────────────────────────
function initSearch() {
    const el = document.getElementById('tx-search');
    if (!el) return;
    let debounce;
    el.addEventListener('input', e => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
            _searchQuery = e.target.value.toLowerCase();
            _currentPage = 1;
            renderTableFromCache();
        }, 250);
    });
}

// ─────────────────────────────────────────────────────────────
// 6. SELECTOR DE CICLO DE TARJETA DE CRÉDITO
// ─────────────────────────────────────────────────────────────
function initCycleSelector() {
    document.getElementById('cycle-card-select')?.addEventListener('change', async () => {
        await renderCyclePanel();
    });
    document.getElementById('cycle-month-sel')?.addEventListener('change', async () => {
        await renderCyclePanel();
    });
    document.getElementById('cycle-year-sel')?.addEventListener('change', async () => {
        await renderCyclePanel();
    });

    // Populate month/year selectors
    const now = new Date();
    const monthSel = document.getElementById('cycle-month-sel');
    const yearSel  = document.getElementById('cycle-year-sel');
    if (monthSel) {
        const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
        months.forEach((m, i) => {
            const opt = new Option(m, String(i + 1).padStart(2, '0'));
            if (i + 1 === now.getMonth() + 1) opt.selected = true;
            monthSel.add(opt);
        });
    }
    if (yearSel) {
        for (let y = now.getFullYear(); y >= now.getFullYear() - 3; y--) {
            const opt = new Option(y, y);
            if (y === now.getFullYear()) opt.selected = true;
            yearSel.add(opt);
        }
    }
}

// ─────────────────────────────────────────────────────────────
// 7. CHIPS DE PERIODO
// ─────────────────────────────────────────────────────────────
function applyPeriodChip(period) {
    const now   = new Date();
    const year  = now.getFullYear();
    const month = now.getMonth();

    document.getElementById('filter-from').value = '';
    document.getElementById('filter-to').value   = '';

    if (period === 'month') {
        document.getElementById('filter-month').value = String(month + 1).padStart(2, '0');
        document.getElementById('filter-year').value  = year;
    } else if (period === 'lastmonth') {
        const lm = month === 0 ? 12 : month;
        const ly = month === 0 ? year - 1 : year;
        document.getElementById('filter-month').value = String(lm).padStart(2, '0');
        document.getElementById('filter-year').value  = ly;
    } else if (period === 'quarter') {
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
// 8. RANGO DE FECHAS
// ─────────────────────────────────────────────────────────────
function buildDateRange(filters) {
    if (filters.from || filters.to) return { from: filters.from || null, to: filters.to || null };
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
// 9. FETCH DATA
// ─────────────────────────────────────────────────────────────
async function fetchExpenses(userId, filters, dateRange) {
    let q = supabase.from('expenses')
        .select('*, categories(name_cat), subcategories(name_subcat), cards(name_card, type_card)')
        .eq('id_user', userId)
        .eq('deleted_exp', false);

    if (dateRange.from) q = q.gte('date_exp', dateRange.from);
    if (dateRange.to)   q = q.lte('date_exp', dateRange.to);
    if (filters.cat)    q = q.eq('id_category', filters.cat);
    if (filters.subcat) q = q.eq('id_subcat', filters.subcat);
    if (filters.card)   q = q.eq('id_card', filters.card);
    if (filters.method) q = q.eq('payment_method', filters.method);

    const { data, error } = await q.order('date_exp', { ascending: false });
    if (error) console.error('[expenses]', error.message);
    return data || [];
}

async function fetchIncomes(userId, filters, dateRange) {
    let q = supabase.from('monthly_incomes')
        .select('id_income, amount_income, date_income, notes_income, id_card, cards(name_card)')
        .eq('id_user', userId);

    if (dateRange.from) q = q.gte('date_income', dateRange.from);
    if (dateRange.to)   q = q.lte('date_income', dateRange.to);

    const { data, error } = await q.order('date_income', { ascending: false });
    if (error) console.error('[monthly_incomes]', error.message);
    return data || [];
}

async function fetchCreditPayments(userId, dateRange) {
    let q = supabase.from('credit_card_payments')
        .select('*, cards!credit_card_payments_id_card_fkey(name_card), cards!credit_card_payments_source_account_fkey(name_card)')
        .eq('id_user', userId);

    if (dateRange.from) q = q.gte('date_payment', dateRange.from);
    if (dateRange.to)   q = q.lte('date_payment', dateRange.to);

    const { data, error } = await q.order('date_payment', { ascending: false });
    if (error) console.error('[credit_card_payments]', error.message);
    return data || [];
}

async function fetchDebts(userId) {
    const { data, error } = await supabase.from('debts')
        .select('amount_debt, amount_paid, debtor_name, status_debt')
        .eq('id_user', userId)
        .neq('status_debt', 'Paid');
    if (error) console.error('[debts]', error.message);
    return data || [];
}

async function fetchBudgets(userId, month, year) {
    if (!month || !year) return [];
    const { data, error } = await supabase.from('budgets')
        .select('*, categories(name_cat)')
        .eq('id_user', userId)
        .eq('month_budget', parseInt(month))
        .eq('year_budget', parseInt(year));
    if (error) console.error('[budgets]', error.message);
    return data || [];
}

// ─────────────────────────────────────────────────────────────
// 10. CICLO DE TARJETA DE CRÉDITO
// ─────────────────────────────────────────────────────────────
async function renderCyclePanel() {
    const cardId    = document.getElementById('cycle-card-select')?.value;
    const month     = document.getElementById('cycle-month-sel')?.value;
    const year      = document.getElementById('cycle-year-sel')?.value;
    const container = document.getElementById('cycle-details');
    if (!container) return;

    container.innerHTML = '<div class="cycle-loading">Calculando ciclo…</div>';

    if (!month || !year) {
        container.innerHTML = '<div class="cycle-empty">Selecciona mes y año</div>';
        return;
    }

    // Rango del mes
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const from    = `${year}-${month}-01`;
    const to      = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

    // Gastos de crédito del ciclo
    let expQ = supabase.from('expenses')
        .select('*, categories(name_cat), subcategories(name_subcat), cards(name_card)')
        .eq('id_user', _currentUserId)
        .eq('deleted_exp', false)
        .eq('payment_method', 'Credit')
        .gte('date_exp', from).lte('date_exp', to);
    if (cardId) expQ = expQ.eq('id_card', cardId);

    // Pagos realizados en el ciclo
    let payQ = supabase.from('credit_card_payments')
        .select('*, cards!credit_card_payments_id_card_fkey(name_card)')
        .eq('id_user', _currentUserId)
        .gte('date_payment', from).lte('date_payment', to);
    if (cardId) payQ = payQ.eq('id_card', cardId);

    // También pagos atribuidos a este ciclo (target_cycle con month/year)
    let payAttrQ = supabase.from('credit_card_payments')
        .select('*, cards!credit_card_payments_id_card_fkey(name_card)')
        .eq('id_user', _currentUserId)
        .eq('month_cycle', parseInt(month))
        .eq('year_cycle', parseInt(year));
    if (cardId) payAttrQ = payAttrQ.eq('id_card', cardId);

    const [expRes, payRes, payAttrRes] = await Promise.all([expQ, payQ, payAttrQ]);

    const cycleExpenses  = expRes.data  || [];
    const cyclePayments  = payRes.data  || [];
    const attrPayments   = payAttrRes.data || [];

    // Combinar pagos (deduplicar por id)
    const allPays = [...cyclePayments, ...attrPayments].reduce((acc, p) => {
        if (!acc.find(x => x.id_payment === p.id_payment)) acc.push(p);
        return acc;
    }, []);

    const totalGasto   = cycleExpenses.reduce((s, e) => s + parseFloat(e.amount_exp), 0);
    const totalPagado  = allPays.reduce((s, p) => s + parseFloat(p.amount_paid), 0);
    const saldoPendiente = totalGasto - totalPagado;

    // Cuotas en ciclo
    const cuotasEnCiclo = cycleExpenses.filter(e => parseInt(e.installments) > 1);
    const totalCuotas   = cuotasEnCiclo.reduce((s, e) => {
        const c = e.installment_amt != null ? parseFloat(e.installment_amt) : parseFloat(e.amount_exp) / parseInt(e.installments);
        return s + c;
    }, 0);

    const fmt = n => Math.abs(n).toLocaleString('es-PE', { minimumFractionDigits: 2 });
    const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const statusColor = saldoPendiente <= 0 ? 'var(--sage)' : saldoPendiente < totalGasto * 0.5 ? 'var(--gold)' : 'var(--rust)';

    container.innerHTML = `
        <div class="cycle-summary">
            <div class="cycle-stat">
                <span class="cycle-stat-label">Consumo del ciclo</span>
                <span class="cycle-stat-val" style="color:var(--rust);">S/ ${fmt(totalGasto)}</span>
            </div>
            <div class="cycle-stat">
                <span class="cycle-stat-label">Total pagado</span>
                <span class="cycle-stat-val" style="color:var(--sage);">S/ ${fmt(totalPagado)}</span>
            </div>
            <div class="cycle-stat highlight">
                <span class="cycle-stat-label">Saldo pendiente</span>
                <span class="cycle-stat-val" style="color:${statusColor};">S/ ${fmt(Math.max(0, saldoPendiente))}</span>
            </div>
            ${cuotasEnCiclo.length > 0 ? `
            <div class="cycle-stat">
                <span class="cycle-stat-label">Cuotas en ciclo</span>
                <span class="cycle-stat-val" style="color:var(--gold);">S/ ${fmt(totalCuotas)}</span>
            </div>` : ''}
        </div>

        ${totalGasto > 0 ? `
        <div class="cycle-progress-wrap">
            <div class="cycle-progress-label">
                <span>Pagado</span>
                <span>${Math.min(100, (totalPagado / totalGasto * 100)).toFixed(0)}%</span>
            </div>
            <div class="cycle-progress-track">
                <div class="cycle-progress-fill" style="width:${Math.min(100, totalPagado/totalGasto*100)}%;background:${statusColor};"></div>
            </div>
        </div>` : ''}

        ${cycleExpenses.length > 0 ? `
        <div class="cycle-section-title">Gastos del ciclo (${cycleExpenses.length})</div>
        <div class="cycle-list">
            ${cycleExpenses.slice(0, 8).map(e => `
                <div class="cycle-list-item">
                    <div>
                        <div class="cycle-item-name">${e.description_exp || '—'}</div>
                        <div class="cycle-item-sub">${e.date_exp} · ${e.categories?.name_cat || ''}${e.subcategories?.name_subcat ? ' / ' + e.subcategories.name_subcat : ''}${parseInt(e.installments) > 1 ? ` · ${e.installments}c` : ''}</div>
                    </div>
                    <div class="cycle-item-amt">S/ ${parseFloat(e.amount_exp).toFixed(2)}</div>
                </div>
            `).join('')}
            ${cycleExpenses.length > 8 ? `<div class="cycle-more">+${cycleExpenses.length - 8} más</div>` : ''}
        </div>` : '<div class="cycle-empty">Sin gastos de crédito en este ciclo</div>'}

        ${allPays.length > 0 ? `
        <div class="cycle-section-title" style="margin-top:1rem;">Pagos realizados (${allPays.length})</div>
        <div class="cycle-list">
            ${allPays.map(p => `
                <div class="cycle-list-item">
                    <div>
                        <div class="cycle-item-name">${p.cards?.name_card || 'Tarjeta'}</div>
                        <div class="cycle-item-sub">${p.date_payment}${p.notes ? ' · ' + p.notes : ''}</div>
                    </div>
                    <div class="cycle-item-amt" style="color:var(--sage);">S/ ${parseFloat(p.amount_paid).toFixed(2)}</div>
                </div>
            `).join('')}
        </div>` : ''}
    `;
}

// ─────────────────────────────────────────────────────────────
// 11. CARGA PRINCIPAL
// ─────────────────────────────────────────────────────────────
let _cachedRows = [];

async function loadDashboardData(userId) {
    // Mostrar estado de carga en KPIs
    document.querySelectorAll('.kpi-value').forEach(el => {
        el.style.opacity = '0.4';
    });

    const filters = {
        from:   document.getElementById('filter-from')?.value   || '',
        to:     document.getElementById('filter-to')?.value     || '',
        month:  document.getElementById('filter-month')?.value  || '',
        year:   document.getElementById('filter-year')?.value   || '',
        cat:    document.getElementById('filter-cat')?.value    || '',
        subcat: document.getElementById('filter-subcat')?.value || '',
        card:   document.getElementById('filter-card')?.value   || '',
        method: document.getElementById('filter-method')?.value || '',
        type:   document.getElementById('filter-type')?.value   || 'all'
    };

    const dateRange = buildDateRange(filters);

    const [expenses, incomes, debts, budgets, cardsRes, creditPayments] = await Promise.all([
        filters.type !== 'income'   ? fetchExpenses(userId, filters, dateRange) : [],
        filters.type !== 'expense'  ? fetchIncomes(userId, filters, dateRange)  : [],
        fetchDebts(userId),
        fetchBudgets(userId, filters.month, filters.year),
        supabase.from('cards').select('id_card, name_card, type_card, current_balance, limit_card, cutoff_day, due_day')
            .eq('id_user', userId).eq('deleted_card', false).order('type_card', { ascending: true }),
        fetchCreditPayments(userId, dateRange)
    ]);

    const cards = cardsRes.data || [];

    // ── CÁLCULOS KPI ────────────────────────────────────────
    const totalInc  = incomes.reduce((s, i) => s + parseFloat(i.amount_income), 0);
    const totalExp  = expenses
        .filter(e => e.payment_method !== 'Credit') // Ignora tarjetas de crédito
        .reduce((s, e) => s + parseFloat(e.amount_exp), 0);
    const totalDebt = debts.reduce((s, d) => s + parseFloat(d.amount_debt) - parseFloat(d.amount_paid), 0);

    const expRealMoney   = expenses.filter(e => e.payment_method !== 'Credit');
    const expCredit      = expenses.filter(e => e.payment_method === 'Credit');
    const totalExpReal   = expRealMoney.reduce((s, e) => s + parseFloat(e.amount_exp), 0);
    const totalExpCredit = expCredit.reduce((s, e)    => s + parseFloat(e.amount_exp), 0);

    // Gastos excluyendo los marcados como excluir
    const expForBalance   = expRealMoney.filter(e => !e.exclude_from_balance);
    const totalExpBalance = expForBalance.reduce((s, e) => s + parseFloat(e.amount_exp), 0);

    const netRealPeriod = totalInc - totalExpBalance;

    const realMoneyCards = cards.filter(c => c.type_card !== 'Credit');
    const creditCards    = cards.filter(c => c.type_card === 'Credit');
    const totalRealMoney = realMoneyCards.reduce((s, c) => s + parseFloat(c.current_balance || 0), 0);
    const totalCreditDebt = creditCards.reduce((s, c) => s + Math.max(0, parseFloat(c.current_balance || 0)), 0);

    const gastosCuota = expenses.filter(e => parseInt(e.installments) > 1);
    const cuotasMes   = gastosCuota.reduce((s, e) => {
        const amt = e.installment_amt != null ? parseFloat(e.installment_amt) : parseFloat(e.amount_exp) / parseInt(e.installments);
        return s + amt;
    }, 0);

    const totalPagosTC = creditPayments.reduce((s, p) => s + parseFloat(p.amount_paid), 0);

    updateKPIs({
        totalExp, totalInc, totalExpReal, totalExpCredit,
        netRealPeriod, totalRealMoney, totalCreditDebt,
        totalDebt, cuotasMes, totalPagosTC,
        expCount: expenses.length, incCount: incomes.length, quotCount: gastosCuota.length
    });

    renderCardsPanel(realMoneyCards, creditCards);

    // Cache de filas para tabs / search / sort / paginación
    _cachedRows = buildTableRows(expenses, incomes, creditPayments);
    renderTableFromCache();

    renderBarChart(expenses, incomes, dateRange, filters);
    renderPieChart(expenses);
    renderSubPieChart(expenses);
    renderMethodChart(expenses);
    renderInstallments(gastosCuota, cuotasMes);
    renderBudgetBars(budgets, expenses, filters);
    renderCyclePanel();

    // Restaurar opacidad
    document.querySelectorAll('.kpi-value').forEach(el => {
        el.style.opacity = '1';
    });
}

// ─────────────────────────────────────────────────────────────
// 12. KPIs
// ─────────────────────────────────────────────────────────────
function updateKPIs({ totalExp, totalInc, totalExpReal, totalExpCredit,
                      netRealPeriod, totalRealMoney, totalCreditDebt,
                      totalDebt, cuotasMes, totalPagosTC,
                      expCount, incCount, quotCount }) {
    const fmt = n => Math.abs(n).toLocaleString('es-PE', { minimumFractionDigits: 2 });

    // Flujo de caja
    const netEl = document.getElementById('net-balance-display');
    if (netEl) {
        netEl.innerText   = `S/ ${fmt(netRealPeriod)}`;
        netEl.style.color = netRealPeriod < 0 ? 'var(--rust)' : netRealPeriod > 0 ? 'var(--sage)' : 'var(--ink)';
    }
    const trendEl = document.getElementById('net-trend');
    if (trendEl) {
        if (totalExpReal > 0) {
            const pct = (Math.abs(netRealPeriod) / (totalInc || 1) * 100).toFixed(1);
            trendEl.innerText = netRealPeriod >= 0 ? `Ahorro ${pct}% del ingreso` : `Déficit ${pct}% del ingreso`;
            trendEl.style.color = netRealPeriod >= 0 ? 'var(--sage)' : 'var(--rust)';
        } else {
            trendEl.innerText = incCount > 0 ? 'Solo ingresos registrados' : 'Sin datos en el periodo';
        }
    }

    // Ingresos
    const incEl = document.getElementById('total-inc-display');
    if (incEl) incEl.innerText = `S/ ${fmt(totalInc)}`;
    const incCountEl = document.getElementById('inc-count');
    if (incCountEl) incCountEl.innerText = `${incCount} registro${incCount !== 1 ? 's' : ''}`;

    // Gastos
    const expEl = document.getElementById('total-exp-display');
    if (expEl) expEl.innerText = `S/ ${fmt(totalExp)}`;
    const expCountEl = document.getElementById('exp-count');
    if (expCountEl) expCountEl.innerText = `S/ ${fmt(totalExpReal)} real · S/ ${fmt(totalExpCredit)} TC`;

    // Saldo real (cuentas)
    const realEl = document.getElementById('real-money-display');
    if (realEl) realEl.innerText = `S/ ${fmt(totalRealMoney)}`;

    // Deuda TC
    const debtTCEl = document.getElementById('credit-debt-display');
    if (debtTCEl) {
        debtTCEl.innerText   = `S/ ${fmt(totalCreditDebt)}`;
        debtTCEl.style.color = totalCreditDebt > 0 ? 'var(--rust)' : 'var(--sage)';
    }
    const paidTCEl = document.getElementById('credit-paid-label');
    if (paidTCEl) paidTCEl.innerText = totalPagosTC > 0 ? `S/ ${fmt(totalPagosTC)} pagado en periodo` : `${quotCount} gasto${quotCount !== 1 ? 's' : ''} en cuotas`;

    // Cuotas
    const quotEl = document.getElementById('quot-display');
    if (quotEl) quotEl.innerText = `S/ ${fmt(cuotasMes)}`;
    const quotCountEl = document.getElementById('quot-count-label');
    if (quotCountEl) quotCountEl.innerText = `${quotCount} gasto${quotCount !== 1 ? 's' : ''} en cuotas`;

    // Deuda externa
    const debtEl = document.getElementById('debt-display');
    if (debtEl) {
        debtEl.innerText   = `S/ ${fmt(totalDebt)}`;
        debtEl.style.color = totalDebt > 0 ? 'var(--blue)' : 'var(--sage)';
    }
}

// ─────────────────────────────────────────────────────────────
// 13. PANEL DE CUENTAS
// ─────────────────────────────────────────────────────────────
function renderCardsPanel(realCards, creditCards) {
    const container = document.getElementById('cards-panel');
    if (!container) return;

    const fmt = n => Math.abs(n).toLocaleString('es-PE', { minimumFractionDigits: 2 });
    let html = '';

    realCards.forEach(c => {
        const bal = parseFloat(c.current_balance || 0);
        const icon = c.type_card === 'Cash' ? '💵' : '🏦';
        html += `
        <div class="cp-card-item">
            <div class="cp-card-left">
                <span class="cp-card-icon">${icon}</span>
                <div>
                    <div class="cp-card-name">${c.name_card}</div>
                    <span class="cp-card-type">${c.type_card === 'Cash' ? 'Efectivo' : 'Débito'}</span>
                </div>
            </div>
            <div class="cp-card-bal" style="color:${bal >= 0 ? 'var(--sage)' : 'var(--rust)'};">S/ ${fmt(bal)}</div>
        </div>`;
    });

    if (creditCards.length > 0) {
        html += '<div class="cp-separator">Tarjetas de Crédito</div>';
        creditCards.forEach(c => {
            const debt  = parseFloat(c.current_balance || 0);
            const limit = parseFloat(c.limit_card || 0);
            const used  = limit > 0 ? Math.min((debt / limit) * 100, 100) : 0;
            const color = used > 80 ? 'var(--rust)' : used > 50 ? 'var(--gold)' : 'var(--sage)';
            const avail = limit > 0 ? limit - debt : null;

            html += `
            <div class="cp-card-item credit">
                <div class="cp-card-left">
                    <span class="cp-card-icon">💳</span>
                    <div>
                        <div class="cp-card-name">${c.name_card}</div>
                        <span class="cp-card-type">${limit > 0 ? `Límite S/ ${fmt(limit)}` : 'Crédito'}</span>
                    </div>
                </div>
                <div style="text-align:right;">
                    <div class="cp-card-bal" style="color:${debt > 0 ? 'var(--rust)' : 'var(--sage)'};">S/ ${fmt(debt)}</div>
                    ${limit > 0 ? `
                    <div class="cp-mini-bar"><div class="cp-mini-bar-fill" style="width:${used}%;background:${color};"></div></div>
                    <div style="font-size:0.6rem;color:var(--muted);margin-top:1px;">S/ ${fmt(avail)} disponible</div>` : ''}
                </div>
            </div>`;
        });
    }

    if (html === '') html = '<div style="color:var(--muted);font-size:0.75rem;text-align:center;padding:1rem;">Sin cuentas registradas</div>';
    container.innerHTML = html;
}

function escHtml(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ─────────────────────────────────────────────────────────────
// 14. TABLA — BUILD ROWS
// ─────────────────────────────────────────────────────────────
function buildTableRows(expenses, incomes, creditPayments) {
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
            card:   e.cards?.name_card || '',
            cuotas: parseInt(e.installments) > 1
                ? `${e.installments}c · S/ ${e.installment_amt != null ? parseFloat(e.installment_amt).toFixed(2) : (parseFloat(e.amount_exp)/parseInt(e.installments)).toFixed(2)}/c`
                : null,
            excluded: e.exclude_from_balance,
            raw: e
        })),
        ...incomes.map(i => ({
            id:     i.id_income,
            date:   i.date_income,
            type:   'income',
            cat:    i.cards?.name_card || 'Ingreso',
            subcat: '',
            desc:   i.notes_income,
            amount: parseFloat(i.amount_income),
            method: null,
            card:   i.cards?.name_card || '',
            cuotas: null,
            excluded: false,
            raw: i
        })),
        ...creditPayments.map(p => ({
            id:     p.id_payment,
            date:   p.date_payment,
            type:   'credit_payment',
            cat:    p.cards?.name_card || 'Tarjeta',
            subcat: p.target_cycle ? (p.target_cycle === 'current' ? 'Ciclo actual' : 'Ciclo anterior') : '',
            desc:   p.notes || 'Pago de tarjeta',
            amount: parseFloat(p.amount_paid),
            method: 'Payment',
            card:   p.cards?.name_card || '',
            cuotas: null,
            excluded: false,
            raw: p
        }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    return rows;
}

// ─────────────────────────────────────────────────────────────
// 15. TABLA — RENDER FROM CACHE (tabs + search + sort + paginación)
// ─────────────────────────────────────────────────────────────
function renderTableFromCache() {
    let rows = [..._cachedRows];

    // Filtrar por tab
    if (_activeTab !== 'all') {
        if (_activeTab === 'credit') {
            rows = rows.filter(r => r.method === 'Credit' || r.type === 'credit_payment');
        } else {
            rows = rows.filter(r => r.type === _activeTab);
        }
    }

    // Búsqueda
    if (_searchQuery) {
        rows = rows.filter(r =>
            (r.desc   || '').toLowerCase().includes(_searchQuery) ||
            (r.cat    || '').toLowerCase().includes(_searchQuery) ||
            (r.subcat || '').toLowerCase().includes(_searchQuery) ||
            (r.card   || '').toLowerCase().includes(_searchQuery)
        );
    }

    // Sort
    rows.sort((a, b) => {
        let va = a[_sortField], vb = b[_sortField];
        if (_sortField === 'date')   { va = new Date(a.date); vb = new Date(b.date); }
        if (_sortField === 'amount') { va = a.amount; vb = b.amount; }
        if (_sortField === 'cat')    { va = a.cat.toLowerCase(); vb = b.cat.toLowerCase(); }
        const cmp = va > vb ? 1 : va < vb ? -1 : 0;
        return _sortDir === 'desc' ? -cmp : cmp;
    });

    // Actualizar tab counts
    const allCount    = _cachedRows.length;
    const expCount    = _cachedRows.filter(r => r.type === 'expense').length;
    const incCount    = _cachedRows.filter(r => r.type === 'income').length;
    const credCount   = _cachedRows.filter(r => r.method === 'Credit' || r.type === 'credit_payment').length;
    document.getElementById('tab-count-all')   && (document.getElementById('tab-count-all').innerText   = allCount);
    document.getElementById('tab-count-exp')   && (document.getElementById('tab-count-exp').innerText   = expCount);
    document.getElementById('tab-count-inc')   && (document.getElementById('tab-count-inc').innerText   = incCount);
    document.getElementById('tab-count-cred')  && (document.getElementById('tab-count-cred').innerText  = credCount);

    // Paginación
    const totalRows  = rows.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
    _currentPage     = Math.min(_currentPage, totalPages);
    const pageRows   = rows.slice((_currentPage - 1) * PAGE_SIZE, _currentPage * PAGE_SIZE);

    renderTable(pageRows, totalRows, totalPages);
}

function renderTable(rows, totalRows, totalPages) {
    const body     = document.getElementById('transactions-body');
    const countEl  = document.getElementById('transaction-count');
    const pagerEl  = document.getElementById('table-pager');

    if (countEl) countEl.innerText = `${totalRows} registros`;

    if (rows.length === 0) {
        body.innerHTML = `<tr><td colspan="7" style="padding:2.5rem;text-align:center;color:var(--muted);font-size:0.8rem;">No hay transacciones para este filtro</td></tr>`;
        if (pagerEl) pagerEl.innerHTML = '';
        return;
    }

    const methodLabel = { Cash: 'Efectivo', Debit: 'Débito', Credit: 'Crédito', Payment: 'Pago TC' };

    body.innerHTML = rows.map(t => {
        const typeClass = t.type === 'income' ? 'income' : t.type === 'credit_payment' ? 'payment' : t.method === 'Credit' ? 'credit-exp' : 'expense';
        const typeLabel = { income: 'Ingreso', expense: 'Gasto', credit_payment: 'Pago TC', 'credit-exp': 'Crédito' };
        const badgeClass = t.type === 'income' ? 'income' : t.type === 'credit_payment' ? 'credit-pay' : t.method === 'Credit' ? 'credit' : 'expense';

        return `
        <tr class="tx-row ${t.excluded ? 'excluded-row' : ''}" data-id="${t.id}" data-type="${t.type}">
            <td class="td-date">${t.date}</td>
            <td><span class="tx-badge ${badgeClass}">${t.type === 'income' ? 'Ingreso' : t.type === 'credit_payment' ? 'Pago TC' : t.method === 'Credit' ? 'Crédito' : 'Gasto'}</span></td>
            <td>
                <div style="font-size:0.78rem;font-weight:500;">${escHtml(t.cat)}</div>
                ${t.subcat ? `<div style="font-size:0.62rem;color:var(--muted);">${escHtml(t.subcat)}</div>` : ''}
            </td>
            <td class="td-desc">
                <div style="font-size:0.78rem;">${escHtml(t.desc) || '—'}</div>
                ${t.cuotas ? `<div style="font-size:0.62rem;color:var(--gold);margin-top:1px;">📅 ${t.cuotas}</div>` : ''}
                ${t.card ? `<div style="font-size:0.62rem;color:var(--muted);">${escHtml(t.card)}</div>` : ''}
                ${t.excluded ? `<span style="font-size:0.58rem;background:var(--cream2);padding:1px 5px;border-radius:4px;color:var(--muted);">excluido</span>` : ''}
            </td>
            <td class="td-method">${t.method ? `<span class="method-tag ${(t.method||'').toLowerCase()}">${methodLabel[t.method] || t.method}</span>` : '—'}</td>
            <td class="amount-cell ${t.type === 'income' ? 'income' : t.type === 'credit_payment' ? 'payment-amt' : 'expense'}">
                ${t.type === 'income' ? '+' : t.type === 'credit_payment' ? '↩' : '−'} S/ ${t.amount.toFixed(2)}
            </td>
            <td class="actions-cell">
                ${t.type !== 'credit_payment' ? `
                <button class="btn-edit-tx" data-id="${t.id}" data-type="${t.type}" title="Editar">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>` : ''}
                <button class="btn-del-tx" data-id="${t.id}" data-type="${t.type}" title="Eliminar">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                </button>
            </td>
        </tr>`;
    }).join('');

    // Eventos tabla
    body.querySelectorAll('.btn-edit-tx').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const row = _cachedRows.find(r => r.id === btn.dataset.id);
            if (row) openDrawer(row.raw, btn.dataset.type);
        });
    });
    body.querySelectorAll('.btn-del-tx').forEach(btn => {
        btn.addEventListener('click', async e => {
            e.stopPropagation();
            await deleteTransaction(btn.dataset.id, btn.dataset.type);
        });
    });

    // Paginador
    if (pagerEl) {
        if (totalPages <= 1) { pagerEl.innerHTML = ''; return; }
        pagerEl.innerHTML = `
            <button class="pager-btn" onclick="changePage(${_currentPage - 1})" ${_currentPage === 1 ? 'disabled' : ''}>←</button>
            <span class="pager-info">Página ${_currentPage} de ${totalPages}</span>
            <button class="pager-btn" onclick="changePage(${_currentPage + 1})" ${_currentPage === totalPages ? 'disabled' : ''}>→</button>
        `;
    }
}

window.changePage = function(page) {
    _currentPage = page;
    renderTableFromCache();
};

// ─────────────────────────────────────────────────────────────
// 16. GRÁFICO DE BARRAS
// ─────────────────────────────────────────────────────────────
function renderBarChart(expenses, incomes, dateRange, filters) {
    if (barChart) barChart.destroy();

    let labels = [], incData = [];
    const hasMonth = !!filters.month;

    if (!hasMonth) {
        const incMap = {}, expRealMap = {}, expCreditMap = {};
        incomes.forEach(i => {
            const key = i.date_income?.substring(0, 7);
            if (key) incMap[key] = (incMap[key] || 0) + parseFloat(i.amount_income);
        });
        expenses.forEach(e => {
            const key = e.date_exp?.substring(0, 7);
            if (!key) return;
            if (e.payment_method === 'Credit') expCreditMap[key] = (expCreditMap[key] || 0) + parseFloat(e.amount_exp);
            else expRealMap[key] = (expRealMap[key] || 0) + parseFloat(e.amount_exp);
        });
        const allKeys = Array.from(new Set([...Object.keys(incMap), ...Object.keys(expRealMap), ...Object.keys(expCreditMap)])).sort();
        const mn = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
        labels  = allKeys.map(k => { const [y, m] = k.split('-'); return `${mn[parseInt(m)-1]} ${y}`; });
        incData = allKeys.map(k => incMap[k] || 0);
        const expRealData   = allKeys.map(k => expRealMap[k]   || 0);
        const expCreditData = allKeys.map(k => expCreditMap[k] || 0);

        document.getElementById('bar-chart-label').innerText = 'Por mes';
        if (labels.length === 0) { document.getElementById('bar-chart-label').innerText = 'Sin datos'; return; }

        barChart = new Chart(document.getElementById('barChart'), {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    { label: 'Ingresos',       data: incData,       backgroundColor: 'rgba(122,140,112,0.8)',  borderColor: '#7a8c70', borderWidth: 0, borderRadius: 6 },
                    { label: 'Gastos Reales',  data: expRealData,   backgroundColor: 'rgba(192,92,58,0.8)',   borderColor: '#c05c3a', borderWidth: 0, borderRadius: 6 },
                    { label: 'Gastos TC',      data: expCreditData, backgroundColor: 'rgba(201,168,76,0.65)', borderColor: '#c9a84c', borderWidth: 0, borderRadius: 6 }
                ]
            },
            options: getBarOptions()
        });
    } else {
        const getWeek = (d) => { const day = parseInt(d.substring(8,10)); return day<=7?'Sem 1':day<=14?'Sem 2':day<=21?'Sem 3':'Sem 4+'; };
        const weekOrder = ['Sem 1','Sem 2','Sem 3','Sem 4+'];
        const incMap = {}, expRealMap = {}, expCreditMap = {};
        incomes.forEach(i => { if (i.date_income) { const k = getWeek(i.date_income); incMap[k] = (incMap[k]||0) + parseFloat(i.amount_income); }});
        expenses.forEach(e => {
            if (!e.date_exp) return;
            const k = getWeek(e.date_exp);
            if (e.payment_method === 'Credit') expCreditMap[k] = (expCreditMap[k]||0) + parseFloat(e.amount_exp);
            else expRealMap[k] = (expRealMap[k]||0) + parseFloat(e.amount_exp);
        });
        labels = weekOrder;
        document.getElementById('bar-chart-label').innerText = 'Por semana';

        barChart = new Chart(document.getElementById('barChart'), {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    { label: 'Ingresos',      data: weekOrder.map(k => incMap[k]||0),        backgroundColor: 'rgba(122,140,112,0.8)',  borderColor: '#7a8c70', borderWidth: 0, borderRadius: 6 },
                    { label: 'Gastos Reales', data: weekOrder.map(k => expRealMap[k]||0),    backgroundColor: 'rgba(192,92,58,0.8)',   borderColor: '#c05c3a', borderWidth: 0, borderRadius: 6 },
                    { label: 'Gastos TC',     data: weekOrder.map(k => expCreditMap[k]||0),  backgroundColor: 'rgba(201,168,76,0.65)', borderColor: '#c9a84c', borderWidth: 0, borderRadius: 6 }
                ]
            },
            options: getBarOptions()
        });
    }
}

function getBarOptions() {
    return {
        responsive: true,
        maintainAspectRatio: true,
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: { position: 'top', labels: { font: { family: 'DM Sans', size: 11 }, boxWidth: 10, padding: 16, usePointStyle: true } },
            tooltip: { callbacks: { label: ctx => ` S/ ${parseFloat(ctx.raw).toLocaleString('es-PE', { minimumFractionDigits: 2 })}` } }
        },
        scales: {
            x: { grid: { display: false }, ticks: { font: { family: 'DM Sans', size: 10 } } },
            y: { grid: { color: 'rgba(15,14,13,0.04)' }, ticks: { font: { family: 'DM Sans', size: 10 }, callback: v => `S/ ${v.toLocaleString('es-PE')}` } }
        }
    };
}

// ─────────────────────────────────────────────────────────────
// 17. GRÁFICOS DONA
// ─────────────────────────────────────────────────────────────
function makeDoughnut(canvasId, labels, values, colors) {
    const total = values.reduce((s, v) => s + v, 0);
    return new Chart(document.getElementById(canvasId), {
        type: 'doughnut',
        data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 2, borderColor: 'white', hoverOffset: 4 }] },
        options: {
            cutout: '70%',
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => ` S/ ${parseFloat(ctx.raw).toFixed(2)} (${(ctx.raw/total*100).toFixed(1)}%)` } }
            }
        }
    });
}

function makeLegend(containerId, labels, values, colors) {
    const total = values.reduce((s, v) => s + v, 0);
    const legendEl = document.getElementById(containerId);
    if (!legendEl) return;
    if (labels.length === 0) { legendEl.innerHTML = '<div class="legend-empty">Sin datos</div>'; return; }

    // Sort descending
    const sorted = labels.map((l, i) => ({ l, v: values[i], c: colors[i % colors.length] }))
                         .sort((a, b) => b.v - a.v);

    legendEl.innerHTML = sorted.map(item => `
        <div class="legend-item">
            <div class="legend-left">
                <span class="legend-dot" style="background:${item.c}"></span>
                <span class="legend-name">${item.l}</span>
                <span class="legend-pct">${(item.v/total*100).toFixed(0)}%</span>
            </div>
            <span class="legend-val">S/ ${item.v.toFixed(2)}</span>
        </div>`).join('');
}

function renderPieChart(expenses) {
    if (pieChart) pieChart.destroy();
    const map = {};
    expenses.forEach(e => { const k = e.categories?.name_cat || 'Sin categoría'; map[k] = (map[k]||0) + parseFloat(e.amount_exp); });
    const labels = Object.keys(map), values = Object.values(map);
    if (labels.length === 0) { makeLegend('pie-legend', [], [], []); return; }
    pieChart = makeDoughnut('pieChart', labels, values, palette);
    makeLegend('pie-legend', labels, values, palette);
}

function renderSubPieChart(expenses) {
    if (subPieChart) subPieChart.destroy();
    const map = {};
    expenses.forEach(e => { const k = e.subcategories?.name_subcat || 'Sin subcategoría'; map[k] = (map[k]||0) + parseFloat(e.amount_exp); });
    const labels = Object.keys(map), values = Object.values(map);
    if (labels.length === 0) { makeLegend('subpie-legend', [], [], []); return; }
    const rev = [...palette].reverse();
    subPieChart = makeDoughnut('subPieChart', labels, values, rev);
    makeLegend('subpie-legend', labels, values, rev);
}

function renderMethodChart(expenses) {
    if (methodChart) methodChart.destroy();
    const methodLabel  = { Cash: 'Efectivo', Debit: 'Débito', Credit: 'Crédito' };
    const methodColors = { Cash: '#7a8c70', Debit: '#5e7a8c', Credit: '#c9a84c' };
    const map = {};
    expenses.forEach(e => { const k = e.payment_method || 'Otro'; map[k] = (map[k]||0) + parseFloat(e.amount_exp); });
    const labels = Object.keys(map), values = Object.values(map);
    const colors = labels.map(l => methodColors[l] || '#8c6b5e');
    if (labels.length === 0) { makeLegend('method-legend', [], [], []); return; }
    methodChart = makeDoughnut('methodChart', labels.map(l => methodLabel[l]||l), values, colors);
    makeLegend('method-legend', labels.map(l => methodLabel[l]||l), values, colors);
}

// ─────────────────────────────────────────────────────────────
// 18. CUOTAS
// ─────────────────────────────────────────────────────────────
function renderInstallments(list, totalCuotas) {
    const container = document.getElementById('installments-container');
    const totalEl   = document.getElementById('quot-total-label');
    if (totalEl) totalEl.innerText = `S/ ${totalCuotas.toFixed(2)} total`;

    if (!container) return;

    if (list.length === 0) {
        container.innerHTML = '<div class="trend-empty">Sin cuotas en este periodo</div>';
        return;
    }

    container.innerHTML = list.map(e => {
        const totalQ = parseInt(e.installments);
        const cuota  = e.installment_amt != null ? parseFloat(e.installment_amt) : parseFloat(e.amount_exp) / totalQ;
        return `
        <div class="installment-row">
            <div>
                <div class="inst-name">${e.description_exp}</div>
                <div class="inst-sub">${e.cards?.name_card || 'TC'} · ${totalQ} cuotas · Total S/ ${parseFloat(e.amount_exp).toFixed(2)}</div>
            </div>
            <div class="inst-amt">S/ ${cuota.toFixed(2)}<span style="font-weight:400;font-size:0.6rem;color:var(--muted);">/c</span></div>
        </div>`;
    }).join('');
}

// ─────────────────────────────────────────────────────────────
// 19. PRESUPUESTO VS REAL
// ─────────────────────────────────────────────────────────────
function renderBudgetBars(budgets, expenses, filters) {
    const container = document.getElementById('budget-bars-container');
    const labelEl   = document.getElementById('budget-period-label');

    if (!container) return;

    if (!filters.month || !filters.year || budgets.length === 0) {
        container.innerHTML = '<div class="trend-empty">Selecciona un mes para ver el presupuesto</div>';
        if (labelEl) labelEl.innerText = '—';
        return;
    }

    const mn = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    if (labelEl) labelEl.innerText = `${mn[parseInt(filters.month)-1]} ${filters.year}`;

    const realByCat = {};
    expenses.forEach(e => { realByCat[e.id_category] = (realByCat[e.id_category]||0) + parseFloat(e.amount_exp); });

    container.innerHTML = budgets.map(b => {
        const presup = parseFloat(b.total_budget);
        const real   = realByCat[b.id_category] || 0;
        const pct    = presup > 0 ? Math.min((real / presup) * 100, 100) : 0;
        const over   = real > presup;
        const color  = over ? 'var(--rust)' : pct > 80 ? 'var(--gold)' : 'var(--sage)';
        const catName = b.categories?.name_cat || b.name_budget || 'Categoría';

        return `
        <div class="budget-item">
            <div class="budget-item-header">
                <span style="font-weight:500;">${catName}</span>
                <span style="color:${over?'var(--rust)':'var(--muted)'};">
                    S/ ${real.toFixed(2)} <span style="opacity:0.5;">/</span> S/ ${presup.toFixed(2)}
                    ${over ? ' ⚠️' : ''}
                </span>
            </div>
            <div class="budget-bar-track">
                <div class="budget-bar-fill" style="width:${pct}%;background:${color};"></div>
            </div>
        </div>`;
    }).join('');
}

// ─────────────────────────────────────────────────────────────
// 20. CRUD — DRAWER
// ─────────────────────────────────────────────────────────────
function initDrawer() {
    document.getElementById('drawer-overlay')?.addEventListener('click', closeDrawer);
    document.getElementById('drawer-close')?.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });

    document.getElementById('d-method')?.addEventListener('change', e => {
        const method = e.target.value;
        const cardRow = document.getElementById('d-card-row');
        const instRow = document.getElementById('d-inst-row');
        if (cardRow) cardRow.style.display = (method === 'Debit' || method === 'Credit') ? 'block' : 'none';
        if (instRow) instRow.style.display = method === 'Credit' ? 'block' : 'none';
        if (method !== 'Credit') {
            const di = document.getElementById('d-installments');
            const da = document.getElementById('d-inst-amt');
            if (di) di.value = 1;
            if (da) da.value = '';
        }
        populateDrawerCards(method);
    });

    document.getElementById('d-cat')?.addEventListener('change', async e => {
        await populateDrawerSubcats(e.target.value);
    });

    document.getElementById('drawer-form')?.addEventListener('submit', async e => {
        e.preventDefault();
        await saveDrawer();
    });
}

async function openDrawer(raw, type) {
    const drawer  = document.getElementById('crud-drawer');
    const overlay = document.getElementById('drawer-overlay');
    const title   = document.getElementById('drawer-title');

    document.getElementById('d-id').value   = type === 'expense' ? raw.id_exp : raw.id_income;
    document.getElementById('d-type').value = type;

    if (type === 'expense') {
        title.textContent = 'Editar Gasto';
        document.getElementById('d-amount').value = parseFloat(raw.amount_exp).toFixed(2);
        document.getElementById('d-date').value   = raw.date_exp;
        document.getElementById('d-desc').value   = raw.description_exp || '';
        document.getElementById('d-method').value = raw.payment_method || 'Cash';

        const method = raw.payment_method;
        document.getElementById('d-card-row').style.display = (method === 'Debit' || method === 'Credit') ? 'block' : 'none';
        document.getElementById('d-inst-row').style.display = method === 'Credit' ? 'block' : 'none';

        populateDrawerCats(raw.id_category);
        await populateDrawerSubcats(raw.id_category, raw.id_subcat);
        populateDrawerCards(method, raw.id_card);

        document.getElementById('d-installments').value = raw.installments || 1;
        document.getElementById('d-inst-amt').value     = raw.installment_amt != null ? parseFloat(raw.installment_amt).toFixed(2) : '';

        document.getElementById('d-income-only').style.display  = 'none';
        document.getElementById('d-expense-only').style.display = 'block';

    } else {
        title.textContent = 'Editar Ingreso';
        document.getElementById('d-amount').value = parseFloat(raw.amount_income || 0).toFixed(2);
        document.getElementById('d-date').value   = raw.date_income || '';
        document.getElementById('d-desc').value   = raw.notes_income || '';
        document.getElementById('d-method').value = 'Cash';

        document.getElementById('d-card-row').style.display  = 'none';
        document.getElementById('d-inst-row').style.display  = 'none';
        document.getElementById('d-income-only').style.display   = 'block';
        document.getElementById('d-expense-only').style.display  = 'none';
    }

    overlay.classList.add('visible');
    drawer.classList.add('open');
}

function closeDrawer() {
    document.getElementById('crud-drawer')?.classList.remove('open');
    document.getElementById('drawer-overlay')?.classList.remove('visible');
}

function populateDrawerCats(selectedId = null) {
    const sel = document.getElementById('d-cat');
    if (!sel) return;
    sel.innerHTML = '<option value="">Sin categoría</option>';
    _allCats.filter(c => c.type_cat === 'gasto' || !c.type_cat).forEach(c => {
        const opt = new Option(c.name_cat, c.id_cat);
        if (c.id_cat === selectedId) opt.selected = true;
        sel.add(opt);
    });
}

async function populateDrawerSubcats(catId, selectedId = null) {
    const sel = document.getElementById('d-subcat');
    if (!sel) return;
    sel.innerHTML = '<option value="">Sin subcategoría</option>';
    if (!catId) return;

    if (!_allSubcats[catId]) {
        const { data } = await supabase.from('subcategories')
            .select('id_subcat, name_subcat')
            .eq('id_category', catId).eq('deleted_subcat', false)
            .order('name_subcat', { ascending: true });
        _allSubcats[catId] = data || [];
    }
    _allSubcats[catId].forEach(s => {
        const opt = new Option(s.name_subcat, s.id_subcat);
        if (s.id_subcat === selectedId) opt.selected = true;
        sel.add(opt);
    });
}

function populateDrawerCards(method, selectedId = null) {
    const sel = document.getElementById('d-card');
    if (!sel) return;
    sel.innerHTML = '<option value="">Sin tarjeta</option>';
    const typeFilter = method === 'Debit' ? 'Debit' : method === 'Cash' ? 'Cash' : 'Credit';
    const filtered   = method === 'Debit' ? _allCards.filter(c => c.type_card === 'Debit') :
                       method === 'Credit' ? _allCards.filter(c => c.type_card === 'Credit') :
                       _allCards.filter(c => c.type_card === 'Cash');
    filtered.forEach(c => {
        const opt = new Option(c.name_card, c.id_card);
        if (c.id_card === selectedId) opt.selected = true;
        sel.add(opt);
    });
}

function toNumber(value) {
    return Number.parseFloat(value || 0) || 0;
}

async function adjustCardBalance(cardId, delta) {
    if (!cardId || !delta) return;

    const card = _allCards.find(c => c.id_card === cardId);
    const currentBalance = toNumber(card?.current_balance);
    const newBalance = currentBalance + delta;

    const { error } = await supabase
        .from('cards')
        .update({ current_balance: newBalance })
        .eq('id_card', cardId);

    if (error) throw error;
    if (card) card.current_balance = newBalance;
}

function getExpenseBalanceDelta(expense) {
    if (!expense || expense.exclude_from_balance || expense.deleted_exp) return 0;
    const amount = toNumber(expense.amount_exp);
    if (expense.payment_method === 'Credit') return amount;
    if (expense.payment_method === 'Cash' || expense.payment_method === 'Debit') return -amount;
    return 0;
}

function getIncomeBalanceDelta(income) {
    if (!income) return 0;
    return toNumber(income.amount_income);
}

function getCreditPaymentBalanceDeltas(payment) {
    if (!payment) return [];
    const amount = toNumber(payment.amount_paid);
    const deltas = [];
    if (payment.id_card) deltas.push({ cardId: payment.id_card, delta: amount });
    if (payment.source_account) deltas.push({ cardId: payment.source_account, delta: amount });
    return deltas;
}

function getCurrentDrawerRow(type, id) {
    if (_currentDrawerRaw && _currentDrawerType === type) return _currentDrawerRaw;
    return _cachedRows.find(r => r.id === id && r.type === type)?.raw || null;
}

async function saveDrawer() {
    const id   = document.getElementById('d-id').value;
    const type = document.getElementById('d-type').value;
    const btn  = document.getElementById('drawer-save-btn');
    const previousRaw = getCurrentDrawerRow(type, id);

    btn.disabled    = true;
    btn.textContent = 'Guardando…';

    try {
        if (type === 'expense') {
            const method      = document.getElementById('d-method').value;
            const totalAmount = parseFloat(document.getElementById('d-amount').value);
            const installments = parseInt(document.getElementById('d-installments').value) || 1;
            const instAmt      = parseFloat(document.getElementById('d-inst-amt').value);
            const installmentAmt = installments > 1 && !isNaN(instAmt) && instAmt > 0 ? instAmt : null;
            const nextExpense = {
                amount_exp: totalAmount,
                payment_method: method,
                id_card: document.getElementById('d-card').value || null,
                exclude_from_balance: false,
            };

            if (previousRaw) {
                await adjustCardBalance(previousRaw.id_card, -getExpenseBalanceDelta(previousRaw));
            }

            const { error } = await supabase.from('expenses').update({
                amount_exp:      totalAmount,
                date_exp:        document.getElementById('d-date').value,
                description_exp: document.getElementById('d-desc').value.trim() || 'Sin descripción',
                payment_method:  method,
                id_category:     document.getElementById('d-cat').value   || null,
                id_subcat:       document.getElementById('d-subcat').value || null,
                id_card:         nextExpense.id_card,
                installments,
                installment_amt: installmentAmt
            }).eq('id_exp', id);
            if (error) throw error;

            const updatedExpense = {
                ...previousRaw,
                ...nextExpense,
                amount_exp: totalAmount,
                installments,
                installment_amt: installmentAmt,
            };
            await adjustCardBalance(updatedExpense.id_card, getExpenseBalanceDelta(updatedExpense));

        } else {
            const previousIncome = previousRaw;
            if (previousIncome) {
                await adjustCardBalance(previousIncome.id_card, -getIncomeBalanceDelta(previousIncome));
            }

            const { error } = await supabase.from('monthly_incomes').update({
                amount_income: parseFloat(document.getElementById('d-amount').value),
                date_income:   document.getElementById('d-date').value,
                notes_income:  document.getElementById('d-desc').value.trim() || null
            }).eq('id_income', id);
            if (error) throw error;

            const updatedIncome = {
                ...previousIncome,
                amount_income: parseFloat(document.getElementById('d-amount').value),
            };
            await adjustCardBalance(updatedIncome.id_card, getIncomeBalanceDelta(updatedIncome));
        }

        closeDrawer();
        showToast('✓ Guardado correctamente', 'success');
        if (_reloadCallback) await _reloadCallback();

    } catch (err) {
        console.error('[drawer]', err.message);
        showToast('Error: ' + err.message, 'error');
    } finally {
        btn.disabled    = false;
        btn.textContent = 'Guardar cambios';
    }
}

async function deleteTransaction(id, type) {
    const label = type === 'expense' ? 'este gasto' : type === 'credit_payment' ? 'este pago' : 'este ingreso';
    if (!confirm(`¿Eliminar ${label}? Esta acción no se puede deshacer.`)) return;

    try {
        const raw = _cachedRows.find(r => r.id === id && r.type === type)?.raw || null;
        let error;
        if (type === 'expense') {
            if (raw) {
                await adjustCardBalance(raw.id_card, -getExpenseBalanceDelta(raw));
            }
            ({ error } = await supabase.from('expenses').update({ deleted_exp: true }).eq('id_exp', id));
        } else if (type === 'credit_payment') {
            if (raw) {
                for (const entry of getCreditPaymentBalanceDeltas(raw)) {
                    await adjustCardBalance(entry.cardId, entry.delta);
                }

                // Al registrar pago también se crea un gasto espejo (exclude_from_balance=true)
                // enlazado por id_credit_payment. Usamos esa referencia para borrado exacto.
                const { error: mirrorErr } = await supabase
                    .from('expenses')
                    .update({ deleted_exp: true })
                    .eq('id_credit_payment', raw.id_payment)
                    .eq('deleted_exp', false);

                if (mirrorErr) throw mirrorErr;

                // Fallback para registros antiguos sin id_credit_payment.
                const { error: legacyMirrorErr } = await supabase
                    .from('expenses')
                    .update({ deleted_exp: true })
                    .eq('id_user', raw.id_user)
                    .eq('date_exp', raw.date_payment)
                    .eq('id_card', raw.source_account)
                    .eq('exclude_from_balance', true)
                    .eq('deleted_exp', false)
                    .eq('amount_exp', raw.amount_paid)
                    .is('id_credit_payment', null);

                if (legacyMirrorErr) throw legacyMirrorErr;
            }
            ({ error } = await supabase.from('credit_card_payments').delete().eq('id_payment', id));
        } else {
            if (raw) {
                await adjustCardBalance(raw.id_card, -getIncomeBalanceDelta(raw));
            }
            ({ error } = await supabase.from('monthly_incomes').delete().eq('id_income', id));
        }
        if (error) throw error;
        showToast('🗑 Eliminado correctamente', 'success');
        if (_reloadCallback) await _reloadCallback();
    } catch (err) {
        console.error('[delete]', err.message);
        showToast('Error: ' + err.message, 'error');
    }
}

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
    setTimeout(() => toast.classList.remove('show'), 3200);
}

init();