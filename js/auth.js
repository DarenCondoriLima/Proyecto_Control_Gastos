import { supabase } from './supabase.js';

// --- LÓGICA DE INTERFAZ (TABS) ---
const tabs = document.querySelectorAll('.tab-btn');
tabs.forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.dataset.target;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(target).classList.add('active');

        const header = document.querySelector('.form-header h2');
        const sub = document.querySelector('.form-header p');
        if (target === 'login-pane') {
            header.textContent = 'Bienvenido de nuevo';
            sub.textContent = 'Ingresa a tu cuenta para continuar';
        } else {
            header.textContent = 'Crea tu cuenta';
            sub.textContent = 'Empieza a controlar tus finanzas hoy';
        }
    });
});

// --- FUNCIÓN DE ALERTAS ---
function showAlert(msg, type = 'error') {
    const c = document.getElementById('alert-container');
    const alertType = type === 'success' ? 'alert-success' : 'alert-error';
    c.innerHTML = `<div class="alert ${alertType} show">${msg}</div>`;
    // No limpiar inmediatamente si es éxito para que el usuario lea
    if(type !== 'success') setTimeout(() => c.innerHTML = '', 4000);
}

// --- VALIDACIÓN DE CONTRASEÑA ---
function isStrongPassword(password) {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\w\W]{8,}$/;
    return regex.test(password);
}

// --- LOGIN REAL ---
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        showAlert('Credenciales incorrectas o correo no verificado.', 'error');
    } else {
        showAlert('¡Bienvenido! Redirigiendo...', 'success');
        setTimeout(() => window.location.href = 'dashboard.html', 1500);
    }
});

// --- REGISTRO REAL ---
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const firstName = document.getElementById('reg-firstname').value;
    const lastName = document.getElementById('reg-lastname').value;
    const birthDate = document.getElementById('reg-birth').value;

    if (!isStrongPassword(password)) {
        showAlert('La contraseña no cumple los requisitos mínimos.', 'error');
        return;
    }

    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                first_name: firstName,
                last_name: lastName,
                birth_date: birthDate
            }
        }
    });

    if (error) {
        showAlert(error.message, 'error');
    } else {
        showAlert('¡Cuenta creada! Verifica tu correo electrónico.', 'success');
        document.getElementById('register-form').reset();
    }
});