/**
 * Mostrar/ocultar contraseña.
 * Cablea cualquier botón [data-password-toggle] dentro de un .auth-field__input-wrap:
 * alterna el type del input password<->text y el icono ojo/ojo-tachado.
 * Compartido por login y registro.
 */
export function initPasswordToggles(root = document) {
    root.querySelectorAll('[data-password-toggle]').forEach((btn) => {
        if (btn.dataset.bound) return;
        btn.dataset.bound = '1';

        const wrap = btn.closest('.auth-field__input-wrap');
        const input = wrap && wrap.querySelector('input');
        if (!input) return;

        btn.addEventListener('click', () => {
            const reveal = input.type === 'password';
            input.type = reveal ? 'text' : 'password';
            btn.classList.toggle('is-revealed', reveal);
            btn.setAttribute('aria-pressed', String(reveal));
            btn.setAttribute('aria-label', reveal ? 'Ocultar contraseña' : 'Mostrar contraseña');
            input.focus();
        });
    });
}
