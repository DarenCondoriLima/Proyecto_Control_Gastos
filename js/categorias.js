import { supabase } from './supabase.js';

const palette = ['#c9a84c','#7a8c70','#c05c3a','#5e7a8c','#8c6b5e','#a8a87a'];

async function init() {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        window.location.href = 'login.html';
        return;
    }

    const nameDisplay = document.getElementById('user-name');
    const initialDisplay = document.getElementById('sb-initial');
    
    if (user.user_metadata && user.user_metadata.first_name) {
        nameDisplay.innerText = user.user_metadata.first_name;
        initialDisplay.innerText = user.user_metadata.first_name.charAt(0).toUpperCase();
    } else {
        nameDisplay.innerText = user.email.split('@')[0];
    }

    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.localStorage.clear();
            window.location.href = 'login.html';
        });
    }

    renderCategories(user.id);
}

async function renderCategories(userId) {
    const grid = document.getElementById('categories-grid'); // Para Gastos
    const incomeList = document.getElementById('income-categories-list'); // Para Ingresos
    const empty = document.getElementById('empty-state');

    const { data: cats, error } = await supabase
        .from('categories')
        .select('*, subcategories(*)')
        .eq('id_user', userId)
        .eq('deleted_cat', false)
        .order('name_cat', { ascending: true });

    if (error || !cats || cats.length === 0) {
        grid.innerHTML = '';
        incomeList.innerHTML = '';
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';

    // Separar datos
    const gastoCats = cats.filter(c => c.type_cat === 'gasto');
    const ingresoCats = cats.filter(c => c.type_cat === 'ingreso');

    // 1. Renderizar CARDS de Gastos
    grid.innerHTML = gastoCats.map((cat, i) => {
        const activeSubs = cat.subcategories.filter(s => !s.deleted_subcat);
        const subItems = activeSubs.map(sub => `
            <div class="subcat-item">
                <span class="subcat-name">${sub.name_subcat}</span>
                <div class="subcat-actions">
                    <button class="icon-btn" onclick="openEditSub('${cat.id_cat}', '${sub.id_subcat}', '${sub.name_subcat}', '${cat.name_cat}')">
                        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 13.5V16h2.5l7.37-7.37-2.5-2.5L4 13.5zM15.71 6.04a1 1 0 000-1.41L14.37 3.29a1 1 0 00-1.41 0l-1.06 1.06 2.5 2.5 1.31-1.31z" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                    <button class="icon-btn danger" onclick="deleteSub('${sub.id_subcat}')">
                        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 7h10M8 7V5h4v2M9 10v4M11 10v4M6 7l.9 9.1a1 1 0 001 .9h4.2a1 1 0 001-.9L14 7" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                </div>
            </div>`).join('');

        return `
            <div class="cat-card" style="animation-delay:${i * 0.05}s">
                <div class="cat-card-header">
                    <div class="cat-card-left">
                        <span class="cat-color-dot" style="background:${palette[i % palette.length]}"></span>
                        <span class="cat-name">${cat.name_cat}</span>
                    </div>
                    <div class="cat-actions">
                        <button class="icon-btn" onclick="openEditCat('${cat.id_cat}', '${cat.name_cat}', 'gasto')">
                            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 13.5V16h2.5l7.37-7.37-2.5-2.5L4 13.5zM15.71 6.04a1 1 0 000-1.41L14.37 3.29a1 1 0 00-1.41 0l-1.06 1.06 2.5 2.5 1.31-1.31z" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        </button>
                        <button class="icon-btn danger" onclick="deleteCat('${cat.id_cat}')">
                            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 7h10M8 7V5h4v2M9 10v4M11 10v4M6 7l.9 9.1a1 1 0 001 .9h4.2a1 1 0 001-.9L14 7" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        </button>
                    </div>
                </div>
                <div class="subcat-list">${activeSubs.length === 0 ? `<p style="font-size:0.75rem;color:var(--muted);padding:0.4rem 0;">Sin subcategorías</p>` : subItems}</div>
                <button class="add-subcat-btn" onclick="openNewSub('${cat.id_cat}', '${cat.name_cat}')">Agregar subcategoría</button>
            </div>`;
    }).join('');

    // 2. Renderizar LISTA de Ingresos
    incomeList.innerHTML = ingresoCats.map(cat => `
        <div class="subcat-item" style="padding: 1rem 1.25rem; border-bottom: 1px solid var(--line);">
            <div style="display: flex; align-items: center; gap: 0.8rem;">
                <span class="cat-color-dot" style="background:var(--sage)"></span>
                <span style="font-weight: 500; font-size: 0.9rem;">${cat.name_cat}</span>
            </div>
            <div class="subcat-actions">
                <button class="icon-btn" onclick="openEditCat('${cat.id_cat}', '${cat.name_cat}', 'ingreso')">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 13.5V16h2.5l7.37-7.37-2.5-2.5L4 13.5zM15.71 6.04a1 1 0 000-1.41L14.37 3.29a1 1 0 00-1.41 0l-1.06 1.06 2.5 2.5 1.31-1.31z" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
                <button class="icon-btn danger" onclick="deleteCat('${cat.id_cat}')">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 7h10M8 7V5h4v2M9 10v4M11 10v4M6 7l.9 9.1a1 1 0 001 .9h4.2a1 1 0 001-.9L14 7" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
            </div>
        </div>
    `).join('');
}

// --- MODALES ---
const openM = (id) => document.getElementById(id).classList.add('open');
const closeM = (id) => document.getElementById(id).classList.remove('open');

document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeM(btn.dataset.close));
});

