const _v = new URL(import.meta.url).searchParams.get('v') || '';
const { rooms: roomsApi, tokens, ApiError } = await import(`../api.js?v=${_v}`);
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

function activeRoomId() {
    return Number(localStorage.getItem('cogniroom.activeRoomId')) || null;
}


const PAGE_SIZE = 6;
let currentPage = 1;
let ROOMS = [];
let LOADED = false;
let RENAME_ID = null;
let DELETE_ID = null;
let DELETE_NAME = '';
let DELETE_HASDATA = false;

function modalInstance(id) {
    const $m = document.getElementById(id);
    if (!$m || !window.bootstrap) return null;
    return window.bootstrap.Modal.getInstance($m) || new window.bootstrap.Modal($m);
}


async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}


function healthTone(icc) {
    if (icc >= 0.65) return 'moss';
    if (icc >= 0.5)  return 'amber';
    return 'rust';
}


function renderCard(r, isActive) {
    const d = r;
    const alerts = { pendingAI: d.pending_ai_count || 0, atRisk: d.at_risk_count || 0 };
    const sectionCount = d.section_count || 0;
    const tone = healthTone(d.icc || 0);
    const archived = d.is_active === false;

    return `
    <li class="rcard ${isActive ? 'rcard--active' : ''} ${archived ? 'rcard--archived' : ''}" data-open="${r.id}">
        ${isActive && !archived ? '<span class="rcard__activedot" aria-label="Sala activa"></span>' : ''}
        <header class="rcard__head">
            <div class="rcard__id">
                <h3 class="rcard__name">${escapeHTML(d.name)}</h3>
                <div class="rcard__submeta">
                    <span>Creada ${escapeHTML((d.created_at || '').slice(0, 10))}</span>
                    ${archived ? '<span class="rcard__archived">Cerrada</span>' : ''}
                </div>
            </div>
        </header>

        <div class="rcard__code">
            <span class="rcard__code-label eyebrow">Código</span>
            <span class="rcard__code-value num">${escapeHTML(d.access_code)}</span>
            <div class="rcard__code-actions">
                <button type="button" class="rcard__icon-btn" data-copy="${escapeHTML(d.access_code)}" aria-label="Copiar código" title="Copiar">
                    <svg class="icon-svg" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                        <rect x="9" y="9" width="13" height="13" rx="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                </button>
                <button type="button" class="rcard__icon-btn" data-share="${escapeHTML(d.name)}|${escapeHTML(d.access_code)}" aria-label="Compartir" title="Compartir">
                    <svg class="icon-svg" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="18" cy="5" r="3"></circle>
                        <circle cx="6" cy="12" r="3"></circle>
                        <circle cx="18" cy="19" r="3"></circle>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                    </svg>
                </button>
            </div>
        </div>

        <div class="rcard__stats">
            <div class="rcard__stat" title="Estudiantes inscritos">
                <svg class="icon-svg" width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                </svg>
                <span class="num">${d.member_count ?? 0}</span>
                <span class="rcard__stat-label">estudiantes</span>
            </div>
            <div class="rcard__stat" title="Preguntas en el banco">
                <svg class="icon-svg" width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span class="num">${d.question_count ?? 0}</span>
                <span class="rcard__stat-label">preguntas</span>
            </div>
            <div class="rcard__stat" title="Documentos PDF subidos">
                <svg class="icon-svg" width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <span class="num">${d.pdf_count ?? 0}</span>
                <span class="rcard__stat-label">PDFs</span>
            </div>
            ${sectionCount > 0 ? `
            <div class="rcard__stat" title="Secciones paralelas dentro de la sala">
                <svg class="icon-svg" width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                </svg>
                <span class="num">${sectionCount}</span>
                <span class="rcard__stat-label">${sectionCount === 1 ? 'sección' : 'secciones'}</span>
            </div>
            ` : ''}
            <div class="rcard__stat rcard__stat--health" data-tone="${tone}" title="Calibración promedio del grupo (qué tan bien se conocen)">
                <svg class="icon-svg" width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="9"></circle>
                    <circle cx="12" cy="12" r="4"></circle>
                </svg>
                <span class="num">${(d.icc * 100).toFixed(0)}%</span>
                <span class="rcard__stat-label">calibración</span>
            </div>
        </div>

        ${(alerts.pendingAI > 0 || alerts.atRisk > 0) ? `
        <div class="rcard__alerts">
            ${alerts.pendingAI > 0 ? `
                <span class="rcard__alert" data-kind="pending">
                    <svg class="icon-svg" width="11" height="11" viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <span class="num">${alerts.pendingAI}</span> IA por revisar
                </span>
            ` : ''}
            ${alerts.atRisk > 0 ? `
                <span class="rcard__alert" data-kind="risk">
                    <svg class="icon-svg" width="11" height="11" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    <span class="num">${alerts.atRisk}</span> en riesgo
                </span>
            ` : ''}
        </div>
        ` : ''}

        <footer class="rcard__foot">
            <div class="rcard__menu" data-menu>
                <button type="button" class="rcard__menu-btn" data-menu-btn aria-haspopup="true" aria-expanded="false" aria-label="Más acciones">
                    <svg class="rcard__menu-dots" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="12" cy="5" r="1.7"></circle>
                        <circle cx="12" cy="12" r="1.7"></circle>
                        <circle cx="12" cy="19" r="1.7"></circle>
                    </svg>
                </button>
                <div class="rcard__menu-list" role="menu" hidden>
                    <button type="button" class="rcard__menu-item" role="menuitem" data-rename="${r.id}" data-name="${escapeHTML(d.name)}">Renombrar</button>
                    ${archived
                        ? `<button type="button" class="rcard__menu-item" role="menuitem" data-reactivate="${r.id}">Reabrir sala</button>`
                        : `${isActive ? '' : `<button type="button" class="rcard__menu-item" role="menuitem" data-activate="${r.id}">Hacer activa</button>`}
                           <button type="button" class="rcard__menu-item" role="menuitem" data-close="${r.id}">Cerrar sala</button>`
                    }
                    <button type="button" class="rcard__menu-item rcard__menu-item--danger" role="menuitem" data-delete="${r.id}" data-name="${escapeHTML(d.name)}">Eliminar</button>
                </div>
            </div>
            <div class="rcard__foot-right">
                ${isActive && !archived ? '<span class="rcard__activelabel">Activa</span>' : ''}
                <a class="rcard__cta" href="/app/questions/" data-activate="${r.id}">
                    Ver preguntas
                    <svg class="icon-svg" width="11" height="11" viewBox="0 0 24 24" aria-hidden="true">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                </a>
            </div>
        </footer>
    </li>
    `;
}


