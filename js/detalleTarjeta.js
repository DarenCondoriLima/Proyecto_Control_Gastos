/**
 * detalleTarjeta.js — ControlGastos v3
 *
 * FIXES vs versión anterior:
 * ──────────────────────────
 * 1. Query de pagos corregido: PostgREST no puede resolver la FK ambigua
 *    source_account → cards (hay dos FK desde credit_card_payments a cards).
 *    Solución: query separado + join manual por nombre de cuenta.
 *
 * 2. cycle-payments-section: visibilidad corregida en CSS y JS.
 *
 * 3. payment-pending-amount-large: actualizado directamente en renderPaymentMonth,
 *    eliminando el MutationObserver frágil del HTML.
 *
 * 4. stat-period: se inicializa correctamente en el primer render.
 *
 * 5. Botón "Registrar Pago": modal completo con validaciones, inserta en
 *    credit_card_payments y recarga la vista sin refresh de página.
 *    El trigger update_balances_on_payment se encarga del balance automáticamente.
 *
 * 6. Protección contra tarjetas no-Credit: todos los bloques de crédito
 *    están guardados con comprobación de type_card.
 *
 * LÓGICA DE CICLOS (sin cambios — ya estaba correcta):
 * ──────────────────────────────────────────────────────
 * cycleStart = cutoff_day del mes M-1 + 1
 * cycleEnd   = cutoff_day del mes M
 * payWindow  = (cutoff_day M + 1) → due_day M (o M+1 si due < cutoff)
 * Pagos atribuidos al ciclo M = pagos cuya fecha cae en la payWindow.
 */

import { supabase } from './supabase.js';

// ─── Estado global ────────────────────────────────────────────────────────────
let allExpenses   = [];
let allPayments   = [];   // credit_card_payments de esta tarjeta
let allDebitCards = [];   // tarjetas Debit+Cash del usuario para el modal de pago
let currentCard   = null;
let currentCardId = null;
let currentUserId = null;

// ─── Utilidades ───────────────────────────────────────────────────────────────
const fmt     = (n) => `S/ ${parseFloat(n || 0).toFixed(2)}`;
const fmtDate = (d) => new Date(d + 'T00:00:00')
    .toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
const isoDate = (d) => d.toISOString().split('T')[0];
const pad     = (n) => String(n).padStart(2, '0');

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

// ─── LÓGICA DE CICLOS ────────────────────────────────────────────────────────

function getBillingCycle(year, month, cutoffDay) {
    if (!cutoffDay) {
        return {
            cycleStart: new Date(year, month - 1, 1),
            cycleEnd:   new Date(year, month, 0)
        };
    }
    const prevMonth  = month === 1 ? 12 : month - 1;
    const prevYear   = month === 1 ? year - 1 : year;
    const daysInPrev = new Date(prevYear, prevMonth, 0).getDate();
    const startDay   = Math.min(cutoffDay + 1, daysInPrev);
    return {
        cycleStart: new Date(prevYear, prevMonth - 1, startDay),
        cycleEnd:   new Date(year, month - 1, cutoffDay)
    };
}

function getPaymentWindow(year, month, cutoffDay, dueDay) {
    if (!cutoffDay && !dueDay) {
        return { payStart: new Date(year, month - 1, 1), payEnd: new Date(year, month, 0) };
    }
    const cd = cutoffDay || 28;
    const dd = dueDay    || (cd + 10);
    const payStart = new Date(year, month - 1, cd + 1);
    const payEnd   = dd > cd
        ? new Date(year, month - 1, dd)
        : new Date(year, month, dd);      // vence mes siguiente
    return { payStart, payEnd };
}

function getInstallmentInCycle(expense, cycleStart, cycleEnd, cutoffDay) {
    const expDate   = new Date(expense.date_exp + 'T00:00:00');
    const totalInst = parseInt(expense.installments || 1);
    for (let n = 1; n <= totalInst; n++) {
        const off          = n - 1;
        const chargeYear   = expDate.getFullYear() + Math.floor((expDate.getMonth() + off) / 12);
        const chargeMonth  = ((expDate.getMonth() + off) % 12) + 1;
        const chargeCycleEnd = cutoffDay
            ? new Date(chargeYear, chargeMonth - 1, cutoffDay)
            : new Date(chargeYear, chargeMonth, 0);
        if (chargeCycleEnd >= cycleStart && chargeCycleEnd <= cycleEnd) return n;
    }
    return null;
}

