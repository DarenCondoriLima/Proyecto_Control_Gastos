import { supabase } from './supabase.js';

// ─────────────────────────────────────────────
// UTILIDADES DE CICLO
// ─────────────────────────────────────────────

/**
 * Calcula el rango de fechas del ciclo actual basado en el día de corte.
 * Lógica: si hoy es día 15 y el corte es el 20, el ciclo va del 21 del mes anterior al 20 del mes actual.
 *         si hoy es día 25 y el corte es el 20, el ciclo va del 21 del mes actual al 20 del mes siguiente.
 *
 * @param {number} cutoffDay - Día de corte de la tarjeta (1-31)
 * @returns {{ startDate: Date, endDate: Date, startStr: string, endStr: string }}
 */
function getCurrentCycle(cutoffDay) {
    const today = new Date();
    const day   = today.getDate();
    const month = today.getMonth();   // 0-indexed
    const year  = today.getFullYear();

    let startDate, endDate;

    if (day > cutoffDay) {
        // Ya pasamos el corte: ciclo actual va de (corte+1 de este mes) a (corte del mes siguiente)
        startDate = new Date(year, month, cutoffDay + 1);
        endDate   = new Date(year, month + 1, cutoffDay);
    } else {
        // Aún no llegamos al corte: ciclo actual va de (corte+1 del mes anterior) a (corte de este mes)
        startDate = new Date(year, month - 1, cutoffDay + 1);
        endDate   = new Date(year, month, cutoffDay);
    }

    return {
        startDate,
        endDate,
        startStr: toDateStr(startDate),
        endStr:   toDateStr(endDate),
    };
}

/**
 * Calcula la próxima fecha de vencimiento (due_day) a partir de la fecha de corte.
 * Normalmente la fecha de vencimiento es X días después del corte.
 *
 * @param {number} dueDay  - Día de pago/vencimiento configurado en la tarjeta
 * @param {Date}   endDate - Fecha de fin del ciclo actual (= día de corte)
 * @returns {Date}
 */
function getNextDueDate(dueDay, endDate) {
    // El due_day cae en el mismo mes del corte o en el mes siguiente
    const cutoffMonth = endDate.getMonth();
    const cutoffYear  = endDate.getFullYear();

    // Si el día de pago es mayor al día de corte, cae en el mismo mes
    // Si es menor o igual, cae en el mes siguiente al corte
    if (dueDay > endDate.getDate()) {
        return new Date(cutoffYear, cutoffMonth, dueDay);
    } else {
        return new Date(cutoffYear, cutoffMonth + 1, dueDay);
    }
}

