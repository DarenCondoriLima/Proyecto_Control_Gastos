import { supabase } from './supabase.js';
import { applyExpenseImpact, applyCreditPaymentImpact } from './balanceHandlers.js';

// ═══════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════

const cleanUUID = (id) => (id && id !== '' && id !== '0') ? id : null;

function setupAmountInput(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.addEventListener('input', e => {
        e.target.value = e.target.value
            .replace(',', '.')
            .replace(/[^0-9.]/g, '')
            .replace(/(\..*)\./g, '$1');
    });
    input.addEventListener('blur', e => {
        const v = parseFloat(e.target.value);
        if (!isNaN(v)) e.target.value = v.toFixed(2);
    });
}

function showToast(msg, kind = 'success') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = `toast ${kind} show`;
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove('show'), 3500);
}

function setLoading(btnId, loading, label = '') {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = loading;
    const span = btn.querySelector('span');
    if (span) span.textContent = loading ? 'Guardando…' : label;
}

const fmt = (n) => `S/ ${parseFloat(n || 0).toFixed(2)}`;

// ═══════════════════════════════════════════════════════════════
// ESTADO GLOBAL
// ═══════════════════════════════════════════════════════════════

let allCards   = [];   // { id_card, name_card, type_card, current_balance, due_day, limit_card }
let currentTab = 'expense';

// ═══════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════

async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    const urlParams = new URLSearchParams(window.location.search);
    const targetTab = urlParams.get('tab'); // 'payment'
    const targetCardId = urlParams.get('cardId');

    if (!user) { window.location.href = 'login.html'; return; }

    // Fechas de hoy
    ['exp-date', 'debt-date', 'pay-date'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.valueAsDate = new Date();
    });

    // Validaciones de montos
    ['exp-amount', 'exp-inst-amount', 'debt-amount', 'debt-amount-paid', 'pay-amount']
        .forEach(setupAmountInput);

    // ── Cargar datos en paralelo ─────────────────────────────
    // SCHEMA V2: categories tiene type_cat ('gasto' | 'ingreso')
    // Cards ahora incluye type_card 'Cash' además de 'Debit' y 'Credit'
    const [catsRes, cardsRes] = await Promise.all([
        supabase.from('categories')
            .select('id_cat, name_cat, type_cat')
            .eq('id_user', user.id)
            .eq('deleted_cat', false)
            .eq('type_cat', 'gasto')           // Solo categorías de gasto
            .order('name_cat', { ascending: true }),
        supabase.from('cards')
            .select('id_card, name_card, type_card, current_balance, due_day, limit_card')
            .eq('id_user', user.id)
            .eq('deleted_card', false)
            .order('name_card', { ascending: true })
    ]);

    allCards = cardsRes.data || [];

    // Poblar categorías de gasto
    const catSel = document.getElementById('exp-cat');
    catsRes.data?.forEach(c => catSel.add(new Option(c.name_cat, c.id_cat)));

    // Poblar todos los selectores de tarjetas
    populateAllCardSelectors();

    // ── Iniciar formularios ──────────────────────────────────
    initTabs();
    initExpenseForm(user);
    initDebtForm(user);
    initPaymentForm(user);

    // 1. Si venimos de detalleTarjeta, activar la pestaña de Pago
    if (targetTab === 'payment') {
        const payBtn = document.querySelector('.tab-btn[data-tab="payment"]');
        if (payBtn) payBtn.click(); // Esto dispara el cambio de panel visual
    }

    // 2. Autoseleccionar la tarjeta de crédito en el select
    if (targetCardId) {
        // Esperamos un momento a que los selects se pueblen con la data de Supabase
        setTimeout(() => {
            const creditSel = document.getElementById('pay-credit-card');
            if (creditSel) {
                creditSel.value = targetCardId;
            }
        }, 500); // Pequeño delay para asegurar que el fetch de tarjetas terminó
    }

    // ── Mostrar selector de tarjeta al inicio (Cash por defecto) ──
    // El método inicial es 'Cash', así que mostramos las tarjetas Cash
    // y el indicador de saldo desde el arranque, sin esperar el evento change
    onMethodChange('Cash');
}

