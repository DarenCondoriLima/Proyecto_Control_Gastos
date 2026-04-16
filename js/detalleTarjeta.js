/**
 * detalleTarjeta.js — ControlGastos v4
 *
 * MEJORAS v4 vs v3:
 * ─────────────────
 * CICLOS:
 * 1. getBillingCycle() corregido: si la compra se hizo DESPUÉS del cutoff,
 *    pertenece al ciclo del MES SIGUIENTE (startDay ahora siempre es cutoffDay+1
 *    del mes anterior, sin clamp incorrecto).
 *
 * 2. getInstallmentInCycle() reescrito: calcula correctamente el mes de
 *    corte de cada cuota basándose en el ciclo de la compra original,
 *    no en el mes calendario de la fecha de compra.
 *
 * 3. renderPaymentMonth() ya NO hace queries ad-hoc a Supabase.
 *    Usa allPayments (cargado en init) filtrado por ventana de pago.
 *    La ventana de pago usa los pagos con month_cycle/year_cycle coincidentes
 *    como fuente primaria; si no tienen ciclo asignado, cae back a fecha.
 *
 * 4. getCurrentBillingCycle(): devuelve el ciclo "activo" hoy (para el hero).
 *    Compara si hoy está en la ventana de compras o ya en la ventana de pago
 *    para determinar qué ciclo mostrar.
 *
 * CÁLCULOS:
 * 5. Hero crédito: "Gasto ciclo actual" usa el ciclo activo correcto.
 * 6. Hero crédito: "Disponible" = limit - current_balance (deuda real del trigger).
 * 7. payment-total-sub: muestra "Corte: DD MMM · Pago: DD MMM YYYY".
 * 8. renderStats: ticket promedio excluye cuotas (usa monto/cuota, no total).
 *
 * ARQUITECTURA:
 * 9. currentCard se asigna en init(), no en renderHeroCard() — evita
 *    condición de carrera si renderPaymentMonth() se llama antes.
 * 10. reloadPayments() reutiliza la misma lógica de resolución de nombres.
 */

import { supabase } from './supabase.js';

// ─── Estado global ────────────────────────────────────────────────────────────
let allExpenses   = [];
let allPayments   = [];   // credit_card_payments de esta tarjeta (con source_card_name resuelto)
let allDebitCards = [];   // tarjetas Debit+Cash del usuario
let currentCard   = null;
let currentCardId = null;
let currentUserId = null;

// ─── Utilidades ───────────────────────────────────────────────────────────────
const fmt     = (n) => `S/ ${parseFloat(n || 0).toFixed(2)}`;
const fmtDate = (d) => new Date(d + 'T00:00:00')
    .toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
const isoDate = (d) => d.toISOString().split('T')[0];
const pad     = (n) => String(n).padStart(2, '0');