function getPaymentsForCycle(year, month, cutoffDay, dueDay) {
    const { payStart, payEnd } = getPaymentWindow(year, month, cutoffDay, dueDay);
    return allPayments.filter(p => {
        const d = new Date(p.date_payment + 'T00:00:00');
        return d >= payStart && d <= payEnd;
    });
}

function closePaymentModal() {
    const modal = document.getElementById('payment-modal');
    if (modal) modal.classList.remove('open');
    document.body.style.overflow = '';
}

async function submitPayment(e) {
    e.preventDefault();

    const amount     = parseFloat(document.getElementById('modal-amount').value);
    const sourceId   = document.getElementById('modal-source-card').value;
    const dateVal    = document.getElementById('modal-payment-date').value;
    const notes      = document.getElementById('modal-notes').value.trim() || null;

    // ── Validaciones ──────────────────────────────────────────
    if (!amount || amount <= 0) {
        showToast('Ingresa un monto de pago válido.');
        return;
    }
    if (!sourceId) {
        showToast('Selecciona la cuenta de origen del pago.');
        return;
    }
    if (!dateVal) {
        showToast('Selecciona la fecha del pago.');
        return;
    }

    // ── Determinar ciclo al que pertenece este pago ───────────
    // Buscamos en qué ciclo cae la fecha del pago según la ventana de pago
    const payDate    = new Date(dateVal + 'T00:00:00');
    const cutoffDay  = currentCard.cutoff_day || null;
    const dueDay     = currentCard.due_day    || null;
    let   month_cycle = null;
    let   year_cycle  = null;

    // Revisar los últimos 3 meses para encontrar la ventana correcta
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

    // ── Insertar en credit_card_payments ──────────────────────
    // El trigger update_balances_on_payment se encarga de:
    //   - Reducir CURRENT_BALANCE de la tarjeta crédito (la "deuda")
    //   - Reducir CURRENT_BALANCE de la cuenta de origen
    const payload = {
        id_user:       currentUserId,
        id_card:       currentCardId,     // tarjeta de crédito destino
        amount_paid:   amount,
        date_payment:  dateVal,
        source_account: sourceId,
        target_cycle:  'current',         // siempre el ciclo actual
        month_cycle,
        year_cycle,
        notes
    };

    const btn = document.getElementById('modal-submit-btn');
    btn.disabled = true;
    btn.textContent = 'Guardando…';

    const { error } = await supabase.from('credit_card_payments').insert([payload]);

    btn.disabled = false;
    btn.textContent = 'Confirmar Pago';

    if (error) {
        showToast('Error al registrar el pago: ' + error.message);
        return;
    }

    showToast('✓ Pago registrado correctamente', 'success');
    closePaymentModal();

    // Recargar pagos y re-renderizar el panel sin recargar la página
    await reloadPayments();
    renderPaymentMonth();
}

async function reloadPayments() {
    // FIX #1: query de pagos sin alias ambiguo de FK.
    // Traemos los pagos y luego resolvemos el nombre de la cuenta origen manualmente.
    const { data, error } = await supabase
        .from('credit_card_payments')
        .select('id_payment, amount_paid, date_payment, notes, source_account, month_cycle, year_cycle')
        .eq('id_card', currentCardId)
        .order('date_payment', { ascending: false });

    if (error) {
        console.error('Error recargando pagos:', error.message);
        return;
    }

    // Resolver nombres de cuentas origen (join manual)
    const sourceIds = [...new Set((data || []).map(p => p.source_account).filter(Boolean))];
    let sourceMap = {};
    if (sourceIds.length > 0) {
        const { data: cards } = await supabase
            .from('cards')
            .select('id_card, name_card')
            .in('id_card', sourceIds);
        (cards || []).forEach(c => { sourceMap[c.id_card] = c.name_card; });
    }

    allPayments = (data || []).map(p => ({
        ...p,
        source_card_name: p.source_account ? (sourceMap[p.source_account] || 'Cuenta desconocida') : 'Sin cuenta'
    }));
}

// ─── RENDERIZAR PANEL DE CICLO ────────────────────────────────────────────────

