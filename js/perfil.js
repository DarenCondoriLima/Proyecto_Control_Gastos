/**
 * perfil.js — ControlGastos
 *
 * Funciones:
 *  - Avatar generativo SVG/Canvas con iniciales + color único basado en nombre
 *  - Carga de datos desde tabla `users` y auth de Supabase
 *  - Stats: conteo de gastos, ingresos, cuentas, deudas
 *  - Actividad reciente (últimos 20 gastos)
 *  - Modales: editar perfil, cambiar contraseña, cambiar email,
 *             foto de perfil, eliminar cuenta
 *  - Tabs de navegación interna
 */

import { supabase } from './supabase.js';

// ═══════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════
let currentUser    = null;   // auth user
let currentProfile = null;   // fila de public.users

// ═══════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════
function showToast(msg, kind = 'success') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = `toast ${kind} show`;
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove('show'), 3500);
}

function openModal(id) {
    document.getElementById(id)?.classList.add('open');
}
function closeModal(id) {
    document.getElementById(id)?.classList.remove('open');
}

// Cierra cualquier modal al hacer clic en el overlay
document.addEventListener('click', e => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('open');
    }
    const closeBtn = e.target.closest('[data-close]');
    if (closeBtn) closeModal(closeBtn.dataset.close);
});

// ═══════════════════════════════════════════════════════════════
// AVATAR GENERATIVO
// ═══════════════════════════════════════════════════════════════

/**
 * Genera un color de fondo consistente basado en el nombre del usuario.
 * Usa un hash simple para que el mismo nombre siempre dé el mismo color.
 */