function emptyStateHTML() {
    return `
    <li class="rooms-empty">
        <span class="rooms-empty__art" aria-hidden="true">
            <svg aria-hidden="true" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"></path>
                <path d="M9 21v-6h6v6"></path>
            </svg>
        </span>
        <h2 class="rooms-empty__title">Crea tu primera sala</h2>
        <p class="rooms-empty__text">Una sala agrupa a tus estudiantes y su banco de preguntas. Al crearla obtienes un código único que ellos usan para unirse y empezar a responder.</p>

        <button type="button" class="ds-btn ds-btn--ink rooms-empty__cta" data-bs-toggle="modal" data-bs-target="#createRoomModal">
            <svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Crear sala
        </button>
    </li>`;
}


function render() {
    const $list = document.getElementById('rooms-list');
    const $meta = document.getElementById('rooms-meta');
    if (!$list) return;

    const activeId = activeRoomId();

    // Hasta que la primera carga termine no se pinta nada en la lista: así el
    // estado vacío no parpadea cuando el usuario sí tiene salas (FOUC).
    if (!LOADED) {
        if ($meta) $meta.textContent = '';
        $list.innerHTML = '';
        renderPager(0, 1);
        return;
    }

    if (ROOMS.length === 0) {
        if ($meta) $meta.textContent = '';
        $list.innerHTML = emptyStateHTML();
        renderPager(0, 1);
        return;
    }

    const totalPages = Math.max(1, Math.ceil(ROOMS.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    const startIdx = (currentPage - 1) * PAGE_SIZE;
    const visible = ROOMS.slice(startIdx, startIdx + PAGE_SIZE);

    if ($meta) {
        $meta.textContent = ROOMS.length <= PAGE_SIZE
            ? ''
            : `${startIdx + 1}–${startIdx + visible.length} de ${ROOMS.length}`;
    }

    $list.innerHTML = visible.map((r) => renderCard(r, r.id === activeId)).join('');

    renderPager(ROOMS.length, totalPages);
    bindActions();
}


function renderPager(total, totalPages) {
    const $pager = document.getElementById('rooms-pager');
    if (!$pager) return;

    if (total === 0 || totalPages <= 1) {
        $pager.innerHTML = '';
        $pager.hidden = true;
        return;
    }
    $pager.hidden = false;

    const parts = [];
    parts.push(`<span class="rooms-pager__info">Página ${currentPage} de ${totalPages}</span>`);
    parts.push(`<button type="button" class="rooms-pager__btn" data-page-go="prev" ${currentPage === 1 ? 'disabled' : ''} aria-label="Anterior">‹</button>`);
    for (let p = 1; p <= totalPages; p++) {
        parts.push(`<button type="button" class="rooms-pager__btn" data-page-go="${p}" ${p === currentPage ? 'aria-current="page"' : ''}>${p}</button>`);
    }
    parts.push(`<button type="button" class="rooms-pager__btn" data-page-go="next" ${currentPage === totalPages ? 'disabled' : ''} aria-label="Siguiente">›</button>`);
    $pager.innerHTML = parts.join('');

    $pager.querySelectorAll('[data-page-go]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.pageGo;
            if (target === 'prev') currentPage = Math.max(1, currentPage - 1);
            else if (target === 'next') currentPage = Math.min(totalPages, currentPage + 1);
            else currentPage = Number(target);
            render();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
}


function closeAllMenus(except) {
    document.querySelectorAll('.rcard__menu-list').forEach((list) => {
        if (list === except) return;
        list.hidden = true;
        const btn = list.parentElement.querySelector('[data-menu-btn]');
        if (btn) btn.setAttribute('aria-expanded', 'false');
    });
}

// Cierre del menú al hacer clic fuera o con Escape (una sola vez, no por render).
document.addEventListener('click', () => closeAllMenus());
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAllMenus(); });


function bindActions() {
    document.querySelectorAll('[data-menu-btn]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const list = btn.parentElement.querySelector('.rcard__menu-list');
            const willOpen = list.hidden;
            closeAllMenus();
            list.hidden = !willOpen;
            btn.setAttribute('aria-expanded', String(willOpen));
        });
    });

    document.querySelectorAll('[data-copy]').forEach((btn) => {
        btn.addEventListener('click', async () => {
            const code = btn.dataset.copy;
            const ok = await copyToClipboard(code);
            toast(
                ok ? `Código ${code} copiado al portapapeles.` : `No se pudo copiar el código.`,
                { kind: ok ? 'success' : 'error' },
            );
        });
    });

    document.querySelectorAll('[data-share]').forEach((btn) => {
        btn.addEventListener('click', async () => {
            const [name, code] = btn.dataset.share.split('|');
            const text = `Únete a "${name}" en CogniRoom con el código ${code}`;
            if (navigator.share) {
                try {
                    await navigator.share({ title: name, text });
                    return;
                } catch { /* user cancelled */ }
            }
            const ok = await copyToClipboard(text);
            toast(
                ok ? 'Texto de invitación copiado al portapapeles.' : 'No se pudo copiar la invitación.',
                { kind: ok ? 'success' : 'error' },
            );
        });
    });

    document.querySelectorAll('[data-activate]').forEach((el) => {
        el.addEventListener('click', () => {
            localStorage.setItem('cogniroom.activeRoomId', String(Number(el.dataset.activate)));
            if (el.tagName !== 'A') render();
        });
    });

    // Clic en la tarjeta (fuera de botones/enlaces) → abre las preguntas de esa sala.
    document.querySelectorAll('.rcard[data-open]').forEach((card) => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('button, a')) return;
            localStorage.setItem('cogniroom.activeRoomId', String(Number(card.dataset.open)));
            location.href = '/app/questions/';
        });
    });

    document.querySelectorAll('[data-rename]').forEach((btn) => {
        btn.addEventListener('click', () => {
            RENAME_ID = Number(btn.dataset.rename);
            const $input = document.getElementById('room-rename-input');
            if ($input) $input.value = btn.dataset.name || '';
            const m = modalInstance('roomRenameModal');
            if (m) m.show();
        });
    });

    document.querySelectorAll('[data-reactivate]').forEach((btn) => {
        btn.addEventListener('click', async () => {
            const id = Number(btn.dataset.reactivate);
            btn.disabled = true;
            try {
                await roomsApi.archive(id, false);
                toast('Sala reabierta. Tus estudiantes ya pueden evaluarse de nuevo.', { kind: 'success' });
                await loadRooms();
            } catch (err) {
                btn.disabled = false;
                toast(err?.body?.detail || err?.message || 'No se pudo reabrir la sala.', { kind: 'error' });
            }
        });
    });

    document.querySelectorAll('[data-close]').forEach((btn) => {
        btn.addEventListener('click', async () => {
            const id = Number(btn.dataset.close);
            btn.disabled = true;
            try {
                await roomsApi.archive(id, true);
                toast('Sala cerrada. Se conserva el historial y los estudiantes no pueden iniciar evaluaciones; puedes reabrirla cuando quieras.', { kind: 'success' });
                await loadRooms();
            } catch (err) {
                btn.disabled = false;
                toast(err?.body?.detail || err?.message || 'No se pudo cerrar la sala.', { kind: 'error' });
            }
        });
    });

    document.querySelectorAll('[data-delete]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const id = Number(btn.dataset.delete);
            const room = ROOMS.find((r) => r.id === id);
            if (room) openDeleteModal(room);
        });
    });
}


