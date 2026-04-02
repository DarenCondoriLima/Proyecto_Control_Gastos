import { supabase } from './supabase.js';

async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return window.location.href = 'login.html';

    const form = document.getElementById('budget-form');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Captura de datos siguiendo tu estructura SQL
        const budgetData = {
            id_user: user.id,
            name_budget: document.getElementById('budget-name').value,
            month_budget: parseInt(document.getElementById('budget-month').value),
            year_budget: parseInt(document.getElementById('budget-year').value),
            total_budget: parseFloat(document.getElementById('budget-total').value),
            currency_budget: document.getElementById('budget-currency').value,
            deleted_budget: false
        };

        const { error } = await supabase
            .from('budgets')
            .insert([budgetData]);

        if (error) {
            console.error("Error al guardar:", error.message);
            alert("No se pudo guardar el presupuesto: " + error.message);
        } else {
            window.location.href = 'presupuestos.html';
        }
    });
}

init();