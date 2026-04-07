import { supabase } from './supabase.js';

(function renderSidebar() {
    const root = document.getElementById('sidebar-root');
    if (!root) return;

    const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';

    const links = {
        dashboard: 'dashboard.html',
        nuevoGasto: 'nuevoGasto.html',
        nuevoIngreso: 'nuevoIngreso.html',
        transferencia: 'transferencia.html',
        categorias: 'categoriasYSubCategorias.html',
        metodosPago: 'metodosPago.html',
        gestionTarjetas: 'gestionTarjetas.html',
        deudores: 'deudores.html',
        presupuestos: 'presupuestos.html',
        perfil: 'perfil.html'
    };

    const isActive = (path) => (currentPage === path ? 'active' : '');

    root.innerHTML = `
<button class="sidebar-mobile-toggle" id="sidebar-mobile-toggle" aria-label="Abrir menu">
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M3 5h14M3 10h14M3 15h14" stroke-linecap="round"/>
    </svg>
</button>
<div class="sidebar-backdrop" id="sidebar-backdrop"></div>
<aside class="sidebar">
    <div class="sb-brand">
        <div class="sb-brand-icon">
            <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 10C3 6.13 6.13 3 10 3s7 3.13 7 7-3.13 7-7 7-7-3.13-7-7z" stroke="#c9a84c" stroke-width="1.5"/>
                <path d="M10 7v6M7.5 9.5l2.5-2.5 2.5 2.5" stroke="#c9a84c" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </div>
        <span class="sb-brand-name">Control<span>Gastos</span></span>
    </div>

    <p class="sb-section-label">Principal</p>
    <ul class="sb-nav">
        <li><a href="${links.dashboard}" class="${isActive(links.dashboard)}"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="6" height="6" rx="1.5"/><rect x="11" y="3" width="6" height="6" rx="1.5"/><rect x="3" y="11" width="6" height="6" rx="1.5"/><rect x="11" y="11" width="6" height="6" rx="1.5"/></svg> Inicio</a></li>
    </ul>

    <p class="sb-section-label">Movimientos</p>
    <ul class="sb-nav">
        <li><a href="${links.nuevoGasto}" class="${isActive(links.nuevoGasto)}"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M10 4v12M4 10h12" stroke-linecap="round"/></svg> Nuevo Gasto</a></li>
        <li><a href="${links.nuevoIngreso}" class="${isActive(links.nuevoIngreso)}"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 10h12M10 14l4-4-4-4" stroke-linecap="round" stroke-linejoin="round"/></svg> Nuevo Ingreso</a></li>
        <li><a href="${links.transferencia}" class="${isActive(links.transferencia)}"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 7h10M11 4l4 3-4 3" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 13H5M9 10l-4 3 4 3" stroke-linecap="round" stroke-linejoin="round"/></svg> Transferencias</a></li>
    </ul>

    <p class="sb-section-label">Gestión</p>
    <ul class="sb-nav">
        <li><a href="${links.categorias}" class="${isActive(links.categorias)}"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 5h14M3 10h10M3 15h6" stroke-linecap="round"/></svg> Categorías</a></li>
        <li><a href="${links.metodosPago}" class="${isActive(links.metodosPago)}"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2" y="5" width="16" height="12" rx="2"/><path d="M2 9h16" stroke-linecap="round"/></svg> Métodos de Pago</a></li>
        <li><a href="${links.gestionTarjetas}" class="${isActive(links.gestionTarjetas)}"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2" y="5" width="16" height="12" rx="2"/><path d="M2 9h16" stroke-linecap="round"/><path d="M6 14h4" stroke-linecap="round"/></svg> Gestión Tarjetas</a></li>
        <li><a href="${links.deudores}" class="${isActive(links.deudores)}"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="8" cy="7" r="3"/><path d="M2 17c0-3.31 2.69-6 6-6"/><path d="M14 12v5M11.5 14.5l2.5-2.5 2.5 2.5" stroke-linecap="round" stroke-linejoin="round"/></svg> Deudores</a></li>
        <li><a href="${links.presupuestos}" class="${isActive(links.presupuestos)}"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 3h14v14H3z"/><path d="M3 8h14" stroke-linecap="round"/></svg> Presupuestos</a></li>
        <li><a href="${links.perfil}" class="${isActive(links.perfil)}"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="10" cy="6" r="3"/><path d="M4 17c0-3.31 2.69-6 6-6s6 2.69 6 6"/></svg> Perfil</a></li>
    </ul>

    <div class="sb-spacer"></div>

    <div class="sb-user">
        <div class="sb-avatar" id="sb-initial">U</div>
        <div class="sb-user-info">
            <div class="sb-user-name" id="user-name">Usuario</div>
            <div class="sb-user-role">Plan gratuito</div>
        </div>
        <button class="sb-logout" id="btn-logout" title="Cerrar sesi\u00f3n">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M13 7l3 3-3 3M16 10H8" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 3H5a1 1 0 00-1 1v12a1 1 0 001 1h5" stroke-linecap="round"/></svg>
        </button>
    </div>
</aside>`;

    const body = document.body;
    const toggleButton = document.getElementById('sidebar-mobile-toggle');
    const backdrop = document.getElementById('sidebar-backdrop');
    const navLinks = root.querySelectorAll('.sb-nav a');

    const closeSidebar = () => body.classList.remove('sidebar-open');

    if (toggleButton) {
        toggleButton.addEventListener('click', () => {
            body.classList.toggle('sidebar-open');
        });
    }

    if (backdrop) {
        backdrop.addEventListener('click', closeSidebar);
    }

    navLinks.forEach((link) => {
        link.addEventListener('click', closeSidebar);
    });

    const logoutButton = document.getElementById('btn-logout');

    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                // 1. Llamada a Supabase para cerrar la sesión
                const { error } = await supabase.auth.signOut();
                
                if (error) throw error;

                // 2. Redirección al login tras éxito
                window.location.href = 'login.html';
                
            } catch (error) {
                console.error('Error al cerrar sesión:', error.message);
                alert('No se pudo cerrar la sesión correctamente.');
            }
        });
    }

})();