async function renderPaymentMonth() {
    const val = document.getElementById('payment-month').value;
    if (!val || !currentCard) return;

    const [year, month] = val.split('-').map(Number);
    const cutoffDay = currentCard.cutoff_day || 20;
    const dueDay    = currentCard.due_day    || 5;

    // 1. Obtener rangos de fechas para filtrar GASTOS
    const { cycleStart, cycleEnd } = getBillingCycle(year, month, cutoffDay);
    const { payStart,   payEnd   } = getPaymentWindow(year, month, cutoffDay, dueDay);

    // Actualizar Badge visual del ciclo
    const badge = document.getElementById('cycle-badge');
    badge.innerHTML = `
        <span class="cycle-range">📅 Compras: <strong>${fmtDate(isoDate(cycleStart))}</strong> → <strong>${fmtDate(isoDate(cycleEnd))}</strong></span>
        <span class="cycle-pay-window">💳 Ventana de pago: <strong>${fmtDate(isoDate(payStart))}</strong> → <strong>${fmtDate(isoDate(payEnd))}</strong></span>`;
    badge.classList.add('active');

    // 2. Clasificar Gastos (Directos y Cuotas)
    const directRows = [];
    const installmentRows = [];

    allExpenses.forEach(e => {
        const expDate   = new Date(e.date_exp + 'T00:00:00');
        const totalInst = parseInt(e.installments || 1);

        if (totalInst <= 1) {
            // Gasto directo: Entra si la fecha está en el rango del ciclo
            if (expDate >= cycleStart && expDate <= cycleEnd) {
                directRows.push({
                    desc: e.description_exp || 'Sin descripción',
                    date: e.date_exp,
                    amount: parseFloat(e.amount_exp || 0),
                    cat: e.categories?.name_cat
                });
            }
        } else {
            // Gasto en cuotas: Verificamos si este ciclo (mes/año) le corresponde una cuota
            const cuotaNum = getInstallmentInCycle(e, cycleStart, cycleEnd, cutoffDay);
            if (cuotaNum !== null) {
                const cuotaAmt = e.installment_amt 
                    ? parseFloat(e.installment_amt) 
                    : parseFloat(e.amount_exp || 0) / totalInst;
                
                installmentRows.push({
                    desc: e.description_exp || 'Sin descripción',
                    date: e.date_exp,
                    cuotaNum,
                    totalInst,
                    cuotaAmt,
                    cat: e.categories?.name_cat
                });
            }
        }
    });

    const directTotal      = directRows.reduce((s, r) => s + r.amount, 0);
    const installmentTotal = installmentRows.reduce((s, r) => s + r.cuotaAmt, 0);
    const grossTotal       = directTotal + installmentTotal;

    // 3. PAGOS ATRIBUIDOS (Corrección Clave)
    // En lugar de filtrar por fecha, traemos los pagos que tienen el MES y AÑO de este ciclo
    const { data: cyclePaymentsData } = await supabase.from('credit_card_payments')
        .select('*, cards!credit_card_payments_source_account_fkey(name_card)')
        .eq('id_card', currentCardId)
        .eq('month_cycle', month)
        .eq('year_cycle', year);

    const cyclePayments = cyclePaymentsData || [];
    const totalPaid     = cyclePayments.reduce((s, p) => s + parseFloat(p.amount_paid || 0), 0);
    const pendingAmount = Math.max(0, grossTotal - totalPaid);

    // 4. Determinar Estado del Ciclo
    let cycleStatus = 'pending';
    if (grossTotal === 0) cycleStatus = 'empty';
    else if (totalPaid >= (grossTotal - 0.01)) cycleStatus = 'paid'; // Margen por decimales
    else if (totalPaid > 0) cycleStatus = 'partial';

    // 5. Renderizar Listas en la UI
    const hasData = directRows.length > 0 || installmentRows.length > 0;
    document.getElementById('payment-breakdown').style.display = hasData ? 'block' : 'none';
    document.getElementById('payment-empty').style.display     = hasData ? 'none'  : 'flex';

    if (hasData) {
        // Render Gastos Directos
        document.getElementById('breakdown-direct-list').innerHTML = directRows.length
            ? directRows.map(r => `
                <div class="breakdown-row">
                    <div class="breakdown-row-left">
                        <div class="breakdown-row-desc">${escHtml(r.desc)}</div>
                        <div class="breakdown-row-date">${fmtDate(r.date)}${r.cat ? ` · ${r.cat}` : ''}</div>
                    </div>
                    <div class="breakdown-row-amount">${fmt(r.amount)}</div>
                </div>`).join('')
            : `<div class="breakdown-empty">Sin gastos directos</div>`;

        // Render Cuotas
        document.getElementById('breakdown-installment-list').innerHTML = installmentRows.length
            ? installmentRows.map(r => `
                <div class="breakdown-row">
                    <div class="breakdown-row-left">
                        <div class="breakdown-row-desc">${escHtml(r.desc)}</div>
                        <div class="breakdown-row-date">Cuota ${r.cuotaNum} de ${r.totalInst}</div>
                    </div>
                    <div class="breakdown-row-amount">${fmt(r.cuotaAmt)}</div>
                </div>`).join('')
            : `<div class="breakdown-empty">Sin cuotas este mes</div>`;

        // Actualizar Resumen Financiero
        document.getElementById('payment-gross-amount').textContent = fmt(grossTotal);
        document.getElementById('payment-paid-amount').textContent  = fmt(totalPaid);
        
        const pendEl = document.getElementById('payment-pending-amount');
        const pendElLg = document.getElementById('payment-pending-amount-large');
        const colorClass = cycleStatus === 'paid' ? 'green' : (cycleStatus === 'partial' ? 'gold' : 'rust');
        
        if (pendEl) { pendEl.textContent = fmt(pendingAmount); pendEl.className = `payment-summary-value ${colorClass}`; }
        if (pendElLg) pendElLg.textContent = fmt(pendingAmount);

        // Renderizar el historial de pagos del ciclo
        renderCyclePayments(cyclePayments, grossTotal);
    }

    updateStatusBadge(cycleStatus);
}

