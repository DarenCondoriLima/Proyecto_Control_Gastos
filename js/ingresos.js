/**
 * ingresos.js — ControlGastos
 *
 * Tabla destino: public.monthly_incomes
 * Columnas: id_user, id_card, amount_income, date_income, notes_income
 *
 * El trigger update_balance_on_income actualiza CURRENT_BALANCE en Cards
 * usando NEW.id_card y NEW.amount_income — por eso id_card nunca puede ser null.
 *
 * Flujo de destino:
 *  - "Efectivo" → autoselecciona la tarjeta tipo 'Cash' del usuario
 *  - "Cuenta Bancaria" → muestra selector de tarjetas tipo 'Debit'
 */

import { supabase } from './supabase.js';

// ─── Estado ───────────────────────────────────────────────────────────────────
let cashCardId = null;       // UUID de la tarjeta "Efectivo" del usuario
let allCards   = [];         // Todas las tarjetas Debit + Cash

// ─── Utilidades ───────────────────────────────────────────────────────────────
const cleanUUID = (id) => (id && id !== '' && id !== '0') ? id : null;

/** Valida y formatea el campo de monto mientras el usuario escribe */
function setupAmountValidation(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    input.addEventListener('input', (e) => {
        if (e.target.value.includes(',')) e.target.value = e.target.value.replace(',', '.');
        e.target.value = e.target.value
            .replace(/[^0-9.]/g, '')
            .replace(/(\..*)\./g, '$1');
    });

    input.addEventListener('blur', (e) => {
        const val = e.target.value;
        if (val !== '' && !isNaN(parseFloat(val))) {
            e.target.value = parseFloat(val).toFixed(2);
        }
    });
}

/** Toast de feedback */
function showToast(msg, type = 'error') {
    const existing = document.getElementById('toast-msg');
    if (existing) existing.remove();

    const t = document.createElement('div');
    t.id = 'toast-msg';
    t.textContent = msg;
    Object.assign(t.style, {
        position: 'fixed',
        bottom: '2rem',
        right: '2rem',
        padding: '0.85rem 1.5rem',
        borderRadius: '12px',
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '0.875rem',
        fontWeight: '500',
        color: 'white',
        zIndex: '9999',
        boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
        background: type === 'success' ? '#4a8c5c' : '#c05c3a',
    });
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
}

