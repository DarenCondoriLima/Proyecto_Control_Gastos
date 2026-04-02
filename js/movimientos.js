import { supabase } from './supabase.js';

// ─────────────────────────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────────────────────────

// Convierte string vacío o "0" a null para no romper FKs de Postgres
const cleanUUID = (id) => (id && id !== '' && id !== '0') ? id : null;

// Valida y formatea inputs de monto (comas → puntos, solo números)
function setupAmountValidation(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    input.addEventListener('input', (e) => {
        e.target.value = e.target.value
            .replace(',', '.')
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

// ─────────────────────────────────────────────────────────────
// ESTADO: guardamos todas las tarjetas en memoria para filtrar
// sin volver a hacer fetch cada vez que cambia el método
// ─────────────────────────────────────────────────────────────
let allCards = [];   // { id_card, name_card, type_card }

// ─────────────────────────────────────────────────────────────
// INICIALIZACIÓN
// ─────────────────────────────────────────────────────────────
async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = 'login.html'; return; }

    // Fecha de hoy
    document.getElementById('exp-date').valueAsDate = new Date();

    // Cargar Categorías
    const { data: cats } = await supabase
        .from('categories')
        .select('id_cat, name_cat')
        .eq('id_user', user.id)
        .eq('deleted_cat', false)
        .order('name_cat', { ascending: true });

    const catSelect = document.getElementById('exp-cat');
    cats?.forEach(c => catSelect.innerHTML += `<option value="${c.id_cat}">${c.name_cat}</option>`);

    // Cargar TODAS las tarjetas del usuario incluyendo type_card para filtrar luego
    const { data: cards } = await supabase
        .from('cards')
        .select('id_card, name_card, type_card')
        .eq('id_user', user.id)
        .eq('deleted_card', false)
        .order('name_card', { ascending: true });

    allCards = cards || [];

    // Validación de montos
    setupAmountValidation('exp-amount');
    setupAmountValidation('exp-inst-amount');
}

// ─────────────────────────────────────────────────────────────
// FILTRAR TARJETAS SEGÚN MÉTODO DE PAGO
// Débito  → solo tarjetas de tipo 'Debit'
// Crédito → solo tarjetas de tipo 'Credit'
// ─────────────────────────────────────────────────────────────
function populateCardsByMethod(method) {
    const cardSelect = document.getElementById('exp-card');
    cardSelect.innerHTML = '<option value="">Selecciona tarjeta...</option>';

    // type_card en el schema: 'Debit' o 'Credit'
    const typeFilter = method === 'Debit' ? 'Debit' : 'Credit';
    const filtered   = allCards.filter(c => c.type_card === typeFilter);

    if (filtered.length === 0) {
        cardSelect.innerHTML += `<option value="" disabled>No tienes tarjetas de ${typeFilter === 'Debit' ? 'débito' : 'crédito'}</option>`;
    } else {
        filtered.forEach(c => {
            cardSelect.innerHTML += `<option value="${c.id_card}">${c.name_card}</option>`;
        });
    }
}

// ─────────────────────────────────────────────────────────────
// EVENTOS DE INTERFAZ
// ─────────────────────────────────────────────────────────────

// Subcategorías dinámicas al cambiar categoría
document.getElementById('exp-cat').addEventListener('change', async (e) => {
    const subSelect = document.getElementById('exp-subcat');
    const catId = e.target.value;

    if (!catId) {
        subSelect.disabled = true;
        subSelect.innerHTML = '<option value="">Elige categoría primero</option>';
        return;
    }

    const { data: subs } = await supabase
        .from('subcategories')
        .select('id_subcat, name_subcat')
        .eq('id_category', catId)
        .eq('deleted_subcat', false)
        .order('name_subcat', { ascending: true });

    subSelect.innerHTML = '<option value="">Selecciona subcategoría</option>';
    subs?.forEach(s => subSelect.innerHTML += `<option value="${s.id_subcat}">${s.name_subcat}</option>`);
    subSelect.disabled = (subs?.length === 0);
});

// Visibilidad de tarjeta y cuotas al cambiar método de pago
document.getElementById('exp-method').addEventListener('change', (e) => {
    const method          = e.target.value;
    const cardDiv         = document.getElementById('card-field');
    const installmentsDiv = document.getElementById('installments-field');
    const cardError       = document.getElementById('card-error');

    // Mostrar u ocultar sección de tarjeta
    const showCard = method === 'Debit' || method === 'Credit';
    cardDiv.style.display = showCard ? 'block' : 'none';

    if (showCard) {
        // CORRECCIÓN: poblar solo las tarjetas del tipo correcto
        populateCardsByMethod(method);
    }

    // Mostrar u ocultar sección de cuotas (solo crédito)
    installmentsDiv.style.display = method === 'Credit' ? 'block' : 'none';

    // Limpiar errores y resetear cuotas si cambia de método
    if (cardError) cardError.style.display = 'none';
    if (method !== 'Credit') {
        document.getElementById('exp-installments').value = 1;
        document.getElementById('exp-inst-amount').value  = '';
    }
});

// Mostrar/ocultar campo de monto manual de cuota
document.getElementById('is-interest-free').addEventListener('change', (e) => {
    const manualField = document.getElementById('manual-installment-field');
    manualField.style.display = e.target.checked ? 'none' : 'block';
    if (e.target.checked) {
        document.getElementById('exp-inst-amount').value = '';
    }
});

// Preview de cuota en tiempo real al cambiar número de cuotas o monto
document.getElementById('exp-installments').addEventListener('input', updateInstallmentPreview);
document.getElementById('exp-amount').addEventListener('blur',  updateInstallmentPreview);

function updateInstallmentPreview() {
    const methodField = document.getElementById('exp-method').value;
    if (methodField !== 'Credit') return;

    const total        = parseFloat(document.getElementById('exp-amount').value) || 0;
    const cuotas       = parseInt(document.getElementById('exp-installments').value) || 1;
    const isInterest   = document.getElementById('is-interest-free').checked;
    const previewEl    = document.getElementById('installment-preview');

    if (previewEl && isInterest && total > 0 && cuotas > 1) {
        const cuotaAmt = (total / cuotas).toFixed(2);
        previewEl.textContent = `→ Cuota estimada: S/ ${cuotaAmt} × ${cuotas}`;
        previewEl.style.display = 'block';
    } else if (previewEl) {
        previewEl.style.display = 'none';
    }
}

// ─────────────────────────────────────────────────────────────
// ENVÍO DEL FORMULARIO
// ─────────────────────────────────────────────────────────────
document.getElementById('expense-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();

    const totalAmount = parseFloat(document.getElementById('exp-amount').value);
    const method      = document.getElementById('exp-method').value;
    const cardId      = document.getElementById('exp-card').value;
    const cardError   = document.getElementById('card-error');

    // ── Validar tarjeta si aplica ────────────────────────────
    if ((method === 'Debit' || method === 'Credit') && (!cardId || cardId === '')) {
        if (cardError) cardError.style.display = 'block';
        document.getElementById('exp-card').focus();
        return;
    }

    // ── Validar monto total ──────────────────────────────────
    if (isNaN(totalAmount) || totalAmount <= 0) {
        alert('Ingresa un monto total válido.');
        return;
    }

    // ── Calcular cuotas ──────────────────────────────────────
    // CORRECCIÓN PRINCIPAL:
    // El CHECK de Postgres es:
    //   (INSTALLMENTS > 1 AND INSTALLMENT_AMT IS NOT NULL) OR (INSTALLMENTS = 1)
    // Por eso:
    //   - Si installments = 1  → installment_amt DEBE ser NULL
    //   - Si installments > 1  → installment_amt DEBE tener valor
    let installments    = 1;
    let installmentAmt  = null;   // ← null por defecto (pago único)

    if (method === 'Credit') {
        installments = parseInt(document.getElementById('exp-installments').value, 10) || 1;

        if (installments > 1) {
            const isInterestFree = document.getElementById('is-interest-free').checked;

            if (isInterestFree) {
                // Sin intereses: dividir el total entre cuotas
                installmentAmt = parseFloat((totalAmount / installments).toFixed(2));
            } else {
                // Con intereses: el usuario ingresa el monto exacto de cada cuota
                const manualAmt = parseFloat(document.getElementById('exp-inst-amount').value);
                if (isNaN(manualAmt) || manualAmt <= 0) {
                    alert('Ingresa el monto exacto de cada cuota.');
                    document.getElementById('exp-inst-amount').focus();
                    return;
                }
                installmentAmt = manualAmt;
            }
        }
        // Si el usuario puso 1 cuota en crédito, installmentAmt queda null ✓
    }

    // ── Construir objeto de inserción ────────────────────────
    const newExpense = {
        id_user:        user.id,
        amount_exp:     totalAmount,
        date_exp:       document.getElementById('exp-date').value,
        id_category:    cleanUUID(document.getElementById('exp-cat').value),
        id_subcat:      cleanUUID(document.getElementById('exp-subcat').value),
        description_exp: document.getElementById('exp-desc').value.trim() || 'Sin descripción',
        payment_method: method,
        id_card:        method === 'Cash' ? null : cleanUUID(cardId),
        installments:   installments,
        installment_amt: installmentAmt   // null si installments = 1, valor si > 1
    };

    console.log('[expense] Insertando:', newExpense);

    const { error } = await supabase.from('expenses').insert([newExpense]);

    if (error) {
        console.error('[expense] Error Supabase:', error);
        alert('Error al guardar: ' + error.message);
    } else {
        window.location.href = 'dashboard.html';
    }
});

init();