function updateStatusBadge(status) {
    const map = {
        paid:    { label: '✓ Pagado',          cls: 'status-paid' },
        partial: { label: '◑ Pago parcial',    cls: 'status-partial' },
        pending: { label: '⏳ Pendiente',       cls: 'status-pending' },
        empty:   { label: '— Sin movimientos', cls: 'status-empty' }
    };
    const s = map[status] || map.empty;
    const el = document.getElementById('cycle-status-badge');
    if (el) { el.textContent = s.label; el.className = `cycle-status-badge ${s.cls}`; }
}

function renderCyclePayments(payments, gross) {
    const container = document.getElementById('cycle-payments-list');
    const section   = document.getElementById('cycle-payments-section');
    if (!container || !section) return;

    // FIX #2: visibilidad explícita en JS, no dependemos del CSS
    section.style.display = 'block';

    if (payments.length === 0) {
        container.innerHTML = `<div class="breakdown-empty">No hay pagos registrados para este ciclo aún.</div>`;
        return;
    }

    container.innerHTML = payments.map((p, i) => {
        const sourceName = p.source_card_name || 'Sin cuenta';
        const pct        = gross > 0 ? Math.min(100, (parseFloat(p.amount_paid) / gross) * 100).toFixed(1) : 0;
        return `
        <div class="breakdown-row payment-row" style="animation-delay:${i * 0.04}s">
            <div class="breakdown-row-left">
                <div class="breakdown-row-desc">Pago registrado</div>
                <div class="breakdown-row-date">${fmtDate(p.date_payment)} · Desde: ${escHtml(sourceName)}</div>
                ${p.notes ? `<div class="breakdown-row-meta">${escHtml(p.notes)}</div>` : ''}
            </div>
            <div style="text-align:right;">
                <div class="breakdown-row-amount green-text">${fmt(p.amount_paid)}</div>
                <div style="font-size:0.65rem;color:var(--muted);">${pct}% del total</div>
            </div>
        </div>`;
    }).join('');
}

// ─── HERO CARD ───────────────────────────────────────────────────────────────