// ═══════════════════════════════════════════════════════════════
// POBLAR SELECTORES DE TARJETA
// ═══════════════════════════════════════════════════════════════

/**
 * Pobla los selectores fijos (origen de pago, tarjeta de crédito, origen de préstamo).
 * El selector del formulario de gasto se gestiona dinámicamente en onMethodChange.
 */
function populateAllCardSelectors() {
    // ── Selectores de Origen (Dinero Real: Débito o Cash) ────────────
    const paySourceSel = document.getElementById('pay-source-card');
    const debtSourceSel = document.getElementById('debt-source-card'); // Selector de Préstamos
    
    const sourceHTML = '<option value="">Seleccionar cuenta de origen…</option>';
    if (paySourceSel) paySourceSel.innerHTML = sourceHTML;
    if (debtSourceSel) debtSourceSel.innerHTML = sourceHTML;

    allCards
        .filter(c => c.type_card === 'Debit' || c.type_card === 'Cash')
        .forEach(c => {
            const icon = c.type_card === 'Cash' ? '💵' : '💳';
            const bal  = parseFloat(c.current_balance || 0);
            const label = `${icon} ${c.name_card} — ${fmt(bal)}`;
            
            // Crear opciones para ambos selectores
            if (paySourceSel) {
                const optPay = new Option(label, c.id_card);
                if (bal <= 0) optPay.style.color = '#c05c3a';
                paySourceSel.add(optPay);
            }
            
            if (debtSourceSel) {
                const optDebt = new Option(label, c.id_card);
                if (bal <= 0) optDebt.style.color = '#c05c3a';
                debtSourceSel.add(optDebt);
            }
        });

    // ── Tarjeta de crédito (destino de pago) ─────────────────
    const payCreditSel = document.getElementById('pay-credit-card');
    if (payCreditSel) {
        payCreditSel.innerHTML = '<option value="">Seleccionar tarjeta de crédito…</option>';
        allCards
            .filter(c => c.type_card === 'Credit')
            .forEach(c => {
                const bal  = parseFloat(c.current_balance || 0);  // deuda actual
                const opt  = new Option(`${c.name_card} — Deuda: ${fmt(bal)}`, c.id_card);
                payCreditSel.add(opt);
            });
    }
}

/**
 * Filtra y muestra en #exp-card solo las tarjetas del tipo correcto,
 * con saldo visible. Devuelve la lista filtrada.
 */
function populateCardsByMethod(method) {
    const sel = document.getElementById('exp-card');
    sel.innerHTML = '';

    // Mapear método de pago → type_card del schema V2
    // Cash → 'Cash',  Debit → 'Debit',  Credit → 'Credit'
    const filtered = allCards.filter(c => c.type_card === method);

    if (filtered.length === 0) {
        const label = { Cash: 'efectivo', Debit: 'débito', Credit: 'crédito' }[method] || method;
        sel.innerHTML = `<option value="" disabled>No tienes cuentas de ${label} registradas</option>`;
        return filtered;
    }

    sel.add(new Option('Seleccionar…', ''));

    filtered.forEach(c => {
        const bal  = parseFloat(c.current_balance || 0);
        const icon = { Cash: '💵', Debit: '💳', Credit: '🏦' }[c.type_card] || '';
        const label = method === 'Credit'
            ? `${icon} ${c.name_card}`                        // crédito no tiene "saldo disponible" relevante
            : `${icon} ${c.name_card} — Disponible: ${fmt(bal)}`;
        const opt = new Option(label, c.id_card);
        if (method !== 'Credit' && bal <= 0) opt.style.color = '#c05c3a';
        sel.add(opt);
    });

    // Pre-seleccionar automáticamente si solo hay una tarjeta
    if (filtered.length === 1) {
        sel.value = filtered[0].id_card;
        updateBalanceIndicator(filtered[0]);
    }

    return filtered;
}

// ═══════════════════════════════════════════════════════════════
// INDICADOR DE SALDO DISPONIBLE (debajo del campo de monto)
// ═══════════════════════════════════════════════════════════════

/**
 * Muestra / actualiza el indicador de saldo justo debajo del input de monto.
 * Se colorea en rojo si el monto ingresado excede el saldo.
 */
