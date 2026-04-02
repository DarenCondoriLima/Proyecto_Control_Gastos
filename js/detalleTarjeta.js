/**
 * detalleTarjeta.js
 * Detalle de gastos por tarjeta — ControlGastos
 *
 * Correcciones:
 *  - Nombres de columnas correctos: installments, installment_amt (no installments_total/paid)
 *  - Visualización clara de cuotas con monto por cuota
 *
 * Funciones nuevas:
 *  - Hero card con info de límite, disponible y barra de uso
 *  - Stats resumen (total, promedio, conteo, cuotas)
 *  - Filtros por mes, categoría y tipo (cuotas / directo)
 *  - Animaciones de carga con skeleton
 *  - Toast de error amigable
 */

import { supabase } from './supabase.js';

// ─── Estado global ────────────────────────────────────────────────────────────
let allExpenses = [];
let currentCard = null;

// ─── Utilidades ───────────────────────────────────────────────────────────────
const fmt = (n) => `S/ ${parseFloat(n || 0).toFixed(2)}`;
const fmtDate = (d) => {
    const date = new Date(d + 'T00:00:00'); // evitar desfase de zona horaria
    return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
};

function showToast(msg, type = 'error') {
    const t = document.createElement('div');
    t.className = 'toast';
    t.style.background = type === 'error' ? 'var(--rust)' : 'var(--green)';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
}

function showSkeletonRows(n = 5) {
    const list = document.getElementById('expenses-list');
    list.innerHTML = Array.from({ length: n }, () => `
        <tr>
            <td><div class="skeleton" style="height:14px;width:80px;"></div></td>
            <td><div class="skeleton" style="height:14px;width:160px;"></div></td>
            <td><div class="skeleton" style="height:22px;width:90px;border-radius:20px;"></div></td>
            <td><div class="skeleton" style="height:22px;width:100px;border-radius:20px;"></div></td>
            <td style="text-align:right;"><div class="skeleton" style="height:14px;width:70px;margin-left:auto;"></div></td>
        </tr>
    `).join('');
}