function nameToColor(name) {
    const PALETTES = [
        { bg: '#2a4858', text: '#e8d5a3' },  // azul oscuro
        { bg: '#3d2b1f', text: '#e8c9a0' },  // café cálido
        { bg: '#1a3a2a', text: '#a8d4b8' },  // verde bosque
        { bg: '#3a1f2e', text: '#e8a0c0' },  // vino
        { bg: '#1f2e3a', text: '#a0c8e8' },  // azul marino
        { bg: '#3a2a1a', text: '#e8c890' },  // ocre oscuro
        { bg: '#2a1f3a', text: '#c0a8e8' },  // púrpura oscuro
        { bg: '#1a2a3a', text: '#90c0d8' },  // azul acero
        { bg: '#3a2828', text: '#e8b0a0' },  // rojo oscuro
        { bg: '#283a28', text: '#b0d8a0' },  // verde salvia
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return PALETTES[Math.abs(hash) % PALETTES.length];
}

/**
 * Extrae las iniciales: "Ramon Yugra" → "RY", "Ana" → "AN"
 */
function getInitials(firstname, lastname) {
    const f = (firstname || '').trim();
    const l = (lastname  || '').trim();
    if (f && l) return (f[0] + l[0]).toUpperCase();
    if (f)      return f.substring(0, 2).toUpperCase();
    return '??';
}

/**
 * Dibuja el avatar generativo en un canvas dado.
 * @param {HTMLCanvasElement} canvas
 * @param {string} initials — ej. "RY"
 * @param {string} fullName — usado para determinar el color
 * @param {number} size     — dimensiones del canvas en px
 */
function drawAvatarCanvas(canvas, initials, fullName, size = 110) {
    canvas.width  = size;
    canvas.height = size;
    const ctx    = canvas.getContext('2d');
    const colors = nameToColor(fullName);
    const cx = size / 2;
    const cy = size / 2;
    const r  = size / 2;

    // Fondo sólido
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = colors.bg;
    ctx.fill();

    // Patrón de círculos sutiles
    ctx.globalAlpha = 0.06;
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(cx, cy, r * (0.4 + i * 0.25), 0, Math.PI * 2);
        ctx.strokeStyle = colors.text;
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Iniciales
    const fontSize = size * 0.34;
    ctx.font = `300 ${fontSize}px 'Fraunces', serif`;
    ctx.fillStyle  = colors.text;
    ctx.textAlign  = 'center';
    ctx.textBaseline = 'middle';
    // Ajuste óptico vertical (Fraunces tiene baseline alta)
    ctx.fillText(initials, cx, cy + fontSize * 0.05);
}

/**
 * Actualiza ambos canvas (hero + modal) y muestra/oculta la imagen real.
 */
function renderAvatar(profile) {
    const initials = getInitials(profile.firstname_user, profile.lastname_user);
    const fullName = `${profile.firstname_user} ${profile.lastname_user}`;
    const imgUrl   = profile.image_user;

    // Canvas hero
    const heroCanvas = document.getElementById('avatar-canvas');
    const heroImg    = document.getElementById('avatar-img');
    drawAvatarCanvas(heroCanvas, initials, fullName, 110);

    if (imgUrl) {
        heroImg.src    = imgUrl;
        heroImg.style.display = 'block';
        heroCanvas.style.opacity = '0';
    } else {
        heroImg.style.display = 'none';
        heroCanvas.style.opacity = '1';
    }

    // Canvas modal de foto
    const modalCanvas = document.getElementById('modal-avatar-canvas');
    const modalImg    = document.getElementById('modal-avatar-img');
    drawAvatarCanvas(modalCanvas, initials, fullName, 90);
    if (imgUrl) {
        modalImg.src = imgUrl; modalImg.style.display = 'block';
        modalCanvas.style.opacity = '0';
    } else {
        modalImg.style.display = 'none';
        modalCanvas.style.opacity = '1';
    }
}

// ═══════════════════════════════════════════════════════════════
// LLENAR DATOS EN LA PÁGINA
// ═══════════════════════════════════════════════════════════════
function fillProfileData(profile, authEmail) {
    // Hero
    document.getElementById('hero-name').innerHTML =
        `${profile.firstname_user} <strong>${profile.lastname_user}</strong>`;
    document.getElementById('hero-username').textContent = `@${profile.name_user}`;
    document.getElementById('hero-email').textContent    = authEmail || profile.email_user;
    document.getElementById('hero-role').textContent     = `⭐ ${profile.role_user || 'User'}`;

    // Grid de datos personales
    const dob = profile.datebirth_user
        ? new Date(profile.datebirth_user + 'T00:00:00')
            .toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })
        : '—';

    document.getElementById('personal-data-grid').innerHTML = `
        <div class="info-item">
            <div class="info-label">Nombre</div>
            <div class="info-value">${profile.firstname_user}</div>
        </div>
        <div class="info-item">
            <div class="info-label">Apellido</div>
            <div class="info-value">${profile.lastname_user}</div>
        </div>
        <div class="info-item">
            <div class="info-label">Usuario</div>
            <div class="info-value">@${profile.name_user}</div>
        </div>
        <div class="info-item">
            <div class="info-label">Fecha de nacimiento</div>
            <div class="info-value">${dob}</div>
        </div>
        <div class="info-item full-width">
            <div class="info-label">Email</div>
            <div class="info-value">${authEmail || profile.email_user}</div>
        </div>`;

    // Prellenar campos de edición
    document.getElementById('edit-firstname').value = profile.firstname_user;
    document.getElementById('edit-lastname').value  = profile.lastname_user;
    document.getElementById('edit-username').value  = profile.name_user;
    if (profile.datebirth_user) {
        document.getElementById('edit-birthdate').value = profile.datebirth_user;
    }
    document.getElementById('email-current').value = authEmail || profile.email_user;

    // Membresía
    const created = new Date(profile.created_at);
    const now     = new Date();
    const days    = Math.floor((now - created) / 86400000);
    document.getElementById('mb-since').textContent = created.toLocaleDateString('es-PE', {
        day: '2-digit', month: 'long', year: 'numeric'
    });
    document.getElementById('mb-days').textContent =
        `${days.toLocaleString('es-PE')} días usando ControlGastos`;
}

// ═══════════════════════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════════════════════
async function loadStats(userId) {
    const [expRes, incRes, cardsRes, debtsRes] = await Promise.all([
        supabase.from('expenses').select('id_exp', { count: 'exact', head: true })
            .eq('id_user', userId).eq('deleted_exp', false),
        supabase.from('monthly_incomes').select('id_income', { count: 'exact', head: true })
            .eq('id_user', userId),
        supabase.from('cards').select('id_card', { count: 'exact', head: true })
            .eq('id_user', userId).eq('deleted_card', false),
        supabase.from('debts').select('id_debt', { count: 'exact', head: true })
            .eq('id_user', userId).neq('status_debt', 'Paid')
    ]);

    document.getElementById('stat-expenses').textContent = (expRes.count  ?? '—').toLocaleString('es-PE');
    document.getElementById('stat-incomes').textContent  = (incRes.count  ?? '—').toLocaleString('es-PE');
    document.getElementById('stat-cards').textContent    = (cardsRes.count ?? '—').toLocaleString('es-PE');
    document.getElementById('stat-debts').textContent    = (debtsRes.count ?? '—').toLocaleString('es-PE');
}

