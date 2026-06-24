const _v = new URL(import.meta.url).searchParams.get('v') || '';
const { rooms: roomsApi, sessions: sessionsApi, questions: questionsApi, tokens, ApiError } = await import(`../api.js?v=${_v}`);
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

function hideModal(id) {
    const $modal = document.getElementById(id);
    if ($modal && window.bootstrap) {
        const instance = window.bootstrap.Modal.getInstance($modal) || new window.bootstrap.Modal($modal);
        instance.hide();
    }
}


let currentMode = 'all';
let rooms = [];


function teacherDisplayName(t) {
    if (!t) return '';
    const first = t.first_name || '';
    const last = t.last_name || '';
    return `${first} ${last}`.trim();
}


function modeBadge(mode) {
    if (mode === 'group') {
        return `<span class="rcard__modebadge" data-mode="group">
            <svg class="icon-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            Grupal
        </span>`;
    }
    return `<span class="rcard__modebadge" data-mode="individual">
        <svg class="icon-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
        </svg>
        De estudio
    </span>`;
}


function renderCard(r) {
    const isGroup = r.mode === 'group';
    const dateRaw = isGroup
        ? (r.membership?.joined_at || r.joined_at || r.created_at)
        : r.created_at;
    const dateLabel = isGroup
        ? `Inscrito ${escapeHTML((dateRaw || '').slice(0, 10))}`
        : `Creada ${escapeHTML((dateRaw || '').slice(0, 10))}`;

    const teacherName = isGroup ? teacherDisplayName(r.teacher) : '';
    const teacherLine = teacherName
        ? `<span class="rcard__teacher">
               <svg class="icon-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                   <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                   <circle cx="12" cy="7" r="4"></circle>
               </svg>
               ${escapeHTML(teacherName)}
           </span>`
        : '';

    const section = isGroup ? (r.membership?.section || null) : null;
    const sectionLine = section
        ? `<div class="rcard__section">
               <svg class="icon-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                   <rect x="3" y="4" width="18" height="18" rx="2"></rect>
                   <line x1="16" y1="2" x2="16" y2="6"></line>
                   <line x1="8" y1="2" x2="8" y2="6"></line>
                   <line x1="3" y1="10" x2="21" y2="10"></line>
               </svg>
               <span class="rcard__section-name">${escapeHTML(section.name || section.code || '')}</span>
               <span class="rcard__section-sep">·</span>
               <span class="rcard__section-schedule">${escapeHTML(section.schedule || '')}</span>
           </div>`
        : '';

    // Sala de estudio sin preguntas: el CTA principal lleva a generar, no a
    // "Empezar evaluación" (que con 0 preguntas no tendría qué servir).
    const qCount = r.questions ?? 0;
    const needsContent = !isGroup && qCount === 0;
    const arrowSvg = `<svg class="icon-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`;
    const primaryCta = needsContent
        ? `<a class="rcard__cta" href="/app/questions/" data-action="manage-questions" data-room-id="${r.id_room}">Generar preguntas ${arrowSvg}</a>`
        : `<a class="rcard__cta" href="#" data-action="start" data-room-id="${r.id_room}">Empezar evaluación ${arrowSvg}</a>`;

    return `
    <li class="rcard" data-mode="${r.mode}">
        <header class="rcard__head rcard__head--withbadge">
            <div class="rcard__id">
                <h3 class="rcard__name">${escapeHTML(r.name)}</h3>
                <div class="rcard__submeta">
                    <span>${escapeHTML(r.subject)}</span>
                    <span class="rcard__submeta-sep">·</span>
                    <span>${dateLabel}</span>
                </div>
                ${teacherLine}
                ${sectionLine}
            </div>
            ${modeBadge(r.mode)}
        </header>

        <div class="rcard__stats">
            <div class="rcard__stat" title="Nodos activos">
                <svg class="icon-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="3"></circle>
                    <circle cx="4" cy="4" r="2"></circle>
                    <circle cx="20" cy="4" r="2"></circle>
                    <circle cx="4" cy="20" r="2"></circle>
                </svg>
                <span class="num">${r.activeNodes ?? 0}</span>
                <span class="rcard__stat-label">nodos</span>
            </div>
            <div class="rcard__stat" title="Sesiones completadas">
                <svg class="icon-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <polyline points="9 11 12 14 22 4"></polyline>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                </svg>
                <span class="num">${r.totalSessions ?? 0}</span>
                <span class="rcard__stat-label">sesiones</span>
            </div>
            ${r.mode === 'individual' ? `
                <div class="rcard__stat" title="PDFs subidos">
                    <svg class="icon-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    <span class="num">${r.pdfs ?? 0}</span>
                    <span class="rcard__stat-label">pdfs</span>
                </div>
                <div class="rcard__stat" title="Preguntas">
                    <svg class="icon-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        <circle cx="12" cy="12" r="10"></circle>
                    </svg>
                    <span class="num">${r.questions ?? 0}</span>
                    <span class="rcard__stat-label">preguntas</span>
                </div>
            ` : ''}
        </div>

        <footer class="rcard__foot">
            <a class="rcard__link" href="/app/history/?room=${r.id_room}" data-action="history" data-room-id="${r.id_room}">
                Ver historial
            </a>
            <div class="rcard__foot-actions">
                ${!isGroup ? `
                    <a class="rcard__link" href="/app/questions/" data-action="manage-questions" data-room-id="${r.id_room}" title="Gestionar preguntas">Preguntas</a>
                    <a class="rcard__link" href="/app/pdfs/" data-action="manage-pdfs" data-room-id="${r.id_room}" title="Gestionar PDFs">PDFs</a>
                ` : ''}
                ${primaryCta}
            </div>
        </footer>
    </li>`;
}


