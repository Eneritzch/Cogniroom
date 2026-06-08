/**
 * Register page controller.
 * Vinculado a templates/app/public/register.html
 *
 * Validación:
 *   - El form usa `novalidate`: las reglas (required, type=email, minlength)
 *     se inspeccionan vía checkValidity(); el feedback sale por toast.
 *   - El rol se elige con el segmented (aria-pressed) y se envía al backend,
 *     que solo acepta student|teacher (coordinator queda fuera del registro).
 */

const _v = new URL(import.meta.url).searchParams.get('v') || '';
const { auth, tokens, ApiError } = await import(`../api.js?v=${_v}`);
const { toast } = await import(`../toast.js?v=${_v}`);
const { initPasswordToggles } = await import(`./password-toggle.js?v=${_v}`);

initPasswordToggles();

const $form = document.getElementById('register-form');
const $firstName = document.getElementById('first_name');
const $lastName = document.getElementById('last_name');
const $username = document.getElementById('username');
const $email = document.getElementById('email');
const $institution = document.getElementById('institution');
const $password = document.getElementById('password');
const $submit = document.getElementById('register-submit');
const $submitText = document.getElementById('register-submit-text');
const $teacherCodeGroup = document.getElementById('teacher-code-group');
const $teacherCode = document.getElementById('teacher_code');

const FIELDS = [$firstName, $lastName, $username, $email, $password];

let selectedRole = 'teacher';

function syncTeacherCode() {
    const isTeacher = selectedRole === 'teacher';
    $teacherCodeGroup.hidden = !isTeacher;
    if (!isTeacher) setInvalid($teacherCode, false);
}

/* ---- Segmented de rol ---- */
document.querySelectorAll('.auth-segmented__option').forEach((btn) => {
    btn.addEventListener('click', () => {
        selectedRole = btn.dataset.role;
        document.querySelectorAll('.auth-segmented__option').forEach((b) => {
            b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        });
        syncTeacherCode();
    });
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

syncTeacherCode();

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

    // El código solo se exige para docentes; lo valida el servidor, pero
    // avisamos temprano para mejor UX.
    if (selectedRole === 'teacher' && !$teacherCode.value.trim()) {
        setInvalid($teacherCode, true);
        toast('Ingresá el código de docente provisto por tu institución.', { kind: 'error' });
        $teacherCode.focus();
        return;
    }

    $submit.disabled = true;
    $submitText.textContent = 'Creando...';

    const payload = {
        first_name: $firstName.value.trim(),
        last_name: $lastName.value.trim(),
        username: $username.value.trim(),
        email: $email.value.trim(),
        institution: $institution.value.trim(),
        password: $password.value,
        role: selectedRole,
    };
    if (selectedRole === 'teacher') {
        payload.teacher_code = $teacherCode.value.trim();
    }

    try {
        const data = await auth.register(payload);
        tokens.access = data.tokens.access;
        tokens.refresh = data.tokens.refresh;
        toast(`Cuenta creada. Hola, ${data.user.first_name || data.user.username}`, {
            kind: 'success', duration: 1500,
        });
        setTimeout(() => { location.href = '/app/dashboard/'; }, 600);
    } catch (err) {
        handleServerError(err);
        $submit.disabled = false;
        $submitText.textContent = 'Crear cuenta';
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

    if (err.status === 429) {
        toast('Demasiados intentos. Esperá un momento e inténtalo de nuevo.', { kind: 'error' });
        return;
    }

    const body = err.body || {};
    const fieldMap = {
        first_name: $firstName,
        last_name: $lastName,
        username: $username,
        email: $email,
        password: $password,
        teacher_code: $teacherCode,
    };

    if (err.status === 400) {
        for (const [field, input] of Object.entries(fieldMap)) {
            const msg = body[field]?.[0];
            if (msg) {
                setInvalid(input, true);
                toast(msg, { kind: 'error' });
                input.focus();
                return;
            }
        }
        const general = body.non_field_errors?.[0] || body.detail;
        toast(general || 'No se pudo crear la cuenta. Revisá los datos.', { kind: 'error' });
        return;
    }

    toast(err.message || 'Ocurrió un error. Inténtalo de nuevo.', { kind: 'error' });
}