const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function showToast(msg, type = 'error') {
    let t = document.getElementById('main-toast');
    if (!t) { t = document.createElement('div'); t.id = 'main-toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.className   = `toast toast--${type} show`;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 3500);
}

function showSkeletonRows(n = 5) {
    document.getElementById('expenses-list').innerHTML = Array.from({ length: n }, () => `
        <tr>
            <td><div class="skeleton" style="height:14px;width:80px;"></div></td>
            <td><div class="skeleton" style="height:14px;width:160px;"></div></td>
            <td><div class="skeleton" style="height:22px;width:90px;border-radius:20px;"></div></td>
            <td><div class="skeleton" style="height:22px;width:100px;border-radius:20px;"></div></td>
            <td style="text-align:right;"><div class="skeleton" style="height:14px;width:70px;margin-left:auto;"></div></td>
        </tr>`).join('');
}

function escHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── LÓGICA DE CICLOS ─────────────────────────────────────────────────────────
//
// MODELO DE CICLO:
//   Ciclo "M" (mes de facturación M, año Y):
//     - Ventana de COMPRAS:  desde (cutoff_day del mes M-1) + 1 día
//                            hasta  cutoff_day del mes M
//     - Ventana de PAGO:     desde  cutoff_day M + 1
//                            hasta  due_day del mes M (o M+1 si due_day < cutoff_day)
//
// ASIGNACIÓN DE CUOTAS:
//   La cuota N de una compra hecha en fecha F:
//     - La compra F pertenece al ciclo cuya ventana de compras la contiene.
//       Sea ese ciclo el "ciclo base" Cb (mes Mb, año Yb).
//     - La cuota N vence en el ciclo Cb + (N-1) meses.
//
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dado un mes de facturación (year, month) y un cutoff_day,
 * devuelve el rango de COMPRAS de ese ciclo.
 */
function getBillingCycle(year, month, cutoffDay) {
    if (!cutoffDay) {
        // Sin cutoff: ciclo = mes calendario completo
        return {
            cycleStart: new Date(year, month - 1, 1),
            cycleEnd:   new Date(year, month, 0)   // último día del mes
        };
    }
    // cycleStart = cutoff_day del mes anterior + 1
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear  = month === 1 ? year - 1 : year;
    const daysInPrev = new Date(prevYear, prevMonth, 0).getDate(); // último día del mes anterior

    // El día de inicio no puede superar los días del mes anterior
    const startDay = Math.min(cutoffDay + 1, daysInPrev);

    return {
        cycleStart: new Date(prevYear, prevMonth - 1, startDay),
        cycleEnd:   new Date(year, month - 1, cutoffDay)
    };
}

/**
 * Devuelve la ventana de PAGO de un ciclo (year, month).
 */
function getPaymentWindow(year, month, cutoffDay, dueDay) {
    if (!cutoffDay && !dueDay) {
        // Sin configuración: ventana = mes calendario completo
        return {
            payStart: new Date(year, month - 1, 1),
            payEnd:   new Date(year, month, 0)
        };
    }
    const cd = cutoffDay || 28;
    const dd = dueDay    || (cd + 10);

    // payStart = día después del corte
    const payStart = new Date(year, month - 1, cd + 1);

    // payEnd = due_day; si due_day < cutoff_day, cae en el mes siguiente
    const payEnd = dd > cd
        ? new Date(year, month - 1, dd)
        : new Date(year, month, dd);

    return { payStart, payEnd };
}

/**
 * Determina a qué ciclo de facturación pertenece una fecha dada.
 * Devuelve { year, month } del ciclo, o null si no cae en ninguno
 * de los últimos 24 meses.
 *
 * Útil para: saber en qué ciclo cayó una compra.
 */
function getCycleForDate(date, cutoffDay) {
    const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;
    // Probamos el mes de la fecha y el siguiente (una compra el día 28 con cutoff 20
    // puede pertenecer al ciclo del mes siguiente)
    for (let offset = -1; offset <= 2; offset++) {
        const testDate = new Date(d.getFullYear(), d.getMonth() + offset, 1);
        const yr = testDate.getFullYear();
        const mo = testDate.getMonth() + 1;
        const { cycleStart, cycleEnd } = getBillingCycle(yr, mo, cutoffDay);
        if (d >= cycleStart && d <= cycleEnd) return { year: yr, month: mo };
    }
    return null;
}

/**
 * Devuelve el ciclo "activo" en este momento:
 * - Si hoy está en la ventana de compras → ese ciclo
 * - Si hoy está en la ventana de pago → ese ciclo (aún se puede pagar)
 * - Fallback: ciclo del mes actual por calendario
 */
function getCurrentBillingCycle(cutoffDay, dueDay) {
    const now = new Date();
    // Probamos el mes actual y el siguiente
    for (let offset = 0; offset <= 1; offset++) {
        const test = new Date(now.getFullYear(), now.getMonth() + offset, 1);
        const yr = test.getFullYear();
        const mo = test.getMonth() + 1;
        const { cycleStart, cycleEnd } = getBillingCycle(yr, mo, cutoffDay);
        const { payStart, payEnd }     = getPaymentWindow(yr, mo, cutoffDay, dueDay);
        // ¿Hoy está en la ventana de compras o de pago?
        if ((now >= cycleStart && now <= cycleEnd) ||
            (now >= payStart   && now <= payEnd)) {
            return { year: yr, month: mo, cycleStart, cycleEnd, payStart, payEnd };
        }
    }
    // Fallback
    const yr = now.getFullYear();
    const mo = now.getMonth() + 1;
    const { cycleStart, cycleEnd } = getBillingCycle(yr, mo, cutoffDay);
    const { payStart, payEnd }     = getPaymentWindow(yr, mo, cutoffDay, dueDay);
    return { year: yr, month: mo, cycleStart, cycleEnd, payStart, payEnd };
}

/**
 * Para un gasto con cuotas, determina si la cuota N cae en el ciclo (year, month).
 * Devuelve el número de cuota (1-based) si hay una en ese ciclo, o null.
 *
 * LÓGICA CORREGIDA:
 *   1. Encontrar el "ciclo base" de la compra (a qué ciclo pertenece la fecha de compra).
 *   2. La cuota N cae en cicloBase + (N-1) meses.
 *   3. Comparar ese ciclo calculado con el ciclo (year, month) pedido.
 */
function getInstallmentInCycle(expense, targetYear, targetMonth, cutoffDay) {
    const expDate   = new Date(expense.date_exp + 'T00:00:00');
    const totalInst = parseInt(expense.installments || 1);
    if (totalInst <= 1) return null;

    // Ciclo base: en qué ciclo cayó la fecha de compra
    const baseCycle = getCycleForDate(expDate, cutoffDay);
    if (!baseCycle) return null;

    // Meses de diferencia entre ciclo base y ciclo objetivo
    const baseMonths   = baseCycle.year * 12 + baseCycle.month - 1;
    const targetMonths = targetYear    * 12 + targetMonth      - 1;
    const diff = targetMonths - baseMonths; // 0 = cuota 1, 1 = cuota 2, etc.

    if (diff >= 0 && diff < totalInst) {
        return diff + 1; // número de cuota (1-based)
    }
    return null;
}

/**
 * Devuelve los pagos de allPayments que corresponden al ciclo (year, month).
 * Prioridad: month_cycle/year_cycle almacenados en el registro.
 * Fallback: fecha del pago cae en la ventana de pago del ciclo.
 */
function getPaymentsForCycle(year, month, cutoffDay, dueDay) {
    const { payStart, payEnd } = getPaymentWindow(year, month, cutoffDay, dueDay);

    return allPayments.filter(p => {
        // Prioridad 1: ciclo explícitamente asignado
        if (p.month_cycle && p.year_cycle) {
            return parseInt(p.month_cycle) === month && parseInt(p.year_cycle) === year;
        }
        // Fallback: la fecha del pago cae en la ventana de pago
        const d = new Date(p.date_payment + 'T00:00:00');
        return d >= payStart && d <= payEnd;
    });
}

// ─── MODAL DE PAGO ────────────────────────────────────────────────────────────

function closePaymentModal() {
    const modal = document.getElementById('payment-modal');
    if (modal) modal.classList.remove('open');
    document.body.style.overflow = '';
}

async function submitPayment(e) {
    e.preventDefault();

    const amount   = parseFloat(document.getElementById('modal-amount').value);
    const sourceId = document.getElementById('modal-source-card').value;
    const dateVal  = document.getElementById('modal-payment-date').value;
    const notes    = document.getElementById('modal-notes').value.trim() || null;

    if (!amount || amount <= 0) { showToast('Ingresa un monto de pago válido.'); return; }
    if (!sourceId)               { showToast('Selecciona la cuenta de origen del pago.'); return; }
    if (!dateVal)                { showToast('Selecciona la fecha del pago.'); return; }

    const cutoffDay = currentCard?.cutoff_day || null;
    const dueDay    = currentCard?.due_day    || null;
    const payDate   = new Date(dateVal + 'T00:00:00');

    // Determinar a qué ciclo corresponde este pago según la ventana de pago
    let month_cycle = null;
    let year_cycle  = null;
    for (let offset = 0; offset <= 3; offset++) {
        const checkDate = new Date(payDate.getFullYear(), payDate.getMonth() - offset, 1);
        const yr = checkDate.getFullYear();
        const mo = checkDate.getMonth() + 1;
        const { payStart, payEnd } = getPaymentWindow(yr, mo, cutoffDay, dueDay);
        if (payDate >= payStart && payDate <= payEnd) {
            year_cycle  = yr;
            month_cycle = mo;
            break;
        }
    }

    const payload = {
        id_user:        currentUserId,
        id_card:        currentCardId,
        amount_paid:    amount,
        date_payment:   dateVal,
        source_account: sourceId,
        target_cycle:   'current',
        month_cycle,
        year_cycle,
        notes
    };

    const btn = document.getElementById('modal-submit-btn');
    btn.disabled    = true;
    btn.textContent = 'Guardando…';

    const { error } = await supabase.from('credit_card_payments').insert([payload]);

    btn.disabled    = false;
    btn.textContent = 'Confirmar Pago';

    if (error) { showToast('Error al registrar el pago: ' + error.message); return; }

    showToast('✓ Pago registrado correctamente', 'success');
    closePaymentModal();

    await reloadPayments();
    renderPaymentMonth();
}

async function reloadPayments() {
    const { data, error } = await supabase
        .from('credit_card_payments')
        .select('id_payment, amount_paid, date_payment, notes, source_account, month_cycle, year_cycle')
        .eq('id_card', currentCardId)
        .order('date_payment', { ascending: false });

    if (error) { console.error('Error recargando pagos:', error.message); return; }

    allPayments = await resolveSourceNames(data || []);
}

async function resolveSourceNames(payments) {
    const sourceIds = [...new Set(payments.map(p => p.source_account).filter(Boolean))];
    let sourceMap = {};
    if (sourceIds.length > 0) {
        const { data: cards } = await supabase
            .from('cards').select('id_card, name_card').in('id_card', sourceIds);
        (cards || []).forEach(c => { sourceMap[c.id_card] = c.name_card; });
    }
    return payments.map(p => ({
        ...p,
        source_card_name: p.source_account ? (sourceMap[p.source_account] || 'Cuenta desconocida') : 'Sin cuenta'
    }));
}

// ─── RENDERIZAR PANEL DE CICLO ────────────────────────────────────────────────

function renderPaymentMonth() {
    const val = document.getElementById('payment-month').value;
    if (!val || !currentCard) return;

    const [year, month] = val.split('-').map(Number);
    const cutoffDay = currentCard.cutoff_day || null;
    const dueDay    = currentCard.due_day    || null;

    const { cycleStart, cycleEnd } = getBillingCycle(year, month, cutoffDay);
    const { payStart,   payEnd   } = getPaymentWindow(year, month, cutoffDay, dueDay);

    // ── Badge de ciclo ──────────────────────────────────────────────────────
    const badge = document.getElementById('cycle-badge');
    badge.innerHTML = `
        <span class="cycle-range">
            📅 Compras: <strong>${fmtDate(isoDate(cycleStart))}</strong> → <strong>${fmtDate(isoDate(cycleEnd))}</strong>
        </span>
        <span class="cycle-pay-window">
            💳 Ventana de pago: <strong>${fmtDate(isoDate(payStart))}</strong> → <strong>${fmtDate(isoDate(payEnd))}</strong>
        </span>`;
    badge.classList.add('active');

    // ── Clasificar gastos del ciclo ─────────────────────────────────────────
    const directRows      = [];
    const installmentRows = [];

    allExpenses.forEach(e => {
        const totalInst = parseInt(e.installments || 1);

        if (totalInst <= 1) {
            // Gasto directo: la fecha debe caer en la ventana de compras
            const expDate = new Date(e.date_exp + 'T00:00:00');
            if (expDate >= cycleStart && expDate <= cycleEnd) {
                directRows.push({
                    desc:   e.description_exp || 'Sin descripción',
                    date:   e.date_exp,
                    amount: parseFloat(e.amount_exp || 0),
                    cat:    e.categories?.name_cat
                });
            }
        } else {
            // Cuota: determinar si este ciclo tiene una cuota de este gasto
            const cuotaNum = getInstallmentInCycle(e, year, month, cutoffDay);
            if (cuotaNum !== null) {
                const cuotaAmt = e.installment_amt
                    ? parseFloat(e.installment_amt)
                    : parseFloat(e.amount_exp || 0) / totalInst;
                installmentRows.push({
                    desc:      e.description_exp || 'Sin descripción',
                    date:      e.date_exp,
                    cuotaNum,
                    totalInst,
                    cuotaAmt,
                    cat:       e.categories?.name_cat
                });
            }
        }
    });

    const directTotal      = directRows.reduce((s, r) => s + r.amount, 0);
    const installmentTotal = installmentRows.reduce((s, r) => s + r.cuotaAmt, 0);
    const grossTotal       = directTotal + installmentTotal;

    // ── Pagos atribuidos a este ciclo (sin query extra) ─────────────────────
    const cyclePayments = getPaymentsForCycle(year, month, cutoffDay, dueDay);
    const totalPaid     = cyclePayments.reduce((s, p) => s + parseFloat(p.amount_paid || 0), 0);
    const pendingAmount = Math.max(0, grossTotal - totalPaid);

    // ── Estado ─────────────────────────────────────────────────────────────
    let cycleStatus = 'pending';
    if      (grossTotal === 0)                     cycleStatus = 'empty';
    else if (totalPaid >= grossTotal - 0.01)       cycleStatus = 'paid';
    else if (totalPaid > 0)                        cycleStatus = 'partial';

    // ── Mostrar/ocultar breakdown ───────────────────────────────────────────
    const hasData = directRows.length > 0 || installmentRows.length > 0;
    document.getElementById('payment-breakdown').style.display = hasData ? 'block' : 'none';
    document.getElementById('payment-empty').style.display     = hasData ? 'none'  : 'flex';

    if (hasData) {
        // Gastos directos
        document.getElementById('breakdown-direct-list').innerHTML = directRows.length
            ? directRows.map(r => `
                <div class="breakdown-row">
                    <div class="breakdown-row-left">
                        <div class="breakdown-row-desc">${escHtml(r.desc)}</div>
                        <div class="breakdown-row-date">${fmtDate(r.date)}${r.cat ? ` · ${r.cat}` : ''}</div>
                    </div>
                    <div class="breakdown-row-amount">${fmt(r.amount)}</div>
                </div>`).join('')
            : `<div class="breakdown-empty">Sin gastos directos en este ciclo</div>`;

        // Cuotas
        document.getElementById('breakdown-installment-list').innerHTML = installmentRows.length
            ? installmentRows.map(r => `
                <div class="breakdown-row">
                    <div class="breakdown-row-left">
                        <div class="breakdown-row-desc">${escHtml(r.desc)}</div>
                        <div class="breakdown-row-date">
                            Cuota ${r.cuotaNum} de ${r.totalInst}
                            <span class="breakdown-row-meta-inline"> · Compra: ${fmtDate(r.date)}</span>
                        </div>
                    </div>
                    <div class="breakdown-row-amount">${fmt(r.cuotaAmt)}</div>
                </div>`).join('')
            : `<div class="breakdown-empty">Sin cuotas en este ciclo</div>`;

        // Subtotales
        document.getElementById('breakdown-direct-total').textContent      = fmt(directTotal);
        document.getElementById('breakdown-installment-total').textContent = fmt(installmentTotal);

        // Resumen financiero
        document.getElementById('payment-gross-amount').textContent = fmt(grossTotal);
        document.getElementById('payment-paid-amount').textContent  = fmt(totalPaid);

        const colorClass = cycleStatus === 'paid' ? 'green' : (cycleStatus === 'partial' ? 'gold' : 'rust');
        const pendEl   = document.getElementById('payment-pending-amount');
        const pendElLg = document.getElementById('payment-pending-amount-large');
        if (pendEl)   { pendEl.textContent = fmt(pendingAmount); pendEl.className = `payment-summary-value ${colorClass}`; }
        if (pendElLg) pendElLg.textContent = fmt(pendingAmount);

        // Sub del total bar: muestra fechas del ciclo
        const subEl = document.getElementById('payment-total-sub');
        if (subEl) {
            const cutStr = cutoffDay ? `Corte día ${cutoffDay} de ${monthNames[month - 1]}` : '';
            const dueStr = dueDay    ? `Pago día ${dueDay}`  : '';
            subEl.textContent = [cutStr, dueStr].filter(Boolean).join(' · ') || `${monthNames[month - 1]} ${year}`;
        }

        renderCyclePayments(cyclePayments, grossTotal);
    }

    updateStatusBadge(cycleStatus);
}

function updateStatusBadge(status) {
    const map = {
        paid:    { label: '✓ Pagado',           cls: 'status-paid'    },
        partial: { label: '◑ Pago parcial',     cls: 'status-partial' },
        pending: { label: '⏳ Pendiente',        cls: 'status-pending' },
        empty:   { label: '— Sin movimientos',  cls: 'status-empty'   }
    };
    const s  = map[status] || map.empty;
    const el = document.getElementById('cycle-status-badge');
    if (el) { el.textContent = s.label; el.className = `cycle-status-badge ${s.cls}`; }
}

function renderCyclePayments(payments, gross) {
    const container = document.getElementById('cycle-payments-list');
    const section   = document.getElementById('cycle-payments-section');
    if (!container || !section) return;

    section.style.display = 'block';

    if (payments.length === 0) {
        container.innerHTML = `<div class="breakdown-empty">No hay pagos registrados para este ciclo aún.</div>`;
        return;
    }

    container.innerHTML = payments.map((p, i) => {
        const pct = gross > 0
            ? Math.min(100, (parseFloat(p.amount_paid) / gross) * 100).toFixed(1)
            : '0.0';
        return `
        <div class="breakdown-row payment-row" style="animation-delay:${i * 0.04}s">
            <div class="breakdown-row-left">
                <div class="breakdown-row-desc">Pago registrado</div>
                <div class="breakdown-row-date">
                    ${fmtDate(p.date_payment)} · Desde: ${escHtml(p.source_card_name)}
                </div>
                ${p.notes ? `<div class="breakdown-row-meta">${escHtml(p.notes)}</div>` : ''}
            </div>
            <div style="text-align:right;">
                <div class="breakdown-row-amount green-text">${fmt(p.amount_paid)}</div>
                <div style="font-size:0.65rem;color:var(--muted);">${pct}% del total</div>
            </div>
        </div>`;
    }).join('');
}

// ─── HERO CARD ────────────────────────────────────────────────────────────────

function renderHeroCard(card, expenses) {
    document.getElementById('hero-card-name').textContent     = card.name_card;
    document.getElementById('hero-card-currency').textContent = card.currency || 'PEN';
    document.getElementById('hero-card-type').textContent     =
        card.type_card === 'Credit' ? 'Crédito'
        : card.type_card === 'Cash' ? 'Efectivo'
        : 'Débito';

    const now = new Date();

    if (card.type_card === 'Credit') {
        const cutoffDay = card.cutoff_day || null;
        const dueDay    = card.due_day    || null;

        // Ciclo activo ahora mismo
        const { year, month, cycleStart, cycleEnd, payStart, payEnd } =
            getCurrentBillingCycle(cutoffDay, dueDay);

        // Etiqueta del ciclo actual
        const monthLbl = document.getElementById('hero-month-label');
        const inPayWindow = now >= payStart && now <= payEnd;
        if (monthLbl) monthLbl.textContent = inPayWindow ? 'Ciclo (ventana de pago)' : 'Gasto ciclo actual';

        // Total del ciclo activo (directos + cuotas)
        let cycleTotal = 0;
        let cycleCount = 0;
        expenses.forEach(e => {
            const totalInst = parseInt(e.installments || 1);
            if (totalInst <= 1) {
                const d = new Date(e.date_exp + 'T00:00:00');
                if (d >= cycleStart && d <= cycleEnd) {
                    cycleTotal += parseFloat(e.amount_exp || 0);
                    cycleCount++;
                }
            } else {
                const cuotaNum = getInstallmentInCycle(e, year, month, cutoffDay);
                if (cuotaNum !== null) {
                    const cuotaAmt = e.installment_amt
                        ? parseFloat(e.installment_amt)
                        : parseFloat(e.amount_exp || 0) / totalInst;
                    cycleTotal += cuotaAmt;
                    cycleCount++;
                }
            }
        });

        document.getElementById('hero-month-total').textContent = fmt(cycleTotal);
        document.getElementById('hero-month-count').textContent =
            `${cycleCount} cargo${cycleCount !== 1 ? 's' : ''} · ${monthNames[month - 1]} ${year}`;

        // ── Cuotas activas ──────────────────────────────────────────────────
        // Una cuota está "activa" si aún tiene cuotas futuras por vencer
        const activeInst = expenses.filter(e => {
            const totalInst = parseInt(e.installments || 1);
            if (totalInst <= 1) return false;
            const baseCycle = getCycleForDate(e.date_exp, cutoffDay);
            if (!baseCycle) return false;
            // Mes del ciclo de la última cuota
            const lastCycleMonths = baseCycle.year * 12 + baseCycle.month - 1 + (totalInst - 1);
            const lastCutoffYear  = Math.floor(lastCycleMonths / 12);
            const lastCutoffMonth = (lastCycleMonths % 12) + 1;
            const { cycleEnd: lastCycleEnd } = getBillingCycle(lastCutoffYear, lastCutoffMonth, cutoffDay);
            return lastCycleEnd >= now;
        });

        // Suma del monto pendiente real (cuotas aún no vencidas)
        const nowCycleMonths = year * 12 + month - 1;
        const activeInstTotal = activeInst.reduce((s, e) => {
            const totalInst = parseInt(e.installments || 1);
            const cuotaAmt  = e.installment_amt
                ? parseFloat(e.installment_amt)
                : parseFloat(e.amount_exp || 0) / totalInst;
            const baseCycle = getCycleForDate(e.date_exp, cutoffDay);
            if (!baseCycle) return s;
            const baseMonths  = baseCycle.year * 12 + baseCycle.month - 1;
            // Cuotas que ya pasaron (ciclo anterior al actual inclusive)
            const paidSoFar   = Math.max(0, nowCycleMonths - baseMonths); // cuotas ya facturadas
            const remaining   = Math.max(0, totalInst - paidSoFar);
            return s + (remaining * cuotaAmt);
        }, 0);

        document.getElementById('hero-installments-wrap').style.display  = 'flex';
        document.getElementById('hero-installments-count').textContent   =
            `${activeInst.length} activa${activeInst.length !== 1 ? 's' : ''}`;
        document.getElementById('hero-installments-total').textContent   =
            `Pendiente: ${fmt(activeInstTotal)}`;

        // ── Disponible / Límite ─────────────────────────────────────────────
        // current_balance en tarjeta de crédito = DEUDA acumulada (aumenta con gastos, baja con pagos)
        if (card.limit_card) {
            const deuda     = Math.max(0, parseFloat(card.current_balance || 0));
            const available = parseFloat(card.limit_card) - deuda;
            const pct       = Math.min(100, (deuda / parseFloat(card.limit_card)) * 100);
            document.getElementById('hero-limit-wrap').style.display = 'flex';
            document.getElementById('hero-available').textContent    = fmt(Math.max(0, available));
            document.getElementById('hero-limit-text').textContent   =
                `Límite: ${fmt(card.limit_card)} · Deuda actual: ${fmt(deuda)}`;
            const bar = document.getElementById('hero-credit-bar');
            bar.style.width = pct + '%';
            if (pct > 80) bar.classList.add('danger');
        }

        // ── Días al corte y al pago ─────────────────────────────────────────
        if (card.cutoff_day || card.due_day) {
            document.getElementById('hero-cutoff-wrap').style.display = 'flex';
            const adjustToFuture = (day) => {
                if (!day) return null;
                let d = new Date(now.getFullYear(), now.getMonth(), day);
                if (d <= now) d = new Date(now.getFullYear(), now.getMonth() + 1, day);
                return d;
            };
            const nextCutoff = adjustToFuture(card.cutoff_day);
            const nextDue    = adjustToFuture(card.due_day);
            const daysToCut  = nextCutoff ? Math.ceil((nextCutoff - now) / 86400000) : null;
            const daysToDue  = nextDue    ? Math.ceil((nextDue    - now) / 86400000) : null;
            const isUrgent   = daysToDue !== null && daysToDue <= 5;

            const cutoffEl = document.getElementById('hero-cutoff-days');
            cutoffEl.textContent = inPayWindow && daysToDue !== null
                ? `${daysToDue} días para pagar`
                : (daysToCut !== null ? `${daysToCut} días al corte` : '—');
            cutoffEl.style.color = isUrgent ? 'var(--rust)' : 'var(--paper)';
            document.getElementById('hero-cutoff-text').textContent =
                `Corte día ${card.cutoff_day || '—'} · Pago día ${card.due_day || '—'}` +
                (isUrgent ? ` ⚠️ Vence en ${daysToDue}d` : '');
        }

    } else {
        // ── Débito / Efectivo ───────────────────────────────────────────────
        const monthLbl = document.getElementById('hero-month-label');
        if (monthLbl) monthLbl.textContent = 'Gasto este mes';
        const thisMonth = expenses.filter(e => {
            const d = new Date(e.date_exp + 'T00:00:00');
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        const monthTotal = thisMonth.reduce((s, e) => s + parseFloat(e.amount_exp || 0), 0);
        document.getElementById('hero-month-total').textContent = fmt(monthTotal);
        document.getElementById('hero-month-count').textContent =
            `${thisMonth.length} transacción${thisMonth.length !== 1 ? 'es' : ''}`;

        // Saldo real
        if (card.current_balance !== null && card.current_balance !== undefined) {
            const balance  = parseFloat(card.current_balance || 0);
            document.getElementById('hero-limit-wrap').style.display = 'flex';
            document.getElementById('hero-available').textContent    = fmt(balance);
            const availLbl = document.getElementById('hero-available-label');
            if (availLbl) availLbl.textContent =
                card.type_card === 'Cash' ? 'Efectivo disponible' : 'Saldo en cuenta';
            document.getElementById('hero-limit-text').textContent =
                card.type_card === 'Cash' ? 'Billetera en efectivo' : 'Cuenta débito';
            const barWrap = document.querySelector('.credit-bar-wrap');
            if (barWrap) barWrap.style.display = 'none';
        }
    }
}

// ─── STATS ────────────────────────────────────────────────────────────────────

function renderStats(expenses) {
    const total = expenses.reduce((s, e) => s + parseFloat(e.amount_exp || 0), 0);
    const count = expenses.length;
    const max   = expenses.reduce((m, e) => Math.max(m, parseFloat(e.amount_exp || 0)), 0);

    // Ticket promedio: para cuotas usamos el monto por cuota, no el total
    const avgBase = expenses.reduce((s, e) => {
        const inst = parseInt(e.installments || 1);
        if (inst <= 1) return s + parseFloat(e.amount_exp || 0);
        const cuotaAmt = e.installment_amt
            ? parseFloat(e.installment_amt)
            : parseFloat(e.amount_exp || 0) / inst;
        return s + cuotaAmt;
    }, 0);
    const avg = count ? avgBase / count : 0;

    // Cuotas activas
    const instExps  = expenses.filter(e => parseInt(e.installments || 1) > 1);
    const instTotal = instExps.reduce((s, e) => s + parseFloat(e.amount_exp || 0), 0);

    document.getElementById('stat-total').textContent            = fmt(total);
    document.getElementById('stat-count').textContent            = count;
    document.getElementById('stat-avg').textContent              = fmt(avg);
    document.getElementById('stat-max').textContent              = fmt(max);
    document.getElementById('stat-installments').textContent     = instExps.length;
    document.getElementById('stat-installments-sub').textContent = `${fmt(instTotal)} en cuotas`;
}

// ─── FILTROS ──────────────────────────────────────────────────────────────────

function getFilteredExpenses() {
    const month = document.getElementById('filter-month').value;
    const catId = document.getElementById('filter-category').value;
    const type  = document.getElementById('filter-type').value;

    return allExpenses.filter(e => {
        if (month) {
            const d  = new Date(e.date_exp + 'T00:00:00');
            const em = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
            if (em !== month) return false;
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
    const cnt   = filtered.length;
    const month = document.getElementById('filter-month').value;
    document.getElementById('expenses-count-label').textContent =
        `${cnt} registro${cnt !== 1 ? 's' : ''}`;
    document.getElementById('stat-period').textContent = month
        ? new Date(month + '-01').toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })
        : 'Todos los registros';
}

function populateCategoryFilter(expenses) {
    const cats = [...new Map(
        expenses.filter(e => e.categories?.name_cat)
                .map(e => [e.id_category, e.categories.name_cat])
    ).entries()];
    const sel = document.getElementById('filter-category');
    cats.forEach(([id, name]) => {
        const opt = document.createElement('option');
        opt.value = id; opt.textContent = name;
        sel.appendChild(opt);
    });
}

// ─── TABLA DE GASTOS ──────────────────────────────────────────────────────────

function renderExpenses(expenses) {
    const list = document.getElementById('expenses-list');
    if (!expenses || expenses.length === 0) {
        list.innerHTML = `
            <tr><td colspan="5">
                <div class="empty-state">
                    <div class="empty-state-icon">🧾</div>
                    <h3>Sin movimientos</h3>
                    <p>No hay gastos que coincidan con los filtros seleccionados.</p>
                </div>
            </td></tr>`;
        return;
    }
    list.innerHTML = expenses.map((e, i) => {
        const inst    = parseInt(e.installments || 1);
        const instAmt = parseFloat(e.installment_amt || 0);
        const calc    = inst > 1 && instAmt === 0
            ? parseFloat(e.amount_exp || 0) / inst
            : instAmt;
        const instCell = inst > 1
            ? `<div class="installment-badge">
                   <span class="installment-tag">${inst} cuotas</span>
                   <span class="installment-per">${fmt(calc)}/cuota${instAmt === 0 ? ' (aprox.)' : ''}</span>
               </div>`
            : `<span class="installment-tag single">Directo</span>`;
        return `
        <tr style="animation-delay:${i * 0.03}s">
            <td><span class="expense-date">${fmtDate(e.date_exp)}</span></td>
            <td><div class="expense-desc">${escHtml(e.description_exp || 'Sin descripción')}</div></td>
            <td><span class="category-badge">${e.categories?.name_cat || 'Sin categoría'}</span></td>
            <td>${instCell}</td>
            <td><span class="amount-cell">${fmt(e.amount_exp)}</span></td>
        </tr>`;
    }).join('');
}

// ─── TIMELINE DE CUOTAS FUTURAS ───────────────────────────────────────────────

function renderInstallmentTimeline() {
    const section = document.getElementById('installments-timeline');
    if (!section || !currentCard) return;

    const cutoffDay = currentCard.cutoff_day || null;
    const instExps  = allExpenses.filter(e => parseInt(e.installments || 1) > 1);

    if (instExps.length === 0) { section.style.display = 'none'; return; }
    section.style.display = 'block';

    const now   = new Date();
    const rows  = [];

    for (let offset = 0; offset < 12; offset++) {
        const td    = new Date(now.getFullYear(), now.getMonth() + offset, 1);
        const year  = td.getFullYear();
        const month = td.getMonth() + 1;
        const cuotas = [];

        instExps.forEach(e => {
            const n = getInstallmentInCycle(e, year, month, cutoffDay);
            if (n !== null) {
                const amt = e.installment_amt
                    ? parseFloat(e.installment_amt)
                    : parseFloat(e.amount_exp) / parseInt(e.installments);
                cuotas.push({
                    desc:      e.description_exp,
                    cuotaNum:  n,
                    totalInst: parseInt(e.installments),
                    amt
                });
            }
        });

        if (cuotas.length > 0) {
            rows.push({ year, month, cuotas, total: cuotas.reduce((s, c) => s + c.amt, 0) });
        }
    }

    const body = document.getElementById('timeline-body');
    if (rows.length === 0) {
        body.innerHTML = `<div class="breakdown-empty">No hay cuotas pendientes en los próximos 12 meses.</div>`;
        return;
    }
    body.innerHTML = rows.map(r => `
        <div class="timeline-month">
            <div class="timeline-month-header">
                <span class="timeline-month-label">${monthNames[r.month - 1]} ${r.year}</span>
                <span class="timeline-month-total">${fmt(r.total)}</span>
            </div>
            ${r.cuotas.map(c => `
                <div class="timeline-item">
                    <div class="timeline-item-desc">${escHtml(c.desc)}</div>
                    <div class="timeline-item-meta">Cuota ${c.cuotaNum} de ${c.totalInst}</div>
                    <div class="timeline-item-amt">${fmt(c.amt)}</div>
                </div>`).join('')}
        </div>`).join('');
}

// ─── INIT ─────────────────────────────────────────────────────────────────────

async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return (window.location.href = 'login.html');
    currentUserId = user.id;

    const cardId = new URLSearchParams(window.location.search).get('id');
    if (!cardId) return (window.location.href = 'gestionTarjetas.html');
    currentCardId = cardId;

    showSkeletonRows(6);

    // ── 1. Tarjeta ────────────────────────────────────────────────────────
    const { data: card, error: cardErr } = await supabase
        .from('cards')
        .select('name_card, type_card, currency, limit_card, current_balance, cutoff_day, due_day')
        .eq('id_card', cardId)
        .eq('deleted_card', false)
        .single();

    if (cardErr || !card) { showToast('No se pudo cargar la tarjeta.'); return; }

    // IMPORTANTE: asignar currentCard ANTES de cualquier renderizado
    currentCard = card;

    document.getElementById('card-name-title').innerHTML =
        `Gastos de <span>${escHtml(card.name_card)}</span>`;
    document.title = `${card.name_card} — ControlGastos`;

    // ── 2. Datos en paralelo ──────────────────────────────────────────────
    const [expRes, payRaw, debitRes] = await Promise.all([
        supabase.from('expenses')
            .select('id_exp, id_category, amount_exp, date_exp, description_exp, installments, installment_amt, payment_method, categories(name_cat)')
            .eq('id_card', cardId)
            .eq('deleted_exp', false)
            .order('date_exp', { ascending: false }),

        supabase.from('credit_card_payments')
            .select('id_payment, amount_paid, date_payment, notes, source_account, month_cycle, year_cycle')
            .eq('id_card', cardId)
            .order('date_payment', { ascending: false }),

        supabase.from('cards')
            .select('id_card, name_card, type_card, current_balance')
            .eq('id_user', user.id)
            .eq('deleted_card', false)
            .in('type_card', ['Debit', 'Cash'])
            .order('name_card', { ascending: true })
    ]);

    if (expRes.error) { showToast('Error al obtener gastos: ' + expRes.error.message); return; }

    allExpenses   = expRes.data   || [];
    allDebitCards = debitRes.data || [];
    allPayments   = await resolveSourceNames(payRaw.data || []);

    // ── 3. Renderizar ─────────────────────────────────────────────────────
    renderHeroCard(card, allExpenses);
    populateCategoryFilter(allExpenses);
    renderStats(allExpenses);
    renderExpenses(allExpenses);

    document.getElementById('stat-period').textContent = 'Todos los registros';
    document.getElementById('expenses-count-label').textContent =
        `${allExpenses.length} registro${allExpenses.length !== 1 ? 's' : ''}`;

    // ── 4. Secciones de crédito ───────────────────────────────────────────
    const isCredit = card.type_card === 'Credit';
    document.getElementById('payment-panel').style.display         = isCredit ? 'block' : 'none';
    document.getElementById('installments-timeline').style.display = isCredit ? 'block' : 'none';

    if (isCredit) {
        const now = new Date();
        document.getElementById('payment-month').value =
            `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
        renderPaymentMonth();
        renderInstallmentTimeline();
        document.getElementById('payment-month').addEventListener('change', renderPaymentMonth);

        // Botón de registrar pago → redirige a pestaña de pago
        const btnPay = document.getElementById('btn-register-payment');
        if (btnPay) {
            btnPay.addEventListener('click', () => {
                window.location.href = `nuevoGasto.html?tab=payment&cardId=${currentCardId}`;
            });
        }
    }

    // ── 5. Eventos de modal ───────────────────────────────────────────────
    document.getElementById('payment-modal-form')?.addEventListener('submit', submitPayment);
    document.getElementById('modal-close')?.addEventListener('click', closePaymentModal);
    document.getElementById('payment-modal')?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closePaymentModal();
    });

    // ── 6. Filtros ────────────────────────────────────────────────────────
    ['filter-month', 'filter-category', 'filter-type'].forEach(id =>
        document.getElementById(id)?.addEventListener('change', applyFilters));
    document.getElementById('btn-clear-filter')?.addEventListener('click', () => {
        ['filter-month', 'filter-category', 'filter-type'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        applyFilters();
    });
}

init();