window.addEventListener('cogniroom:roomchange', render);


async function loadRooms() {
    try {
        ROOMS = (await roomsApi.list()) || [];
        LOADED = true;
        render();
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
            tokens.clear();
            location.replace('/app/');
            return;
        }
        toast('No se pudieron cargar las salas.', { kind: 'error' });
    }
}

const $roomRenameForm = document.getElementById('room-rename-form');
if ($roomRenameForm) {
    $roomRenameForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = (document.getElementById('room-rename-input').value || '').trim();
        if (!name || !RENAME_ID) return;
        const $submit = $roomRenameForm.querySelector('[type="submit"]');
        if ($submit) $submit.disabled = true;
        try {
            await roomsApi.update(RENAME_ID, { name });
            toast('Sala renombrada.', { kind: 'success' });
            const m = modalInstance('roomRenameModal');
            if (m) m.hide();
            await loadRooms();
        } catch (err) {
            toast(err?.body?.detail || err?.message || 'No se pudo renombrar la sala.', { kind: 'error' });
        } finally {
            if ($submit) $submit.disabled = false;
        }
    });
}


function openDeleteModal(room) {
    DELETE_ID = room.id;
    DELETE_NAME = room.name || '';
    const members = room.member_count || 0;
    const sessions = room.session_count || 0;
    DELETE_HASDATA = room.mode === 'group' && (members > 0 || sessions > 0);

    const $body = document.getElementById('room-delete-body');
    const $danger = document.getElementById('room-delete-danger');
    const $confirm = document.getElementById('room-delete-confirm');
    const $btn = document.getElementById('room-delete-submit');

    if ($body) {
        $body.innerHTML = DELETE_HASDATA
            ? `«${escapeHTML(DELETE_NAME)}» tiene <strong>${members} ${members === 1 ? 'estudiante' : 'estudiantes'}</strong> y `
              + `<strong>${sessions} ${sessions === 1 ? 'sesión' : 'sesiones'}</strong>. Al eliminarla se borrará todo su `
              + `historial cognitivo (calibración, dominio y diagnósticos). Esta acción no se puede deshacer.`
            : `Vas a eliminar «${escapeHTML(DELETE_NAME)}». Esta acción no se puede deshacer.`;
    }
    if ($danger) $danger.hidden = !DELETE_HASDATA;
    if ($confirm) $confirm.value = '';
    if ($btn) $btn.disabled = DELETE_HASDATA;   // con datos: se habilita al escribir el nombre

    const m = modalInstance('roomDeleteModal');
    if (m) m.show();
}