function updateBalanceIndicator(card) {
    const indicator = document.getElementById('balance-indicator');
    if (!indicator) return;

    if (!card || card.type_card === 'Credit') {
        indicator.style.display = 'none';
        return;
    }

    const bal    = parseFloat(card.current_balance || 0);
    const amount = parseFloat(document.getElementById('exp-amount').value) || 0;
    const insuf  = amount > bal && bal >= 0;

    indicator.style.display = 'flex';
    indicator.dataset.bal   = bal;

    const balEl    = indicator.querySelector('.bal-value');
    const alertEl  = indicator.querySelector('.bal-alert');
    const iconEl   = indicator.querySelector('.bal-icon');

    balEl.textContent  = fmt(bal);
    balEl.style.color  = insuf ? 'var(--rust)' : 'var(--sage)';
    iconEl.textContent = insuf ? '⚠️' : '✓';

    if (insuf) {
        alertEl.textContent = `Excede el saldo en ${fmt(amount - bal)}`;
        alertEl.style.display = 'block';
    } else {
        alertEl.style.display = 'none';
    }
}

/**
 * Valida en tiempo real mientras el usuario escribe el monto.
 */
function onAmountInput() {
    const cardId = document.getElementById('exp-card').value;
    const card   = allCards.find(c => c.id_card === cardId);
    updateBalanceIndicator(card || null);
    updateInstPreview();

    // Colorear el hero de monto según el estado
    const hero   = document.getElementById('exp-amount-hero');
    const method = document.getElementById('exp-method').value;
    if (!hero || method === 'Credit') return;

    const amount = parseFloat(document.getElementById('exp-amount').value) || 0;
    const bal    = card ? parseFloat(card.current_balance || 0) : Infinity;
    if (amount > 0 && amount > bal) {
        hero.style.borderColor = 'var(--rust)';
    } else {
        hero.style.borderColor = '';
    }
}

// ═══════════════════════════════════════════════════════════════
// LÓGICA CENTRAL: cambio de método de pago
// ═══════════════════════════════════════════════════════════════

function onMethodChange(method) {
    const cardField = document.getElementById('card-field');
    const instField = document.getElementById('installments-field');

    // Siempre mostrar el selector (Cash también es una tarjeta en V2)
    cardField.style.display = 'block';
    instField.classList.toggle('visible', method === 'Credit');

    if (method !== 'Credit') {
        document.getElementById('exp-installments').value = 1;
        document.getElementById('exp-inst-amount').value  = '';
        document.getElementById('installment-preview').style.display = 'none';
    }

    // Poblar tarjetas filtradas por método
    populateCardsByMethod(method);

    // Ocultar indicador hasta que se seleccione tarjeta
    const indicator = document.getElementById('balance-indicator');
    if (indicator) indicator.style.display = 'none';

    // Si ya hay una tarjeta seleccionada (pre-auto), actualizar indicador
    const cardId = document.getElementById('exp-card').value;
    if (cardId) {
        const card = allCards.find(c => c.id_card === cardId);
        updateBalanceIndicator(card || null);
    }
}

// ═══════════════════════════════════════════════════════════════
// TABS
// ═══════════════════════════════════════════════════════════════

function initTabs() {
    const card    = document.getElementById('form-card');
    const panels  = document.querySelectorAll('.tab-panel');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabClasses = {
        expense: 'tab-expense-active',
        debt:    'tab-debt-active',
        payment: 'tab-payment-active'
    };

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            if (tab === currentTab) return;
            currentTab = tab;
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            panels.forEach(p => p.classList.remove('active'));
            document.getElementById(`panel-${tab}`).classList.add('active');
            card.className = `form-card ${tabClasses[tab]}`;
        });
    });
}

// ═══════════════════════════════════════════════════════════════
// PESTAÑA 1: GASTO
// ═══════════════════════════════════════════════════════════════