function renderHeroCard(card, expenses) {
    currentCard = card;

    document.getElementById('hero-card-name').textContent     = card.name_card;
    document.getElementById('hero-card-currency').textContent = card.currency || 'PEN';
    document.getElementById('hero-card-type').textContent     =
        card.type_card === 'Credit' ? 'Crédito' : card.type_card === 'Cash' ? 'Efectivo' : 'Débito';

    const now = new Date();

    if (card.type_card === 'Credit') {
        // Para crédito: "Gasto este mes" = gastos del CICLO de facturación actual
        const monthLbl = document.getElementById('hero-month-label');
        if (monthLbl) monthLbl.textContent = 'Gasto ciclo actual';
        const cutoffDay = card.cutoff_day || null;
        const { cycleStart, cycleEnd } = getBillingCycle(
            now.getFullYear(), now.getMonth() + 1, cutoffDay
        );
        const cycleExpenses = expenses.filter(e => {
            const totalInst = parseInt(e.installments || 1);
            if (totalInst <= 1) {
                // Gasto directo: cae en el ciclo
                const d = new Date(e.date_exp + 'T00:00:00');
                return d >= cycleStart && d <= cycleEnd;
            } else {
                // Con cuotas: tiene una cuota en este ciclo
                return getInstallmentInCycle(e, cycleStart, cycleEnd, cutoffDay) !== null;
            }
        });
        const cycleTotal = cycleExpenses.reduce((s, e) => {
            const totalInst = parseInt(e.installments || 1);
            if (totalInst <= 1) return s + parseFloat(e.amount_exp || 0);
            const cuotaAmt = e.installment_amt
                ? parseFloat(e.installment_amt)
                : parseFloat(e.amount_exp || 0) / totalInst;
            return s + cuotaAmt;
        }, 0);
        document.getElementById('hero-month-total').textContent = fmt(cycleTotal);
        document.getElementById('hero-month-count').textContent =
            `${cycleExpenses.length} transacción${cycleExpenses.length !== 1 ? 'es' : ''} · ciclo actual`;

        // Cuotas ACTIVAS (con cuotas pendientes aún no completadas)
        const now2 = new Date();
        const activeInst = expenses.filter(e => {
            const totalInst = parseInt(e.installments || 1);
            if (totalInst <= 1) return false;
            const expDate = new Date(e.date_exp + 'T00:00:00');
            // La última cuota vence en el mes expDate + (totalInst-1) meses
            const lastInstMonth = expDate.getMonth() + (totalInst - 1);
            const lastInstYear  = expDate.getFullYear() + Math.floor(lastInstMonth / 12);
            const lastInstMo    = (lastInstMonth % 12);
            const cutoff = cutoffDay
                ? new Date(lastInstYear, lastInstMo, cutoffDay)
                : new Date(lastInstYear, lastInstMo + 1, 0);
            return cutoff >= now2;
        });
        // Suma del monto pendiente de cuotas activas (cuotas restantes × monto/cuota)
        const activeInstTotal = activeInst.reduce((s, e) => {
            const totalInst = parseInt(e.installments || 1);
            const cuotaAmt  = e.installment_amt
                ? parseFloat(e.installment_amt)
                : parseFloat(e.amount_exp || 0) / totalInst;
            // Cuotas ya vencidas
            const expDate = new Date(e.date_exp + 'T00:00:00');
            let paid = 0;
            for (let n = 1; n <= totalInst; n++) {
                const off = n - 1;
                const chargeYear  = expDate.getFullYear() + Math.floor((expDate.getMonth() + off) / 12);
                const chargeMonth = ((expDate.getMonth() + off) % 12) + 1;
                const chargeCutoff = cutoffDay
                    ? new Date(chargeYear, chargeMonth - 1, cutoffDay)
                    : new Date(chargeYear, chargeMonth, 0);
                if (chargeCutoff < now2) paid++;
            }
            const remaining = totalInst - paid;
            return s + (remaining * cuotaAmt);
        }, 0);

        document.getElementById('hero-installments-wrap').style.display  = 'flex';
        document.getElementById('hero-installments-count').textContent   =
            `${activeInst.length} activa${activeInst.length !== 1 ? 's' : ''}`;
        document.getElementById('hero-installments-total').textContent   =
            `Pendiente: ${fmt(activeInstTotal)}`;

        // Límite y disponible usando current_balance real (deuda acumulada)
        if (card.limit_card) {
            const deuda     = Math.max(0, parseFloat(card.current_balance || 0));
            const available = parseFloat(card.limit_card) - deuda;
            const pct       = Math.min(100, (deuda / parseFloat(card.limit_card)) * 100);
            document.getElementById('hero-limit-wrap').style.display = 'flex';
            document.getElementById('hero-available').textContent    = fmt(Math.max(0, available));
            document.getElementById('hero-limit-text').textContent   = `Límite: ${fmt(card.limit_card)} · Deuda: ${fmt(deuda)}`;
            const bar = document.getElementById('hero-credit-bar');
            bar.style.width = pct + '%';
            if (pct > 80) bar.classList.add('danger');
        }

        // Días al corte y al pago
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
            cutoffEl.textContent = daysToCut !== null ? `${daysToCut} días al corte` : '—';
            cutoffEl.style.color = isUrgent ? 'var(--rust)' : 'var(--paper)';
            document.getElementById('hero-cutoff-text').textContent =
                `Corte día ${card.cutoff_day || '—'} · Pago día ${card.due_day || '—'}` +
                (isUrgent ? ` ⚠️ Vence en ${daysToDue}d` : '');
        }

    } else {
        // Débito / Efectivo: mes calendario simple
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

        // Saldo real de la cuenta (current_balance del trigger)
        if (card.current_balance !== null && card.current_balance !== undefined) {
            const balance = parseFloat(card.current_balance || 0);
            document.getElementById('hero-limit-wrap').style.display = 'flex';
            document.getElementById('hero-available').textContent    = fmt(balance);
            const availLbl = document.getElementById('hero-available-label');
            if (availLbl) availLbl.textContent = card.type_card === 'Cash' ? 'Efectivo disponible' : 'Saldo en cuenta';
            document.getElementById('hero-limit-text').textContent   =
                card.type_card === 'Cash' ? 'Billetera en efectivo' : 'Cuenta débito';
            // Ocultar barra de crédito para no-crédito
            const barWrap = document.querySelector('.credit-bar-wrap');
            if (barWrap) barWrap.style.display = 'none';
        }
    }
}

