/**
 * Toast — feedback no-bloqueante. Auto-desaparece, accesible (aria-live).
 */

const HOST_ID = 'toast-host';
const DEFAULT_DURATION = 4000;

export function toast(message, { kind = 'info', duration = DEFAULT_DURATION } = {}) {
    const host = document.getElementById(HOST_ID);
    if (!host) return;

    const el = document.createElement('div');
    el.className = 'toast';
    el.dataset.kind = kind;
    el.role = 'status';
    el.textContent = message;

    host.appendChild(el);

    setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(8px)';
        el.addEventListener('transitionend', () => el.remove(), { once: true });
        setTimeout(() => el.remove(), 600);
    }, duration);
}
