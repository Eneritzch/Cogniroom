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


function relDate(iso) {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now - d;
    const diffH = Math.round(diffMs / (1000 * 60 * 60));
    if (diffH < 1)  return 'hace minutos';
    if (diffH < 24) return `hace ${diffH} h`;
    const diffD = Math.round(diffH / 24);
    if (diffD === 1) return 'ayer';
    if (diffD < 7)   return `hace ${diffD} días`;
    return `hace ${Math.round(diffD / 7)} sem`;
}


function iccTone(icc) {
    if (icc >= 0.65) return 'moss';
    if (icc >= 0.5)  return 'amber';
    return 'rust';
}


function iccLabel(icc) {
    if (icc >= 0.65) return 'cohorte calibrada';
    if (icc >= 0.5)  return 'cohorte con desviación moderada';
    return 'cohorte descalibrada';
}


function paintHero(p) {
    document.getElementById('profile-avatar').textContent = initials(p.first_name, p.last_name, p.username);
    const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.username;
    document.getElementById('profile-name').textContent = fullName;
    document.getElementById('profile-title').textContent = p.title || '—';
    document.getElementById('profile-department').textContent = p.department || '';
    document.getElementById('profile-member').textContent = `Miembro desde ${fmtDateLong(p.memberSince)}`;
    document.getElementById('profile-last').textContent = `Último acceso: ${relDate(p.lastActiveAt)}`;
}


function paintStats(p) {
    document.getElementById('stat-rooms').textContent = p.activeRooms;
    document.getElementById('stat-rooms-sub').textContent = `${p.totalRooms} en total`;
    document.getElementById('stat-students').textContent = p.totalStudents;
    document.getElementById('stat-questions').textContent = p.questionsApproved;
    document.getElementById('stat-questions-sub').textContent = `${p.questionsPending} pendientes`;
    document.getElementById('stat-pdfs').textContent = p.pdfsUploaded;
    document.getElementById('stat-diagnoses').textContent = p.aiDiagnosesGenerated;
    document.getElementById('stat-streak').textContent = p.streakDays;
}


function paintCohortHealth(p) {
    const icc = p.avgClassIcc || 0;
    const mastery = p.avgClassMastery || 0;

    document.getElementById('cohort-icc-text').textContent = `ICC ${icc.toFixed(2)}`;
    document.getElementById('cohort-icc-label').textContent = `· ${iccLabel(icc)}`;

    document.getElementById('cohort-icc-num').textContent = icc.toFixed(2);
    document.getElementById('cohort-icc-fill').style.width = `${Math.round(icc * 100)}%`;
    document.getElementById('cohort-icc-fill').dataset.tone = iccTone(icc);

    document.getElementById('cohort-mastery-num').textContent = mastery.toFixed(2);
    document.getElementById('cohort-mastery-fill').style.width = `${Math.round(mastery * 100)}%`;

    document.getElementById('cohort-risk-num').textContent = `${p.atRiskStudents} estudiantes`;
    const pct = p.totalStudents ? Math.round((p.atRiskStudents / p.totalStudents) * 100) : 0;
    document.getElementById('cohort-risk-hint').textContent =
        `${pct}% de tu cohorte con brecha sostenida los últimos 7 días.`;
}


function paintPersonal(p) {
    document.getElementById('p-first').value = p.first_name || '';
    document.getElementById('p-last').value = p.last_name || '';
    document.getElementById('p-title').value = p.title || '';
    document.getElementById('p-email').value = p.email || '';
    document.getElementById('p-institution').value = p.institution || '';
    document.getElementById('p-department').value = p.department || '';
}


function bindPersonalForm() {
    const $form = document.getElementById('personal-form');
    const $save = document.getElementById('personal-save');
    const $hint = document.getElementById('personal-hint');

    const fields = ['p-first', 'p-last', 'p-title', 'p-department'];
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


function bindPreferences(p) {
    document.querySelectorAll('[data-pref]').forEach(($input) => {
        const key = $input.dataset.pref;
        $input.checked = !!(p.preferences && p.preferences[key]);
        $input.addEventListener('change', () => {
            const label = $input.closest('.profile-pref').querySelector('.profile-pref__title').textContent;
            toast(`${label}: ${$input.checked ? 'activado' : 'desactivado'} (mock).`, { kind: 'info', duration: 1500 });
        });
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
    paintCohortHealth(p);
    paintPersonal(p);
    bindPersonalForm();
    bindPasswordForm();
    bindPreferences(p);
    bindLogout();
}


init();