function initExpenseForm(user) {
    // Subcategorías dinámicas
    document.getElementById('exp-cat').addEventListener('change', async e => {
        const sub   = document.getElementById('exp-subcat');
        const catId = e.target.value;
        if (!catId) {
            sub.disabled = true;
            sub.innerHTML = '<option value="">Elige categoría</option>';
            return;
        }
        const { data } = await supabase.from('subcategories')
            .select('id_subcat, name_subcat')
            .eq('id_category', catId)
            .eq('deleted_subcat', false)
            .order('name_subcat', { ascending: true });
        sub.innerHTML = '<option value="">Seleccionar…</option>';
        data?.forEach(s => sub.add(new Option(s.name_subcat, s.id_subcat)));
        sub.disabled = !data?.length;
    });

    // Cambio de método de pago
    document.getElementById('exp-method').addEventListener('change', e => {
        onMethodChange(e.target.value);
    });

    // Cambio de tarjeta seleccionada → actualizar indicador de saldo
    document.getElementById('exp-card').addEventListener('change', e => {
        const card = allCards.find(c => c.id_card === e.target.value);
        updateBalanceIndicator(card || null);
    });

    // Monto en tiempo real → re-validar contra saldo
    document.getElementById('exp-amount').addEventListener('input', onAmountInput);
    document.getElementById('exp-amount').addEventListener('blur',  onAmountInput);

    // Cuotas
    document.getElementById('is-interest-free').addEventListener('change', e => {
        document.getElementById('manual-installment-field').style.display =
            e.target.checked ? 'none' : 'block';
        if (e.target.checked) document.getElementById('exp-inst-amount').value = '';
        updateInstPreview();
    });
    document.getElementById('exp-installments').addEventListener('input', updateInstPreview);

    // Submit
    document.getElementById('expense-form').addEventListener('submit', async e => {
        e.preventDefault();
        await saveExpense(user);
    });
}

function updateInstPreview() {
    const method  = document.getElementById('exp-method').value;
    const preview = document.getElementById('installment-preview');
    if (!preview || method !== 'Credit') { if (preview) preview.style.display = 'none'; return; }

    const total  = parseFloat(document.getElementById('exp-amount').value) || 0;
    const cuotas = parseInt(document.getElementById('exp-installments').value) || 1;
    const isFree = document.getElementById('is-interest-free').checked;

    if (isFree && total > 0 && cuotas > 1) {
        preview.textContent   = `S/ ${(total / cuotas).toFixed(2)} × ${cuotas} cuotas`;
        preview.style.display = 'block';
    } else {
        preview.style.display = 'none';
    }
}

async function saveExpense(user) {
    const amount = parseFloat(document.getElementById('exp-amount').value);
    const method = document.getElementById('exp-method').value;
    const cardId = document.getElementById('exp-card').value;

    // ── Validaciones básicas ─────────────────────────────────
    if (isNaN(amount) || amount <= 0) {
        showToast('Ingresa un monto válido mayor a 0.', 'error'); return;
    }
    if (!cardId) {
        showToast('Selecciona el medio de pago.', 'error');
        document.getElementById('exp-card').focus(); return;
    }

    // ── Validación de saldo suficiente (Cash y Debit) ────────
    // Crédito no tiene restricción de saldo aquí (aumenta deuda)
    if (method !== 'Credit') {
        const card = allCards.find(c => c.id_card === cardId);
        if (card) {
            const bal = parseFloat(card.current_balance || 0);
            if (amount > bal) {
                showToast(
                    `Saldo insuficiente en "${card.name_card}". ` +
                    `Disponible: ${fmt(bal)}, necesitas: ${fmt(amount)}.`,
                    'error'
                );
                return;
            }
        }
    }

    // ── Cuotas ───────────────────────────────────────────────
    let installments   = 1;
    let installmentAmt = null;

    if (method === 'Credit') {
        installments = parseInt(document.getElementById('exp-installments').value) || 1;
        if (installments > 1) {
            if (document.getElementById('is-interest-free').checked) {
                installmentAmt = parseFloat((amount / installments).toFixed(2));
            } else {
                const manual = parseFloat(document.getElementById('exp-inst-amount').value);
                if (isNaN(manual) || manual <= 0) {
                    showToast('Ingresa el monto de cada cuota.', 'error'); return;
                }
                installmentAmt = manual;
            }
        }
    }

    setLoading('exp-submit-btn', true);

    const { data: insertedExpense, error } = await supabase.from('expenses').insert([{
        id_user:         user.id,
        amount_exp:      amount,
        date_exp:        document.getElementById('exp-date').value,
        id_category:     cleanUUID(document.getElementById('exp-cat').value),
        id_subcat:       cleanUUID(document.getElementById('exp-subcat').value),
        description_exp: document.getElementById('exp-desc').value.trim() || 'Sin descripción',
        payment_method:  method,
        id_card:         cardId,
        installments,
        installment_amt: installmentAmt
    }]).select('*').single();

    setLoading('exp-submit-btn', false, 'Guardar Gasto');

    if (error) {
        console.error('[expense]', error);
        showToast('Error: ' + error.message, 'error');
    } else {
        // Aplicar impacto de gasto en DB (reemplaza el trigger)
        await applyExpenseImpact(insertedExpense);
        // Actualizar saldo local para que validaciones siguientes sean correctas
        const card = allCards.find(c => c.id_card === cardId);
        if (card && method !== 'Credit') {
            card.current_balance = parseFloat(card.current_balance) - amount;
        }
        showToast('✓ Gasto registrado', 'success');
        setTimeout(() => window.location.href = 'dashboard.html', 1200);
    }
}