// --- OPERACIONES CATEGORÍA ---

// Botón nueva categoría de GASTO
document.getElementById('btn-open-cat-modal').addEventListener('click', () => {
    openCategoryModal('gasto');
});

// Botón nueva categoría de INGRESO
document.getElementById('btn-open-income-modal').addEventListener('click', () => {
    openCategoryModal('ingreso');
});

function openCategoryModal(type, id = '', name = '') {
    document.getElementById('cat-modal-title').textContent = id ? 'Editar Categoría' : 'Nueva Categoría';
    document.getElementById('edit-cat-id').value = id;
    document.getElementById('cat-name-input').value = name;
    document.getElementById('cat-type-input').value = type; // Input oculto necesario en HTML
    
    // Cambiar color visual del botón del modal
    const saveBtn = document.querySelector('#form-category .btn-save');
    saveBtn.style.background = type === 'ingreso' ? 'var(--sage)' : 'var(--ink)';
    
    openM('modal-cat');
}

window.openEditCat = (id, name, type) => {
    openCategoryModal(type, id, name);
};

document.getElementById('form-category').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    const id = document.getElementById('edit-cat-id').value;
    const name = document.getElementById('cat-name-input').value;
    const type = document.getElementById('cat-type-input').value;

    if (id) {
        await supabase.from('categories').update({ name_cat: name }).eq('id_cat', id);
    } else {
        await supabase.from('categories').insert([{ name_cat: name, id_user: user.id, type_cat: type }]);
    }
    closeM('modal-cat');
    renderCategories(user.id);
});

window.deleteCat = async (id) => {
    if (confirm("¿Eliminar categoría?")) {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('categories').update({ deleted_cat: true }).eq('id_cat', id);
        renderCategories(user.id);
    }
};

// --- OPERACIONES SUBCATEGORÍA ---
window.openNewSub = (catId, catName) => {
    document.getElementById('sub-modal-title').textContent = 'Nueva Subcategoría';
    document.getElementById('parent-cat-id').value = catId;
    document.getElementById('parent-name-display').textContent = catName;
    document.getElementById('edit-sub-id').value = '';
    document.getElementById('sub-name-input').value = '';
    openM('modal-sub');
};

window.openEditSub = (catId, subId, subName, catName) => {
    document.getElementById('sub-modal-title').textContent = 'Editar Subcategoría';
    document.getElementById('parent-cat-id').value = catId;
    document.getElementById('parent-name-display').textContent = catName;
    document.getElementById('edit-sub-id').value = subId;
    document.getElementById('sub-name-input').value = subName;
    openM('modal-sub');
};

document.getElementById('form-subcategory').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    const subId = document.getElementById('edit-sub-id').value;
    const catId = document.getElementById('parent-cat-id').value;
    const name = document.getElementById('sub-name-input').value;

    if (subId) {
        await supabase.from('subcategories').update({ name_subcat: name }).eq('id_subcat', subId);
    } else {
        await supabase.from('subcategories').insert([{ name_subcat: name, id_category: catId, id_user: user.id }]);
    }
    closeM('modal-sub');
    renderCategories(user.id);
});

window.deleteSub = async (id) => {
    if (confirm("¿Eliminar subcategoría?")) {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('subcategories').update({ deleted_subcat: true }).eq('id_subcat', id);
        renderCategories(user.id);
    }
};

init();