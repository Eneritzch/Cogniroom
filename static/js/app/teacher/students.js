const _v = new URL(import.meta.url).searchParams.get('v') || '';
const { rooms: roomsApi, sections: sectionsApi, tokens, ApiError } = await import(`../api.js?v=${_v}`);
const { toast } = await import(`../toast.js?v=${_v}`);


if (!tokens.access) {
    location.replace('/app/');
}


function escapeHTML(s) {
    return String(s ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}

function profileLabel(p) {
    return ({
        overconfident: 'Sobreconfiado',
        underconfident: 'Subconfiado',
        calibrated: 'Calibrado',
    })[p] || '—';
}


const PAGE_SIZE = 20;

let DATA = null;           // { name, students, sections, roster }
let ROOM_ID = null;
let currentProfile = 'all';
let currentSection = 'all';
let currentSearch = '';
let visibleCount = PAGE_SIZE;


function fullName(user) {
    if (!user) return '';
    return `${user.first_name || ''} ${user.last_name || ''}`.trim();
}


function initials(user) {
    const parts = [user?.first_name, user?.last_name].filter(Boolean);
    return parts.map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}


function gapTone(gap) {
    if (gap > 0.15)  return 'amber';
    if (gap < -0.15) return 'stone';
    return 'moss';
}


function actionLabel(profile) {
    if (profile === 'overconfident') return 'Refuerzo';
    if (profile === 'underconfident') return 'Nota';
    return 'Detalle';
}


function summaryShort(profile, gapPts) {
    const abs = Math.abs(gapPts);
    if (profile === 'overconfident') return `Cree saber ${abs} pts más de lo real.`;
    if (profile === 'underconfident') return `Sabe ${abs} pts más de lo que cree.`;
    return 'Bien calibrado · confianza alineada con su nivel.';
}


function renderSectionChips(sections) {
    const $wrap = document.getElementById('curso-chips');
    const $group = document.getElementById('students-curso-group');
    if (!$wrap || !$group) return;

    if (!sections || sections.length <= 1) {
        $group.hidden = true;
        return;
    }
    $group.hidden = false;

    const totalStudents = sections.reduce((s, c) => s + (c.total_student || 0), 0);
    const chips = [
        `<button type="button" class="students-chip" data-curso="all" aria-pressed="${currentSection === 'all' ? 'true' : 'false'}">
            Todos <span class="students-chip__count num">${totalStudents}</span>
        </button>`,
        ...sections.map((c) => `
            <button type="button" class="students-chip" data-curso="${c.id_section}" aria-pressed="${currentSection === c.id_section ? 'true' : 'false'}">
                ${escapeHTML(`${c.code} · ${c.schedule}`)} <span class="students-chip__count num">${c.total_student || 0}</span>
            </button>
        `),
    ];
    $wrap.innerHTML = chips.join('');

    $wrap.querySelectorAll('[data-curso]').forEach((btn) => {
        btn.addEventListener('click', () => {
            currentSection = btn.dataset.curso;
            visibleCount = PAGE_SIZE;
            $wrap.querySelectorAll('[data-curso]').forEach((b) => {
                b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
            });
            renderList();
        });
    });
}


function applyFilters(roster) {
    const q = currentSearch.trim().toLowerCase();
    return roster.filter((s) => {
        if (currentProfile !== 'all' && s.profile !== currentProfile) return false;
        if (currentSection !== 'all' && s.membership?.section?.id_section !== currentSection) return false;
        if (q && !fullName(s.user).toLowerCase().includes(q)) return false;
        return true;
    });
}


function renderList() {
    const data = DATA;
    if (!data) return;

    const $rows = document.getElementById('students-rows');
    const $meta = document.getElementById('students-meta');
    const $pager = document.getElementById('students-pager');
    const $more = document.getElementById('students-more');
    if (!$rows) return;

    const filtered = applyFilters(data.roster);
    const visible = filtered.slice(0, visibleCount);

    if ($meta) {
        let sectionLabel = '';
        if (currentSection !== 'all') {
            const sec = (data.sections || []).find((c) => c.id_section === currentSection);
            sectionLabel = sec ? ` · ${sec.code}` : '';
        }
        $meta.textContent = `Mostrando ${visible.length} de ${filtered.length}${sectionLabel}`;
    }

    if (filtered.length === 0) {
        $rows.innerHTML = `<li class="students-list__empty">Sin estudiantes para este filtro.</li>`;
        if ($pager) $pager.hidden = true;
        return;
    }

    $rows.innerHTML = visible.map((s) => {
        const mastery = Math.round((s.bkt_mastery ?? 0) * 100);
        const gap = s.metacognitive_gap ?? 0;
        const gapPts = Math.round(gap * 100);
        const confidence = Math.round((s.avg_confidence ?? 0) * 100);
        const tone = gapTone(gap);
        const gapText = gapPts > 0 ? `+${gapPts}` : `${gapPts}`;
        const sectionCode = s.membership?.section?.code || '';
        const name = fullName(s.user);

        return `
        <li class="student-card" data-profile="${s.profile}">
            <div class="student-card__head">
                <span class="student-card__avatar" aria-hidden="true">${initials(s.user)}</span>
                <div class="student-card__id">
                    <div class="student-card__name">${escapeHTML(name)}</div>
                    <div class="student-card__meta">
                        ${sectionCode ? `<span class="student-card__curso">${escapeHTML(sectionCode)}</span>` : ''}
                    </div>
                </div>
                <span class="pill student-card__pill" data-profile="${s.profile}">${profileLabel(s.profile)}</span>
            </div>

            <div class="student-card__bars">
                <div class="microbar" title="Cree saber ${confidence}%">
                    <span class="microbar__label">Cree</span>
                    <div class="microbar__track">
                        <div class="microbar__fill microbar__fill--declared" style="width:${confidence}%"></div>
                    </div>
                    <span class="microbar__val num">${confidence}%</span>
                </div>
                <div class="microbar" title="Realmente sabe ${mastery}%">
                    <span class="microbar__label">Sabe</span>
                    <div class="microbar__track">
                        <div class="microbar__fill microbar__fill--mastery" style="width:${mastery}%"></div>
                    </div>
                    <span class="microbar__val num">${mastery}%</span>
                </div>
            </div>

            <div class="student-card__foot">
                <span class="student-card__diff" data-tone="${tone}" title="${summaryShort(s.profile, gapPts)}">${gapText} pts</span>
                <button type="button" class="student-card__action">
                    ${actionLabel(s.profile)}
                    <svg class="icon-svg" width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                </button>
            </div>
        </li>
        `;
    }).join('');

    if ($pager && $more) {
        const remaining = filtered.length - visibleCount;
        if (remaining > 0) {
            $pager.hidden = false;
            $more.textContent = `Mostrar ${Math.min(PAGE_SIZE, remaining)} más`;
        } else {
            $pager.hidden = true;
        }
    }
}


/* ---- Gestión de secciones (CRUD) ---- */

function resetSectionForm() {
    const $id = document.getElementById('section-edit-id');
    const $title = document.getElementById('section-form-title');
    const $submit = document.getElementById('section-submit');
    const $cancel = document.getElementById('section-cancel');
    if ($id) $id.value = '';
    ['section-code', 'section-name', 'section-schedule', 'section-capacity'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    if ($title) $title.textContent = 'Nueva sección';
    if ($submit) $submit.textContent = 'Agregar sección';
    if ($cancel) $cancel.hidden = true;
}

function startEditSection(sec) {
    document.getElementById('section-edit-id').value = String(sec.id_section);
    document.getElementById('section-code').value = sec.code || '';
    document.getElementById('section-name').value = sec.name || '';
    document.getElementById('section-schedule').value = sec.schedule || '';
    document.getElementById('section-capacity').value = sec.capacity != null ? sec.capacity : '';
    document.getElementById('section-form-title').textContent = `Editar sección ${sec.code}`;
    document.getElementById('section-submit').textContent = 'Guardar cambios';
    document.getElementById('section-cancel').hidden = false;
}

function renderSectionsAdmin(sections) {
    const $list = document.getElementById('sections-admin-list');
    if (!$list) return;
    const list = sections || [];
    if (!list.length) {
        $list.innerHTML = '<li class="sections-admin__empty">Esta sala no tiene secciones todavía.</li>';
        return;
    }
    $list.innerHTML = list.map((s) => `
        <li class="sections-admin__item">
            <div class="sections-admin__info">
                <span class="sections-admin__code num">${escapeHTML(s.code)}</span>
                <span class="sections-admin__name">${escapeHTML(s.name)}</span>
                ${s.schedule ? `<span class="sections-admin__sched">${escapeHTML(s.schedule)}</span>` : ''}
            </div>
            <span class="sections-admin__count num">${s.total_student || 0} est.</span>
            <div class="sections-admin__row-actions">
                <button type="button" class="sections-admin__btn" data-section-edit="${s.id_section}" aria-label="Editar ${escapeHTML(s.code)}">
                    <svg class="icon-svg" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"></path>
                    </svg>
                </button>
                <button type="button" class="sections-admin__btn sections-admin__btn--danger" data-section-delete="${s.id_section}" aria-label="Eliminar ${escapeHTML(s.code)}">
                    <svg class="icon-svg" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        </li>
    `).join('');

    $list.querySelectorAll('[data-section-edit]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const sec = list.find((s) => s.id_section === Number(btn.dataset.sectionEdit));
            if (sec) startEditSection(sec);
        });
    });
    $list.querySelectorAll('[data-section-delete]').forEach((btn) => {
        btn.addEventListener('click', () => deleteSection(Number(btn.dataset.sectionDelete), btn));
    });
}