const $deleteConfirmInput = document.getElementById('room-delete-confirm');
if ($deleteConfirmInput) {
    $deleteConfirmInput.addEventListener('input', () => {
        const $btn = document.getElementById('room-delete-submit');
        if ($btn) $btn.disabled = $deleteConfirmInput.value.trim() !== DELETE_NAME;
    });
}

const $deleteSubmit = document.getElementById('room-delete-submit');
if ($deleteSubmit) {
    $deleteSubmit.addEventListener('click', async () => {
        if (!DELETE_ID) return;
        $deleteSubmit.disabled = true;
        try {
            await roomsApi.remove(DELETE_ID, DELETE_HASDATA ? DELETE_NAME : undefined);
            toast('Sala eliminada.', { kind: 'success' });
            const m = modalInstance('roomDeleteModal');
            if (m) m.hide();
            if (activeRoomId() === DELETE_ID) localStorage.removeItem('cogniroom.activeRoomId');
            await loadRooms();
        } catch (err) {
            $deleteSubmit.disabled = false;
            // El backend detectó datos que la tarjeta no reflejaba (p. ej. una
            // sesión en curso): pasa el modal a modo confirmación por nombre.
            if (err?.status === 409 && err?.body?.requires_confirmation && !DELETE_HASDATA) {
                DELETE_HASDATA = true;
                openDeleteModal({
                    id: DELETE_ID,
                    name: DELETE_NAME,
                    mode: 'group',
                    member_count: err.body.member_count,
                    session_count: err.body.session_count,
                });
                return;
            }
            toast(err?.body?.detail || err?.message || 'No se pudo eliminar la sala.', { kind: 'error' });
        }
    });
}

const $deleteArchive = document.getElementById('room-delete-archive');
if ($deleteArchive) {
    $deleteArchive.addEventListener('click', async () => {
        if (!DELETE_ID) return;
        $deleteArchive.disabled = true;
        try {
            await roomsApi.archive(DELETE_ID, true);
            toast('Sala cerrada. Ya no aparece para tus estudiantes; puedes reabrirla cuando quieras.', { kind: 'success' });
            const m = modalInstance('roomDeleteModal');
            if (m) m.hide();
            await loadRooms();
        } catch (err) {
            toast(err?.body?.detail || err?.message || 'No se pudo cerrar la sala.', { kind: 'error' });
        } finally {
            $deleteArchive.disabled = false;
        }
    });
}


render();
loadRooms();