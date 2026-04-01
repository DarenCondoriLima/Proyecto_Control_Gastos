import { supabase } from './supabase.js';

async function protectRoute() {
    // 1. Obtener la sesión actual
    const { data: { session } } = await supabase.auth.getSession();

    // 2. Obtener la ruta actual para evitar bucles infinitos
    const path = window.location.pathname;

    // 3. Si NO hay sesión y NO estás ya en login.html, redirigir
    if (!session && !path.includes('login.html')) {
        // Ajusta la ruta según dónde estés parado
        window.location.href = path.includes('/html/') ? 'login.html' : 'html/login.html';
    }
}

protectRoute();