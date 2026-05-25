const _v = new URL(import.meta.url).searchParams.get('v') || '';
const { tokens } = await import(`../api.js?v=${_v}`);
const { ROOM_DATA, escapeHTML, bindRoomChange } = await import(`./room-mock.js?v=${_v}`);
const { getActiveRoom } = await import(`../nav-auth.js?v=${_v}`);


if (!tokens.access) {
    location.replace('/app/');
}


const PAGE_SIZE = 10;

let currentStatus = 'all';
let currentSource = 'all';
let currentSearch = '';
let currentPage = 1;


function difficulty(correctPct) {
    if (correctPct == null) return null;
    if (correctPct >= 75) return { label: 'Fácil',   tone: 'moss' };
    if (correctPct >= 40) return { label: 'Media',   tone: 'amber' };
    return                       { label: 'Difícil', tone: 'rust' };
}


function applyFilters(bank) {
    const q = currentSearch.trim().toLowerCase();
    return bank.filter((qst) => {
        if (currentStatus === 'pending'  && qst.approved) return false;
        if (currentStatus === 'approved' && !qst.approved) return false;
        if (currentSource !== 'all' && qst.source !== currentSource) return false;
        if (q && !qst.text.toLowerCase().includes(q) && !qst.node.toLowerCase().includes(q)) return false;
        return true;
    });
}


function renderList() {
    const room = getActiveRoom();
    const data = ROOM_DATA[room.id];
    if (!data) return;

    const $list = document.getElementById('questions-list');
    const $meta = document.getElementById('questions-meta');
    if (!$list) return;

    const filtered = applyFilters(data.questionBank);
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
        const diff = difficulty(q.correctPct);
        const status = q.approved ? 'approved' : 'pending';

        return `
        <li class="qcard" data-status="${status}">
            <header class="qcard__head">
                <span class="qcard__source" data-source="${q.source}">${q.source === 'ai' ? 'IA' : 'Manual'}</span>
                <span class="qcard__node">
                    <svg class="icon-svg" width="11" height="11" viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="12" cy="12" r="9"></circle>
                        <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"></circle>
                    </svg>
                    ${escapeHTML(q.node)}
                </span>
                ${q.pdf ? `<span class="qcard__pdf" title="Origen: ${escapeHTML(q.pdf)}">
                    <svg class="icon-svg" width="11" height="11" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    ${escapeHTML(q.pdf)}
                </span>` : ''}
                <span class="qcard__date num">${escapeHTML(q.date)}</span>
            </header>

            <p class="qcard__text">${escapeHTML(q.text)}</p>

            <footer class="qcard__foot">
                <span class="qcard__status" data-status="${status}">
                    <svg class="icon-svg" width="11" height="11" viewBox="0 0 24 24" aria-hidden="true">
                        ${status === 'approved'
                            ? '<polyline points="20 6 9 17 4 12"></polyline>'
                            : '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="6" x2="12" y2="14"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>'}
                    </svg>
                    ${status === 'approved' ? 'Activa' : 'Por revisar'}
                </span>

                <span class="qcard__stat" title="Veces respondida en sesiones">
                    <svg class="icon-svg" width="11" height="11" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                    </svg>
                    <span class="num">${q.uses}</span> usos
                </span>

                ${q.correctPct != null ? `
                <span class="qcard__stat" title="Porcentaje de acierto promedio">
                    <svg class="icon-svg" width="11" height="11" viewBox="0 0 24 24" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span class="num">${q.correctPct}%</span> acierto
                </span>
                ` : ''}

                ${diff ? `<span class="qcard__diff" data-tone="${diff.tone}">${diff.label}</span>` : ''}

                <div class="qcard__actions">
                    ${status === 'pending' ? `
                        <button type="button" class="qcard__btn qcard__btn--ghost">Revisar</button>
                        <button type="button" class="qcard__btn qcard__btn--primary">
                            <svg class="icon-svg" width="11" height="11" viewBox="0 0 24 24" aria-hidden="true">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            Aprobar
                        </button>
                    ` : `
                        <button type="button" class="qcard__btn qcard__btn--ghost">
                            <svg class="icon-svg" width="11" height="11" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M12 20h9"></path>
                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z"></path>
                            </svg>
                            Editar
                        </button>
                    `}
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
    const room = getActiveRoom();
    const data = ROOM_DATA[room.id];
    if (!data) return;

    document.getElementById('room-name').textContent = data.name;
    document.getElementById('room-questions').textContent = String(data.questions);

    const pendingTotal = data.questionBank.filter((q) => !q.approved).length;
    document.getElementById('room-pending').textContent = `${pendingTotal} pendiente${pendingTotal === 1 ? '' : 's'} de aprobación`;

    currentPage = 1;

    renderList();
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


bindRoomChange(render);