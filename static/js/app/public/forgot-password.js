

const _v = new URL(import.meta.url).searchParams.get('v') || '';
const { auth, ApiError } = await import(`../api.js?v=${_v}`);
const { toast } = await import(`../toast.js?v=${_v}`);

const $form = document.getElementById('forgot-form');
const $email = document.getElementById('email');
const $submit = document.getElementById('forgot-submit');
const $submitText = document.getElementById('forgot-submit-text');
const $requestState = document.getElementById('request-state');
const $sentState = document.getElementById('sent-state');
const $sentEmail = document.getElementById('sent-email');

$email.addEventListener('input', () => {
    if ($email.validity.valid) $email.removeAttribute('aria-invalid');
});

$form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!$form.checkValidity()) {
        $email.setAttribute('aria-invalid', 'true');
        toast(
            $email.validity.valueMissing ? 'Ingresa tu correo.' : 'Introduce un correo válido.',
            { kind: 'error' },
        );
        $email.focus();
        return;
    }

    const email = $email.value.trim();
    $submit.disabled = true;
    $submitText.textContent = 'Enviando...';

    try {
        await auth.requestPasswordReset(email);
        $sentEmail.textContent = email;
        $requestState.hidden = true;
        $sentState.hidden = false;
    } catch (err) {
        $submit.disabled = false;
        $submitText.textContent = 'Enviar enlace';
        if (err instanceof ApiError && err.status === 429) {
            toast('Demasiados intentos. Espera un momento e intenta de nuevo.', { kind: 'error' });
        } else {
            toast('No se pudo enviar el enlace. Intenta de nuevo.', { kind: 'error' });
        }
    }
});
