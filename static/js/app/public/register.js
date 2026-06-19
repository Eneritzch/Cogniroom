/**
 * Register page controller.
 * Vinculado a templates/app/public/register.html
 *
 * Validación:
 *   - El form usa `novalidate`: las reglas (required, type=email, minlength)
 *     se inspeccionan vía checkValidity(); el feedback sale por toast.
 *   - El rol se elige con el segmented (aria-pressed) y se envía al backend,
 *     que solo acepta student|teacher (coordinator queda fuera del registro).
 *
 * Institución:
 *   - Estudiante: elige una institución del catálogo (select poblado vía API).
 *   - Docente: la institución se deriva de su código. Al salir del campo (blur)
 *     se resuelve contra el backend y se autocompleta un campo de solo lectura.
 */

const _v = new URL(import.meta.url).searchParams.get('v') || '';
const { auth, tokens, ApiError } = await import(`../api.js?v=${_v}`);
const { toast } = await import(`../toast.js?v=${_v}`);
const { initPasswordToggles } = await import(`./password-toggle.js?v=${_v}`);

initPasswordToggles();

const $form = document.getElementById('register-form');
const $firstName = document.getElementById('first_name');
const $firstSurname = document.getElementById('first_surname');
const $secondSurname = document.getElementById('second_surname');
const $email = document.getElementById('email');
const $password = document.getElementById('password');
const $submit = document.getElementById('register-submit');
const $submitText = document.getElementById('register-submit-text');

const $teacherCodeGroup = document.getElementById('teacher-code-group');
const $teacherCode = document.getElementById('teacher_code');
const $teacherCodeStatus = document.getElementById('teacher-code-status');

const $institutionCol = document.getElementById('institution-col');
const $institutionSelectWrap = document.getElementById('institution-select-wrap');
const $institutionTrigger = document.getElementById('institution-trigger');
const $institutionValue = document.getElementById('institution-value');
const $institutionMenu = document.getElementById('institution-menu');
const $institutionInput = document.getElementById('institution'); // hidden, lleva el id elegido
const $institutionDisplay = document.getElementById('institution-display');
const $institutionDisplayWrap = document.getElementById('institution-display-wrap');
const $institutionDisplayHint = document.getElementById('institution-display-hint');

const FIELDS = [$firstName, $firstSurname, $secondSurname, $email, $password];

let selectedRole = 'teacher';
let resolvedInstitution = null; // { id, name } del código de docente resuelto

function syncRole() {
    const isTeacher = selectedRole === 'teacher';

    $teacherCodeGroup.hidden = !isTeacher;
    if (!isTeacher) setInvalid($teacherCode, false);

    // Docente: institución de solo lectura (la asigna el código). Estudiante: dropdown.
    if (isTeacher) closeMenu();
    $institutionSelectWrap.hidden = isTeacher;
    $institutionDisplayWrap.hidden = !isTeacher;
    $institutionDisplayHint.hidden = !isTeacher;

    // Sin código visible (estudiante), institución toma la fila completa para no dejar hueco.
    $institutionCol.classList.toggle('col-md-6', isTeacher);
    $institutionCol.classList.toggle('col-md-12', !isTeacher);
}

