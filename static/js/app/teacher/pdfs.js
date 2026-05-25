const _v = new URL(import.meta.url).searchParams.get('v') || '';
const { tokens } = await import(`../api.js?v=${_v}`);
const { ROOM_DATA, escapeHTML, bindRoomChange } = await import(`./room-mock.js?v=${_v}`);
const { getActiveRoom } = await import(`../nav-auth.js?v=${_v}`);


if (!tokens.access) {
    location.replace('/app/');
}


function render() {
    const room = getActiveRoom();
    const data = ROOM_DATA[room.id];
    if (!data) return;

    document.getElementById('room-name').textContent = data.name;
    document.getElementById('room-pdfs').textContent = String(data.pdfs);

    const totalNodes = data.pdfFiles.reduce((s, p) => s + p.nodes, 0);
    document.getElementById('room-nodes').textContent = `${totalNodes} nodos extraídos`;

    const $list = document.getElementById('pdfs-list');
    if (!$list) return;

    $list.innerHTML = data.pdfFiles.map((p) => `
        <li class="pdf-item">
            <span class="pdf-item__icon" aria-hidden="true">
                <svg class="icon-svg" width="20" height="20" viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
            </span>
            <div class="pdf-item__main">
                <div class="pdf-item__name">${escapeHTML(p.name)}</div>
                <div class="pdf-item__meta">
                    <span>${escapeHTML(p.size)}</span>
                    <span class="pdf-item__meta-sep">·</span>
                    <span>${escapeHTML(p.date)}</span>
                    <span class="pdf-item__meta-sep">·</span>
                    <span>${p.nodes} nodo${p.nodes === 1 ? '' : 's'}</span>
                </div>
            </div>
            <span class="pdf-item__status" data-status="${p.status}">
                ${p.status === 'processed' ? 'Procesado' : 'Procesando…'}
            </span>
            <button type="button" class="pdf-item__del" aria-label="Eliminar PDF">
                <svg class="icon-svg" width="16" height="16" viewBox="0 0 24 24">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                </svg>
            </button>
        </li>
    `).join('');
}


bindRoomChange(render);