async function reloadRoom() {
    if (!ROOM_ID) return;
    DATA = await roomsApi.members(ROOM_ID);
    renderSectionChips(DATA.sections);
    renderSectionsAdmin(DATA.sections);
    renderList();
}

async function deleteSection(sectionId, btn) {
    if (!ROOM_ID) return;
    if (!window.confirm('¿Eliminar esta sección? Los estudiantes quedan en la sala, sin sección.')) return;
    if (btn) btn.disabled = true;
    try {
        await sectionsApi.delete(ROOM_ID, sectionId);
        toast('Sección eliminada.', { kind: 'success' });
        await reloadRoom();
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) { tokens.clear(); location.replace('/app/'); return; }
        toast(err?.body?.detail || 'No se pudo eliminar la sección.', { kind: 'error' });
        if (btn) btn.disabled = false;
    }
}

const $sectionForm = document.getElementById('section-form');
if ($sectionForm) {
    $sectionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!ROOM_ID) return;
        const editId = document.getElementById('section-edit-id').value;
        const capRaw = document.getElementById('section-capacity').value;
        const payload = {
            code: document.getElementById('section-code').value.trim(),
            name: document.getElementById('section-name').value.trim(),
            schedule: document.getElementById('section-schedule').value.trim(),
        };
        if (capRaw) payload.capacity = Number(capRaw);
        if (!payload.code || !payload.name) {
            toast('Código y nombre son obligatorios.', { kind: 'error' });
            return;
        }
        const $submit = document.getElementById('section-submit');
        $submit.disabled = true;
        try {
            if (editId) await sectionsApi.update(ROOM_ID, Number(editId), payload);
            else await sectionsApi.create(ROOM_ID, payload);
            toast(editId ? 'Sección actualizada.' : 'Sección creada.', { kind: 'success' });
            resetSectionForm();
            await reloadRoom();
        } catch (err) {
            if (err instanceof ApiError && err.status === 401) { tokens.clear(); location.replace('/app/'); return; }
            const b = err?.body || {};
            toast(b.code?.[0] || b.name?.[0] || b.detail || 'No se pudo guardar la sección.', { kind: 'error' });
        } finally {
            $submit.disabled = false;
        }
    });
}