/* ---- Segmented de rol ---- */
document.querySelectorAll('.auth-segmented__option').forEach((btn) => {
    btn.addEventListener('click', () => {
        selectedRole = btn.dataset.role;
        document.querySelectorAll('.auth-segmented__option').forEach((b) => {
            b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        });
        syncRole();
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

function setCodeStatus(message, kind) {
    if (!message) {
        $teacherCodeStatus.hidden = true;
        $teacherCodeStatus.textContent = '';
        $teacherCodeStatus.classList.remove('auth-field__hint--ok', 'auth-field__hint--error');
        return;
    }
    $teacherCodeStatus.hidden = false;
    $teacherCodeStatus.textContent = message;
    $teacherCodeStatus.classList.toggle('auth-field__hint--ok', kind === 'ok');
    $teacherCodeStatus.classList.toggle('auth-field__hint--error', kind === 'error');
}

function clearResolvedInstitution() {
    resolvedInstitution = null;
    $institutionDisplay.value = '';
}

/* Limpiar el estado inválido en cuanto el usuario corrige */
FIELDS.forEach((input) => {
    input.addEventListener('input', () => {
        if (input.validity.valid) setInvalid(input, false);
    });
});

/* ---- Dropdown custom de institución (listbox accesible) ---- */
let activeIndex = -1; // opción resaltada con teclado (aria-activedescendant)

function options() {
    return Array.from($institutionMenu.querySelectorAll('.auth-select__option'));
}

function isOpen() {
    return $institutionTrigger.getAttribute('aria-expanded') === 'true';
}

function setActive(index) {
    const opts = options();
    if (!opts.length) return;
    activeIndex = (index + opts.length) % opts.length;
    opts.forEach((el, i) => el.classList.toggle('auth-select__option--active', i === activeIndex));
    const active = opts[activeIndex];
    $institutionTrigger.setAttribute('aria-activedescendant', active.id);
    active.scrollIntoView({ block: 'nearest' });
}

function openMenu() {
    if (isOpen() || !options().length) return;
    $institutionMenu.hidden = false;
    $institutionTrigger.setAttribute('aria-expanded', 'true');
    const selected = options().findIndex((el) => el.getAttribute('aria-selected') === 'true');
    setActive(selected >= 0 ? selected : 0);
}

function closeMenu() {
    if (!isOpen()) return;
    $institutionMenu.hidden = true;
    $institutionTrigger.setAttribute('aria-expanded', 'false');
    $institutionTrigger.removeAttribute('aria-activedescendant');
    activeIndex = -1;
}

function selectOption(el) {
    $institutionInput.value = el.dataset.value;
    $institutionValue.textContent = el.textContent;
    $institutionValue.classList.remove('auth-select__value--placeholder');
    options().forEach((o) => o.setAttribute('aria-selected', o === el ? 'true' : 'false'));
    setInvalid($institutionTrigger, false);
    closeMenu();
    $institutionTrigger.focus();
}

(async () => {
    try {
        const list = await auth.institutions();
        for (const inst of list) {
            const li = document.createElement('li');
            li.className = 'auth-select__option';
            li.id = `institution-opt-${inst.id}`;
            li.setAttribute('role', 'option');
            li.setAttribute('aria-selected', 'false');
            li.dataset.value = inst.id;
            li.textContent = inst.name;
            li.addEventListener('click', () => selectOption(li));
            $institutionMenu.appendChild(li);
        }
    } catch (_) {
        toast('No se pudo cargar la lista de instituciones.', { kind: 'error' });
    }
})();

$institutionTrigger.addEventListener('click', () => {
    isOpen() ? closeMenu() : openMenu();
});

$institutionTrigger.addEventListener('keydown', (e) => {
    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault();
            isOpen() ? setActive(activeIndex + 1) : openMenu();
            break;
        case 'ArrowUp':
            e.preventDefault();
            isOpen() ? setActive(activeIndex - 1) : openMenu();
            break;
        case 'Home':
            if (isOpen()) { e.preventDefault(); setActive(0); }
            break;
        case 'End':
            if (isOpen()) { e.preventDefault(); setActive(options().length - 1); }
            break;
        case 'Enter':
        case ' ':
            e.preventDefault();
            if (isOpen() && activeIndex >= 0) selectOption(options()[activeIndex]);
            else openMenu();
            break;
        case 'Escape':
            if (isOpen()) { e.preventDefault(); closeMenu(); }
            break;
        case 'Tab':
            closeMenu();
            break;
    }
});

// Cerrar al hacer click fuera del dropdown.
document.addEventListener('click', (e) => {
    if (isOpen() && !$institutionSelectWrap.contains(e.target)) closeMenu();
});

/* ---- Resolución del código de docente → institución (blur) ---- */
$teacherCode.addEventListener('input', () => {
    // El código cambió: invalida cualquier institución resuelta previamente.
    clearResolvedInstitution();
    setCodeStatus('', null);
    setInvalid($teacherCode, false);
});

$teacherCode.addEventListener('blur', async () => {
    if (selectedRole !== 'teacher') return;
    const code = $teacherCode.value.trim();
    if (!code) {
        clearResolvedInstitution();
        setCodeStatus('', null);
        return;
    }
    setCodeStatus('Verificando código…', null);
    try {
        const inst = await auth.resolveTeacherCode(code);
        resolvedInstitution = inst;
        $institutionDisplay.value = inst.name;
        setInvalid($teacherCode, false);
        setCodeStatus(`Institución: ${inst.name}`, 'ok');
    } catch (err) {
        clearResolvedInstitution();
        if (err instanceof ApiError && err.status === 404) {
            setInvalid($teacherCode, true);
            setCodeStatus('Código de docente inválido.', 'error');
        } else {
            setCodeStatus('No se pudo verificar el código.', 'error');
        }
    }
});

syncRole();

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

    // El estudiante elige su institución del catálogo.
    if (selectedRole === 'student' && !$institutionInput.value) {
        setInvalid($institutionTrigger, true);
        toast('Seleccioná tu institución.', { kind: 'error' });
        $institutionTrigger.focus();
        return;
    }

    $submit.disabled = true;
    $submitText.textContent = 'Creando...';

    const payload = {
        first_name: $firstName.value.trim(),
        first_surname: $firstSurname.value.trim(),
        second_surname: $secondSurname.value.trim(),
        email: $email.value.trim(),
        password: $password.value,
        role: selectedRole,
    };
    if (selectedRole === 'teacher') {
        // La institución se deriva del código en el backend.
        payload.teacher_code = $teacherCode.value.trim();
    } else {
        payload.institution = Number($institutionInput.value);
    }

    try {
        await auth.register(payload);
        // Sin auto-login: el usuario inicia sesión manualmente con sus credenciales.
        // Se descartan los tokens del registro y se precarga el correo en el login.
        tokens.clear();
        sessionStorage.setItem('cogniroom.justRegistered', $email.value.trim());
        toast('Cuenta creada. Iniciá sesión con tu correo y contraseña.', {
            kind: 'success', duration: 1800,
        });
        setTimeout(() => { location.href = '/app/'; }, 800);
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
        first_surname: $firstSurname,
        second_surname: $secondSurname,
        email: $email,
        password: $password,
        teacher_code: $teacherCode,
        institution: $institutionTrigger,
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
