const _v = new URL(import.meta.url).searchParams.get('v') || '';
const { rooms: roomsApi, questions: questionsApi, tokens, ApiError } = await import(`../api.js?v=${_v}`);
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


const PAGE_SIZE = 10;

let ROOM_ID = null;
let ROOM_INFO = null;
let BANK = [];
let currentStatus = 'all';
let currentSource = 'all';
let currentSearch = '';
let currentPage = 1;


function difficultyMeta(level) {
    if (level === 'easy')   return { label: 'Fácil',   tone: 'moss' };
    if (level === 'medium') return { label: 'Media',   tone: 'amber' };
    if (level === 'hard')   return { label: 'Difícil', tone: 'rust' };
    return null;
}


function nodeName(node) {
    if (!node) return '';
    if (typeof node === 'string') return node;
    return node.name || '';
}


function nodeTopic(node) {
    if (!node || typeof node === 'string') return '';
    return node.description || '';
}


function questionText(q) {
    return q.statement || '';
}


function applyFilters(bank) {
    const q = currentSearch.trim().toLowerCase();
    return bank.filter((qst) => {
        if (currentStatus !== 'all' && qst.status !== currentStatus) return false;
        if (currentSource !== 'all' && qst.source !== currentSource) return false;
        if (q) {
            const text = questionText(qst).toLowerCase();
            const name = nodeName(qst.node).toLowerCase();
            const topic = nodeTopic(qst.node).toLowerCase();
            if (!text.includes(q) && !name.includes(q) && !topic.includes(q)) return false;
        }
        return true;
    });
}


function formatDate(iso) {
    if (!iso) return '';
    return String(iso).slice(0, 10);
}


function renderList() {
    const $list = document.getElementById('questions-list');
    const $meta = document.getElementById('questions-meta');
    if (!$list) return;

    const filtered = applyFilters(BANK);
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    const startIdx = (currentPage - 1) * PAGE_SIZE;
    const visible = filtered.slice(startIdx, startIdx + PAGE_SIZE);

    if ($meta) {
        if (filtered.length === 0) {
            $meta.textContent = 'Sin resultados';
        } else {
            const endIdx = startIdx + visible.length;
            $meta.textContent = `${startIdx + 1}–${endIdx} de ${filtered.length}`;
        }
    }

    if (filtered.length === 0) {
        $list.innerHTML = `<li class="questions-empty">Sin preguntas para este filtro.</li>`;
        renderPager(0, 1);
        return;
    }

    $list.innerHTML = visible.map((q) => {
        const diff = difficultyMeta(q.difficulty);
        const status = q.status || (q.is_approved ? 'approved' : 'pending');
        const name = q.node_name || nodeName(q.node);
        const topic = nodeTopic(q.node);
        const sourcePdf = q.source_pdf;
        const options = Array.isArray(q.options) ? q.options : [];
        const correctIdx = Number.isInteger(q.correct_index) ? q.correct_index : -1;

        const optionsHTML = options.length === 4 ? `
            <ol class="qcard__options">
                ${options.map((opt, idx) => `
                    <li class="qcard__option${idx === correctIdx ? ' qcard__option--correct' : ''}">
                        <span class="qcard__option-letter num">${String.fromCharCode(65 + idx)}</span>
                        <span class="qcard__option-text">${escapeHTML(opt)}</span>
                        ${idx === correctIdx ? `
                            <svg class="icon-svg" width="12" height="12" viewBox="0 0 24 24" aria-label="Respuesta correcta">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        ` : ''}
                    </li>
                `).join('')}
            </ol>
        ` : '';

        return `
        <li class="qcard" data-status="${status}">
            <header class="qcard__head">
                <span class="qcard__source" data-source="${q.source}">${q.source === 'ai' ? 'IA' : 'Manual'}</span>
                <span class="qcard__node">
                    <svg class="icon-svg" width="11" height="11" viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="12" cy="12" r="9"></circle>
                        <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"></circle>
                    </svg>
                    ${escapeHTML(name)}${topic ? ` <span class="qcard__topic">· ${escapeHTML(topic)}</span>` : ''}
                </span>
                ${sourcePdf ? `<span class="qcard__pdf" title="Generada de: ${escapeHTML(sourcePdf.original_name)}">
                    <svg class="icon-svg" width="11" height="11" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    ${escapeHTML(sourcePdf.original_name)}
                </span>` : ''}
                <span class="qcard__date num">${escapeHTML(formatDate(q.created_at))}</span>
            </header>

            <p class="qcard__text">${escapeHTML(questionText(q))}</p>

            ${optionsHTML}

            <footer class="qcard__foot">
                <span class="qcard__status" data-status="${status}">
                    <svg class="icon-svg" width="11" height="11" viewBox="0 0 24 24" aria-hidden="true">
                        ${status === 'approved'
                            ? '<polyline points="20 6 9 17 4 12"></polyline>'
                            : status === 'rejected'
                                ? '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>'
                                : '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="6" x2="12" y2="14"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>'}
                    </svg>
                    ${status === 'approved' ? 'Activa' : status === 'rejected' ? 'Rechazada' : 'Por revisar'}
                </span>

                ${diff ? `<span class="qcard__diff" data-tone="${diff.tone}">${diff.label}</span>` : ''}

                <div class="qcard__actions">
                    ${status !== 'rejected' ? `
                        <button type="button" class="qcard__btn qcard__btn--ghost" data-action="reject" data-q-id="${q.id}">
                            <svg class="icon-svg" width="11" height="11" viewBox="0 0 24 24" aria-hidden="true">
                                <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                            Rechazar
                        </button>
                    ` : ''}
                    ${status !== 'approved' ? `
                        <button type="button" class="qcard__btn qcard__btn--primary" data-action="approve" data-q-id="${q.id}">
                            <svg class="icon-svg" width="11" height="11" viewBox="0 0 24 24" aria-hidden="true">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            Aprobar
                        </button>
                    ` : ''}
                </div>
            </footer>
        </li>
        `;
    }).join('');

    renderPager(filtered.length, totalPages);
}