// ═══════════════════════════════════════════════════════════════
// PESTAÑA 2: DEUDA
// ═══════════════════════════════════════════════════════════════

function initDebtForm(user) {
    document.getElementById('debt-status').addEventListener('change', e => {
        document.getElementById('debt-paid-field').style.display =
            e.target.value === 'Partial' ? 'block' : 'none';
    });

    document.getElementById('debt-form').addEventListener('submit', async e => {
        e.preventDefault();
        await saveDebt(user);
    });
}

async function saveDebt(user) {
    const amount = parseFloat(document.getElementById('debt-amount').value);
    const debtor = document.getElementById('debt-debtor').value.trim();
    const dateDebt = document.getElementById('debt-date').value;
    const sourceCardId = document.getElementById('debt-source-card').value;
    const notes = document.getElementById('debt-desc').value.trim();

    // 1. Validaciones
    if (isNaN(amount) || amount <= 0 || !debtor || !sourceCardId) {
        showToast('Completa el monto, deudor y cuenta de origen.', 'error');
        return;
    }

    // 2. Validar Saldo Localmente
    const source = allCards.find(c => c.id_card === sourceCardId);
    if (source && parseFloat(source.current_balance) < amount) {
        showToast(`Saldo insuficiente en ${source.name_card}.`, 'error');
        return;
    }

    setLoading('debt-submit-btn', true);

    // 3. Buscar Categoría y Subcategoría (Necesarias para el insert en Expenses)
    const { data: catRes } = await supabase.from('categories')
        .select('id_cat')
        .eq('id_user', user.id)
        .ilike('name_cat', '%prestamo%')
        .maybeSingle();

    let subCatId = null;
    if (catRes) {
        const { data: subRes } = await supabase.from('subcategories')
            .select('id_subcat')
            .eq('id_category', catRes.id_cat)
            .limit(1)
            .maybeSingle();
        subCatId = subRes?.id_subcat;
    }

    // 4. Primer Insert: Control de Deuda (Tabla Debts)
    const { error: debtError } = await supabase.from('debts').insert([{
        id_user: user.id,
        debtor_name: debtor,
        amount_debt: amount,
        description_debt: notes,
        date_debt: dateDebt,
        status_debt: 'Pending'
    }]);

    if (debtError) {
        setLoading('debt-submit-btn', false, 'Registrar Préstamo');
        showToast('Error al registrar deuda: ' + debtError.message, 'error');
        return;
    }

    // 5. Segundo Insert: Gasto
    const { data: insertedDebtExpense, error: expError } = await supabase.from('expenses').insert([{
        id_user: user.id,
        amount_exp: amount,
        date_exp: dateDebt,
        id_category: catRes ? catRes.id_cat : null,
        id_subcat: subCatId, // Ahora incluimos el ID de la subcategoría
        description_exp: `Préstamo a ${debtor}: ${notes}`,
        payment_method: source.type_card, 
        id_card: sourceCardId,
        installments: 1
    }]).select('*').single();

    setLoading('debt-submit-btn', false, 'Registrar Préstamo');

    if (expError) {
        console.error('[debt-expense-error]', expError);
        showToast('Préstamo registrado, pero el saldo no se actualizó.', 'error');
    } else {
        // Aplicar impacto de gasto (reemplaza trigger)
        await applyExpenseImpact(insertedDebtExpense);
        showToast('✓ Préstamo registrado y saldo actualizado');
        setTimeout(() => window.location.href = 'dashboard.html', 1200);
    }
}

