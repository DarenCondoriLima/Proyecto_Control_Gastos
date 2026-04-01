import { supabase } from './supabase.js';

async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return window.location.href = 'login.html';

    // Datos del sidebar
    document.getElementById('user-name').innerText = user.user_metadata.first_name || user.email.split('@')[0];
    document.getElementById('sb-initial').innerText = (user.user_metadata.first_name || 'U').charAt(0).toUpperCase();

    renderDebts(user.id);
}

async function renderDebts(userId) {
    const container = document.getElementById('debt-container');
    
    const { data: debts, error } = await supabase
        .from('debts')
        .select('*')
        .eq('id_user', userId)
        .eq('deleted_debt', false)
        .order('date_debt', { ascending: false });

    if (error) return console.error(error);

    container.innerHTML = debts.map(debt => {
        const balance = debt.amount_debt - debt.amount_paid;
        const statusColor = debt.status_debt === 'Paid' ? 'var(--sage)' : (debt.status_debt === 'Partial' ? 'var(--gold)' : 'var(--rust)');

        return `
            <div class="debt-card" style="border-left: 5px solid ${statusColor}">
                <div class="debt-date">Prestado el: ${debt.date_debt} ${debt.due_date_debt ? `| Vence: ${debt.due_date_debt}` : ''}</div>
                <div class="debt-name">${debt.debtor_name}</div>
                <div style="font-size: 0.75rem; color: var(--muted); margin-bottom: 0.5rem;">${debt.description_debt}</div>
                
                <div class="debt-amount">S/ ${debt.amount_debt.toFixed(2)}</div>
                
                <div style="font-size: 0.85rem; margin-top: 0.5rem;">
                    <span style="color: var(--sage)">Pagado: S/ ${debt.amount_paid.toFixed(2)}</span><br>
                    <span style="font-weight: bold;">Pendiente: S/ ${balance.toFixed(2)}</span>
                </div>

                <div class="card-footer" style="margin-top: 1rem; display: flex; gap: 8px;">
                    <button class="icon-btn" onclick="openEditDebt('${debt.id_debt}', '${debt.debtor_name}', '${debt.amount_debt}', '${debt.amount_paid}', '${debt.date_debt}', '${debt.due_date_debt || ''}', '${debt.description_debt}')">
                         <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 13.5V16h2.5l7.37-7.37-2.5-2.5L4 13.5zM15.71 6.04a1 1 0 000-1.41L14.37 3.29a1 1 0 00-1.41 0l-1.06 1.06 2.5 2.5 1.31-1.31z" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                    <button class="icon-btn danger" onclick="deleteDebt('${debt.id_debt}')">
                        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 7h10M8 7V5h4v2M9 10v4M11 10v4M6 7l.9 9.1a1 1 0 001 .9h4.2a1 1 0 001-.9L14 7" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Lógica del Formulario
document.getElementById('debt-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    
    const id = document.getElementById('edit-debt-id').value;
    const total = parseFloat(document.getElementById('debt-amount').value);
    const paid = parseFloat(document.getElementById('debt-paid').value) || 0;
    
    // Determinar estado automáticamente
    let status = 'Pending';
    if (paid >= total) status = 'Paid';
    else if (paid > 0) status = 'Partial';

    const debtData = {
        id_user: user.id,
        debtor_name: document.getElementById('debt-name').value,
        description_debt: document.getElementById('debt-desc').value,
        amount_debt: total,
        amount_paid: paid,
        date_debt: document.getElementById('debt-date').value,
        due_date_debt: document.getElementById('debt-due').value || null,
        status_debt: status,
        currency_debt: 'PEN'
    };

    if (id) {
        await supabase.from('debts').update(debtData).eq('id_debt', id);
    } else {
        await supabase.from('debts').insert([debtData]);
    }

    closeModal();
    renderDebts(user.id);
});

// Funciones globales para el HTML
window.openEditDebt = (id, name, total, paid, date, due, desc) => {
    document.getElementById('edit-debt-id').value = id;
    document.getElementById('debt-name').value = name;
    document.getElementById('debt-amount').value = total;
    document.getElementById('debt-paid').value = paid;
    document.getElementById('debt-date').value = date;
    document.getElementById('debt-due').value = due;
    document.getElementById('debt-desc').value = desc;
    document.getElementById('debt-modal').classList.add('open');
};

window.deleteDebt = async (id) => {
    if (confirm("¿Marcar préstamo como eliminado?")) {
        await supabase.from('debts').update({ deleted_debt: true }).eq('id_debt', id);
        init();
    }
};

window.closeModal = () => document.getElementById('debt-modal').classList.remove('open');

document.getElementById('btn-new-debt').onclick = () => {
    document.getElementById('debt-form').reset();
    document.getElementById('edit-debt-id').value = '';
    document.getElementById('debt-modal').classList.add('open');
};

init();