/** Convierte una Date a string YYYY-MM-DD sin problemas de zona horaria */
function toDateStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/** Formatea Date a texto legible en español: "20 ene. 2025" */
function formatDate(date) {
    return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Formatea número como moneda peruana */
function formatAmount(amount) {
    return `S/ ${Math.max(0, amount).toFixed(2)}`;
}

/** Devuelve cuántos días faltan (o pasaron) para una fecha */
function daysUntil(targetDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.round((targetDate - today) / (1000 * 60 * 60 * 24));
    return diff;
}


// ─────────────────────────────────────────────
// RENDERIZADO
// ─────────────────────────────────────────────

function buildCardHTML(card, metrics) {
    const {
        currentBalance,       // current_balance desde BD (deuda histórica neta)
        cycleExpenses,        // gastos dentro del ciclo actual
        cyclePayments,        // pagos dentro del ciclo actual
        cycleDebt,            // deuda neta del ciclo (gastos - pagos del ciclo)
        available,            // límite - currentBalance
        usagePercent,         // % de uso del límite
        dueDate,              // próximo vencimiento
        daysLeft,             // días hasta vencimiento
        cycle,                // { startStr, endStr }
    } = metrics;

    const isWarning   = usagePercent > 80;
    const isOverdue   = daysLeft < 0;
    const isDueSoon   = daysLeft >= 0 && daysLeft <= 5;

    const dueBadgeClass = isOverdue   ? 'badge-danger'
                        : isDueSoon   ? 'badge-warning'
                        : 'badge-ok';

    const dueLabel = isOverdue  ? `Vencida hace ${Math.abs(daysLeft)}d`
                   : daysLeft === 0 ? '¡Vence hoy!'
                   : `Vence en ${daysLeft}d`;

    const cardLastDigits = card.id_card.slice(-4).toUpperCase();

    return `
    <div class="credit-card-ui ${isWarning ? 'card-warning' : ''}"
         onclick="window.location.href='detalleTarjeta.html?id=${card.id_card}'"
         style="cursor:pointer">

        <!-- HEADER -->
        <div class="card-header">
            <div>
                <div class="card-chip"></div>
                <div class="card-name">${card.name_card}</div>
                <div class="card-number">**** **** **** ${cardLastDigits}</div>
            </div>
            <div class="card-badges">
                <span class="status-badge ${isWarning ? 'status-warning' : 'status-ok'}">
                    ${usagePercent.toFixed(0)}% usado
                </span>
            </div>
        </div>

        <!-- SEPARADOR -->
        <div class="card-divider"></div>

        <!-- MÉTRICAS PRINCIPALES -->
        <div class="card-metrics-grid">

            <div class="metric-block">
                <div class="card-label">Deuda Total Actual</div>
                <div class="card-value highlight">${formatAmount(currentBalance)}</div>
                <div class="card-sublabel">Saldo acumulado histórico</div>
            </div>

            <div class="metric-block">
                <div class="card-label">Disponible</div>
                <div class="card-value">${formatAmount(available)}</div>
                <div class="card-sublabel">Límite: S/ ${Number(card.limit_card).toFixed(2)}</div>
            </div>

        </div>

        <!-- CICLO ACTUAL -->
        <div class="cycle-section">
            <div class="cycle-header">
                <span class="cycle-label">Ciclo actual</span>
                <span class="cycle-dates">${formatDate(new Date(cycle.startStr + 'T00:00:00'))} — ${formatDate(new Date(cycle.endStr + 'T00:00:00'))}</span>
            </div>
            <div class="cycle-metrics">
                <div class="cycle-metric">
                    <span class="cycle-metric-label">Gastos del ciclo</span>
                    <span class="cycle-metric-value expense">S/ ${cycleExpenses.toFixed(2)}</span>
                </div>
                <div class="cycle-metric">
                    <span class="cycle-metric-label">Pagos del ciclo</span>
                    <span class="cycle-metric-value payment">S/ ${cyclePayments.toFixed(2)}</span>
                </div>
                <div class="cycle-metric cycle-metric-total">
                    <span class="cycle-metric-label">Saldo del ciclo</span>
                    <span class="cycle-metric-value ${cycleDebt > 0 ? 'expense' : 'payment'}">S/ ${cycleDebt.toFixed(2)}</span>
                </div>
            </div>
        </div>

        <!-- VENCIMIENTO -->
        ${card.due_day ? `
        <div class="due-section">
            <span class="due-icon">📅</span>
            <div class="due-info">
                <span class="due-label">Próx. vencimiento: ${formatDate(dueDate)}</span>
                <span class="due-badge ${dueBadgeClass}">${dueLabel}</span>
            </div>
        </div>
        ` : ''}

        <!-- BARRA DE USO -->
        <div class="usage-bar-wrap">
            <div class="usage-bar">
                <div class="usage-fill ${isWarning ? 'fill-warning' : 'fill-ok'}"
                     style="width: ${Math.min(usagePercent, 100).toFixed(1)}%"></div>
            </div>
        </div>

    </div>`;
}


// ─────────────────────────────────────────────
// FUNCIÓN PRINCIPAL
// ─────────────────────────────────────────────

async function loadCreditDashboard() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const container = document.getElementById('credit-summary-grid');
    container.innerHTML = '<div class="loading-state">Cargando tarjetas...</div>';

    // 1. Obtener tarjetas de crédito activas
    const { data: cards, error: cardsError } = await supabase
        .from('cards')
        .select('*')
        .eq('id_user', user.id)
        .eq('type_card', 'Credit')
        .eq('deleted_card', false);

    if (cardsError || !cards?.length) {
        container.innerHTML = '<div class="empty-state">No tienes tarjetas de crédito registradas.</div>';
        return;
    }

    container.innerHTML = '';

    for (const card of cards) {
        const cutoffDay = card.cutoff_day || 20;
        const dueDay    = card.due_day    || null;
        const cycle     = getCurrentCycle(cutoffDay);

        // ── 2. Gastos del ciclo actual (payment_method = Credit para esta tarjeta) ──
        const { data: cycleExpData } = await supabase
            .from('expenses')
            .select('amount_exp')
            .eq('id_card', card.id_card)
            .eq('payment_method', 'Credit')
            .eq('deleted_exp', false)
            .gte('date_exp', cycle.startStr)
            .lte('date_exp', cycle.endStr);

        const cycleExpenses = cycleExpData?.reduce((acc, r) => acc + parseFloat(r.amount_exp), 0) ?? 0;

        // ── 3. Pagos del ciclo actual realizados a esta tarjeta ──
        const { data: cyclePayData } = await supabase
            .from('credit_card_payments')
            .select('amount_paid')
            .eq('id_card', card.id_card)
            .gte('date_payment', cycle.startStr)
            .lte('date_payment', cycle.endStr);

        const cyclePayments = cyclePayData?.reduce((acc, r) => acc + parseFloat(r.amount_paid), 0) ?? 0;

        // ── 4. Métricas derivadas ──
        // current_balance en tarjetas de crédito = deuda acumulada (gestionado por triggers)
        const currentBalance = parseFloat(card.current_balance) || 0;
        const limitCard      = parseFloat(card.limit_card)      || 0;
        const available      = limitCard - currentBalance;
        const usagePercent   = limitCard > 0 ? (currentBalance / limitCard) * 100 : 0;
        const cycleDebt      = cycleExpenses - cyclePayments;

        // ── 5. Próxima fecha de vencimiento ──
        let dueDate  = null;
        let daysLeft = null;
        if (dueDay) {
            dueDate  = getNextDueDate(dueDay, cycle.endDate);
            daysLeft = daysUntil(dueDate);
        }

        // ── 6. Log de depuración ──
        console.table({
            tarjeta:          card.name_card,
            ciclo_inicio:     cycle.startStr,
            ciclo_fin:        cycle.endStr,
            gastos_ciclo:     cycleExpenses,
            pagos_ciclo:      cyclePayments,
            deuda_ciclo:      cycleDebt,
            deuda_historica:  currentBalance,
            disponible:       available,
            uso_pct:          `${usagePercent.toFixed(1)}%`,
            proximo_venc:     dueDate ? toDateStr(dueDate) : 'N/A',
            dias_venc:        daysLeft,
        });

        // ── 7. Render ──
        container.innerHTML += buildCardHTML(card, {
            currentBalance,
            cycleExpenses,
            cyclePayments,
            cycleDebt,
            available,
            usagePercent,
            dueDate,
            daysLeft,
            cycle,
        });
    }
}

document.addEventListener('DOMContentLoaded', loadCreditDashboard);