// ═══════════════════════════════════════════════════════════════
// ACTIVIDAD RECIENTE
// ═══════════════════════════════════════════════════════════════
async function loadActivity(userId) {
    const list = document.getElementById('activity-list');
    const countEl = document.getElementById('activity-count');

    const { data, error } = await supabase.from('expenses')
        .select('date_exp, description_exp, amount_exp, payment_method, categories(name_cat)')
        .eq('id_user', userId).eq('deleted_exp', false)
        .order('created_at', { ascending: false })
        .limit(25);

    if (error || !data?.length) {
        list.innerHTML = `<div style="padding:2.5rem;text-align:center;color:var(--muted);font-size:0.82rem;">Sin actividad registrada.</div>`;
        countEl.textContent = '0 registros';
        return;
    }

    countEl.textContent = `Últimos ${data.length} gastos`;
    const methodIcon = { Cash: '💵', Debit: '💳', Credit: '🏦' };
    const fmt = n => `S/ ${parseFloat(n || 0).toFixed(2)}`;
    const fmtDate = d => new Date(d + 'T00:00:00').toLocaleDateString('es-PE', {
        day: '2-digit', month: 'short', year: 'numeric'
    });

    list.innerHTML = data.map((e, i) => `
        <div style="display:flex;align-items:center;gap:0.85rem;padding:0.85rem 1.5rem;
                    border-bottom:1px solid var(--line);animation:fadeIn 0.2s ease both;
                    animation-delay:${i * 0.025}s;">
            <div style="width:36px;height:36px;border-radius:10px;background:var(--rust-soft);
                        display:flex;align-items:center;justify-content:center;
                        font-size:0.9rem;flex-shrink:0;">
                ${methodIcon[e.payment_method] || '💸'}
            </div>
            <div style="flex:1;min-width:0;">
                <div style="font-size:0.82rem;font-weight:500;
                            white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                    ${e.description_exp}
                </div>
                <div style="font-size:0.68rem;color:var(--muted);margin-top:1px;">
                    ${fmtDate(e.date_exp)}
                    ${e.categories?.name_cat ? ` · ${e.categories.name_cat}` : ''}
                </div>
            </div>
            <div style="font-family:'Fraunces',serif;font-size:0.95rem;
                        color:var(--rust);white-space:nowrap;flex-shrink:0;">
                ${fmt(e.amount_exp)}
            </div>
        </div>`).join('');
}

// ═══════════════════════════════════════════════════════════════
// TABS
// ═══════════════════════════════════════════════════════════════
function initTabs(userId) {
    let activityLoaded = false;
    document.querySelectorAll('.ptab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.ptab').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.ptab-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`panel-${btn.dataset.tab}`)?.classList.add('active');

            if (btn.dataset.tab === 'activity' && !activityLoaded) {
                activityLoaded = true;
                loadActivity(userId);
            }
        });
    });
}

// ═══════════════════════════════════════════════════════════════
// MODAL: EDITAR PERFIL
// ═══════════════════════════════════════════════════════════════
function initEditProfileModal(userId) {
    const open = () => { openModal('modal-settings'); closeModal('modal-edit-profile'); openModal('modal-edit-profile'); };

    document.getElementById('btn-edit-profile')?.addEventListener('click', open);
    document.getElementById('cfg-edit-profile')?.addEventListener('click', open);

    document.getElementById('btn-save-profile').addEventListener('click', async () => {
        const btn = document.getElementById('btn-save-profile');
        const firstname = document.getElementById('edit-firstname').value.trim();
        const lastname  = document.getElementById('edit-lastname').value.trim();
        const username  = document.getElementById('edit-username').value.trim();
        const birthdate = document.getElementById('edit-birthdate').value;

        if (!firstname || !lastname || !username) {
            showToast('Completa todos los campos.', 'error'); return;
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            showToast('El usuario solo puede tener letras, números y _', 'error'); return;
        }

        btn.disabled = true; btn.textContent = 'Guardando…';

        const { error } = await supabase.from('users').update({
            firstname_user: firstname,
            lastname_user:  lastname,
            name_user:      username,
            datebirth_user: birthdate || null,
            updated_at:     new Date().toISOString()
        }).eq('id_user', userId);

        btn.disabled = false; btn.textContent = 'Guardar cambios';

        if (error) {
            console.error('[edit-profile]', error);
            showToast('Error: ' + error.message, 'error');
        } else {
            // Actualizar estado local
            currentProfile = { ...currentProfile, firstname_user: firstname, lastname_user: lastname, name_user: username };
            if (birthdate) currentProfile.datebirth_user = birthdate;

            fillProfileData(currentProfile, currentUser.email);
            renderAvatar(currentProfile);
            closeModal('modal-edit-profile');
            showToast('✓ Perfil actualizado', 'success');
        }
    });
}