/** Actualiza el selector de cuentas según el método elegido */
function syncCardSelector(method) {
    const cardField  = document.getElementById('card-field');
    const cardSelect = document.getElementById('inc-card');
    const cashNotice = document.getElementById('cash-notice');
    const cardError  = document.getElementById('card-error');

    cardError.style.display = 'none';

    if (method === 'Cash') {
        cardField.style.display  = 'none';
        cashNotice.style.display = 'flex';
    } else {
        const debitCards = allCards.filter(c => c.type_card === 'Debit');
        cardSelect.innerHTML = '<option value="">Selecciona cuenta...</option>';
        debitCards.forEach(c => {
            const bal = parseFloat(c.current_balance || 0).toFixed(2);
            cardSelect.innerHTML += `<option value="${c.id_card}">${c.name_card} — S/ ${bal}</option>`;
        });
        cardField.style.display  = 'block';
        cashNotice.style.display = 'none';
    }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return (window.location.href = 'login.html');

    // Fecha por defecto: hoy
    const today = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    document.getElementById('inc-date').value =
        `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

    setupAmountValidation('inc-amount');

    // Categorías tipo 'ingreso'
    const { data: cats, error: catErr } = await supabase
        .from('categories')
        .select('id_cat, name_cat')
        .eq('id_user', user.id)
        .eq('deleted_cat', false)
        .eq('type_cat', 'ingreso')
        .order('name_cat', { ascending: true });

    const catSelect = document.getElementById('inc-cat');
    catSelect.innerHTML = '<option value="">Selecciona categoría...</option>';

    if (catErr || !cats || cats.length === 0) {
        catSelect.innerHTML = '<option value="">Sin categorías de ingreso</option>';
        showToast('No encontramos categorías de ingreso. Crea una primero.');
    } else {
        cats.forEach(c => {
            catSelect.innerHTML += `<option value="${c.id_cat}">${c.name_cat}</option>`;
        });
    }

    // Tarjetas Debit + Cash
    const { data: cards, error: cardErr } = await supabase
        .from('cards')
        .select('id_card, name_card, type_card, current_balance')
        .eq('id_user', user.id)
        .eq('deleted_card', false)
        .in('type_card', ['Debit', 'Cash'])
        .order('name_card', { ascending: true });

    if (cardErr || !cards) {
        showToast('Error al cargar las cuentas.');
        return;
    }

    allCards = cards;

    const cashCard = cards.find(c => c.type_card === 'Cash');
    cashCardId = cashCard ? cashCard.id_card : null;

    if (cashCard) {
        const bal = parseFloat(cashCard.current_balance || 0).toFixed(2);
        document.getElementById('cash-card-name').textContent =
            `${cashCard.name_card} · Saldo actual: S/ ${bal}`;
    } else {
        document.getElementById('cash-card-name').textContent =
            'No se encontró cuenta de Efectivo.';
        showToast('No tienes cuenta de Efectivo. Créala en Gestión de Tarjetas.');
    }

    syncCardSelector(document.getElementById('inc-method').value);
}

// ─── Listeners ────────────────────────────────────────────────────────────────
document.getElementById('inc-method').addEventListener('change', (e) => {
    syncCardSelector(e.target.value);
});

document.getElementById('income-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return (window.location.href = 'login.html');

    const amount    = parseFloat(document.getElementById('inc-amount').value);
    const method    = document.getElementById('inc-method').value;
    const catId     = cleanUUID(document.getElementById('inc-cat').value);
    const cardError = document.getElementById('card-error');

    // Validaciones
    if (!amount || amount <= 0) {
        showToast('Ingresa un monto válido mayor a 0.');
        document.getElementById('inc-amount').focus();
        return;
    }
    if (!catId) {
        showToast('Selecciona una categoría de ingreso.');
        return;
    }

    // Resolver id_card destino
    let targetCardId = null;

    if (method === 'Cash') {
        // CRÍTICO: el trigger update_balance_on_income necesita id_card para
        // poder hacer UPDATE cards SET current_balance = current_balance + NEW.amount_income
        if (!cashCardId) {
            showToast('No se encontró cuenta de Efectivo. Créala primero.');
            return;
        }
        targetCardId = cashCardId;
    } else {
        targetCardId = cleanUUID(document.getElementById('inc-card').value);
        if (!targetCardId) {
            cardError.style.display = 'block';
            document.getElementById('inc-card').focus();
            return;
        }
        cardError.style.display = 'none';
    }

    // Payload → columnas de monthly_incomes
    // NOTA: monthly_incomes no tiene id_category en el schema V2.
    // Si quieres rastrear categoría por ingreso, agrega la columna al schema:
    //   ALTER TABLE monthly_incomes ADD COLUMN id_category UUID REFERENCES categories(id_cat);
    // y descomenta la línea de abajo.
    // Asegúrate de que esta sección en ingresos.js coincida con las nuevas columnas SQL
    const newIncome = {
        id_user:       user.id,
        id_card:       targetCardId,      
        amount_income: amount,
        date_income:   document.getElementById('inc-date').value, 
        notes_income:  document.getElementById('inc-desc').value.trim() || null, 
    };

    const btn = document.querySelector('.btn-save');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    const { error } = await supabase.from('monthly_incomes').insert([newIncome]);

    btn.disabled = false;
    btn.textContent = 'Registrar Ingreso';

    if (error) {
        console.error('Supabase error:', error);
        showToast('Error al guardar: ' + error.message);
    } else {
        showToast('✓ Ingreso registrado correctamente', 'success');
        setTimeout(() => (window.location.href = 'dashboard.html'), 1200);
    }
});

init();