// ─── Renderizar hero card ─────────────────────────────────────────────────────
function renderHeroCard(card, expenses) {
    currentCard = card;

    document.getElementById('hero-card-name').textContent = card.name_card;
    document.getElementById('hero-card-currency').textContent = card.currency || 'PEN';
    document.getElementById('hero-card-type').textContent =
        card.type_card === 'Credit' ? 'Crédito' : 'Débito';

    // Gastos del mes actual
    const now = new Date();
    const thisMonth = expenses.filter(e => {
        const d = new Date(e.date_exp + 'T00:00:00');
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const monthTotal = thisMonth.reduce((s, e) => s + parseFloat(e.amount_exp || 0), 0);
    document.getElementById('hero-month-total').textContent = fmt(monthTotal);
    document.getElementById('hero-month-count').textContent =
        `${thisMonth.length} transacción${thisMonth.length !== 1 ? 'es' : ''}`;

    // Solo para crédito: cuotas activas, límite, fechas
    if (card.type_card === 'Credit') {
        // Cuotas en curso (gastos con más de 1 cuota)
        const installmentExpenses = expenses.filter(e => parseInt(e.installments || 1) > 1);
        const installmentTotal = installmentExpenses.reduce(
            (s, e) => s + parseFloat(e.amount_exp || 0), 0
        );
        document.getElementById('hero-installments-wrap').style.display = 'flex';
        document.getElementById('hero-installments-count').textContent = installmentExpenses.length;
        document.getElementById('hero-installments-total').textContent =
            `Total: ${fmt(installmentTotal)}`;

        // Límite y disponible
        if (card.limit_card) {
            const used = monthTotal;
            const available = parseFloat(card.limit_card) - used;
            const pct = Math.min(100, (used / parseFloat(card.limit_card)) * 100);

            document.getElementById('hero-limit-wrap').style.display = 'flex';
            document.getElementById('hero-available').textContent = fmt(Math.max(0, available));
            document.getElementById('hero-limit-text').textContent =
                `Límite: ${fmt(card.limit_card)}`;

            const bar = document.getElementById('hero-credit-bar');
            bar.style.width = pct + '%';
            if (pct > 80) bar.classList.add('danger');
        }

        // Días de corte y pago
        if (card.cutoff_day || card.due_day) {
            document.getElementById('hero-cutoff-wrap').style.display = 'flex';
            const now = new Date();
            const cutoffDate = card.cutoff_day
                ? new Date(now.getFullYear(), now.getMonth(), card.cutoff_day)
                : null;
            const daysToCorte = cutoffDate
                ? Math.ceil((cutoffDate - now) / (1000 * 60 * 60 * 24))
                : null;

            document.getElementById('hero-cutoff-days').textContent =
                daysToCorte !== null ? `${daysToCorte} días` : '—';
            document.getElementById('hero-cutoff-text').textContent =
                `Corte día ${card.cutoff_day || '—'} / Pago día ${card.due_day || '—'}`;
        }
    }
}

// ─── Renderizar stats resumen ─────────────────────────────────────────────────
function renderStats(expenses) {
    const total = expenses.reduce((s, e) => s + parseFloat(e.amount_exp || 0), 0);
    const count = expenses.length;
    const avg = count ? total / count : 0;
    const installmentExps = expenses.filter(e => parseInt(e.installments || 1) > 1);
    const installmentTotal = installmentExps.reduce(
        (s, e) => s + parseFloat(e.amount_exp || 0), 0
    );

    document.getElementById('stat-total').textContent = fmt(total);
    document.getElementById('stat-count').textContent = count;
    document.getElementById('stat-avg').textContent = fmt(avg);
    document.getElementById('stat-installments').textContent = installmentExps.length;
    document.getElementById('stat-installments-sub').textContent =
        `${fmt(installmentTotal)} en cuotas`;
}

// ─── Llenar filtro de categorías ─────────────────────────────────────────────
function populateCategoryFilter(expenses) {
    const cats = [...new Map(
        expenses
            .filter(e => e.categories?.name_cat)
            .map(e => [e.id_category, e.categories.name_cat])
    ).entries()];

    const sel = document.getElementById('filter-category');
    cats.forEach(([id, name]) => {
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = name;
        sel.appendChild(opt);
    });
}

// ─── Aplicar filtros ──────────────────────────────────────────────────────────
function getFilteredExpenses() {
    const month = document.getElementById('filter-month').value;     // "YYYY-MM"
    const catId = document.getElementById('filter-category').value;
    const type  = document.getElementById('filter-type').value;

    return allExpenses.filter(e => {
        if (month) {
            const d = new Date(e.date_exp + 'T00:00:00');
            const expMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (expMonth !== month) return false;
        }
        if (catId && e.id_category !== catId) return false;
        if (type === 'installment' && parseInt(e.installments || 1) <= 1) return false;
        if (type === 'direct'      && parseInt(e.installments || 1) > 1)  return false;
        return true;
    });
}

function applyFilters() {
    const filtered = getFilteredExpenses();
    renderExpenses(filtered);
    renderStats(filtered);
    document.getElementById('expenses-count-label').textContent =
        `${filtered.length} registro${filtered.length !== 1 ? 's' : ''}`;

    // Indicar período en stat
    const month = document.getElementById('filter-month').value;
    document.getElementById('stat-period').textContent = month
        ? new Date(month + '-01').toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })
        : 'Todos los registros';
}