const $sectionCancel = document.getElementById('section-cancel');
if ($sectionCancel) $sectionCancel.addEventListener('click', resetSectionForm);


function render() {
    if (!DATA) return;

    const $name = document.getElementById('room-name');
    const $students = document.getElementById('room-students');
    if ($name) $name.textContent = DATA.name;
    if ($students) $students.textContent = String(DATA.students);

    visibleCount = PAGE_SIZE;
    currentSection = 'all';

    renderSectionChips(DATA.sections);
    renderSectionsAdmin(DATA.sections);
    renderList();
}


function activeRoomId() {
    return Number(localStorage.getItem('cogniroom.activeRoomId')) || null;
}


async function resolveRoomId() {
    const stored = activeRoomId();
    if (stored) return stored;
    // sin sala activa: tomar la primera del docente y fijarla
    const list = await roomsApi.list();
    const first = (list || [])[0];
    if (first) {
        localStorage.setItem('cogniroom.activeRoomId', String(first.id));
        return first.id;
    }
    return null;
}


async function load() {
    let roomId;
    try {
        roomId = await resolveRoomId();
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) { tokens.clear(); location.replace('/app/'); return; }
        toast('No se pudieron cargar las salas.', { kind: 'error' });
        return;
    }
    if (!roomId) {
        const $rows = document.getElementById('students-rows');
        if ($rows) $rows.innerHTML = `<li class="students-list__empty">Todavía no tenés salas. Creá una para ver tu cohorte.</li>`;
        return;
    }
    ROOM_ID = roomId;
    try {
        DATA = await roomsApi.members(roomId);
        render();
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) { tokens.clear(); location.replace('/app/'); return; }
        toast('No se pudo cargar el roster.', { kind: 'error' });
    }
}


document.querySelectorAll('[data-profile-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
        currentProfile = btn.dataset.profileFilter;
        visibleCount = PAGE_SIZE;
        document.querySelectorAll('[data-profile-filter]').forEach((b) => {
            b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        });
        renderList();
    });
});


const $search = document.getElementById('students-search');
if ($search) {
    let t = null;
    $search.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => {
            currentSearch = $search.value;
            visibleCount = PAGE_SIZE;
            renderList();
        }, 150);
    });
}


const $more = document.getElementById('students-more');
if ($more) {
    $more.addEventListener('click', () => {
        visibleCount += PAGE_SIZE;
        renderList();
    });
}


window.addEventListener('cogniroom:roomchange', load);

load();
