const _v = new URL(import.meta.url).searchParams.get('v') || '';
const { tokens } = await import(`../api.js?v=${_v}`);
const { toast } = await import(`../toast.js?v=${_v}`);
const {
    STUDENT_DATA,
    escapeHTML,
    profileLabel,
    profileTone,
    fmt,
} = await import(`./student-mock.js?v=${_v}`);


if (!tokens.access) {
    location.replace('/app/');
}


let currentMode = 'all';
let rooms = [...STUDENT_DATA.joinedRooms, ...STUDENT_DATA.studyRooms];


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
    const dateLabel = isGroup
        ? `Inscrito ${escapeHTML(r.joinedAt)}`
        : `Creada ${escapeHTML(r.createdAt)}`;

    const teacherLine = isGroup && r.teacher
        ? `<span class="rcard__teacher">
               <svg class="icon-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                   <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                   <circle cx="12" cy="7" r="4"></circle>
               </svg>
               ${escapeHTML(r.teacher)}
           </span>`
        : '';

    const pendingPill = (r.pendingSessions || 0) > 0
        ? `<span class="rcard__pendingdot">${r.pendingSessions} pendiente${r.pendingSessions === 1 ? '' : 's'}</span>`
        : '';

    const profileT = profileTone(r.myProfile);

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
            </div>
            ${modeBadge(r.mode)}
        </header>

        <div class="rcard__progress">
            <div class="rcard__progress-row">
                <span class="rcard__progress-k">
                    <svg class="icon-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="9"></circle>
                        <path d="M12 7v6l3 2"></path>
                    </svg>
                    Tu ICC
                </span>
                <span class="rcard__progress-v" data-tone="${profileT}">${fmt(r.myIcc)}</span>
            </div>
            <div class="rcard__progress-row">
                <span class="rcard__progress-k">
                    <svg class="icon-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
                        <polyline points="16 7 22 7 22 13"></polyline>
                    </svg>
                    Mastery
                </span>
                <span class="rcard__progress-v">${fmt(r.myMastery)}</span>
            </div>
            <div class="rcard__progress-row">
                <span class="rcard__progress-k">
                    <svg class="icon-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M12 1v6m0 10v6m11-11h-6M7 12H1"></path>
                    </svg>
                    Perfil
                </span>
                <span class="pill" data-profile="${escapeHTML(r.myProfile)}">${profileLabel(r.myProfile)}</span>
            </div>
        </div>

        <div class="rcard__stats">
            <div class="rcard__stat" title="Nodos activos">
                <svg class="icon-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="3"></circle>
                    <circle cx="4" cy="4" r="2"></circle>
                    <circle cx="20" cy="4" r="2"></circle>
                    <circle cx="4" cy="20" r="2"></circle>
                </svg>
                <span class="num">${r.activeNodes}</span>
                <span class="rcard__stat-label">nodos</span>
            </div>
            <div class="rcard__stat" title="Sesiones completadas">
                <svg class="icon-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <polyline points="9 11 12 14 22 4"></polyline>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                </svg>
                <span class="num">${r.totalSessions}</span>
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
            ${pendingPill}
        </div>

        <footer class="rcard__foot">
            <a class="rcard__link" href="/app/history/?room=${r.id}" data-action="history" data-room-id="${r.id}">
                Ver historial
            </a>
            <div class="rcard__foot-actions">
                ${r.mode === 'individual' ? `
                    <a class="rcard__link" href="/app/questions/" title="Gestionar preguntas">Preguntas</a>
                    <a class="rcard__link" href="/app/pdfs/" title="Gestionar PDFs">PDFs</a>
                ` : ''}
                <a class="rcard__cta" href="/app/session/" data-room-id="${r.id}">
                    Empezar evaluación
                    <svg class="icon-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                </a>
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

    $form.addEventListener('submit', (e) => {
        e.preventDefault();
        const code = ($code?.value || '').trim();
        if (code.length < 6) {
            toast('El código debe tener al menos 6 caracteres.', { kind: 'error' });
            $code?.focus();
            return;
        }
        toast(`Te uniste a la sala con el código ${code} (mock).`, { kind: 'success' });
        $form.reset();
        const $modal = document.getElementById('joinRoomModal');
        if ($modal && window.bootstrap) {
            const instance = window.bootstrap.Modal.getInstance($modal) || new window.bootstrap.Modal($modal);
            instance.hide();
        }
    });
}


function bindCreateStudyModal() {
    const $form = document.getElementById('create-study-form');
    if (!$form || $form.dataset.bound) return;
    $form.dataset.bound = '1';

    $form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = $form.elements.name.value.trim();
        if (!name) {
            $form.elements.name.focus();
            return;
        }
        const subject = $form.elements.subject.value.trim();
        const newRoom = {
            id: Date.now(),
            mode: 'individual',
            name,
            subject: subject || 'General',
            teacher: null,
            accessCode: null,
            createdAt: new Date().toISOString().slice(0, 10),
            lastActivity: 'recién',
            myIcc: 0,
            myMastery: 0,
            myProfile: 'calibrated',
            activeNodes: 0,
            pendingSessions: 0,
            totalSessions: 0,
            pdfs: 0,
            questions: 0,
        };
        rooms = [newRoom, ...rooms];
        render();
        toast(`Sala "${name}" creada (mock).`, { kind: 'success' });
        $form.reset();
        const $modal = document.getElementById('createStudyRoomModal');
        if ($modal && window.bootstrap) {
            const instance = window.bootstrap.Modal.getInstance($modal) || new window.bootstrap.Modal($modal);
            instance.hide();
        }
    });
}


bindJoinModal();
bindCreateStudyModal();
render();
