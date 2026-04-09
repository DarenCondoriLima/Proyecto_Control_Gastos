import { supabase } from './supabase.js';

// ─────────────────────────────────────────────────────────────
// 1. LÓGICA DE INTERFAZ (TABS)
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// 2. UTILIDADES (ALERTAS Y VALIDACIÓN)
// ─────────────────────────────────────────────────────────────
function showAlert(msg, type = 'error') {
    const c = document.getElementById('alert-container');
    const alertType = type === 'success' ? 'alert-success' : 'alert-error';
    c.innerHTML = `<div class="alert ${alertType} show">${msg}</div>`;
    
    // Si no es un mensaje de éxito con link, limpiar después de 4s
    if(!msg.includes('href')) {
        setTimeout(() => c.innerHTML = '', 5000);
    }
}

function isStrongPassword(password) {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\w\W]{8,}$/;
    return regex.test(password);
}

// ─────────────────────────────────────────────────────────────
// 3. LOGIN (CON MANEJO DE CORREO NO CONFIRMADO)
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// LOGIN (CON MANEJO DE ERROR 400 Y REENVÍO)
// ─────────────────────────────────────────────────────────────
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        // El error 400 suele ser "Invalid login credentials" o "Email not confirmed"
        console.error("Error Auth:", error.status, error.message);

        if (error.message.toLowerCase().includes("confirm") || error.message.toLowerCase().includes("not confirmed")) {
            showAlert(`
                Debes confirmar tu correo para entrar. 
                <br><a href="#" id="resend-auth-email" style="color:var(--gold); font-weight:bold; text-decoration:underline;">
                ¿Reenviar enlace de confirmación?
                </a>
            `, "error");

            // Lógica para reenviar si el usuario hace clic
            document.getElementById('resend-auth-email')?.addEventListener('click', async (e) => {
                e.preventDefault();
                const { error: resendErr } = await supabase.auth.resend({
                    type: 'signup',
                    email: email,
                    options: {
                        emailRedirectTo: 'https://darencondorilima.github.io/Proyecto_Control_Gastos/html/dashboard.html'
                    }
                });
                
                if (resendErr) {
                    showAlert("Error al reenviar: " + resendErr.message, "error");
                } else {
                    showAlert("✓ Enlace enviado. Revisa tu bandeja de Gmail.", "success");
                }
            });
        } else {
            showAlert('Credenciales incorrectas. Verifica tu correo y contraseña.', 'error');
        }
        return;
    }

    // Si no hay error, entrar
    window.location.href = 'dashboard.html';
});

// ─────────────────────────────────────────────────────────────
// 4. REGISTRO (CON VALIDACIÓN DE DUPLICADOS)
// ─────────────────────────────────────────────────────────────
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email     = document.getElementById('reg-email').value.trim();
    const password  = document.getElementById('reg-password').value;
    const firstName = document.getElementById('reg-firstname').value.trim();
    const lastName  = document.getElementById('reg-lastname').value.trim();
    const birthDate = document.getElementById('reg-birth').value;

    // A. Validar fuerza de contraseña
    if (!isStrongPassword(password)) {
        showAlert('La contraseña debe tener 8 caracteres, una mayúscula y un número.', 'error');
        return;
    }

    // B. VALIDACIÓN DE DUPLICADO (Prevenir error de Trigger)
    // Buscamos en tu tabla public.Users si el email ya existe
    const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('email_user')
        .eq('email_user', email)
        .maybeSingle();

    if (existingUser) {
        showAlert('Este correo ya está registrado. Intenta iniciar sesión.', 'error');
        return;
    }

    // C. Ejecutar Registro en Supabase Auth
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
            // Datos para el trigger que llena public.Users
            data: {
                first_name: firstName,
                last_name: lastName,
                birth_date: birthDate
            },
            // Redirección obligatoria para GitHub Pages
            emailRedirectTo: 'https://darencondorilima.github.io/Proyecto_Control_Gastos/html/dashboard.html'
        }
    });

    if (error) {
        showAlert(error.message, 'error');
    } else {
        showAlert('¡Cuenta creada! Revisa tu correo para confirmar el acceso.', 'success');
        document.getElementById('register-form').reset();
    }
});