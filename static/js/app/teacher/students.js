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
        overconfident: 'Confía de más',
        underconfident: 'Confía de menos',
        calibrated: 'Confianza justa',
    })[p] || '—';
}

const PROBLEM_LABEL = {
    vacio_conceptual: 'Vacío conceptual',
    confusion_conceptual: 'Confusión conceptual',
    error_procedimental: 'Error procedimental',
    aplicacion_incorrecta: 'Aplicación incorrecta',
    sin_patron: 'Sin patrón claro',
};
function problemLabel(p) { return PROBLEM_LABEL[p] || ''; }


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


// Cuadrante 2x2 (dominio real × confianza), en lenguaje claro.
function quadrantLabel(q) {
    return ({
        calibrated: 'Sabe y confía',
        underconfident: 'Sabe pero no confía',
        overconfident: 'No sabe y confía',
        aware_gap: 'No sabe y lo reconoce',
    })[q] || 'Sin datos';
}


// Lectura en lenguaje claro de la brecha entre confianza y dominio real.
function calibrationReading(profile, gapPts) {
    const abs = Math.abs(gapPts);
    if (profile === 'overconfident')
        return { headline: 'Sobreestima su nivel', detail: `Cree saber ${abs} pts más de lo que demuestra.` };
    if (profile === 'underconfident')
        return { headline: 'Subestima su nivel', detail: `Sabe ${abs} pts más de lo que cree saber.` };
    return { headline: 'Bien calibrado', detail: 'Su confianza coincide con lo que realmente sabe.' };
}


