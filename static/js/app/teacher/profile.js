// widget teacher-cohort-health removido (avgClassIcc, avgClassMastery, cohort-risk eran promedios docente-wide prohibidos por schema v2026-06)
const _v = new URL(import.meta.url).searchParams.get('v') || '';
const { tokens } = await import(`../api.js?v=${_v}`);
const { toast } = await import(`../toast.js?v=${_v}`);
const { TEACHER_DATA } = await import(`./teacher-mock.js?v=${_v}`);


if (!tokens.access) {
    location.replace('/app/');
}


function initials(first, last, username) {
    const base = `${first || ''} ${last || ''}`.trim() || username || '?';
    return base.split(/\s+/).map((p) => p[0] || '').join('').slice(0, 2).toUpperCase();
}


function fmtDateLong(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const mm = months[d.getMonth()];
    const yy = d.getFullYear();
    return `${dd} ${mm} ${yy}`;
}


function paintHero(p) {
    document.getElementById('profile-avatar').textContent = initials(p.first_name, p.last_name, p.username);
    const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.username;
    document.getElementById('profile-name').textContent = fullName;
    document.getElementById('profile-institution').textContent = p.institution || '—';
    document.getElementById('profile-member').textContent = `Miembro desde ${fmtDateLong(p.date_joined)}`;
}


function paintStats(p) {
    document.getElementById('stat-rooms').textContent = p.activeRooms;
    document.getElementById('stat-rooms-sub').textContent = `${p.totalRooms} en total`;
    document.getElementById('stat-students').textContent = p.totalStudents;
    document.getElementById('stat-questions').textContent = p.questionsApproved;
    document.getElementById('stat-questions-sub').textContent = `${p.questionsPending} pendientes`;
    document.getElementById('stat-pdfs').textContent = p.pdfsUploaded;
    document.getElementById('stat-diagnoses').textContent = p.aiDiagnosesGenerated;
}


// widget teacher-cohort-health removido (schema v2026-06: avgClassIcc/avgClassMastery/atRiskStudents
// son promedios docente-wide no derivables del schema, y "brecha sostenida los últimos 7 días" es una ventana temporal inventada)


function paintPersonal(p) {
    document.getElementById('p-first').value = p.first_name || '';
    document.getElementById('p-last').value = p.last_name || '';
    document.getElementById('p-email').value = p.email || '';
    document.getElementById('p-institution').value = p.institution || '';
}


function bindPersonalForm() {
    const $form = document.getElementById('personal-form');
    const $save = document.getElementById('personal-save');
    const $hint = document.getElementById('personal-hint');

    const fields = ['p-first', 'p-last'];
    const initial = {};
    fields.forEach((id) => { initial[id] = document.getElementById(id).value; });

    function check() {
        const dirty = fields.some((id) => document.getElementById(id).value !== initial[id]);
        $save.disabled = !dirty;
        $hint.textContent = dirty
            ? 'Hay cambios sin guardar.'
            : 'Editá un campo para activar guardar.';
    }

    fields.forEach((id) => {
        document.getElementById(id).addEventListener('input', check);
    });

    $form.addEventListener('submit', (e) => {
        e.preventDefault();
        fields.forEach((id) => { initial[id] = document.getElementById(id).value; });
        toast('Datos guardados (mock).', { kind: 'success' });
        check();
    });
}


function bindPasswordForm() {
    const $form = document.getElementById('password-form');
    const $current = document.getElementById('pw-current');
    const $new = document.getElementById('pw-new');
    const $confirm = document.getElementById('pw-confirm');
    const $save = document.getElementById('password-save');
    const $hint = document.getElementById('password-hint');

    function markRule(name, ok) {
        const $rule = document.querySelector(`[data-rule="${name}"]`);
        if ($rule) $rule.dataset.ok = ok ? 'true' : 'false';
    }

    function evaluate() {
        const newV = $new.value;
        const confV = $confirm.value;
        const okLength = newV.length >= 8;
        const okCase = /[a-z]/.test(newV) && /[A-Z]/.test(newV);
        const okNumber = /\d/.test(newV);
        const okMatch = newV.length > 0 && newV === confV;

        markRule('length', okLength);
        markRule('case', okCase);
        markRule('number', okNumber);
        markRule('match', okMatch);

        const allOk = okLength && okCase && okNumber && okMatch && $current.value.length > 0;
        $save.disabled = !allOk;
        $hint.textContent = allOk
            ? 'Listo para actualizar tu contraseña.'
            : 'Tu sesión se mantendrá abierta tras el cambio.';
    }

    [$current, $new, $confirm].forEach(($el) => {
        $el.addEventListener('input', evaluate);
    });

    $form.addEventListener('submit', (e) => {
        e.preventDefault();
        toast('Contraseña actualizada (mock).', { kind: 'success' });
        $form.reset();
        document.querySelectorAll('[data-rule]').forEach(($r) => $r.dataset.ok = 'false');
        $save.disabled = true;
        $hint.textContent = 'Tu sesión se mantendrá abierta tras el cambio.';
    });
}


function bindLogout() {
    document.getElementById('logout-btn-profile').addEventListener('click', () => {
        tokens.clear();
        location.href = '/';
    });
}


function init() {
    const p = TEACHER_DATA.profile;
    paintHero(p);
    paintStats(p);
    paintPersonal(p);
    bindPersonalForm();
    bindPasswordForm();
    bindLogout();
}


init();
