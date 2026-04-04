import { supabase } from './supabase.js';

// ─────────────────────────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────────────────────────
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
    t.className   = `toast ${kind} show`;
    setTimeout(() => t.classList.remove('show'), 3200);
}

function setLoading(btnId, loading, label = '') {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = loading;
    btn.querySelector('span').textContent = loading ? 'Guardando…' : label;
}

// ─────────────────────────────────────────────────────────────
// ESTADO GLOBAL
// ─────────────────────────────────────────────────────────────
let allCards   = [];   // { id_card, name_card, type_card }
let currentTab = 'expense';

// ─────────────────────────────────────────────────────────────
// INICIALIZACIÓN
// ─────────────────────────────────────────────────────────────
async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = 'login.html'; return; }

    // Fechas de hoy
    ['exp-date', 'debt-date', 'pay-date'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.valueAsDate = new Date();
    });

    // Validaciones de monto
    ['exp-amount', 'exp-inst-amount', 'debt-amount', 'debt-amount-paid', 'pay-amount']
        .forEach(setupAmountInput);

    // Cargar datos en paralelo
    const [cats, cards] = await Promise.all([
        supabase.from('categories').select('id_cat, name_cat')
            .eq('id_user', user.id).eq('deleted_cat', false)
            .order('name_cat', { ascending: true }),
        supabase.from('cards').select('id_card, name_card, type_card, due_day, limit_card')
            .eq('id_user', user.id).eq('deleted_card', false)
            .order('name_card', { ascending: true })
    ]);

    allCards = cards.data || [];

    // Poblar categorías
    const catSel = document.getElementById('exp-cat');
    cats.data?.forEach(c => catSel.add(new Option(c.name_cat, c.id_cat)));

    // Poblar tarjetas de crédito para pago
    const creditSel = document.getElementById('pay-credit-card');
    const debitSel  = document.getElementById('pay-source-card');
    allCards.filter(c => c.type_card === 'Credit').forEach(c => {
        creditSel.add(new Option(c.name_card, c.id_card));
    });
    allCards.filter(c => c.type_card === 'Debit').forEach(c => {
        debitSel.add(new Option(c.name_card, c.id_card));
    });

    initTabs();
    initExpenseForm(user);
    initDebtForm(user);
    initPaymentForm(user);
}

// ─────────────────────────────────────────────────────────────
// TABS
// ─────────────────────────────────────────────────────────────
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

            // Botones
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Paneles
            panels.forEach(p => p.classList.remove('active'));
            document.getElementById(`panel-${tab}`).classList.add('active');

            // Color de la card
            card.className = `form-card ${tabClasses[tab]}`;
        });
    });
}

// ─────────────────────────────────────────────────────────────
// PESTAÑA 1: GASTO
// ─────────────────────────────────────────────────────────────
function initExpenseForm(user) {
    // Subcategorías dinámicas
    document.getElementById('exp-cat').addEventListener('change', async e => {
        const sub = document.getElementById('exp-subcat');
        const catId = e.target.value;
        if (!catId) { sub.disabled = true; sub.innerHTML = '<option value="">Elige categoría</option>'; return; }
        const { data } = await supabase.from('subcategories')
            .select('id_subcat, name_subcat')
            .eq('id_category', catId).eq('deleted_subcat', false)
            .order('name_subcat', { ascending: true });
        sub.innerHTML = '<option value="">Seleccionar…</option>';
        data?.forEach(s => sub.add(new Option(s.name_subcat, s.id_subcat)));
        sub.disabled = !data?.length;
    });

    // Método de pago → tarjeta y cuotas
    document.getElementById('exp-method').addEventListener('change', e => {
        const method = e.target.value;
        const cardField  = document.getElementById('card-field');
        const instField  = document.getElementById('installments-field');
        const cardError  = document.getElementById('card-error');

        const showCard = method === 'Debit' || method === 'Credit';
        cardField.style.display = showCard ? 'block' : 'none';
        instField.classList.toggle('visible', method === 'Credit');
        if (cardError) cardError.style.display = 'none';

        if (showCard) populateCardsByMethod(method);
        if (method !== 'Credit') {
            document.getElementById('exp-installments').value = 1;
            document.getElementById('exp-inst-amount').value  = '';
            document.getElementById('installment-preview').style.display = 'none';
        }
    });

    // Sin intereses checkbox
    document.getElementById('is-interest-free').addEventListener('change', e => {
        document.getElementById('manual-installment-field').style.display =
            e.target.checked ? 'none' : 'block';
        if (e.target.checked) document.getElementById('exp-inst-amount').value = '';
        updateInstPreview();
    });

    // Preview en tiempo real
    ['exp-installments', 'exp-amount'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', updateInstPreview);
        document.getElementById(id)?.addEventListener('blur', updateInstPreview);
    });

    // Submit
    document.getElementById('expense-form').addEventListener('submit', async e => {
        e.preventDefault();
        await saveExpense(user);
    });
}

