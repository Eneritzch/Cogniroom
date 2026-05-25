const _v = new URL(import.meta.url).searchParams.get('v') || '';
const { auth, rooms, questions, pdfs, tokens, ApiError } = await import(`./api.js?v=${_v}`);
const { toast } = await import(`./toast.js?v=${_v}`);


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

function fmt(n, digits = 2) {
    if (n == null || Number.isNaN(n)) return '—';
    return Number(n).toFixed(digits);
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
    nodeLabels: ['1ª ley', 'Entropía', 'Cinética 2°', 'Eq. químico', 'Gibbs', 'Le Chatelier'],
    rows: [
        { student: 'Andrea Molina',   profile: 'overconfident',  cells: [0.32, 0.41, 0.78, 0.65, 0.50, 0.72] },
        { student: 'Bruno Cárdenas',  profile: 'overconfident',  cells: [0.28, 0.39, 0.66, 0.58, 0.44, 0.61] },
        { student: 'Camila Reyes',    profile: 'underconfident', cells: [0.71, 0.82, 0.78, 0.69, 0.74, 0.81] },
        { student: 'Daniel Tovar',    profile: 'calibrated',     cells: [0.60, 0.62, 0.65, 0.58, 0.61, 0.66] },
        { student: 'Elena Pinto',     profile: 'underconfident', cells: [0.55, 0.60, 0.72, 0.68, 0.70, 0.74] },
        { student: 'Felipe Marín',    profile: 'calibrated',     cells: [0.70, 0.68, 0.75, 0.71, 0.69, 0.76] },
        { student: 'Gabriela Soto',   profile: 'overconfident',  cells: [0.35, 0.40, 0.55, 0.48, 0.41, 0.50] },
    ],
};

function profileLabel(p) {
    return ({ calibrated: 'Cal.', overconfident: 'Sobre.', underconfident: 'Sub.' })[p] || '—';
}

function cellColor(v) {
    if (v >= 0.7) return `color-mix(in oklab, var(--sage) ${v * 70}%, var(--paper-surface))`;
    if (v >= 0.5) return `color-mix(in oklab, var(--amber) ${v * 50}%, var(--paper-surface))`;
    return `color-mix(in oklab, var(--rust) ${(1 - v) * 60}%, var(--paper-surface))`;
}

function renderHeatmap(data) {
    const $header = document.getElementById('heatmap-header');
    const $rows = document.getElementById('heatmap-rows');

    $header.innerHTML = data.nodeLabels
        .map((n) => `<div class="heatmap__header-cell eyebrow">${escapeHTML(n)}</div>`)
        .join('');

    $rows.innerHTML = data.rows.map((row) => `
      <div class="heatmap__row">
        <div class="heatmap__row-name">
          <span class="heatmap__row-name-text">${escapeHTML(row.student)}</span>
          <span class="pill" data-profile="${row.profile}">${profileLabel(row.profile)}</span>
        </div>
        ${row.cells.map((v, i) => `
          <div class="heatmap__cell" style="background:${cellColor(v)};"
               title="${escapeHTML(row.student)} · ${escapeHTML(data.nodeLabels[i])} · ${v.toFixed(2)}">
            <span class="heatmap__cell-value">${v.toFixed(2)}</span>
          </div>
        `).join('')}
      </div>
    `).join('');
}


function renderDemo() {
    document.getElementById('room-name').textContent = 'Termodinámica I · 2026·I';
    document.getElementById('room-students').textContent = '84';
    document.getElementById('room-questions').textContent = '312';
    document.getElementById('room-pdfs').textContent = '5';
    document.getElementById('stat-icc').textContent = '0.58';
    document.getElementById('stat-ipc').textContent = '0.34';
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
        const current = allRooms.find((r) => r.id === ROOM_ID);

        document.getElementById('room-name').textContent = current?.name || `Sala ${ROOM_ID}`;
        document.getElementById('room-students').textContent = String(members.length || 0);
        document.getElementById('room-questions').textContent = String(questionList.length || 0);
        document.getElementById('room-pdfs').textContent = String(pdfList.length || 0);

        document.getElementById('stat-icc').textContent = fmt(current?.icc_avg);
        document.getElementById('stat-ipc').textContent = fmt(current?.ipc_avg);

        const overCount = members.filter((m) => m.profile === 'overconfident').length;
        const calCount = members.filter((m) => m.profile === 'calibrated').length;
        const total = members.length || 1;
        document.getElementById('stat-over').textContent = `${Math.round((overCount / total) * 100)}%`;
        document.getElementById('stat-cal').textContent = `${Math.round((calCount / total) * 100)}%`;
        document.getElementById('stat-over-detail').textContent = `${overCount} de ${members.length}`;
        document.getElementById('stat-cal-detail').textContent = `${calCount} de ${members.length}`;

        renderHeatmap(DEMO_HEATMAP);

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
        renderHeatmap(DEMO_HEATMAP);
    }
}

bootstrap();
