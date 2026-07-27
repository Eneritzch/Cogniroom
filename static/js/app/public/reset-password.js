/**
 * Restablecer contraseña con el enlace del correo.
 * Vinculado a templates/app/public/reset-password.html
 *
 * Lee uid + token de la URL (?uid=..&token=..). Si faltan, o el backend los
 * rechaza (400), muestra el estado "enlace no válido" con la opción de pedir
 * uno nuevo.
 */

const _v = new URL(import.meta.url).searchParams.get('v') || '';
const { auth, ApiError, apiErrorMessage } = await import(`../api.js?v=${_v}`);
const { toast } = await import(`../toast.js?v=${_v}`);
const { initPasswordToggles } = await import(`./password-toggle.js?v=${_v}`);

initPasswordToggles();

const params = new URLSearchParams(location.search);
const uid = params.get('uid') || '';
const token = params.get('token') || '';

const $resetState = document.getElementById('reset-state');
const $invalidState = document.getElementById('invalid-state');
const $form = document.getElementById('reset-form');
const $password = document.getElementById('password');
const $password2 = document.getElementById('password2');
const $submit = document.getElementById('reset-submit');
const $submitText = document.getElementById('reset-submit-text');

function showInvalid() {
    $resetState.hidden = true;
    $invalidState.hidden = false;
}

if (!uid || !token) showInvalid();

[$password, $password2].forEach((input) => {
    input.addEventListener('input', () => {
        if (input.validity.valid) input.removeAttribute('aria-invalid');
    });
});

$form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!$form.checkValidity()) {
        [$password, $password2].forEach((i) => {
            if (!i.validity.valid) i.setAttribute('aria-invalid', 'true');
        });
        toast('La contraseña debe tener al menos 8 caracteres.', { kind: 'error' });
        return;
    }

    if ($password.value !== $password2.value) {
        $password2.setAttribute('aria-invalid', 'true');
        toast('Las contraseñas no coinciden.', { kind: 'error' });
        $password2.focus();
        return;
    }

    $submit.disabled = true;
    $submitText.textContent = 'Guardando...';

    try {
        await auth.confirmPasswordReset(uid, token, $password.value);
        toast('Contraseña actualizada. Inicia sesión.', { kind: 'success', duration: 2000 });
        setTimeout(() => { location.href = '/app/'; }, 900);
    } catch (err) {
        $submit.disabled = false;
        $submitText.textContent = 'Guardar contraseña';

        if (err instanceof ApiError && err.status === 400) {
            const body = err.body || {};
            if (body.token || body.uid || body.non_field_errors) {
                showInvalid();
                return;
            }
            const pwMsg = body.new_password?.[0];
            if (pwMsg) {
                $password.setAttribute('aria-invalid', 'true');
                toast(pwMsg, { kind: 'error' });
                $password.focus();
                return;
            }
            toast(apiErrorMessage(err, 'No se pudo actualizar la contraseña.'), { kind: 'error' });
        } else if (err instanceof ApiError && err.status === 429) {
            toast('Demasiados intentos. Esperá un momento.', { kind: 'error' });
        } else {
            toast('No se pudo actualizar la contraseña. Intenta de nuevo.', { kind: 'error' });
        }
    }
});
