/**
 * Login page controller.
 * Vinculado a templates/app/index.html
 */

import { auth, tokens, ApiError } from './api.js';
import { toast } from './toast.js';

const $form = document.getElementById('login-form');
const $email = document.getElementById('email');
const $password = document.getElementById('password');
const $error = document.getElementById('login-error');
const $submit = document.getElementById('login-submit');
const $chips = document.querySelectorAll('[data-demo]');

/* ---- Auto-redirect si ya hay sesión válida ---- */
(async () => {
    if (!tokens.access) return;
    try {
        await auth.me();
        location.href = '/app/dashboard/';
    } catch (_) {
        tokens.clear();
    }
})();

/* ---- Quick-fill demo ---- */
$chips.forEach((chip) => {
    chip.addEventListener('click', (e) => {
        e.preventDefault();
        $email.value = chip.dataset.demo;
        $password.value = 'password123';
        $email.focus();
    });
});

/* ---- Submit ---- */
$form.addEventListener('submit', async (event) => {
    event.preventDefault();
    $error.textContent = '';

    const email = $email.value.trim();
    const password = $password.value;

    if (!email || !password) {
        $error.textContent = 'Completa correo y contraseña.';
        return;
    }

    $submit.disabled = true;
    $submit.textContent = 'Entrando...';

    try {
        const data = await auth.login(email, password);
        tokens.access = data.tokens.access;
        tokens.refresh = data.tokens.refresh;
        toast(`Hola, ${data.user.username}`, { kind: 'success', duration: 1500 });
        setTimeout(() => { location.href = '/app/dashboard/'; }, 600);
    } catch (err) {
        if (err instanceof ApiError) {
            $error.textContent = err.status === 400
                ? 'Credenciales inválidas.'
                : err.message;
        } else {
            $error.textContent = 'No se pudo conectar con el servidor.';
        }
        $submit.disabled = false;
        $submit.textContent = 'Entrar';
    }
});
