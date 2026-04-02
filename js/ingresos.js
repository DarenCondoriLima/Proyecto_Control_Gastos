import { supabase } from './supabase.js';

const cleanUUID = (id) => (id && id !== "" && id !== "0") ? id : null;

function setupAmountValidation(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    input.addEventListener('input', (e) => {
        if (e.target.value.includes(',')) e.target.value = e.target.value.replace(',', '.');
        e.target.value = e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    });

    input.addEventListener('blur', (e) => {
        let val = e.target.value;
        if (val !== '' && !isNaN(parseFloat(val))) {
            e.target.value = parseFloat(val).toFixed(2);
        }
    });
}

async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // 1. Configurar datos del usuario en Sidebar
    document.getElementById('user-name').innerText = user.user_metadata.first_name || user.email.split('@')[0];
    document.getElementById('sb-initial').innerText = (user.user_metadata.first_name || 'U').charAt(0).toUpperCase();

    // 2. Fecha por defecto
    document.getElementById('inc-date').valueAsDate = new Date();

    // 3. CARGAR CATEGORÍAS REALES DESDE SUPABASE
    const { data: cats, error: catErr } = await supabase
    .from('categories')
    .select('id_cat, name_cat')
    .eq('id_user', user.id)
    .eq('deleted_cat', false)
    .eq('type_cat', 'ingreso') // <--- EL FILTRO CLAVE
    .order('name_cat', { ascending: true });

    const catSelect = document.getElementById('inc-cat');
    catSelect.innerHTML = '<option value="">Selecciona categoría</option>';

    if (cats && cats.length > 0) {
        cats.forEach(c => {
            catSelect.innerHTML += `<option value="${c.id_cat}">${c.name_cat}</option>`;
        });
    } else {
        catSelect.innerHTML = '<option value="">No hay categorías de ingreso. Crea una primero.</option>';
    }

    // 4. Cargar Cuentas/Tarjetas
    const { data: cards } = await supabase
    .from('cards')
    .select('id_card, name_card')
    .eq('id_user', user.id)
    .in('type_card', ['Debit', 'Cash']);

        
    const cardSelect = document.getElementById('inc-card');
    cardSelect.innerHTML = '<option value="">Selecciona destino...</option>';
    cards?.forEach(card => {
        cardSelect.innerHTML += `<option value="${card.id_card}">${card.name_card}</option>`;
    });
}

// Mostrar/Ocultar campo de cuenta
document.getElementById('inc-method').addEventListener('change', (e) => {
    const cardDiv = document.getElementById('card-field');
    cardDiv.style.display = (e.target.value === 'Debit') ? 'block' : 'none';
    document.getElementById('card-error').style.display = 'none';
});

// Guardar Ingreso
document.getElementById('income-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();

    const amount = parseFloat(document.getElementById('inc-amount').value);
    const method = document.getElementById('inc-method').value;
    const cardId = document.getElementById('inc-card').value;

    if (method === 'Debit' && !cleanUUID(cardId)) {
        document.getElementById('card-error').style.display = 'block';
        return;
    }

    const newIncome = {
        id_user: user.id,
        amount_inc: amount,
        date_inc: document.getElementById('inc-date').value,
        id_category: cleanUUID(document.getElementById('inc-cat').value),
        payment_method: method,
        id_card: (method === 'Cash') ? null : cleanUUID(cardId),
        description_inc: document.getElementById('inc-desc').value || null
    };

    const { error } = await supabase.from('incomes').insert([newIncome]);

    if (error) {
        alert("Error al guardar: " + error.message);
    } else {
        window.location.href = 'dashboard.html';
    }
});

init();