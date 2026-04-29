/**
 * Design System — controlador de /app/design-system/.
 *
 *   1. Copy-to-clipboard de tokens (botones [data-copy]).
 *   2. Theme toggle dark ↔ light, persistido en localStorage.
 *   3. Scroll-spy del topbar.
 *   4. Demos de toast (botones [data-toast]).
 */

import { toast } from './toast.js';

/* ---------- 1. Copy ---------- */

const hint = document.getElementById('copy-hint');

function showHint(msg) {
    if (!hint) return;
    hint.textContent = msg;
    hint.classList.add('is-visible');
    clearTimeout(showHint._t);
    showHint._t = setTimeout(() => hint.classList.remove('is-visible'), 1400);
}

document.querySelectorAll('[data-copy]').forEach((el) => {
    el.addEventListener('click', async () => {
        const value = el.dataset.copy;
        try {
            await navigator.clipboard.writeText(value);
            el.classList.add('is-copied');
            setTimeout(() => el.classList.remove('is-copied'), 800);
            showHint(`Copiado: ${value}`);
        } catch {
            showHint('No se pudo copiar');
        }
    });
});

/* ---------- 2. Theme toggle ---------- */

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

/* ---------- 3. Scroll-spy ---------- */

const navLinks = document.querySelectorAll('.ds-topbar__nav a');
const sections = [...document.querySelectorAll('.ds-section[id]')];

if (navLinks.length && sections.length && 'IntersectionObserver' in window) {
    const linkById = new Map(
        [...navLinks].map((a) => [a.getAttribute('href').slice(1), a])
    );
    const io = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    navLinks.forEach((l) => l.classList.remove('is-active'));
                    const link = linkById.get(entry.target.id);
                    if (link) link.classList.add('is-active');
                }
            });
        },
        { rootMargin: '-30% 0px -60% 0px', threshold: 0 }
    );
    sections.forEach((s) => io.observe(s));
}

/* ---------- 4. Toast demos ---------- */

document.querySelectorAll('[data-toast]').forEach((btn) => {
    btn.addEventListener('click', () => {
        const variant = btn.dataset.toast;
        switch (variant) {
            case 'info':
                toast('Sesión sincronizada con el servidor.');
                break;
            case 'success':
                toast('¡Hola, María!', { kind: 'success', duration: 1500 });
                break;
            case 'error':
                toast('Credenciales inválidas.', { kind: 'error' });
                break;
            case 'stack':
                toast('Subiendo PDF…');
                setTimeout(() => toast('PDF procesado.', { kind: 'success' }), 350);
                setTimeout(() => toast('Generando preguntas con Claude.'), 700);
                break;
        }
    });
});