// ═══════════════════════════════════════════════════════════════
// MODAL: CONTRASEÑA
// ═══════════════════════════════════════════════════════════════
function initPasswordModal() {
    const open = () => { closeModal('modal-settings'); openModal('modal-change-password'); };
    document.getElementById('btn-change-password')?.addEventListener('click', open);
    document.getElementById('cfg-change-password')?.addEventListener('click', open);

    const pwdNew     = document.getElementById('pwd-new');
    const pwdConfirm = document.getElementById('pwd-confirm');
    const pwdBar     = document.getElementById('pwd-bar');
    const pwdLabel   = document.getElementById('pwd-label');
    const matchError = document.getElementById('pwd-match-error');
    const saveBtn    = document.getElementById('btn-save-password');

    function evalStrength(pwd) {
        let score = 0;
        if (pwd.length >= 8)  score++;
        if (pwd.length >= 12) score++;
        if (/[A-Z]/.test(pwd)) score++;
        if (/[0-9]/.test(pwd)) score++;
        if (/[^A-Za-z0-9]/.test(pwd)) score++;
        return score;
    }

    function updatePwdUI() {
        const val     = pwdNew.value;
        const score   = evalStrength(val);
        const pct     = val.length === 0 ? 0 : Math.max(20, (score / 5) * 100);
        const colors  = ['#c05c3a','#c05c3a','#c9a84c','#7a8c70','#4a7a9b'];
        const labels  = ['','Muy débil','Débil','Aceptable','Fuerte','Muy fuerte'];

        pwdBar.style.width      = pct + '%';
        pwdBar.style.background = val.length ? colors[Math.min(score - 1, 4)] : '#c05c3a';
        pwdLabel.textContent    = val.length ? labels[score] || 'Muy fuerte' : 'Ingresa una contraseña';

        const match = pwdConfirm.value && pwdNew.value !== pwdConfirm.value;
        matchError.style.display = match ? 'block' : 'none';

        saveBtn.disabled = !(val.length >= 8 && pwdNew.value === pwdConfirm.value && pwdConfirm.value);
    }

    pwdNew.addEventListener('input',     updatePwdUI);
    pwdConfirm.addEventListener('input', updatePwdUI);

    saveBtn.addEventListener('click', async () => {
        saveBtn.disabled = true; saveBtn.textContent = 'Actualizando…';

        const { error } = await supabase.auth.updateUser({ password: pwdNew.value });

        saveBtn.disabled = false; saveBtn.textContent = 'Actualizar contraseña';

        if (error) {
            showToast('Error: ' + error.message, 'error');
        } else {
            pwdNew.value = ''; pwdConfirm.value = '';
            updatePwdUI();
            closeModal('modal-change-password');
            showToast('✓ Contraseña actualizada', 'success');
        }
    });
}

// ═══════════════════════════════════════════════════════════════
// MODAL: EMAIL
// ═══════════════════════════════════════════════════════════════
function initEmailModal() {
    document.getElementById('cfg-change-email')?.addEventListener('click', () => {
        closeModal('modal-settings'); openModal('modal-change-email');
    });

    document.getElementById('btn-save-email').addEventListener('click', async () => {
        const btn      = document.getElementById('btn-save-email');
        const newEmail = document.getElementById('email-new').value.trim();

        if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
            showToast('Ingresa un email válido.', 'error'); return;
        }

        btn.disabled = true; btn.textContent = 'Enviando…';

        const { error } = await supabase.auth.updateUser({ email: newEmail });

        btn.disabled = false; btn.textContent = 'Enviar confirmación';

        if (error) {
            showToast('Error: ' + error.message, 'error');
        } else {
            document.getElementById('email-new').value = '';
            closeModal('modal-change-email');
            showToast('✓ Enlace de confirmación enviado a ' + newEmail, 'success');
        }
    });
}

