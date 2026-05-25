const _v = new URL(import.meta.url).searchParams.get('v') || '';
const { tokens } = await import(`../api.js?v=${_v}`);
const { ROOM_DATA, escapeHTML, profileLabel, bindRoomChange } = await import(`./room-mock.js?v=${_v}`);
const { getActiveRoom } = await import(`../nav-auth.js?v=${_v}`);


if (!tokens.access) {
    location.replace('/app/');
}


let currentFilter = 'all';


function initials(name) {
    return name.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}


function gapTone(gap) {
    if (gap > 0.2) return 'amber';
    if (gap < -0.2) return 'stone';
    return 'moss';
}


function fmtGap(g) {
    const sign = g >= 0 ? '+' : '';
    return `${sign}${g.toFixed(2)}`;
}


function render() {
    const room = getActiveRoom();
    const data = ROOM_DATA[room.id];
    if (!data) return;

    document.getElementById('room-name').textContent = data.name;
    document.getElementById('room-students').textContent = String(data.students);

    const $rows = document.getElementById('students-rows');
    if (!$rows) return;

    const filtered = currentFilter === 'all'
        ? data.roster
        : data.roster.filter((r) => r.profile === currentFilter);

    if (filtered.length === 0) {
        $rows.innerHTML = `<div class="students-table__empty">Sin estudiantes para este filtro.</div>`;
        return;
    }

    $rows.innerHTML = filtered.map((s) => `
        <div class="students-table__row" role="row">
            <div class="students-table__cell students-table__name" role="cell">
                <span class="students-table__avatar" aria-hidden="true">${initials(s.name)}</span>
                <span>${escapeHTML(s.name)}</span>
            </div>
            <div class="students-table__cell" role="cell">
                <span class="pill" data-profile="${s.profile}">${profileLabel(s.profile)}</span>
            </div>
            <div class="students-table__cell num" role="cell">${s.icc.toFixed(2)}</div>
            <div class="students-table__cell num" role="cell">${s.bkt.toFixed(2)}</div>
            <div class="students-table__cell num" role="cell">
                <span data-tone="${gapTone(s.gap)}">${fmtGap(s.gap)}</span>
            </div>
            <div class="students-table__cell students-table__last" role="cell">${escapeHTML(s.last)}</div>
        </div>
    `).join('');
}


document.querySelectorAll('.students-toolbar__chip').forEach((btn) => {
    btn.addEventListener('click', () => {
        currentFilter = btn.dataset.filter;
        document.querySelectorAll('.students-toolbar__chip').forEach((b) => {
            b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        });
        render();
    });
});


bindRoomChange(render);
