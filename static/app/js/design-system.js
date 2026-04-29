/**
 * Design System JS — v2.0
 *
 *   1. Copy-to-clipboard de tokens (botones [data-copy]).
 *   2. Theme toggle dark ↔ light.
 *   3. Scroll-spy del sidebar.
 *   4. Demos de toast.
 */

import { toast } from './toast.js';

/* ---------- 1. Copy Logic ---------- */

const hint = document.getElementById('copy-hint');

function showHint(msg) {
    if (!hint) return;
    hint.textContent = msg;
    hint.classList.add('is-visible');
    clearTimeout(showHint._t);
    showHint._t = setTimeout(() => hint.classList.remove('is-visible'), 2000);
}

document.querySelectorAll('[data-copy]').forEach((el) => {
    el.addEventListener('click', async () => {
        const value = el.dataset.copy;
        try {
            await navigator.clipboard.writeText(value);
            el.classList.add('is-copied');
            setTimeout(() => el.classList.remove('is-copied'), 1000);
            showHint(`Copiado: ${value}`);
        } catch {
            showHint('No se pudo copiar al portapapeles');
        }
    });
});

/* ---------- 2. Theme Toggle ---------- */

const themeBtn = document.getElementById('theme-toggle');
if (themeBtn) {
    const stored = localStorage.getItem('cogniroom:theme');
    if (stored === 'light') document.documentElement.dataset.theme = 'light';

    const sync = () => {
        const isLight = document.documentElement.dataset.theme === 'light';
        themeBtn.querySelector('.theme-toggle__label').textContent = isLight ? 'Claro' : 'Oscuro';
    };
    sync();

    themeBtn.addEventListener('click', () => {
        const next = document.documentElement.dataset.theme === 'light' ? '' : 'light';
        if (next) {
            document.documentElement.dataset.theme = next;
            localStorage.setItem('cogniroom:theme', next);
        } else {
            delete document.documentElement.dataset.theme;
            localStorage.removeItem('cogniroom:theme');
        }
        sync();
    });
}

/* ---------- 3. Scroll-Spy (Sidebar) ---------- */

const navLinks = document.querySelectorAll('.ds-nav-link');
const sections = [...document.querySelectorAll('.ds-section[id]')];

if (navLinks.length && sections.length && 'IntersectionObserver' in window) {
    const linkById = new Map(
        [...navLinks].map((a) => [a.getAttribute('href').slice(1), a])
    );

    const observerOptions = {
        rootMargin: '-20% 0px -70% 0px',
        threshold: 0
    };

    const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                navLinks.forEach((l) => l.classList.remove('is-active'));
                const link = linkById.get(entry.target.id);
                if (link) {
                    link.classList.add('is-active');
                    // Opcional: Centrar el link en el sidebar si hay scroll
                    // link.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }
        });
    }, observerOptions);

    sections.forEach((s) => io.observe(s));
}

/* ---------- 4. Toast Demos ---------- */

document.querySelectorAll('[data-toast]').forEach((btn) => {
    btn.addEventListener('click', () => {
        const variant = btn.dataset.toast;
        switch (variant) {
            case 'info':
                toast('Información del sistema: los cambios se han guardado.');
                break;
            case 'success':
                toast('¡Operación exitosa!', { kind: 'success', duration: 2000 });
                break;
            case 'error':
                toast('Hubo un problema al procesar la solicitud.', { kind: 'error' });
                break;
            case 'stack':
                toast('Iniciando sincronización...');
                setTimeout(() => toast('Analizando datos cognitivos...', { duration: 2000 }), 500);
                setTimeout(() => toast('Sincronización completada.', { kind: 'success' }), 1200);
                break;
        }
    });
});