function renderPager(total, totalPages) {
    const $pager = document.getElementById('questions-pager');
    if (!$pager) return;

    if (total === 0 || totalPages <= 1) {
        $pager.innerHTML = '';
        $pager.hidden = true;
        return;
    }
    $pager.hidden = false;

    const pages = pageRange(currentPage, totalPages);

    const parts = [];
    parts.push(`<span class="questions-pager__info">Página ${currentPage} de ${totalPages}</span>`);
    parts.push(`<button type="button" class="questions-pager__btn" data-page-go="prev" ${currentPage === 1 ? 'disabled' : ''} aria-label="Anterior">‹</button>`);
    pages.forEach((p) => {
        if (p === '…') {
            parts.push(`<span class="questions-pager__ellipsis">…</span>`);
        } else {
            const isCurrent = p === currentPage;
            parts.push(`<button type="button" class="questions-pager__btn" data-page-go="${p}" ${isCurrent ? 'aria-current="page"' : ''}>${p}</button>`);
        }
    });
    parts.push(`<button type="button" class="questions-pager__btn" data-page-go="next" ${currentPage === totalPages ? 'disabled' : ''} aria-label="Siguiente">›</button>`);

    $pager.innerHTML = parts.join('');

    $pager.querySelectorAll('[data-page-go]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.pageGo;
            if (target === 'prev') currentPage = Math.max(1, currentPage - 1);
            else if (target === 'next') currentPage = Math.min(totalPages, currentPage + 1);
            else currentPage = Number(target);
            renderList();
        });
    });
}


function pageRange(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 4) return [1, 2, 3, 4, 5, '…', total];
    if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total];
    return [1, '…', current - 1, current, current + 1, '…', total];
}


function render() {
    if (!ROOM_INFO) return;

    const $name = document.getElementById('room-name');
    const $q = document.getElementById('room-questions');
    const $pending = document.getElementById('room-pending');
    if ($name) $name.textContent = ROOM_INFO.name;
    if ($q) $q.textContent = String(BANK.filter((q) => q.status === 'approved').length);

    const pendingTotal = BANK.filter((q) => q.status === 'pending').length;
    if ($pending) $pending.textContent = `${pendingTotal} pendiente${pendingTotal === 1 ? '' : 's'} de aprobación`;

    currentPage = 1;
    renderList();
}


/* Aprobar / rechazar preguntas del banco. */
document.getElementById('questions-list').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn || !ROOM_ID) return;
    const id = Number(btn.dataset.qId);
    const action = btn.dataset.action;
    if (!id) return;

    btn.disabled = true;
    try {
        if (action === 'approve') await questionsApi.approve(ROOM_ID, [id]);
        else if (action === 'reject') await questionsApi.reject(ROOM_ID, [id]);
        toast(action === 'approve' ? 'Pregunta aprobada.' : 'Pregunta rechazada.', { kind: 'success' });
        await reloadBank();
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) { tokens.clear(); location.replace('/app/'); return; }
        toast(err?.body?.detail || err?.message || 'No se pudo actualizar la pregunta.', { kind: 'error' });
        btn.disabled = false;
    }
});


async function reloadBank() {
    BANK = (await questionsApi.list(ROOM_ID)) || [];
    render();
}


async function load() {
    let list;
    try {
        list = await roomsApi.list();
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) { tokens.clear(); location.replace('/app/'); return; }
        toast('No se pudieron cargar las salas.', { kind: 'error' });
        return;
    }
    const stored = activeRoomId();
    ROOM_INFO = (list || []).find((r) => r.id === stored) || (list || [])[0];
    if (!ROOM_INFO) {
        const $list = document.getElementById('questions-list');
        if ($list) $list.innerHTML = `<li class="questions-empty">Creá una sala para gestionar su banco de preguntas.</li>`;
        return;
    }
    ROOM_ID = ROOM_INFO.id;
    localStorage.setItem('cogniroom.activeRoomId', String(ROOM_ID));
    try {
        BANK = (await questionsApi.list(ROOM_ID)) || [];
        render();
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) { tokens.clear(); location.replace('/app/'); return; }
        toast('No se pudo cargar el banco de preguntas.', { kind: 'error' });
    }
}


document.querySelectorAll('[data-status-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
        currentStatus = btn.dataset.statusFilter;
        currentPage = 1;
        document.querySelectorAll('[data-status-filter]').forEach((b) => {
            b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        });
        renderList();
    });
});

document.querySelectorAll('[data-source-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
        currentSource = btn.dataset.sourceFilter;
        currentPage = 1;
        document.querySelectorAll('[data-source-filter]').forEach((b) => {
            b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        });
        renderList();
    });
});


const $search = document.getElementById('questions-search');
if ($search) {
    let t = null;
    $search.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => {
            currentSearch = $search.value;
            currentPage = 1;
            renderList();
        }, 150);
    });
}


window.addEventListener('cogniroom:roomchange', load);

load();