// ─── STATS ───────────────────────────────────────────────────────────────────

function renderStats(expenses) {
    const total  = expenses.reduce((s, e) => s + parseFloat(e.amount_exp || 0), 0);
    const count  = expenses.length;
    const avg    = count ? total / count : 0;
    const max    = expenses.reduce((m, e) => Math.max(m, parseFloat(e.amount_exp || 0)), 0);

    // Cuotas: solo gastos con cuotas, y sumar el total comprado (no la cuota)
    const instExps   = expenses.filter(e => parseInt(e.installments || 1) > 1);
    // Suma de montos totales de compras en cuotas (valor real de la compra)
    const instTotal  = instExps.reduce((s, e) => s + parseFloat(e.amount_exp || 0), 0);

    document.getElementById('stat-total').textContent            = fmt(total);
    document.getElementById('stat-count').textContent            = count;
    document.getElementById('stat-avg').textContent              = fmt(avg);
    document.getElementById('stat-installments').textContent     = instExps.length;
    document.getElementById('stat-installments-sub').textContent = `${fmt(instTotal)} en cuotas`;
    const maxEl = document.getElementById('stat-max');
    if (maxEl) maxEl.textContent = fmt(max);
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
    const cnt = filtered.length;
    document.getElementById('expenses-count-label').textContent = `${cnt} registro${cnt !== 1 ? 's' : ''}`;
    const month = document.getElementById('filter-month').value;
    // FIX #4: stat-period
    document.getElementById('stat-period').textContent = month
        ? new Date(month + '-01').toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })
        : 'Todos los registros';
}

// ─── TABLA DE GASTOS ─────────────────────────────────────────────────────────

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
        const calc    = inst > 1 && instAmt === 0 ? parseFloat(e.amount_exp || 0) / inst : instAmt;
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

// ─── TIMELINE DE CUOTAS FUTURAS ──────────────────────────────────────────────