function populateCardsByMethod(method) {
    const sel    = document.getElementById('exp-card');
    const filter = method === 'Debit' ? 'Debit' : 'Credit';
    const cards  = allCards.filter(c => c.type_card === filter);
    sel.innerHTML = `<option value="">Selecciona tarjeta…</option>`;
    if (cards.length === 0) {
        sel.innerHTML += `<option value="" disabled>No tienes tarjetas de ${filter === 'Debit' ? 'débito' : 'crédito'}</option>`;
    } else {
        cards.forEach(c => sel.add(new Option(c.name_card, c.id_card)));
    }
}

function updateInstPreview() {
    const method  = document.getElementById('exp-method').value;
    const preview = document.getElementById('installment-preview');
    if (!preview || method !== 'Credit') return;

    const total   = parseFloat(document.getElementById('exp-amount').value) || 0;
    const cuotas  = parseInt(document.getElementById('exp-installments').value) || 1;
    const isFree  = document.getElementById('is-interest-free').checked;

    if (isFree && total > 0 && cuotas > 1) {
        preview.textContent = `S/ ${(total / cuotas).toFixed(2)} × ${cuotas}`;
        preview.style.display = 'block';
    } else {
        preview.style.display = 'none';
    }
}

async function saveExpense(user) {
    const totalAmount = parseFloat(document.getElementById('exp-amount').value);
    const method      = document.getElementById('exp-method').value;
    const cardId      = document.getElementById('exp-card').value;
    const cardError   = document.getElementById('card-error');

    // Validaciones
    if (isNaN(totalAmount) || totalAmount <= 0) {
        showToast('Ingresa un monto válido.', 'error'); return;
    }
    if ((method === 'Debit' || method === 'Credit') && !cardId) {
        cardError.style.display = 'block';
        document.getElementById('exp-card').focus(); return;
    }
    if (cardError) cardError.style.display = 'none';

    // Cuotas (respeta el CHECK de Postgres)
    let installments   = 1;
    let installmentAmt = null;

    if (method === 'Credit') {
        installments = parseInt(document.getElementById('exp-installments').value, 10) || 1;
        if (installments > 1) {
            if (document.getElementById('is-interest-free').checked) {
                installmentAmt = parseFloat((totalAmount / installments).toFixed(2));
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

    const { error } = await supabase.from('expenses').insert([{
        id_user:         user.id,
        amount_exp:      totalAmount,
        date_exp:        document.getElementById('exp-date').value,
        id_category:     cleanUUID(document.getElementById('exp-cat').value),
        id_subcat:       cleanUUID(document.getElementById('exp-subcat').value),
        description_exp: document.getElementById('exp-desc').value.trim() || 'Sin descripción',
        payment_method:  method,
        id_card:         method === 'Cash' ? null : cleanUUID(cardId),
        installments,
        installment_amt: installmentAmt
    }]);

    setLoading('exp-submit-btn', false, 'Guardar Gasto');

    if (error) {
        console.error('[expense]', error);
        showToast('Error: ' + error.message, 'error');
    } else {
        showToast('✓ Gasto registrado', 'success');
        document.getElementById('expense-form').reset();
        document.getElementById('exp-date').valueAsDate = new Date();
        document.getElementById('card-field').style.display = 'none';
        document.getElementById('installments-field').classList.remove('visible');
        document.getElementById('exp-subcat').disabled = true;
        document.getElementById('installment-preview').style.display = 'none';
        setTimeout(() => window.location.href = 'dashboard.html', 1200);
    }
}

// ─────────────────────────────────────────────────────────────
// PESTAÑA 2: DEUDA
// ─────────────────────────────────────────────────────────────
function initDebtForm(user) {
    // Mostrar campo "ya recibido" si el estado es Parcial
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
    const amount    = parseFloat(document.getElementById('debt-amount').value);
    const debtor    = document.getElementById('debt-debtor').value.trim();
    const desc      = document.getElementById('debt-desc').value.trim();
    const dateDebt  = document.getElementById('debt-date').value;
    const dueDate   = document.getElementById('debt-due-date').value || null;
    const status    = document.getElementById('debt-status').value;
    const paidRaw   = document.getElementById('debt-amount-paid').value;
    const amtPaid   = status === 'Partial' ? (parseFloat(paidRaw) || 0) : 0;

    if (isNaN(amount) || amount <= 0) { showToast('Ingresa un monto válido.', 'error'); return; }
    if (!debtor)  { showToast('Ingresa el nombre del deudor.', 'error'); return; }
    if (!desc)    { showToast('Ingresa una descripción.', 'error'); return; }
    if (!dateDebt){ showToast('Selecciona la fecha del préstamo.', 'error'); return; }

    // Validar vencimiento no antes de la fecha del préstamo
    if (dueDate && dueDate < dateDebt) {
        showToast('La fecha de vencimiento no puede ser anterior al préstamo.', 'error'); return;
    }

    setLoading('debt-submit-btn', true);

    const { error } = await supabase.from('debts').insert([{
        id_user:          user.id,
        amount_debt:      amount,
        amount_paid:      amtPaid,
        debtor_name:      debtor,
        description_debt: desc,
        date_debt:        dateDebt,
        due_date_debt:    dueDate,
        status_debt:      status,
        currency_debt:    'PEN'
    }]);

    setLoading('debt-submit-btn', false, 'Registrar Deuda');

    if (error) {
        console.error('[debt]', error);
        showToast('Error: ' + error.message, 'error');
    } else {
        showToast('✓ Deuda registrada', 'success');
        document.getElementById('debt-form').reset();
        document.getElementById('debt-date').valueAsDate = new Date();
        document.getElementById('debt-paid-field').style.display = 'none';
        setTimeout(() => window.location.href = 'dashboard.html', 1200);
    }
}

// ─────────────────────────────────────────────────────────────
// PESTAÑA 3: PAGO DE TARJETA
// ─────────────────────────────────────────────────────────────
function initPaymentForm(user) {
    // Mostrar info de la tarjeta seleccionada (día de pago)
    document.getElementById('pay-credit-card').addEventListener('change', e => {
        const card = allCards.find(c => c.id_card === e.target.value);
        const hint = document.getElementById('pay-credit-hint');
        if (card?.due_day) {
            hint.textContent = `Fecha de pago: día ${card.due_day} de cada mes`;
        } else {
            hint.textContent = '';
        }
    });

    document.getElementById('payment-form').addEventListener('submit', async e => {
        e.preventDefault();
        await savePayment(user);
    });
}

async function savePayment(user) {
    const amount     = parseFloat(document.getElementById('pay-amount').value);
    const creditCard = document.getElementById('pay-credit-card').value;
    const sourceCard = document.getElementById('pay-source-card').value || null;
    const datePay    = document.getElementById('pay-date').value;
    const note       = document.getElementById('pay-note').value.trim() || null;

    if (isNaN(amount) || amount <= 0) { showToast('Ingresa un monto válido.', 'error'); return; }
    if (!creditCard) { showToast('Selecciona la tarjeta de crédito a pagar.', 'error'); return; }
    if (!datePay)    { showToast('Selecciona la fecha del pago.', 'error'); return; }

    setLoading('pay-submit-btn', true);

    // movimientos.js (dentro de savePayment)
    const { error } = await supabase.from('credit_card_payments').insert([{
        id_user:        user.id,
        id_card:        creditCard,
        amount_paid:    amount,
        date_payment:   datePay,
        source_account: sourceCard,
        notes:          note // Ahora sí se guardará si añadiste la columna
    }]);

    // Registrar también como gasto de tipo Débito para que aparezca en el dashboard
    if (!error && sourceCard) {
        await supabase.from('expenses').insert([{
            id_user:         user.id,
            amount_exp:      amount,
            date_exp:        datePay,
            description_exp: note || `Pago tarjeta de crédito`,
            payment_method:  'Debit',
            id_card:         sourceCard,
            installments:    1,
            installment_amt: null
        }]);
    }

    setLoading('pay-submit-btn', false, 'Registrar Pago');

    if (error) {
        console.error('[payment]', error);
        showToast('Error: ' + error.message, 'error');
    } else {
        showToast('✓ Pago registrado', 'success');
        document.getElementById('payment-form').reset();
        document.getElementById('pay-date').valueAsDate = new Date();
        document.getElementById('pay-credit-hint').textContent = '';
        setTimeout(() => window.location.href = 'dashboard.html', 1200);
    }
}

init();