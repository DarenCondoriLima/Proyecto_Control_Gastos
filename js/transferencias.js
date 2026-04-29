/**
 * transferencias.js — ControlGastos
 *
 * Flujo:
 *  1. Cargar todas las cuentas del usuario (Cash, Debit, Credit)
 *  2. Usuario elige origen y destino (no pueden ser iguales)
 *  3. Validar que el monto no supere el saldo disponible en origen
 *  4. Guardar en tabla `transfers` (historial)
 *  5. Actualizar current_balance en origin (-) y destination (+)
 *
 * Tabla transfers (SQL al pie del archivo):
 *   id_transfer UUID PK
 *   id_user     UUID
 *   id_from     UUID (FK cards)
 *   id_to       UUID (FK cards)
 *   amount      NUMERIC(15,2)
 *   date_transfer DATE
 *   notes       TEXT
 *   created_at  TIMESTAMPTZ
 */

import { supabase } from './supabase.js';

// ═══════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════
let allCards      = [];   // { id_card, name_card, type_card, current_balance }
let selectedOrigin = null; // id_card
let selectedDest   = null; // id_card
let allTransfers   = [];   // historial completo
let currentFilter  = 'all';

// ═══════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════
const fmt     = (n)  => `S/ ${parseFloat(n || 0).toFixed(2)}`;
const fmtDate = (d)  => new Date(d + 'T00:00:00').toLocaleDateString('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric'
});

function showToast(msg, kind = 'success') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = `toast ${kind} show`;
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove('show'), 3500);
}

function setLoading(loading) {
    const btn   = document.getElementById('submit-btn');
    const label = document.getElementById('submit-label');
    btn.disabled    = loading || !canSubmit();
    label.textContent = loading ? 'Procesando…' : buildSubmitLabel();
}

function canSubmit() {
    return selectedOrigin && selectedDest && selectedOrigin !== selectedDest;
}

function buildSubmitLabel() {
    if (!selectedOrigin && !selectedDest) return 'Selecciona origen y destino';
    if (!selectedOrigin) return 'Selecciona la cuenta de origen';
    if (!selectedDest)   return 'Selecciona la cuenta de destino';
    const from = allCards.find(c => c.id_card === selectedOrigin);
    const to   = allCards.find(c => c.id_card === selectedDest);
    return `Transferir de ${from?.name_card} a ${to?.name_card}`;
}

function cardTypeLabel(type) {
    return { Cash: 'Efectivo', Debit: 'Débito', Credit: 'Crédito' }[type] || type;
}
function cardTypeIcon(type) {
    return { Cash: '💵', Debit: '💳', Credit: '🏦' }[type] || '🏦';
}

// ═══════════════════════════════════════════════════════════════
// SETUP MONTO — comas/puntos, solo números
// ═══════════════════════════════════════════════════════════════
function setupAmountInput() {
    const input = document.getElementById('transfer-amount');
    input.addEventListener('input', e => {
        e.target.value = e.target.value
            .replace(',', '.')
            .replace(/[^0-9.]/g, '')
            .replace(/(\..*)\./g, '$1');
        updateBalanceIndicator();
        updateSubmitState();
    });
    input.addEventListener('blur', e => {
        const v = parseFloat(e.target.value);
        if (!isNaN(v) && v > 0) e.target.value = v.toFixed(2);
        updateBalanceIndicator();
    });
}

