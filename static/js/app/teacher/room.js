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
        location.replace('/');
    });
}

function getRoomId() {
    const m = location.pathname.match(/\/app\/room\/(\d+)/);
    return m ? Number(m[1]) : null;
}

const ROOM_ID = getRoomId();
const IS_DEMO = ROOM_ID === null;


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


const DEMO_HEATMAP = {
    nodes: [
        { id_node: 1, name: '1ª ley',       description: 'Termodinámica clásica' },
        { id_node: 2, name: 'Entropía',     description: 'Termodinámica clásica' },
        { id_node: 3, name: 'Cinética 2°',  description: 'Cinética' },
        { id_node: 4, name: 'Eq. químico',  description: 'Equilibrio' },
        { id_node: 5, name: 'Gibbs',        description: 'Termodinámica clásica' },
        { id_node: 6, name: 'Le Chatelier', description: 'Equilibrio' },
    ],
    rows: [
        { user: { id_user: 11, first_name: 'Andrea',   last_name: 'Molina'   }, profile: 'overconfident',  cells: [0.32, 0.41, 0.78, 0.65, 0.50, 0.72] },
        { user: { id_user: 12, first_name: 'Bruno',    last_name: 'Cárdenas' }, profile: 'overconfident',  cells: [0.28, 0.39, 0.66, 0.58, 0.44, 0.61] },
        { user: { id_user: 13, first_name: 'Camila',   last_name: 'Reyes'    }, profile: 'underconfident', cells: [0.71, 0.82, 0.78, 0.69, 0.74, 0.81] },
        { user: { id_user: 14, first_name: 'Daniel',   last_name: 'Tovar'    }, profile: 'calibrated',     cells: [0.60, 0.62, 0.65, 0.58, 0.61, 0.66] },
        { user: { id_user: 15, first_name: 'Elena',    last_name: 'Pinto'    }, profile: 'underconfident', cells: [0.55, 0.60, 0.72, 0.68, 0.70, 0.74] },
        { user: { id_user: 16, first_name: 'Felipe',   last_name: 'Marín'    }, profile: 'calibrated',     cells: [0.70, 0.68, 0.75, 0.71, 0.69, 0.76] },
        { user: { id_user: 17, first_name: 'Gabriela', last_name: 'Soto'     }, profile: 'overconfident',  cells: [0.35, 0.40, 0.55, 0.48, 0.41, 0.50] },
    ],
};

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


function renderDemo() {
    document.getElementById('room-name').textContent = 'Termodinámica I · 2026·I';
    document.getElementById('room-students').textContent = '84';
    document.getElementById('room-questions').textContent = '312';
    document.getElementById('room-pdfs').textContent = '5';
    document.getElementById('stat-over').textContent = '38%';
    document.getElementById('stat-cal').textContent = '41%';
    document.getElementById('stat-over-detail').textContent = '32 de 84';
    document.getElementById('stat-cal-detail').textContent = '34 de 84';
    renderHeatmap(DEMO_HEATMAP);
}


async function bootstrap() {
    if (IS_DEMO) {
        renderDemo();
        return;
    }

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
