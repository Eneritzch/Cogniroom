const _v = new URL(import.meta.url).searchParams.get('v') || '';
const { tokens } = await import(`../api.js?v=${_v}`);
const { ROOM_DATA, escapeHTML, profileLabel, fmt, bindRoomChange } = await import(`./room-mock.js?v=${_v}`);
const { getActiveRoom } = await import(`../nav-auth.js?v=${_v}`);


if (!tokens.access) {
    location.replace('/app/');
}


function cellColor(v) {
    if (v >= 0.7) return `color-mix(in oklab, var(--sage) ${v * 70}%, var(--paper-surface))`;
    if (v >= 0.5) return `color-mix(in oklab, var(--amber) ${v * 50}%, var(--paper-surface))`;
    return `color-mix(in oklab, var(--rust) ${(1 - v) * 60}%, var(--paper-surface))`;
}


function profileShort(p) {
    return ({ calibrated: 'Cal.', overconfident: 'Sobre.', underconfident: 'Sub.' })[p] || '—';
}


function renderHeatmap(data) {
    const $header = document.getElementById('heatmap-header');
    const $rows = document.getElementById('heatmap-rows');
    if (!$header || !$rows) return;

    $header.innerHTML = data.nodes
        .map((n) => `<div class="heatmap__header-cell eyebrow">${escapeHTML(n)}</div>`)
        .join('');

    $rows.innerHTML = data.roster.map((row) => `
      <div class="heatmap__row">
        <div class="heatmap__row-name">
          <span class="heatmap__row-name-text">${escapeHTML(row.name)}</span>
          <span class="pill" data-profile="${row.profile}">${profileShort(row.profile)}</span>
        </div>
        ${row.cells.map((v, i) => `
          <div class="heatmap__cell" style="background:${cellColor(v)};"
               title="${escapeHTML(row.name)} · ${escapeHTML(data.nodes[i])} · ${v.toFixed(2)}">
            <span class="heatmap__cell-value">${v.toFixed(2)}</span>
          </div>
        `).join('')}
      </div>
    `).join('');
}


function render() {
    const room = getActiveRoom();
    const data = ROOM_DATA[room.id];
    if (!data) return;

    document.getElementById('room-name').textContent = data.name;
    document.getElementById('room-students').textContent = String(data.students);

    document.getElementById('stat-icc').textContent = fmt(data.icc);
    document.getElementById('stat-ipc').textContent = fmt(data.ipc);

    const total = data.roster.length || 1;
    const over = data.roster.filter((r) => r.profile === 'overconfident').length;
    const cal = data.roster.filter((r) => r.profile === 'calibrated').length;
    document.getElementById('stat-over').textContent = `${Math.round((over / total) * 100)}%`;
    document.getElementById('stat-cal').textContent  = `${Math.round((cal  / total) * 100)}%`;
    document.getElementById('stat-over-detail').textContent = `${over} de ${total}`;
    document.getElementById('stat-cal-detail').textContent  = `${cal} de ${total}`;

    renderHeatmap(data);
}


bindRoomChange(render);
