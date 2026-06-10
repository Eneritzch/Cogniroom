const _v = new URL(import.meta.url).searchParams.get('v') || '';
const { auth, rooms, questions, pdfs, tokens, ApiError } = await import(`../api.js?v=${_v}`);
const { toast } = await import(`../toast.js?v=${_v}`);


if (!tokens.access) {
    location.replace('/app/');
}

const $logout = document.getElementById('logout-btn');
if ($logout) {
    $logout.addEventListener('click', () => {
        auth.logout();
        location.replace('/app/');
    });
}

function getRoomId() {
    const m = location.pathname.match(/\/app\/room\/(\d+)/);
    return m ? Number(m[1]) : null;
}

const ROOM_ID = getRoomId();
if (!ROOM_ID) {
    location.replace('/app/rooms/');
}


function escapeHTML(s) {
    return String(s ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}

document.querySelectorAll('.room-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        document.querySelectorAll('.room-tab').forEach((b) => {
            b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
        });
        document.querySelectorAll('.room-panel').forEach((p) => {
            p.hidden = p.dataset.panel !== target;
        });
    });
});


function profileLabel(p) {
    return ({ calibrated: 'Cal.', overconfident: 'Sobre.', underconfident: 'Sub.' })[p] || '—';
}

function fullName(user) {
    return `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim();
}

function cellColor(v) {
    if (v >= 0.7) return `color-mix(in oklab, var(--sage) ${v * 70}%, var(--paper-surface))`;
    if (v >= 0.5) return `color-mix(in oklab, var(--amber) ${v * 50}%, var(--paper-surface))`;
    return `color-mix(in oklab, var(--rust) ${(1 - v) * 60}%, var(--paper-surface))`;
}

function renderHeatmap(data) {
    const $header = document.getElementById('heatmap-header');
    const $rows = document.getElementById('heatmap-rows');

    $header.innerHTML = data.nodes
        .map((n) => `<div class="heatmap__header-cell eyebrow" title="${escapeHTML(n.description)}">${escapeHTML(n.name)}</div>`)
        .join('');

    $rows.innerHTML = data.rows.map((row) => {
        const name = fullName(row.user);
        return `
      <div class="heatmap__row">
        <div class="heatmap__row-name">
          <span class="heatmap__row-name-text">${escapeHTML(name)}</span>
          <span class="pill" data-profile="${row.profile}">${profileLabel(row.profile)}</span>
        </div>
        ${row.cells.map((v, i) => `
          <div class="heatmap__cell" style="background:${cellColor(v)};"
               title="${escapeHTML(name)} · ${escapeHTML(data.nodes[i].name)} · ${v.toFixed(2)}">
            <span class="heatmap__cell-value">${v.toFixed(2)}</span>
          </div>
        `).join('')}
      </div>
    `;
    }).join('');
}


async function bootstrap() {
    try {
        const [members, questionList, pdfList, blindSpots] = await Promise.all([
            rooms.members(ROOM_ID).catch(() => []),
            questions.list(ROOM_ID).catch(() => []),
            pdfs.list(ROOM_ID).catch(() => []),
            rooms.blindSpots(ROOM_ID).catch(() => []),
        ]);

        const allRooms = await rooms.list().catch(() => []);
        const current = allRooms.find((r) => r.id_room === ROOM_ID);

        document.getElementById('room-name').textContent = current?.name || `Sala ${ROOM_ID}`;
        document.getElementById('room-students').textContent = String(members.length || 0);
        document.getElementById('room-questions').textContent = String(questionList.length || 0);
        document.getElementById('room-pdfs').textContent = String(pdfList.length || 0);

        const overCount = members.filter((m) => m.profile === 'overconfident').length;
        const calCount = members.filter((m) => m.profile === 'calibrated').length;
        const total = members.length || 1;
        document.getElementById('stat-over').textContent = `${Math.round((overCount / total) * 100)}%`;
        document.getElementById('stat-cal').textContent = `${Math.round((calCount / total) * 100)}%`;
        document.getElementById('stat-over-detail').textContent = `${overCount} de ${members.length}`;
        document.getElementById('stat-cal-detail').textContent = `${calCount} de ${members.length}`;

        if (blindSpots && blindSpots.length === 0) {
            toast('Sala sin puntos ciegos detectados todavía.', { kind: 'success' });
        }
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
            tokens.clear();
            location.replace('/app/');
            return;
        }
        toast(err?.message || 'Error al cargar la sala', { kind: 'error' });
    }
}

bootstrap();