// ═══════════════════════════════════════════════════════════════
// MODAL: FOTO
// ═══════════════════════════════════════════════════════════════
function initPhotoModal(userId) {
    const open = () => { closeModal('modal-settings'); openModal('modal-photo'); };
    document.getElementById('btn-change-photo')?.addEventListener('click', open);
    document.getElementById('cfg-change-photo')?.addEventListener('click', open);

    // Previsualizar URL en tiempo real
    document.getElementById('photo-url').addEventListener('input', e => {
        const url       = e.target.value.trim();
        const modalImg  = document.getElementById('modal-avatar-img');
        const modalCvs  = document.getElementById('modal-avatar-canvas');
        if (url) {
            modalImg.src           = url;
            modalImg.style.display = 'block';
            modalCvs.style.opacity = '0';
        } else {
            modalImg.style.display = 'none';
            modalCvs.style.opacity = '1';
        }
    });

    // Eliminar foto
    document.getElementById('btn-remove-photo').addEventListener('click', async () => {
        const { error } = await supabase.from('users')
            .update({ image_user: null, updated_at: new Date().toISOString() })
            .eq('id_user', userId);
        if (error) { showToast('Error: ' + error.message, 'error'); return; }
        currentProfile.image_user = null;
        renderAvatar(currentProfile);
        document.getElementById('photo-url').value = '';
        closeModal('modal-photo');
        showToast('✓ Foto eliminada', 'success');
    });

    // Guardar URL
    document.getElementById('btn-save-photo').addEventListener('click', async () => {
        const btn = document.getElementById('btn-save-photo');
        const url = document.getElementById('photo-url').value.trim();

        btn.disabled = true; btn.textContent = 'Guardando…';

        const { error } = await supabase.from('users')
            .update({ image_user: url || null, updated_at: new Date().toISOString() })
            .eq('id_user', userId);

        btn.disabled = false; btn.textContent = 'Guardar foto';

        if (error) { showToast('Error: ' + error.message, 'error'); return; }
        currentProfile.image_user = url || null;
        renderAvatar(currentProfile);
        closeModal('modal-photo');
        showToast('✓ Foto actualizada', 'success');
    });
}

// ═══════════════════════════════════════════════════════════════
// MODAL: ELIMINAR CUENTA
// ═══════════════════════════════════════════════════════════════
function initDeleteModal(userId) {
    document.getElementById('cfg-delete-account').addEventListener('click', () => {
        closeModal('modal-settings'); openModal('modal-delete-account');
    });

    const confirmInput = document.getElementById('delete-confirm-input');
    const confirmBtn   = document.getElementById('btn-confirm-delete');

    confirmInput.addEventListener('input', () => {
        confirmBtn.disabled = confirmInput.value !== 'ELIMINAR';
    });

    confirmBtn.addEventListener('click', async () => {
        confirmBtn.disabled = true; confirmBtn.textContent = 'Eliminando…';

        // Soft delete en tabla users
        const { error } = await supabase.from('users')
            .update({ deleted_user: true, updated_at: new Date().toISOString() })
            .eq('id_user', userId);

        if (error) {
            confirmBtn.disabled = false; confirmBtn.textContent = 'Eliminar mi cuenta';
            showToast('Error: ' + error.message, 'error');
        } else {
            await supabase.auth.signOut();
            window.location.href = 'login.html';
        }
    });
}

// ═══════════════════════════════════════════════════════════════
// LOGOUT
// ═══════════════════════════════════════════════════════════════
function initLogout() {
    document.getElementById('btn-logout').addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = 'login.html';
    });
}

// ═══════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════
async function init() {
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) { window.location.href = 'login.html'; return; }
    currentUser = user;

    // Cargar perfil
    const { data: profile, error: profErr } = await supabase
        .from('users')
        .select('*')
        .eq('id_user', user.id)
        .single();

    if (profErr || !profile) {
        showToast('No se pudo cargar el perfil.', 'error'); return;
    }
    currentProfile = profile;

    // Renderizar avatar PRIMERO (antes de rellenar datos para evitar parpadeo)
    renderAvatar(profile);
    fillProfileData(profile, user.email);

    // Cargar stats y tabs
    await loadStats(user.id);
    initTabs(user.id);

    // Inicializar modales
    initEditProfileModal(user.id);
    initPasswordModal();
    initEmailModal();
    initPhotoModal(user.id);
    initDeleteModal(user.id);
    initLogout();

    // Botón de configuración global
    document.getElementById('btn-open-settings')?.addEventListener('click', () => openModal('modal-settings'));
}

init();