// ─── Renderizar tabla ─────────────────────────────────────────────────────────
function renderExpenses(expenses) {
    const list = document.getElementById('expenses-list');

    if (!expenses || expenses.length === 0) {
        list.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="empty-state">
                        <div class="empty-state-icon">🧾</div>
                        <h3>Sin movimientos</h3>
                        <p>No hay gastos que coincidan con los filtros seleccionados.</p>
                    </div>
                </td>
            </tr>`;
        return;
    }

    list.innerHTML = expenses.map((e, i) => {
        const installments = parseInt(e.installments || 1);
        const installmentAmt = parseFloat(e.installment_amt || 0);

        // ── Badge de cuotas ──────────────────────────────────────────
        let installmentCell;
        if (installments > 1 && installmentAmt > 0) {
            installmentCell = `
                <div class="installment-badge">
                    <span class="installment-tag">
                        ${installments} cuotas
                    </span>
                    <span class="installment-per">${fmt(installmentAmt)} / cuota</span>
                </div>`;
        } else if (installments > 1) {
            // Calculamos la cuota si no viene en DB
            const calcAmt = parseFloat(e.amount_exp || 0) / installments;
            installmentCell = `
                <div class="installment-badge">
                    <span class="installment-tag">
                        ${installments} cuotas
                    </span>
                    <span class="installment-per">${fmt(calcAmt)} / cuota (aprox.)</span>
                </div>`;
        } else {
            installmentCell = `<span class="installment-tag single">Directo</span>`;
        }

        return `
        <tr style="animation-delay: ${i * 0.04}s">
            <td>
                <span class="expense-date">${fmtDate(e.date_exp)}</span>
            </td>
            <td>
                <div class="expense-desc">${e.description_exp || 'Sin descripción'}</div>
            </td>
            <td>
                <span class="category-badge">
                    ${e.categories?.name_cat || 'Sin categoría'}
                </span>
            </td>
            <td>${installmentCell}</td>
            <td>
                <span class="amount-cell">${fmt(e.amount_exp)}</span>
            </td>
        </tr>`;
    }).join('');
}

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
    // Autenticación
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return (window.location.href = 'login.html');

    // Parámetro de URL
    const urlParams = new URLSearchParams(window.location.search);
    const cardId = urlParams.get('id');
    if (!cardId) return (window.location.href = 'gestionTarjetas.html');

    // Skeleton de carga
    showSkeletonRows(6);

    // 1. Información de la tarjeta
    const { data: card, error: cardError } = await supabase
        .from('cards')
        .select('name_card, type_card, currency, limit_card, cutoff_day, due_day')
        .eq('id_card', cardId)
        .eq('deleted_card', false)
        .single();

    if (cardError || !card) {
        showToast('No se pudo cargar la tarjeta.');
        return;
    }

    // Título de página
    document.getElementById('card-name-title').innerHTML =
        `Gastos de <span>${card.name_card}</span>`;
    document.title = `${card.name_card} — ControlGastos`;

    // 2. Gastos de esta tarjeta
    // IMPORTANTE: columnas correctas según el schema → installments, installment_amt
    const { data: expenses, error: expError } = await supabase
        .from('expenses')
        .select(`
            id_exp,
            id_category,
            amount_exp,
            date_exp,
            description_exp,
            installments,
            installment_amt,
            payment_method,
            categories ( name_cat )
        `)
        .eq('id_card', cardId)
        .eq('deleted_exp', false)
        .order('date_exp', { ascending: false });

    if (expError) {
        showToast('Error al obtener los gastos: ' + expError.message);
        return;
    }

    allExpenses = expenses || [];

    // Renderizar todo
    renderHeroCard(card, allExpenses);
    populateCategoryFilter(allExpenses);
    renderStats(allExpenses);
    renderExpenses(allExpenses);

    document.getElementById('expenses-count-label').textContent =
        `${allExpenses.length} registro${allExpenses.length !== 1 ? 's' : ''}`;

    // 3. Listeners de filtros
    document.getElementById('filter-month').addEventListener('change', applyFilters);
    document.getElementById('filter-category').addEventListener('change', applyFilters);
    document.getElementById('filter-type').addEventListener('change', applyFilters);

    document.getElementById('btn-clear-filter').addEventListener('click', () => {
        document.getElementById('filter-month').value = '';
        document.getElementById('filter-category').value = '';
        document.getElementById('filter-type').value = '';
        applyFilters();
    });
}

init();