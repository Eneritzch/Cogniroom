const _v = new URL(import.meta.url).searchParams.get('v') || '';
const { me, auth, tokens, ApiError } = await import(`../api.js?v=${_v}`);
const { toast } = await import(`../toast.js?v=${_v}`);


if (!tokens.access) {
    location.replace('/app/');
}


function profileLabel(p) {
    return ({
        overconfident: 'Confía de más',
        underconfident: 'Confía de menos',
        calibrated: 'Confianza justa',
    })[p] || '—';
}

function fmt(n) {
    return typeof n === 'number' ? n.toFixed(2) : '—';
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


function iccTone(icc) {
    if (icc >= 0.65) return 'moss';
    if (icc >= 0.5)  return 'amber';
    return 'rust';
}


function profileOf(p) {
    return p.predominant_profile || 'calibrated';
}


function paintHero(p) {
    document.getElementById('profile-avatar').textContent = initials(p.first_name, p.last_name, p.username);
    const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.username;
    document.getElementById('profile-name').textContent = fullName;
    document.getElementById('profile-institution').textContent = p.institution || '—';
    document.getElementById('profile-username').textContent = p.username || '—';
    document.getElementById('profile-member').textContent = `Miembro desde ${fmtDateLong(p.date_joined)}`;

    const profile = profileOf(p);
    const $pill = document.getElementById('profile-pill');
    $pill.textContent = profileLabel(profile);
    $pill.dataset.profile = profile;
}


function paintStats(p) {
    const profile = profileOf(p);
    document.getElementById('stat-icc').textContent = fmt(p.icc_avg);
    document.getElementById('stat-icc').dataset.tone = iccTone(p.icc_avg);
    document.getElementById('stat-icc-sub').textContent = profileLabel(profile).toLowerCase();

    document.getElementById('stat-mastery').textContent = fmt(p.avg_mastery);
    document.getElementById('stat-sessions').textContent = p.total_sessions;
    document.getElementById('stat-answers-sub').textContent = `${p.total_answers} respuestas`;
    document.getElementById('stat-nodes').textContent = p.nodes_tracked;
    document.getElementById('stat-diagnoses-sub').textContent = `${p.ai_diagnoses_count} diagnósticos IA`;
}


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
            : 'Edite un campo para activar guardar.';
    }

    fields.forEach((id) => {
        document.getElementById(id).addEventListener('input', check);
    });

    $form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            first_name: document.getElementById('p-first').value.trim(),
            last_name: document.getElementById('p-last').value.trim(),
        };
        $save.disabled = true;
        try {
            const updated = await auth.updateMe(payload);
            fields.forEach((id) => { initial[id] = document.getElementById(id).value; });
            document.getElementById('profile-avatar').textContent =
                initials(updated.first_name, updated.last_name, updated.username);
            document.getElementById('profile-name').textContent =
                `${updated.first_name || ''} ${updated.last_name || ''}`.trim() || updated.username;
            toast('Datos guardados.', { kind: 'success' });
            check();
        } catch (err) {
            if (err instanceof ApiError && err.status === 401) { tokens.clear(); location.replace('/app/'); return; }
            const b = err?.body || {};
            toast(b.first_name?.[0] || b.last_name?.[0] || b.detail || 'No se pudieron guardar los datos.', { kind: 'error' });
            $save.disabled = false;
        }
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

    $form.addEventListener('submit', async (e) => {
        e.preventDefault();
        $save.disabled = true;
        try {
            await auth.changePassword($current.value, $new.value);
            toast('Contraseña actualizada.', { kind: 'success' });
            $form.reset();
            document.querySelectorAll('[data-rule]').forEach(($r) => $r.dataset.ok = 'false');
            $hint.textContent = 'Tu sesión se mantendrá abierta tras el cambio.';
        } catch (err) {
            if (err instanceof ApiError && err.status === 401) { tokens.clear(); location.replace('/app/'); return; }
            const b = err?.body || {};
            toast(b.current_password?.[0] || b.new_password?.[0] || b.detail || 'No se pudo actualizar la contraseña.', { kind: 'error' });
            $save.disabled = false;
        }
    });
}


async function init() {
    let p;
    try {
        p = await me.profile();
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
            tokens.clear();
            location.replace('/app/');
            return;
        }
        toast('No se pudo cargar tu perfil.', { kind: 'error' });
        return;
    }
    paintHero(p);
    paintStats(p);
    paintPersonal(p);
    bindPersonalForm();
    bindPasswordForm();
}


init();