// ═══════════════════════════════════════════════════════════════
// RENDERIZAR GRILLAS DE CUENTAS
// ═══════════════════════════════════════════════════════════════
function renderAccountGrids() {
    const originGrid = document.getElementById('origin-grid');
    const destGrid   = document.getElementById('dest-grid');

    if (allCards.length === 0) {
        const empty = '<div style="color:var(--muted);font-size:0.8rem;grid-column:1/-1;padding:1rem;background:var(--cream);border-radius:var(--radius-sm);">No tienes cuentas registradas.</div>';
        originGrid.innerHTML = empty;
        destGrid.innerHTML   = empty;
        return;
    }

    originGrid.innerHTML = '';
    destGrid.innerHTML   = '';

    allCards.forEach(c => {
        const bal     = parseFloat(c.current_balance || 0);
        const balCls  = bal > 0 ? 'positive' : bal < 0 ? 'negative' : 'zero';
        const isOriginSel = c.id_card === selectedOrigin;
        const isDestSel   = c.id_card === selectedDest;
        const disabledOrg = (selectedDest === c.id_card);
        const disabledDst = (selectedOrigin === c.id_card);

        const cardHtml = (role) => {
            const isSelected  = role === 'origin' ? isOriginSel : isDestSel;
            const isDisabled  = role === 'origin' ? disabledOrg : disabledDst;
            const selectedCls = isSelected
                ? (role === 'origin' ? 'selected-origin' : 'selected-dest')
                : '';
            const disabledCls = isDisabled ? 'disabled-card' : '';
            const roleLabel   = role === 'origin' ? 'Origen' : 'Destino';

            return `
            <div class="account-card ${selectedCls} ${disabledCls}"
                 data-id="${c.id_card}" data-role="${role}">
                <span class="ac-role-badge">${roleLabel}</span>
                <div class="ac-icon">${cardTypeIcon(c.type_card)}</div>
                <div class="ac-name" title="${c.name_card}">${c.name_card}</div>
                <div class="ac-type">${cardTypeLabel(c.type_card)}</div>
                <div class="ac-balance ${balCls}">${fmt(bal)}</div>
            </div>`;
        };

        originGrid.insertAdjacentHTML('beforeend', cardHtml('origin'));
        destGrid.insertAdjacentHTML('beforeend',   cardHtml('dest'));
    });

    // Eventos de click
    originGrid.querySelectorAll('.account-card:not(.disabled-card)').forEach(el => {
        el.addEventListener('click', () => selectCard('origin', el.dataset.id));
    });
    destGrid.querySelectorAll('.account-card:not(.disabled-card)').forEach(el => {
        el.addEventListener('click', () => selectCard('dest', el.dataset.id));
    });
}

function selectCard(role, cardId) {
    if (role === 'origin') {
        selectedOrigin = selectedOrigin === cardId ? null : cardId;
        // Si el destino era el mismo, limpiarlo
        if (selectedDest === selectedOrigin) selectedDest = null;
    } else {
        selectedDest = selectedDest === cardId ? null : cardId;
        if (selectedOrigin === selectedDest) selectedOrigin = null;
    }

    renderAccountGrids();
    updatePreviewBar();
    updateBalanceIndicator();
    updateArrow();
    updateSubmitState();
}

// ═══════════════════════════════════════════════════════════════
// UI DE ESTADO
// ═══════════════════════════════════════════════════════════════
function updatePreviewBar() {
    const bar = document.getElementById('preview-bar');
    if (!selectedOrigin || !selectedDest) {
        bar.classList.remove('visible'); return;
    }
    const from = allCards.find(c => c.id_card === selectedOrigin);
    const to   = allCards.find(c => c.id_card === selectedDest);
    document.getElementById('preview-origin-name').textContent = `${cardTypeIcon(from.type_card)} ${from.name_card}`;
    document.getElementById('preview-dest-name').textContent   = `${cardTypeIcon(to.type_card)} ${to.name_card}`;
    bar.classList.add('visible');
}

function updateArrow() {
    const icon = document.getElementById('arrow-icon');
    icon.classList.toggle('ready', !!(selectedOrigin && selectedDest));
}

function updateBalanceIndicator() {
    const indicator = document.getElementById('balance-indicator');
    const hero      = document.getElementById('amount-hero');

    if (!selectedOrigin) {
        indicator.classList.remove('show', 'warn');
        hero.classList.remove('error-state');
        return;
    }

    const card   = allCards.find(c => c.id_card === selectedOrigin);
    const bal    = parseFloat(card?.current_balance || 0);
    const amount = parseFloat(document.getElementById('transfer-amount').value) || 0;
    const insuf  = amount > 0 && amount > bal;

    indicator.classList.add('show');
    indicator.classList.toggle('warn', insuf);
    hero.classList.toggle('error-state', insuf);

    indicator.querySelector('.bal-value').textContent  = fmt(bal);
    indicator.querySelector('.bal-value').style.color  = insuf ? 'var(--rust)' : 'var(--sage)';
    indicator.querySelector('.bal-icon').textContent   = insuf ? '⚠️' : '✓';

    const alertEl = indicator.querySelector('.bal-alert');
    if (insuf) {
        alertEl.textContent   = `Faltan ${fmt(amount - bal)}`;
        alertEl.style.display = 'block';
    } else {
        alertEl.style.display = 'none';
    }
}

