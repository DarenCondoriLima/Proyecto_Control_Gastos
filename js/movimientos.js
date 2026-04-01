import { supabase } from './supabase.js';

// --- UTILIDADES ---
// Limpia UUIDs para evitar errores de sintaxis en Postgres ("" -> null)
const cleanUUID = (id) => (id && id !== "" && id !== "0") ? id : null;

// Configura el filtrado de comas y el auto-completado de .00
function setupAmountValidation(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    input.addEventListener('input', (e) => {
        // Cambiar comas por puntos en tiempo real
        if (e.target.value.includes(',')) {
            e.target.value = e.target.value.replace(',', '.');
        }
        // Bloquear letras y dejar solo números y un punto
        e.target.value = e.target.value
            .replace(/[^0-9.]/g, '')
            .replace(/(\..*)\./g, '$1');
    });

    input.addEventListener('blur', (e) => {
        let val = e.target.value;
        if (val !== '' && !isNaN(parseFloat(val))) {
            e.target.value = parseFloat(val).toFixed(2);
        }
    });
}

// --- INICIALIZACIÓN ---
async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // Establecer fecha de hoy
    document.getElementById('exp-date').valueAsDate = new Date();

    // Cargar Categorías
    const { data: cats } = await supabase.from('categories')
        .select('id_cat, name_cat')
        .eq('id_user', user.id).eq('deleted_cat', false)
        .order('name_cat', { ascending: true });
    
    const catSelect = document.getElementById('exp-cat');
    cats?.forEach(c => catSelect.innerHTML += `<option value="${c.id_cat}">${c.name_cat}</option>`);

    // Cargar Tarjetas
    const { data: cards } = await supabase.from('cards').select('id_card, name_card').eq('id_user', user.id);
    const cardSelect = document.getElementById('exp-card');
    cardSelect.innerHTML = '<option value="">Selecciona tarjeta...</option>';
    cards?.forEach(card => cardSelect.innerHTML += `<option value="${card.id_card}">${card.name_card}</option>`);

    // Activar validaciones de montos
    setupAmountValidation('exp-amount');
    setupAmountValidation('exp-inst-amount');
}

// --- EVENTOS DE INTERFAZ ---

// Subcategorías Dinámicas
document.getElementById('exp-cat').addEventListener('change', async (e) => {
    const subSelect = document.getElementById('exp-subcat');
    const catId = e.target.value;

    if (!catId) {
        subSelect.disabled = true;
        subSelect.innerHTML = '<option value="">Elige categoría primero</option>';
        return;
    }

    const { data: subs } = await supabase.from('subcategories')
        .select('id_subcat, name_subcat')
        .eq('id_category', catId)
        .eq('deleted_subcat', false);

    subSelect.innerHTML = '<option value="">Selecciona subcategoría</option>';
    subs?.forEach(s => subSelect.innerHTML += `<option value="${s.id_subcat}">${s.name_subcat}</option>`);
    subSelect.disabled = false;
});

// Visibilidad de campos (Tarjeta y Cuotas)
document.getElementById('exp-method').addEventListener('change', (e) => {
    const method = e.target.value;
    const cardDiv = document.getElementById('card-field');
    const installmentsDiv = document.getElementById('installments-field');
    const cardError = document.getElementById('card-error');

    cardDiv.style.display = (method === 'Debit' || method === 'Credit') ? 'block' : 'none';
    installmentsDiv.style.display = (method === 'Credit') ? 'block' : 'none';
    
    // Si cambia de opinión, resetear error y cuotas
    if (cardError) cardError.style.display = 'none';
    if (method !== 'Credit') document.getElementById('exp-installments').value = 1;
});

// Lógica de Intereses
document.getElementById('is-interest-free').addEventListener('change', (e) => {
    const manualInstField = document.getElementById('manual-installment-field');
    manualInstField.style.display = e.target.checked ? 'none' : 'block';
});

// --- ENVÍO DEL FORMULARIO ---
document.getElementById('expense-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();

    // Captura de valores
    const totalAmount = parseFloat(document.getElementById('exp-amount').value);
    const method = document.getElementById('exp-method').value;
    const cardId = document.getElementById('exp-card').value;
    const cardError = document.getElementById('card-error');

    // 1. Validar Tarjeta si no es Efectivo
    if (method !== 'Cash' && (!cardId || cardId === "")) {
        if (cardError) cardError.style.display = 'block';
        document.getElementById('exp-card').focus();
        return;
    }

    // 2. Procesar Cuotas y Monto de Cuota
    let installments = 1;
    let installmentAmt = totalAmount;

    if (method === 'Credit') {
        installments = parseInt(document.getElementById('exp-installments').value, 10) || 1;
        const isInterestFree = document.getElementById('is-interest-free').checked;

        if (isInterestFree) {
            installmentAmt = totalAmount / installments;
        } else {
            const manualAmt = document.getElementById('exp-inst-amount').value;
            installmentAmt = parseFloat(manualAmt);
        }
    } else {
        // Para Cash/Debit, la base de datos prefiere NULL o 1 según tu CHECK
        // Si tu CHECK pide installments = 1, lo dejamos en 1.
        installmentAmt = totalAmount;
    }

    // 3. Validaciones finales
    if (isNaN(totalAmount) || totalAmount <= 0) {
        alert("Ingresa un monto total válido.");
        return;
    }
    if (installments > 1 && (isNaN(installmentAmt) || installmentAmt <= 0)) {
        alert("Ingresa un monto de cuota válido.");
        return;
    }

    // 4. Construcción del Objeto ( UUIDs limpios )
    const newExpense = {
        id_user: user.id,
        amount_exp: totalAmount,
        date_exp: document.getElementById('exp-date').value,
        id_category: cleanUUID(document.getElementById('exp-cat').value),
        id_subcat: cleanUUID(document.getElementById('exp-subcat').value),
        payment_method: method,
        id_card: (method === 'Cash') ? null : cleanUUID(cardId),
        description_exp: document.getElementById('exp-desc').value || null,
        installments: installments,
        installment_amt: installmentAmt
    };

    const { error } = await supabase.from('expenses').insert([newExpense]);

    if (error) {
        console.error("Error Supabase:", error);
        alert("Error al guardar: " + error.message);
    } else {
        window.location.href = 'dashboard.html';
    }
});

init();