// Par de barras comparativas "Cree saber" vs "Realmente sabe" (reutilizado en
// la tarjeta y en el desglose por nodo del modal). `sm` para la variante compacta.
function compareBars(confidence, mastery, { sm = false } = {}) {
    const mod = sm ? ' cmpbar--sm' : '';
    return `
      <div class="cmpbar${mod}">
        <span class="cmpbar__label"><span class="cmpbar__dot" data-kind="declared" aria-hidden="true"></span>Cree saber</span>
        <div class="cmpbar__track"><div class="cmpbar__fill" data-kind="declared" style="width:${confidence}%"></div></div>
        <span class="cmpbar__val num">${confidence}%</span>
      </div>
      <div class="cmpbar${mod}">
        <span class="cmpbar__label"><span class="cmpbar__dot" data-kind="mastery" aria-hidden="true"></span>Realmente sabe</span>
        <div class="cmpbar__track"><div class="cmpbar__fill" data-kind="mastery" style="width:${mastery}%"></div></div>
        <span class="cmpbar__val num">${mastery}%</span>
      </div>`;
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


// Selector para asignar la sección de un estudiante (solo si la sala tiene
// secciones). El cambio dispara el PATCH de membresía.
function sectionSelectHTML(student, sections) {
    if (!sections || sections.length === 0) return '';
    const currentId = student.membership?.section?.id_section ?? '';
    const opts = ['<option value="">Sin sección</option>'].concat(
        sections.map((c) => {
            const label = c.name ? `${c.code} · ${c.name}` : c.code;
            return `<option value="${c.id_section}" ${c.id_section === currentId ? 'selected' : ''}>${escapeHTML(label)}</option>`;
        }),
    );
    return `
        <label class="student-card__section">
            <span class="student-card__section-label">Sección</span>
            <select class="student-card__section-select" data-assign-section="${student.user?.id ?? ''}"
                    aria-label="Asignar sección a ${escapeHTML(fullName(student.user))}">
                ${opts.join('')}
            </select>
        </label>`;
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
        const name = fullName(s.user);
        const reading = calibrationReading(s.profile, gapPts);

        return `
        <li class="student-card" data-profile="${s.profile}">
            <div class="student-card__head">
                <span class="student-card__avatar" aria-hidden="true">${initials(s.user)}</span>
                <div class="student-card__id">
                    <div class="student-card__name">${escapeHTML(name)}</div>
                    <div class="student-card__meta">
                        <span class="student-card__reading">${reading.headline}</span>
                    </div>
                </div>
                <span class="pill student-card__pill" data-quadrant="${s.quadrant || ''}">${escapeHTML(quadrantLabel(s.quadrant))}</span>
            </div>

            <div class="student-card__bars">
                ${compareBars(confidence, mastery)}
            </div>

            <div class="student-card__foot">
                ${sectionSelectHTML(s, data.sections)}
                <div class="student-card__gap" title="${escapeHTML(reading.detail)}">
                    <span class="student-card__gap-val" data-tone="${tone}">${gapText}</span>
                    <span class="student-card__gap-cap">diferencia (pts)</span>
                </div>
                <button type="button" class="student-card__action" data-student-id="${s.user?.id ?? ''}" aria-label="Ver detalle de ${escapeHTML(name)}">
                    Ver detalle
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


/* ---- Detalle de un estudiante (modal) ---- */

function icc2(v) { return v == null ? '—' : Number(v).toFixed(2); }

document.getElementById('students-rows').addEventListener('click', (e) => {
    const btn = e.target.closest('.student-card__action');
    if (!btn) return;
    const studentId = Number(btn.dataset.studentId);
    if (studentId) openStudentDetail(studentId);
});


document.getElementById('students-rows').addEventListener('change', async (e) => {
    const sel = e.target.closest('[data-assign-section]');
    if (!sel || !ROOM_ID) return;
    const studentId = Number(sel.dataset.assignSection);
    const sectionId = sel.value ? Number(sel.value) : null;
    sel.disabled = true;
    try {
        await roomsApi.assignSection(ROOM_ID, studentId, sectionId);
        toast('Sección actualizada.', { kind: 'success' });
        await reloadRoom();
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) { tokens.clear(); location.replace('/app/'); return; }
        toast(err?.body?.detail || 'No se pudo asignar la sección.', { kind: 'error' });
        sel.disabled = false;
    }
});

async function openStudentDetail(studentId) {
    const $modal = document.getElementById('studentDetailModal');
    const $body = document.getElementById('student-detail-body');
    const $title = document.getElementById('studentDetailTitle');
    if (!$modal || !$body) return;

    $body.innerHTML = '<p class="student-detail__msg">Cargando…</p>';
    if ($title) $title.textContent = 'Detalle del estudiante';
    if (window.bootstrap) {
        const inst = window.bootstrap.Modal.getInstance($modal) || new window.bootstrap.Modal($modal);
        inst.show();
    }
    try {
        const d = await roomsApi.studentDetail(ROOM_ID, studentId);
        renderStudentDetail(d);
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) { tokens.clear(); location.replace('/app/'); return; }
        $body.innerHTML = `<p class="student-detail__msg">${escapeHTML(err?.body?.detail || 'No se pudo cargar el detalle.')}</p>`;
    }
}

function renderStudentDetail(d) {
    // El título del modal queda fijo ("Detalle del estudiante"); el nombre va
    // una sola vez, en el encabezado del cuerpo junto al perfil.
    const $body = document.getElementById('student-detail-body');
    const st = d.student || {};
    const name = `${st.first_name || ''} ${st.last_name || ''}`.trim() || st.username || 'Estudiante';

    const sum = d.summary || {};
    const gapRaw = sum.metacognitive_gap ?? 0;
    const gapPts = Math.round(gapRaw * 100);
    const gapText = gapPts > 0 ? `+${gapPts}` : `${gapPts}`;
    const conf = Math.round((sum.avg_confidence ?? 0) * 100);
    const mast = Math.round((sum.bkt_mastery ?? 0) * 100);
    const reading = calibrationReading(sum.profile, gapPts);
    const sectionLine = d.section
        ? `<span class="sd-hero__section">${escapeHTML(`${d.section.code} · ${d.section.name}`)}</span>`
        : '';

    const summaryHTML = `
      <header class="sd-hero" data-profile="${sum.profile}">
        <div class="sd-hero__top">
          <span class="sd-hero__avatar" aria-hidden="true">${initials(st)}</span>
          <div class="sd-hero__id">
            <span class="sd-hero__name">${escapeHTML(name)}</span>
            ${sectionLine}
          </div>
          <span class="pill" data-quadrant="${sum.quadrant || ''}">${escapeHTML(sum.quadrant_label || quadrantLabel(sum.quadrant))}</span>
        </div>
        <p class="sd-hero__reading"><strong>${reading.headline}.</strong> ${reading.detail}</p>
        <div class="sd-compare">${compareBars(conf, mast)}</div>
        <div class="sd-hero__actions">
          <button type="button" class="sd-remove" data-remove-student="${st.id}">
            <svg class="icon-svg" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
            </svg>
            Quitar de la sala
          </button>
        </div>
      </header>

      <dl class="sd-stats">
        <div class="sd-stat">
          <dt>Qué tan bien se conoce</dt>
          <dd class="num">${icc2(sum.icc_value)}</dd>
          <span class="sd-stat__cap">de 0 a 1 · mientras más alto, mejor</span>
        </div>
        <div class="sd-stat">
          <dt>Diferencia</dt>
          <dd class="num" data-tone="${gapTone(gapRaw)}">${gapText} pts</dd>
          <span class="sd-stat__cap">lo que cree saber − lo que realmente sabe</span>
        </div>
        <div class="sd-stat">
          <dt>Respuestas</dt>
          <dd class="num">${sum.answers_count ?? 0}</dd>
          <span class="sd-stat__cap">en esta sala</span>
        </div>
      </dl>`;

    const nodes = d.nodes || [];
    const nodesHTML = nodes.length === 0
        ? '<p class="student-detail__msg">Todavía no respondió en ningún tema.</p>'
        : `<ul class="sd-nodes">${nodes.map((n) => {
              const nc = Math.round((n.avg_confidence ?? 0) * 100);
              const nm = Math.round((n.bkt_mastery ?? 0) * 100);
              return `
               <li class="sd-node">
                 <div class="sd-node__head">
                   <span class="sd-node__name">${escapeHTML(n.node_name)}</span>
                   ${n.profile ? `<span class="pill pill--sm" data-profile="${n.profile}">${profileLabel(n.profile)}</span>` : ''}
                   <span class="sd-node__icc">Autoconocimiento <span class="num">${icc2(n.icc_value)}</span></span>
                 </div>
                 <div class="sd-node__bars">${compareBars(nc, nm, { sm: true })}</div>
               </li>`;
            }).join('')}</ul>`;

    const diags = d.diagnoses || [];
    const diagsHTML = diags.length === 0
        ? '<p class="student-detail__msg">Sin diagnósticos de IA todavía (se generan cuando hay desalineación grave).</p>'
        : diags.map((dg) => `
            <article class="student-detail__diag">
              <header class="student-detail__diag-head">
                <span class="pill pill--sm" data-profile="${dg.classification}">${profileLabel(dg.classification)}</span>
                ${dg.problem_type ? `<span class="pill pill--sm" data-problem="${dg.problem_type}">${problemLabel(dg.problem_type)}</span>` : ''}
                ${dg.node_name ? `<span class="student-detail__diag-node">${escapeHTML(dg.node_name)}</span>` : ''}
                <span class="student-detail__diag-date num">${escapeHTML((dg.generated_at || '').slice(0, 10))}</span>
              </header>
              ${dg.reasoning ? `<p class="student-detail__diag-text">${escapeHTML(dg.reasoning)}</p>` : ''}
              ${dg.recommendation ? `<p class="student-detail__diag-rec"><strong>Recomendación:</strong> ${escapeHTML(dg.recommendation)}</p>` : ''}
            </article>`).join('');

    $body.innerHTML = `
      ${summaryHTML}
      <section class="sd-block">
        <h3 class="sd-block__title">Desglose por tema</h3>
        ${nodesHTML}
      </section>
      <section class="sd-block">
        <h3 class="sd-block__title">Diagnósticos de IA</h3>
        ${diagsHTML}
      </section>`;
}


/* ---- Agregar estudiante (buscar por institución) ---- */
const $enrollSearch = document.getElementById('enroll-search');
const $enrollResults = document.getElementById('enroll-results');
const $enrollModal = document.getElementById('enrollModal');
let enrollTimer = null;

function renderEnrollResults(items) {
    if (!$enrollResults) return;
    if (!items || items.length === 0) {
        $enrollResults.innerHTML = '<li class="enroll__empty">Sin estudiantes para mostrar.</li>';
        return;
    }
    $enrollResults.innerHTML = items.map((u) => {
        const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || '';
        const ini = (name.split(/\s+/).map((p) => p[0]).join('') || '?').slice(0, 2).toUpperCase();
        return `
        <li class="enroll__row">
            <span class="enroll__avatar" aria-hidden="true">${escapeHTML(ini)}</span>
            <div class="enroll__id">
                <span class="enroll__name">${escapeHTML(name)}</span>
                <span class="enroll__email">${escapeHTML(u.email || '')}</span>
            </div>
            <button type="button" class="enroll__add" data-enroll="${u.id}">Agregar</button>
        </li>`;
    }).join('');
}

async function loadEnrollCandidates(q = '') {
    if (!ROOM_ID || !$enrollResults) return;
    $enrollResults.innerHTML = '<li class="enroll__empty">Buscando…</li>';
    try {
        const items = await roomsApi.enrollSearch(ROOM_ID, q);
        renderEnrollResults(items);
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) { tokens.clear(); location.replace('/app/'); return; }
        $enrollResults.innerHTML = `<li class="enroll__empty">${escapeHTML(err?.body?.detail || 'No se pudo buscar.')}</li>`;
    }
}

if ($enrollSearch) {
    $enrollSearch.addEventListener('input', () => {
        clearTimeout(enrollTimer);
        enrollTimer = setTimeout(() => loadEnrollCandidates($enrollSearch.value.trim()), 250);
    });
}

if ($enrollModal) {
    $enrollModal.addEventListener('shown.bs.modal', () => {
        if ($enrollSearch) $enrollSearch.value = '';
        loadEnrollCandidates('');
        $enrollSearch?.focus();
    });
}

if ($enrollResults) {
    $enrollResults.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-enroll]');
        if (!btn || !ROOM_ID) return;
        btn.disabled = true;
        try {
            await roomsApi.enroll(ROOM_ID, Number(btn.dataset.enroll));
            toast('Estudiante agregado a la sala.', { kind: 'success' });
            btn.closest('.enroll__row')?.remove();
            await reloadRoom();
        } catch (err) {
            if (err instanceof ApiError && err.status === 401) { tokens.clear(); location.replace('/app/'); return; }
            toast(err?.body?.detail || 'No se pudo agregar al estudiante.', { kind: 'error' });
            btn.disabled = false;
        }
    });
}


/* ---- Quitar estudiante de la sala (desde el modal de detalle) ---- */
document.getElementById('student-detail-body')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-remove-student]');
    if (!btn || !ROOM_ID) return;
    const studentId = Number(btn.dataset.removeStudent);
    if (!studentId) return;
    if (!window.confirm('¿Quitar a este estudiante de la sala? Perderá el acceso a las evaluaciones de esta sala; sus datos históricos se conservan.')) return;
    btn.disabled = true;
    try {
        await roomsApi.unenroll(ROOM_ID, studentId);
        toast('Estudiante quitado de la sala.', { kind: 'success' });
        const $modal = document.getElementById('studentDetailModal');
        if (window.bootstrap && $modal) {
            (window.bootstrap.Modal.getInstance($modal) || new window.bootstrap.Modal($modal)).hide();
        }
        await reloadRoom();
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) { tokens.clear(); location.replace('/app/'); return; }
        toast(err?.body?.detail || 'No se pudo quitar al estudiante.', { kind: 'error' });
        btn.disabled = false;
    }
});


window.addEventListener('cogniroom:roomchange', load);

load();