function applyFilter() {
    return rooms.filter((r) => currentMode === 'all' || r.mode === currentMode);
}


function paintCounts() {
    const all = rooms.length;
    const group = rooms.filter((r) => r.mode === 'group').length;
    const individual = rooms.filter((r) => r.mode === 'individual').length;
    document.querySelector('[data-count="all"]').textContent = all;
    document.querySelector('[data-count="group"]').textContent = group;
    document.querySelector('[data-count="individual"]').textContent = individual;
    document.getElementById('my-rooms-count').textContent = all;
}


function paintMeta(filtered) {
    const $meta = document.getElementById('my-rooms-meta');
    if (!$meta) return;
    if (filtered.length === 0) {
        $meta.textContent = '';
        return;
    }
    const modeLabel = currentMode === 'all'
        ? ''
        : currentMode === 'group' ? ' grupales' : ' de estudio';
    $meta.textContent = `Mostrando ${filtered.length} sala${filtered.length === 1 ? '' : 's'}${modeLabel}`;
}


function render() {
    const $list = document.getElementById('my-rooms-list');
    const $empty = document.getElementById('my-rooms-empty');
    const filtered = applyFilter();

    paintCounts();
    paintMeta(filtered);

    if (rooms.length === 0) {
        $list.innerHTML = '';
        $empty.hidden = false;
        return;
    }

    $empty.hidden = true;

    if (filtered.length === 0) {
        $list.innerHTML = `
          <li class="my-rooms-empty" style="margin:var(--s-4) 0;">
            <p class="my-rooms-empty__body">No tenés salas en este filtro. Probá con otro.</p>
          </li>`;
        return;
    }

    $list.innerHTML = filtered.map(renderCard).join('');
}


document.querySelectorAll('[data-mode-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
        currentMode = btn.dataset.modeFilter;
        document.querySelectorAll('[data-mode-filter]').forEach((b) => {
            b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        });
        render();
    });
});


/* Iniciar evaluación: el estudiante elige en qué nodos evaluarse antes de crear
   la sesión. Los nodos se traen en vivo, así reflejan los que el docente agregó
   y solo se ofrecen los que ya tienen preguntas aprobadas. */
let startRoomId = null;

document.getElementById('my-rooms-list').addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;
    const roomId = Number(el.dataset.roomId);

    if (action === 'start') {
        e.preventDefault();
        if (roomId) openStartEvalModal(roomId);
        return;
    }
    // "Preguntas" / "PDFs" / "Generar preguntas": fijamos la sala activa para que
    // la página de gestión cargue ESTA sala; el href navega normalmente.
    if (action === 'manage-questions' || action === 'manage-pdfs') {
        if (roomId) localStorage.setItem('cogniroom.activeRoomId', String(roomId));
    }
});


