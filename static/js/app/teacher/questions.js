const _v = new URL(import.meta.url).searchParams.get('v') || '';
const { tokens } = await import(`../api.js?v=${_v}`);
const { ROOM_DATA, escapeHTML, bindRoomChange } = await import(`./room-mock.js?v=${_v}`);
const { getActiveRoom } = await import(`../nav-auth.js?v=${_v}`);


if (!tokens.access) {
    location.replace('/app/');
}


let currentFilter = 'all';


function matchesFilter(q, filter) {
    if (filter === 'all') return true;
    if (filter === 'approved') return q.approved;
    if (filter === 'pending')  return !q.approved;
    if (filter === 'ai')       return q.source === 'ai';
    if (filter === 'manual')   return q.source === 'manual';
    return true;
}


function render() {
    const room = getActiveRoom();
    const data = ROOM_DATA[room.id];
    if (!data) return;

    document.getElementById('room-name').textContent = data.name;
    document.getElementById('room-questions').textContent = String(data.questions);

    const pendingTotal = data.questionBank.filter((q) => !q.approved).length;
    document.getElementById('room-pending').textContent = `${pendingTotal} pendiente${pendingTotal === 1 ? '' : 's'} de aprobación`;

    const $list = document.getElementById('questions-list');
    if (!$list) return;

    const filtered = data.questionBank.filter((q) => matchesFilter(q, currentFilter));

    if (filtered.length === 0) {
        $list.innerHTML = `<div class="questions-empty">Sin preguntas para este filtro.</div>`;
        return;
    }

    $list.innerHTML = filtered.map((q) => `
        <article class="question-card" data-status="${q.approved ? 'approved' : 'pending'}">
            <header class="question-card__head">
                <span class="question-card__source" data-source="${q.source}">${q.source === 'ai' ? 'IA' : 'Manual'}</span>
                <span class="question-card__node eyebrow">${escapeHTML(q.node)}</span>
                <span class="question-card__date">${escapeHTML(q.date)}</span>
            </header>
            <p class="question-card__text">${escapeHTML(q.text)}</p>
            <footer class="question-card__foot">
                <span class="question-card__status" data-status="${q.approved ? 'approved' : 'pending'}">
                    ${q.approved ? 'Aprobada' : 'Pendiente'}
                </span>
                ${q.approved ? '' : `
                    <button type="button" class="question-card__btn">
                        <svg class="icon-svg" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Aprobar
                    </button>
                `}
            </footer>
        </article>
    `).join('');
}


document.querySelectorAll('.questions-filters__chip').forEach((btn) => {
    btn.addEventListener('click', () => {
        currentFilter = btn.dataset.filter;
        document.querySelectorAll('.questions-filters__chip').forEach((b) => {
            b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        });
        render();
    });
});


bindRoomChange(render);
