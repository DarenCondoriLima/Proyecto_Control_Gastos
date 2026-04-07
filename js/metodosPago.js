import { supabase } from './supabase.js';

async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // Datos del usuario en el sidebar
    document.getElementById('user-name').innerText = user.user_metadata.first_name || user.email.split('@')[0];
    document.getElementById('sb-initial').innerText = (user.user_metadata.first_name || 'U').charAt(0).toUpperCase();

    renderCards(user.id);
}

// --- RENDERIZADO ---
async function renderCards(userId) {
    const container = document.getElementById('cards-container');
    const { data: cards, error } = await supabase
        .from('cards') 
        .select('*')
        .eq('id_user', userId) 
        .eq('deleted_card', false);

    if (error) {
        console.error("Error al cargar tarjetas:", error);
        return;
    }

    container.innerHTML = cards.map(card => {
        const balance = parseFloat(card.current_balance || 0);
        const isCredit = card.type_card === 'Credit';
        
        // Determinamos el color del saldo: rojo si es deuda (crédito) o negativo, verde si es ahorro
        const balanceColor = isCredit ? 'var(--rust)' : (balance >= 0 ? 'var(--sage)' : 'var(--rust)');
        const balanceLabel = isCredit ? 'Deuda Actual' : 'Saldo Disponible';

        return `
        <div class="bank-card">
            <div class="card-type">${isCredit ? 'Tarjeta de Crédito' : 'Cuenta / Débito'}</div>
            <div class="card-name">${card.name_card}</div>
            
            <div style="margin: 1rem 0; padding: 0.5rem 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line);">
                <div style="font-size: 0.65rem; text-transform: uppercase; color: var(--muted); letter-spacing: 0.05em;">
                    ${balanceLabel}
                </div>
                <div style="font-family: 'Fraunces', serif; font-size: 1.4rem; color: ${balanceColor}; font-weight: 600;">
                    S/ ${balance.toFixed(2)}
                </div>
            </div>

            <div style="color: var(--muted); font-size: 0.75rem;">
                Moneda: ${card.currency} 
                ${isCredit ? `| Límite: S/ ${card.limit_card}` : ''}
            </div>

            <div class="card-footer">
                <span style="font-size: 0.7rem; color: var(--gold); font-weight: 600;">ACTIVA</span>
                <div class="card-actions">
                    <button class="icon-btn" onclick="editCard('${card.id_card}', '${card.name_card}', '${card.type_card}', '${card.limit_card || 0}', '${card.cutoff_day || ''}', '${card.due_day || ''}')">
                        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 13.5V16h2.5l7.37-7.37-2.5-2.5L4 13.5zM15.71 6.04a1 1 0 000-1.41L14.37 3.29a1 1 0 00-1.41 0l-1.06 1.06 2.5 2.5 1.31-1.31z" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                    <button class="icon-btn danger" onclick="deleteCard('${card.id_card}')">
                        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 7h10M8 7V5h4v2M9 10v4M11 10v4M6 7l.9 9.1a1 1 0 001 .9h4.2a1 1 0 001-.9L14 7" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                </div>
            </div>
        </div>
    `}).join('');
}

// Abrir modal
document.getElementById('btn-new-card').addEventListener('click', () => {
    document.getElementById('card-form').reset();
    document.getElementById('edit-card-id').value = '';
    document.getElementById('modal-title').innerText = 'Nueva Tarjeta';
    document.getElementById('card-modal').classList.add('open');
});

window.closeModal = () => document.getElementById('card-modal').classList.remove('open');

window.editCard = (id, name, type, limit, cutoff, due) => {
    // 1. Llenar campos básicos
    document.getElementById('edit-card-id').value = id;
    document.getElementById('card-name').value = name;
    document.getElementById('card-type').value = type;
    
    const creditFields = document.getElementById('credit-fields');

    // 2. Lógica para campos de crédito
    if (type === 'Credit') {
        creditFields.style.display = 'block';
        document.getElementById('card-limit').value = limit;
        document.getElementById('card-cutoff').value = cutoff;
        document.getElementById('card-due').value = due;
    } else {
        creditFields.style.display = 'none';
        // Limpiamos los campos de crédito por si acaso
        document.getElementById('card-limit').value = '';
        document.getElementById('card-cutoff').value = '';
        document.getElementById('card-due').value = '';
    }

    // 3. Cambiar título y abrir modal
    document.getElementById('modal-title').innerText = 'Editar Tarjeta';
    document.getElementById('card-modal').classList.add('open');
};

// --- ENVÍO DEL FORMULARIO ---
document.getElementById('card-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    
    const id = document.getElementById('edit-card-id').value;
    const type = document.getElementById('card-type').value;

    // TODO EN MINÚSCULAS PARA POSTGRES
    const cardData = {
        id_user: user.id,
        name_card: document.getElementById('card-name').value.trim(),
        type_card: type,
        currency: 'PEN', 
        limit_card: type === 'Credit' ? parseFloat(document.getElementById('card-limit').value) || 0 : null,
        cutoff_day: type === 'Credit' ? parseInt(document.getElementById('card-cutoff').value) || null : null,
        due_day: type === 'Credit' ? parseInt(document.getElementById('card-due').value) || null : null,
        deleted_card: false
    };

    let response;
    if (id) {
        response = await supabase.from('cards').update(cardData).eq('id_card', id);
    } else {
        response = await supabase.from('cards').insert([cardData]);
    }

    if (response.error) {
        console.error("Error de Supabase:", response.error);
        alert("Error: " + response.error.message);
    } else {
        closeModal();
        renderCards(user.id);
    }
});

window.deleteCard = async (id) => {
    if (confirm("¿Eliminar este método de pago? Los registros vinculados podrían verse afectados.")) {
        await supabase.from('cards').delete().eq('id_card', id);
        init();
    }
};

// --- Control de visibilidad para campos de Crédito ---
const cardTypeSelect = document.getElementById('card-type');
const creditFields = document.getElementById('credit-fields');

cardTypeSelect.addEventListener('change', (e) => {
    // Si el valor seleccionado es 'Credit', mostramos el div, si no, lo ocultamos
    if (e.target.value === 'Credit') {
        creditFields.style.display = 'block';
    } else {
        creditFields.style.display = 'none';
        // Limpiamos los valores por seguridad si cambia a Débito
        document.getElementById('card-limit').value = '';
        document.getElementById('card-cutoff').value = '';
        document.getElementById('card-due').value = '';
    }
});

init();