async function openStartEvalModal(roomId) {
    startRoomId = roomId;
    const $body = document.getElementById('start-eval-nodes');
    const $confirm = document.getElementById('start-eval-confirm');
    const $all = document.getElementById('start-eval-all');
    if (!$body) return;

    $body.innerHTML = '<p class="start-eval__msg">Cargando nodos…</p>';
    if ($confirm) $confirm.disabled = true;
    if ($all) { $all.checked = true; $all.disabled = true; }

    const $modal = document.getElementById('startEvalModal');
    if ($modal && window.bootstrap) {
        const instance = window.bootstrap.Modal.getInstance($modal) || new window.bootstrap.Modal($modal);
        instance.show();
    }

    try {
        const nodes = await questionsApi.listNodes(roomId);
        const usable = (nodes || []).filter((n) => (n.approved_count ?? 0) > 0);
        if (usable.length === 0) {
            $body.innerHTML = '<p class="start-eval__msg">Esta sala todavía no tiene preguntas disponibles para evaluar.</p>';
            return;
        }
        $body.innerHTML = usable.map((n) => `
            <label class="start-eval__node">
                <input type="checkbox" class="start-eval__check" value="${n.id}" checked>
                <span class="start-eval__node-name">${escapeHTML(n.name)}</span>
                <span class="start-eval__node-count num">${n.approved_count} ${n.approved_count === 1 ? 'pregunta' : 'preguntas'}</span>
            </label>
        `).join('');
        if ($confirm) $confirm.disabled = false;
        if ($all) { $all.disabled = false; $all.checked = true; }
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
            tokens.clear();
            location.replace('/app/');
            return;
        }
        $body.innerHTML = '<p class="start-eval__msg">No se pudieron cargar los nodos.</p>';
    }
}


function bindStartEvalModal() {
    const $all = document.getElementById('start-eval-all');
    const $body = document.getElementById('start-eval-nodes');
    const $confirm = document.getElementById('start-eval-confirm');

    if ($all && !$all.dataset.bound) {
        $all.dataset.bound = '1';
        $all.addEventListener('change', () => {
            document.querySelectorAll('.start-eval__check').forEach((c) => { c.checked = $all.checked; });
        });
    }

    // "Todos" queda en sync con las casillas individuales.
    if ($body && !$body.dataset.bound) {
        $body.dataset.bound = '1';
        $body.addEventListener('change', () => {
            const checks = Array.from(document.querySelectorAll('.start-eval__check'));
            if ($all && checks.length) $all.checked = checks.every((c) => c.checked);
        });
    }

    if ($confirm && !$confirm.dataset.bound) {
        $confirm.dataset.bound = '1';
        $confirm.addEventListener('click', async () => {
            if (!startRoomId) return;
            const checked = Array.from(document.querySelectorAll('.start-eval__check:checked'))
                .map((c) => Number(c.value));
            if (checked.length === 0) {
                toast('Elegí al menos un nodo para evaluarte.', { kind: 'error' });
                return;
            }
            $confirm.disabled = true;
            const original = $confirm.innerHTML;
            $confirm.textContent = 'Iniciando…';
            try {
                const session = await sessionsApi.create(startRoomId, checked);
                location.href = `/app/session/${session.id}/`;
            } catch (err) {
                if (err instanceof ApiError && err.status === 401) {
                    tokens.clear();
                    location.replace('/app/');
                    return;
                }
                toast(err?.body?.detail || err?.message || 'No se pudo iniciar la evaluación.', { kind: 'error' });
                $confirm.disabled = false;
                $confirm.innerHTML = original;
            }
        });
    }
}


function bindJoinModal() {
    const $form = document.getElementById('join-room-form');
    if (!$form || $form.dataset.bound) return;
    $form.dataset.bound = '1';

    const $code = $form.elements.code;
    if ($code) {
        $code.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
        });
    }

    $form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = ($code?.value || '').trim();
        if (code.length < 6) {
            toast('El código debe tener al menos 6 caracteres.', { kind: 'error' });
            $code?.focus();
            return;
        }
        try {
            await roomsApi.join(code);
            toast('Te uniste a la sala.', { kind: 'success' });
            $form.reset();
            hideModal('joinRoomModal');
            await loadRooms();
        } catch (err) {
            toast(err?.body?.detail || err?.message || 'No se pudo unir a la sala.', { kind: 'error' });
        }
    });
}


function bindCreateStudyModal() {
    const $form = document.getElementById('create-study-form');
    if (!$form || $form.dataset.bound) return;
    $form.dataset.bound = '1';

    $form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = $form.elements.name.value.trim();
        if (!name) {
            $form.elements.name.focus();
            return;
        }
        const subject = $form.elements.subject.value.trim();
        try {
            await roomsApi.create({ name, subject: subject || 'General', mode: 'individual' });
            toast(`Sala "${name}" creada.`, { kind: 'success' });
            $form.reset();
            hideModal('createStudyRoomModal');
            await loadRooms();
        } catch (err) {
            toast(err?.body?.detail || err?.message || 'No se pudo crear la sala.', { kind: 'error' });
        }
    });
}


async function loadRooms() {
    try {
        const data = await roomsApi.list();
        rooms = (data || []).map((r) => ({ ...r, id_room: r.id }));
        render();
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
            tokens.clear();
            location.replace('/app/');
            return;
        }
        toast('No se pudieron cargar tus salas.', { kind: 'error' });
    }
}


bindJoinModal();
bindCreateStudyModal();
bindStartEvalModal();
render();
loadRooms();