// ═══════════════════════════════════════════════════════════════
// PESTAÑA 3: PAGO DE TARJETA
// ═══════════════════════════════════════════════════════════════

function initPaymentForm(user) {
    // Info de fecha de pago al seleccionar tarjeta de crédito
    document.getElementById('pay-credit-card').addEventListener('change', e => {
        const card = allCards.find(c => c.id_card === e.target.value);
        const hint = document.getElementById('pay-credit-hint');
        if (card?.due_day) {
            hint.textContent = `Fecha de pago: día ${card.due_day} de cada mes`;
        } else {
            hint.textContent = '';
        }
    });

    // Info de saldo al seleccionar cuenta de origen
    document.getElementById('pay-source-card').addEventListener('change', e => {
        updatePaySourceBalance();
    });
    document.getElementById('pay-amount').addEventListener('input', updatePaySourceBalance);

    document.getElementById('payment-form').addEventListener('submit', async e => {
        e.preventDefault();
        await savePayment(user);
    });
}

function updatePaySourceBalance() {
    const sourceId  = document.getElementById('pay-source-card').value;
    const amount    = parseFloat(document.getElementById('pay-amount').value) || 0;
    const indicator = document.getElementById('pay-balance-indicator');
    if (!indicator) return;

    if (!sourceId) { indicator.style.display = 'none'; return; }

    const card = allCards.find(c => c.id_card === sourceId);
    if (!card)    { indicator.style.display = 'none'; return; }

    const bal   = parseFloat(card.current_balance || 0);
    const insuf = amount > bal && amount > 0;

    indicator.style.display = 'flex';
    indicator.querySelector('.bal-value').textContent  = fmt(bal);
    indicator.querySelector('.bal-value').style.color  = insuf ? 'var(--rust)' : 'var(--sage)';
    indicator.querySelector('.bal-icon').textContent   = insuf ? '⚠️' : '✓';
    const alertEl = indicator.querySelector('.bal-alert');
    if (insuf) {
        alertEl.textContent   = `Falta ${fmt(amount - bal)} para completar el pago`;
        alertEl.style.display = 'block';
    } else {
        alertEl.style.display = 'none';
    }
}

function getBillingCycleFromDate(dateObj, cutoffDay) {
    const cycleDate = new Date(dateObj.getFullYear(), dateObj.getMonth() + (dateObj.getDate() > cutoffDay ? 1 : 0), 1);
    return {
        month: cycleDate.getMonth() + 1,
        year: cycleDate.getFullYear(),
    };
}

function shiftCycle(month, year, deltaMonths) {
    const shifted = new Date(year, month - 1 + deltaMonths, 1);
    return {
        month: shifted.getMonth() + 1,
        year: shifted.getFullYear(),
    };
}

