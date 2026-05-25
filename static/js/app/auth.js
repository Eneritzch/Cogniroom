/**
 * Login page controller.
 * Vinculado a templates/app/index.html
 *
 * Validación:
 *   - El form usa `novalidate`: desactiva la validación automática al
 *     submit (lo único que dispara los bubbles nativos del navegador).
 *   - Las reglas siguen declaradas en HTML (required, type=email,
 *     minlength) — el JS las inspecciona vía checkValidity().
 *   - El feedback sale por toast. El input inválido marca
 *     aria-invalid="true" para el borde rojo (regla en styles.css).
 */

const _v = new URL(import.meta.url).searchParams.get('v') || '';
const { auth, tokens, ApiError } = await import(`./api.js?v=${_v}`);
const { toast } = await import(`./toast.js?v=${_v}`);

const $form = document.getElementById('login-form');
const $email = document.getElementById('email');
const $password = document.getElementById('password');
const $submit = document.getElementById('login-submit');
const $submitText = document.getElementById('login-submit-text');

const FIELDS = [$email, $password];


document.querySelectorAll('.auth-segmented__option').forEach((btn) => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.auth-segmented__option').forEach((b) => {
            b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        });
    });
});


const TERMINAL_LINES = [
    '> auth.handshake          OK',
    '> bkt.engine v3.1         READY',
    '> cohort.load 2026·I      1 284 students',
    '> calibration.scan        Δ ICC −0.02',
    '> ai.tutor                claude-3.7 ONLINE',
    '> session.ready           waiting for input_',
];

const $terminal = document.getElementById('auth-terminal');
if ($terminal) {
    let i = 1;
    const renderTerminal = () => {
        $terminal.innerHTML = TERMINAL_LINES.slice(0, i)
            .map((line, idx) => {
                const cls = idx === i - 1 ? 'auth-terminal__line--active' : '';
                return `<span class="${cls}">${line.replace(/</g, '&lt;')}</span>`;
            })
            .join('');
    };
    renderTerminal();
    const interval = setInterval(() => {
        i += 1;
        renderTerminal();
        if (i >= TERMINAL_LINES.length) clearInterval(interval);
    }, 380);
}


document.querySelectorAll('.auth-form__switch-link').forEach((link) => {
    link.addEventListener('click', (e) => e.preventDefault());
});

function messageFor(input) {
    const v = input.validity;
    if (v.valueMissing) return 'Este campo es obligatorio.';
    if (v.typeMismatch && input.type === 'email') return 'Introduce un correo válido.';
    if (v.tooShort) return `Mínimo ${input.minLength} caracteres.`;
    return input.validationMessage || 'Valor no válido.';
}

function setInvalid(input, isInvalid) {
    if (isInvalid) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
}

/* Limpiar el estado inválido en cuanto el usuario corrige */
FIELDS.forEach((input) => {
    input.addEventListener('input', () => {
        if (input.validity.valid) setInvalid(input, false);
    });
});

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

/* ---- Submit ---- */
$form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!$form.checkValidity()) {
        FIELDS.forEach((i) => setInvalid(i, !i.validity.valid));
        const firstInvalid = FIELDS.find((i) => !i.validity.valid);
        if (firstInvalid) {
            toast(messageFor(firstInvalid), { kind: 'error' });
            firstInvalid.focus();
        }
        return;
    }

    $submit.disabled = true;
    $submitText.textContent = 'Entrando...';

    try {
        const data = await auth.login($email.value.trim(), $password.value);
        tokens.access = data.tokens.access;
        tokens.refresh = data.tokens.refresh;
        toast(`Hola, ${data.user.username}`, { kind: 'success', duration: 1500 });
        setTimeout(() => { location.href = '/app/dashboard/'; }, 600);
    } catch (err) {
        handleServerError(err);
        $submit.disabled = false;
        $submitText.textContent = 'Entrar';
    }
});

/**
 * Mapea errores del servidor a toast y pinta el campo correspondiente
 * como inválido cuando el error viene asociado a un campo concreto.
 */
function handleServerError(err) {
    if (!(err instanceof ApiError)) {
        toast('No se pudo conectar con el servidor.', { kind: 'error' });
        return;
    }

    const body = err.body || {};

    if (err.status === 400) {
        const emailMsg = body.email?.[0];
        const passwordMsg = body.password?.[0];
        const general = body.non_field_errors?.[0];

        if (emailMsg) {
            setInvalid($email, true);
            toast(emailMsg, { kind: 'error' });
            $email.focus();
            return;
        }
        if (passwordMsg) {
            setInvalid($password, true);
            toast(passwordMsg, { kind: 'error' });
            $password.focus();
            return;
        }
        toast(general || 'Credenciales inválidas.', { kind: 'error' });
        return;
    }

    toast(err.message || 'Ocurrió un error. Inténtalo de nuevo.', { kind: 'error' });
}