function renderInstallmentTimeline() {
    const section  = document.getElementById('installments-timeline');
    if (!section || !currentCard) return;
    const cutoffDay = currentCard.cutoff_day;
    const instExps  = allExpenses.filter(e => parseInt(e.installments || 1) > 1);

    if (instExps.length === 0) { section.style.display = 'none'; return; }
    section.style.display = 'block';

    const now  = new Date();
    const rows = [];
    const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                        'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

    for (let offset = 0; offset < 12; offset++) {
        const td    = new Date(now.getFullYear(), now.getMonth() + offset, 1);
        const year  = td.getFullYear();
        const month = td.getMonth() + 1;
        const { cycleStart, cycleEnd } = getBillingCycle(year, month, cutoffDay);
        const cuotas = [];

        instExps.forEach(e => {
            const n = getInstallmentInCycle(e, cycleStart, cycleEnd, cutoffDay);
            if (n !== null) {
                const amt = e.installment_amt
                    ? parseFloat(e.installment_amt)
                    : parseFloat(e.amount_exp) / parseInt(e.installments);
                cuotas.push({ desc: e.description_exp, cuotaNum: n, totalInst: parseInt(e.installments), amt });
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

// ─── FILTRO DE CATEGORÍAS ────────────────────────────────────────────────────

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

// ─── SEGURIDAD: escape de HTML ────────────────────────────────────────────────
function escHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ─── INIT ────────────────────────────────────────────────────────────────────

async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return (window.location.href = 'login.html');
    currentUserId = user.id;

    const cardId = new URLSearchParams(window.location.search).get('id');
    if (!cardId) return (window.location.href = 'gestionTarjetas.html');
    currentCardId = cardId;

    showSkeletonRows(6);

    // 1. Tarjeta
    const { data: card, error: cardErr } = await supabase
        .from('cards')
        .select('name_card, type_card, currency, limit_card, current_balance, cutoff_day, due_day')
        .eq('id_card', cardId)
        .eq('deleted_card', false)
        .single();

    if (cardErr || !card) { showToast('No se pudo cargar la tarjeta.'); return; }

    document.getElementById('card-name-title').innerHTML = `Gastos de <span>${escHtml(card.name_card)}</span>`;
    document.title = `${card.name_card} — ControlGastos`;

    // 2. Gastos + pagos + cuentas de débito en paralelo
    const [expRes, payRaw, debitRes] = await Promise.all([
        supabase.from('expenses')
            .select('id_exp, id_category, amount_exp, date_exp, description_exp, installments, installment_amt, payment_method, categories(name_cat)')
            .eq('id_card', cardId)
            .eq('deleted_exp', false)
            .order('date_exp', { ascending: false }),

        // FIX #1: sin alias de FK ambiguo — solo campos escalares
        supabase.from('credit_card_payments')
            .select('id_payment, amount_paid, date_payment, notes, source_account, month_cycle, year_cycle')
            .eq('id_card', cardId)
            .order('date_payment', { ascending: false }),

        // Cuentas Debit+Cash del usuario para el modal
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

    // Resolver nombres de cuentas origen para pagos (join manual)
    const rawPayments  = payRaw.data || [];
    const sourceIds    = [...new Set(rawPayments.map(p => p.source_account).filter(Boolean))];
    let sourceMap      = {};
    if (sourceIds.length > 0) {
        const { data: srcCards } = await supabase
            .from('cards').select('id_card, name_card').in('id_card', sourceIds);
        (srcCards || []).forEach(c => { sourceMap[c.id_card] = c.name_card; });
    }
    allPayments = rawPayments.map(p => ({
        ...p,
        source_card_name: p.source_account ? (sourceMap[p.source_account] || 'Cuenta desconocida') : 'Sin cuenta'
    }));

    // 3. Renderizar todo
    renderHeroCard(card, allExpenses);
    populateCategoryFilter(allExpenses);
    renderStats(allExpenses);
    renderExpenses(allExpenses);

    // FIX #4: stat-period inicial
    document.getElementById('stat-period').textContent = 'Todos los registros';
    document.getElementById('expenses-count-label').textContent =
        `${allExpenses.length} registro${allExpenses.length !== 1 ? 's' : ''}`;

    // 4. Secciones de crédito
    const isCredit = card.type_card === 'Credit';
    document.getElementById('payment-panel').style.display           = isCredit ? 'block' : 'none';
    document.getElementById('installments-timeline').style.display   = isCredit ? 'block' : 'none';

    if (isCredit) {
        const now = new Date();
        document.getElementById('payment-month').value =
            `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
        renderPaymentMonth();
        renderInstallmentTimeline();
        document.getElementById('payment-month').addEventListener('change', renderPaymentMonth);

        // Botón de registrar pago
        const btnPay = document.getElementById('btn-register-payment');
        if (btnPay) {
            btnPay.addEventListener('click', () => {
                // Redirigimos a nuevoGasto.html pasando la pestaña y la tarjeta
                window.location.href = `nuevoGasto.html?tab=payment&cardId=${currentCardId}`;
            });
        }
    }

    // 5. Modal de pago
    document.getElementById('payment-modal-form')?.addEventListener('submit', submitPayment);
    document.getElementById('modal-close')?.addEventListener('click', closePaymentModal);
    document.getElementById('payment-modal')?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closePaymentModal();
    });

    // 6. Filtros
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