async function savePayment(user) {
    const amount      = parseFloat(document.getElementById('pay-amount').value);
    const creditCard  = document.getElementById('pay-credit-card').value;
    const sourceCard  = document.getElementById('pay-source-card').value;
    const datePay     = document.getElementById('pay-date').value;
    const targetCycle = document.querySelector('input[name="target-cycle"]:checked')?.value || 'previous';
    const notes       = document.getElementById('pay-note').value.trim();

    // ── Validaciones ─────────────────────────────────────────
    if (isNaN(amount) || amount <= 0) {
        showToast('Ingresa un monto válido.', 'error'); return;
    }
    if (!creditCard) {
        showToast('Selecciona la tarjeta de crédito a pagar.', 'error'); return;
    }
    if (!sourceCard) {
        showToast('Selecciona la cuenta de origen del pago.', 'error'); return;
    }
    if (!datePay) {
        showToast('Selecciona la fecha del pago.', 'error'); return;
    }

    // ── Validación de saldo en cuenta de origen ──────────────
    const source = allCards.find(c => c.id_card === sourceCard);
    if (source) {
        const bal = parseFloat(source.current_balance || 0);
        if (amount > bal) {
            showToast(
                `Saldo insuficiente en "${source.name_card}". ` +
                `Disponible: ${fmt(bal)}, necesitas: ${fmt(amount)}.`,
                'error'
            );
            return;
        }
    }

    // ── Calcular mes/año del ciclo al que se atribuye el pago ─
    // target_cycle no debe basarse en el mes calendario del pago,
    // sino en el ciclo real definido por el cutoff de la tarjeta.
    const creditCardData = allCards.find(c => c.id_card === creditCard);
    const cutoffDay = creditCardData?.cutoff_day || 0;
    const dateObj  = new Date(datePay + 'T00:00:00');
    const currentCycle = getBillingCycleFromDate(dateObj, cutoffDay);
    const attributedCycle = targetCycle === 'current'
        ? currentCycle
        : shiftCycle(currentCycle.month, currentCycle.year, -1);
    const monthAttr = attributedCycle.month;
    const yearAttr  = attributedCycle.year;

    // ── Buscar categoría y subcategoría para el gasto automático ─
    const [catRes, subRes] = await Promise.all([
        supabase.from('categories')
            .select('id_cat')
            .eq('id_user', user.id)
            .ilike('name_cat', 'Pago Tarjeta')
            .maybeSingle(),
        supabase.from('subcategories')
            .select('id_subcat')
            .eq('id_user', user.id)
            .ilike('name_subcat', 'Credito')
            .maybeSingle()
    ]);

    if (!catRes.data || !subRes.data) {
        showToast(
            'No se encontró la categoría "Pago Tarjeta" o subcategoría "Credito". ' +
            'Verifica que existan en tu cuenta.',
            'error'
        );
        return;
    }

    setLoading('pay-submit-btn', true);

    // ── Insertar el registro de pago ─────────────────────────
    const { data: payData, error: payError } = await supabase
        .from('credit_card_payments')
        .insert([{
            id_user:        user.id,
            id_card:        creditCard,
            amount_paid:    amount,
            date_payment:   datePay,
            source_account: sourceCard,
            target_cycle:   targetCycle,
            month_cycle:    monthAttr,
            year_cycle:     yearAttr,
            notes:          notes || null
        }])
        .select('id_payment')
        .single();

    if (payError) {
        setLoading('pay-submit-btn', false, 'Registrar Pago');
        console.error('[payment]', payError);
        showToast('Error al registrar el pago: ' + payError.message, 'error');
        return;
    }

    // ── Aplicar impacto de pago (reemplaza trigger)
    await applyCreditPaymentImpact(payData);

    // ── Registrar gasto en expenses para crear registro espejo (excluido del balance)
    const { error: expError } = await supabase.from('expenses').insert([{
        id_user:         user.id,
        amount_exp:      amount,
        date_exp:        datePay,
        id_category:     catRes.data.id_cat,
        id_subcat:       subRes.data.id_subcat,
        description_exp: notes || 'Pago tarjeta de crédito',
        payment_method:  source?.type_card === 'Cash' ? 'Cash' : 'Debit',
        id_card:         sourceCard,
        id_credit_payment: payData?.id_payment || null,
        installments:    1,
        installment_amt: null,
        exclude_from_balance: true
    }]);

    setLoading('pay-submit-btn', false, 'Registrar Pago');

    if (expError) {
        // El pago ya se registró; el gasto falló. Informar sin bloquear.
        console.error('[payment-expense]', expError);
        showToast('Pago registrado, pero hubo un error al registrar el gasto.', 'error');
    } else {
        // Actualizar saldo local (ya aplicado por applyCreditPaymentImpact)
        if (source) source.current_balance = parseFloat(source.current_balance) - amount;
        showToast('✓ Pago registrado correctamente', 'success');
        setTimeout(() => window.location.href = 'gestionTarjetas.html', 1400);
    }
}

init();