function updateSubmitState() {
    const btn    = document.getElementById('submit-btn');
    const label  = document.getElementById('submit-label');
    const amount = parseFloat(document.getElementById('transfer-amount').value) || 0;
    const card   = allCards.find(c => c.id_card === selectedOrigin);
    const bal    = parseFloat(card?.current_balance || 0);
    const insuf  = amount > 0 && amount > bal;

    const ready  = canSubmit() && amount > 0 && !insuf;
    btn.disabled = !ready;
    label.textContent = buildSubmitLabel();
}

// ═══════════════════════════════════════════════════════════════
// HISTORIAL
// ═══════════════════════════════════════════════════════════════
function filterTransfers() {
    const now = new Date();
    if (currentFilter === 'all') return allTransfers;

    return allTransfers.filter(t => {
        const d = new Date(t.date_transfer + 'T00:00:00');
        if (currentFilter === 'month') {
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }
        if (currentFilter === 'week') {
            const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
            return d >= weekAgo;
        }
        return true;
    });
}

function renderHistory() {
    const list    = document.getElementById('history-list');
    const countEl = document.getElementById('history-count');
    const filtered = filterTransfers();

    countEl.textContent = `${filtered.length} transferencia${filtered.length !== 1 ? 's' : ''}`;

    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="history-empty">
                <div class="history-empty-icon">↔️</div>
                <p>No hay transferencias en este periodo.</p>
            </div>`;
        return;
    }

    list.innerHTML = filtered.map((t, i) => {
        const fromCard = allCards.find(c => c.id_card === t.id_from);
        const toCard   = allCards.find(c => c.id_card === t.id_to);
        const fromName = fromCard ? `${cardTypeIcon(fromCard.type_card)} ${fromCard.name_card}` : (t.cards_from?.name_card || '?');
        const toName   = toCard   ? `${cardTypeIcon(toCard.type_card)} ${toCard.name_card}`     : (t.cards_to?.name_card   || '?');

        return `
        <div class="tx-item" style="animation-delay:${i * 0.04}s">
            <div class="tx-icon-wrap">↔️</div>
            <div class="tx-body">
                <div class="tx-route">
                    <span class="from-name">${fromName}</span>
                    <span class="arrow">→</span>
                    <span class="to-name">${toName}</span>
                </div>
                <div class="tx-date">${fmtDate(t.date_transfer)}</div>
                ${t.notes ? `<div class="tx-note">${t.notes}</div>` : ''}
            </div>
            <div class="tx-amount">${fmt(t.amount)}</div>
        </div>`;
    }).join('');
}

// ═══════════════════════════════════════════════════════════════
// GUARDAR TRANSFERENCIA
// ═══════════════════════════════════════════════════════════════
async function saveTransfer(userId) {
    const amount = parseFloat(document.getElementById('transfer-amount').value);
    const date   = document.getElementById('transfer-date').value;
    const notes  = document.getElementById('transfer-note').value.trim() || null;

    // ── Validaciones ────────────────────────────────────────
    if (!selectedOrigin || !selectedDest) {
        showToast('Selecciona la cuenta de origen y destino.', 'error'); return;
    }
    if (selectedOrigin === selectedDest) {
        showToast('Origen y destino no pueden ser la misma cuenta.', 'error'); return;
    }
    if (isNaN(amount) || amount <= 0) {
        showToast('Ingresa un monto válido mayor a 0.', 'error'); return;
    }
    if (!date) {
        showToast('Selecciona la fecha de la transferencia.', 'error'); return;
    }

    const originCard = allCards.find(c => c.id_card === selectedOrigin);
    const destCard   = allCards.find(c => c.id_card === selectedDest);
    const balOrigen  = parseFloat(originCard?.current_balance || 0);

    if (amount > balOrigen) {
        showToast(
            `Saldo insuficiente en "${originCard.name_card}". ` +
            `Disponible: ${fmt(balOrigen)}, necesitas: ${fmt(amount)}.`,
            'error'
        );
        return;
    }

    setLoading(true);

    try {
        // ── 1. Registrar en tabla transfers ──────────────────
        const { error: trErr } = await supabase.from('transfers').insert([{
            id_user:       userId,
            id_from:       selectedOrigin,
            id_to:         selectedDest,
            amount,
            date_transfer: date,
            notes
        }]);
        if (trErr) throw trErr;

        // ── 2. Actualizar saldos directamente ────────────────
        // Los triggers solo cubren expenses/monthly_incomes.
        // Las transferencias actualizan current_balance manualmente.

        const newOriginBal = balOrigen - amount;
        const { error: updOrigin } = await supabase.from('cards')
            .update({ current_balance: newOriginBal })
            .eq('id_card', selectedOrigin);
        if (updOrigin) throw updOrigin;

        const newDestBal = parseFloat(destCard.current_balance || 0) + amount;
        const { error: updDest } = await supabase.from('cards')
            .update({ current_balance: newDestBal })
            .eq('id_card', selectedDest);
        if (updDest) throw updDest;

        // ── 3. Actualizar estado local ───────────────────────
        originCard.current_balance = newOriginBal;
        destCard.current_balance   = newDestBal;

        // Añadir al historial local
        allTransfers.unshift({
            id_from:       selectedOrigin,
            id_to:         selectedDest,
            amount,
            date_transfer: date,
            notes
        });

        // ── 4. Limpiar formulario ────────────────────────────
        document.getElementById('transfer-amount').value = '';
        document.getElementById('transfer-note').value   = '';
        document.getElementById('transfer-date').valueAsDate = new Date();
        selectedOrigin = null;
        selectedDest   = null;

        renderAccountGrids();
        updatePreviewBar();
        updateBalanceIndicator();
        updateArrow();
        updateSubmitState();
        renderHistory();

        showToast(
            `✓ ${fmt(amount)} transferidos de ${originCard.name_card} a ${destCard.name_card}`,
            'success'
        );

    } catch (err) {
        console.error('[transfer]', err);
        showToast('Error al procesar la transferencia: ' + err.message, 'error');
    } finally {
        setLoading(false);
    }
}

// ═══════════════════════════════════════════════════════════════
// CARGA DE TRANSFERENCIAS HISTÓRICAS
// ═══════════════════════════════════════════════════════════════
async function loadTransfers(userId) {
    const { data, error } = await supabase
        .from('transfers')
        .select('*')
        .eq('id_user', userId)
        .order('date_transfer', { ascending: false })
        .limit(100);

    if (error) {
        // Si la tabla no existe aún, mostramos el estado vacío sin crashear
        console.warn('[transfers] No se pudo cargar el historial:', error.message);
        allTransfers = [];
    } else {
        allTransfers = data || [];
    }
    renderHistory();
}

// ═══════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════
async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = 'login.html'; return; }

    // Fecha de hoy
    document.getElementById('transfer-date').valueAsDate = new Date();

    // Input de monto
    setupAmountInput();

    // ── Cargar cuentas ───────────────────────────────────────
    const { data: cards, error: cardsErr } = await supabase
        .from('cards')
        .select('id_card, name_card, type_card, current_balance')
        .eq('id_user', user.id)
        .eq('deleted_card', false)
        .order('type_card', { ascending: true })
        .order('name_card',  { ascending: true });

    if (cardsErr) {
        console.error('[cards]', cardsErr.message);
        showToast('Error al cargar las cuentas.', 'error');
        return;
    }

    allCards = cards || [];
    renderAccountGrids();

    // ── Cargar historial ─────────────────────────────────────
    await loadTransfers(user.id);

    // ── Filtros del historial ────────────────────────────────
    document.querySelectorAll('.hf-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.hf-chip').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderHistory();
        });
    });

    // ── Submit ───────────────────────────────────────────────
    document.getElementById('transfer-form').addEventListener('submit', async e => {
        e.preventDefault();
        await saveTransfer(user.id);
    });
}

init();
