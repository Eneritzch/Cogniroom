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

// Cuadrante 2x2 (lo que realmente sabe × lo que cree saber). El crítico es
// "no sabe y está confiado".
const QUAD_TH = 0.6;
const QUAD_META = {
    overconfident:  { label: 'No sabe y confía',       tone: 'rust',  critical: true },
    calibrated:     { label: 'Sabe y confía',          tone: 'moss',  critical: false },
    underconfident: { label: 'Sabe pero no confía',    tone: 'stone', critical: false },
    aware_gap:      { label: 'No sabe y lo reconoce',  tone: 'amber', critical: false },
};
function quadrantLabel(q) { return (QUAD_META[q] || {}).label || 'Sin datos'; }

function fullName(user) {
    return `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() || '—';
}

function formatDate(iso) {
    return iso ? String(iso).slice(0, 10) : '';
}

function pct(v) {
    return `${Math.round((v ?? 0) * 100)}%`;
}


/* ---------- Navegación por tabs ---------- */
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


/* ---------- Encabezado ---------- */
function renderHeader(room, memberCount) {
    document.getElementById('room-name').textContent = room?.name || `Sala ${ROOM_ID}`;
    document.getElementById('room-subject').textContent = room?.subject || '—';
    document.getElementById('room-mode').textContent = room?.mode === 'individual' ? 'Individual' : 'Grupal';
    document.getElementById('room-access-code').textContent = room?.access_code || '—';
    document.getElementById('room-students').textContent = String(memberCount ?? room?.member_count ?? 0);
    document.getElementById('room-questions').textContent = String(room?.question_count ?? 0);
    document.getElementById('room-pdfs').textContent = String(room?.pdf_count ?? 0);
}


/* ---------- Panel de métricas (heatmap + stats) ---------- */
function cellColor(v) {
    if (v >= 0.7) return `color-mix(in oklab, var(--sage) ${v * 70}%, var(--paper-surface))`;
    if (v >= 0.5) return `color-mix(in oklab, var(--amber) ${v * 50}%, var(--paper-surface))`;
    return `color-mix(in oklab, var(--rust) ${(1 - v) * 60}%, var(--paper-surface))`;
}

function renderHeatmap(data) {
    const $header = document.getElementById('heatmap-header');
    const $rows = document.getElementById('heatmap-rows');
    const nodes = data.nodes || [];

    $header.innerHTML = nodes
        .map((n) => `<div class="heatmap__header-cell eyebrow" title="${escapeHTML(n.description)}">${escapeHTML(n.name)}</div>`)
        .join('');

    if (!data.roster || data.roster.length === 0) {
        $rows.innerHTML = `<div class="room-placeholder">Aún no hay estudiantes evaluados en esta sala.</div>`;
        return;
    }

    $rows.innerHTML = data.roster.map((row) => {
        const name = fullName(row);
        const cells = row.cells || [];
        return `
      <div class="heatmap__row">
        <div class="heatmap__row-name">
          <span class="heatmap__row-name-text">${escapeHTML(name)}</span>
          <span class="pill" data-quadrant="${row.quadrant || ''}">${escapeHTML(quadrantLabel(row.quadrant))}</span>
        </div>
        ${cells.map((v, i) => `
          <div class="heatmap__cell" style="background:${cellColor(v)};"
               title="${escapeHTML(name)} · ${escapeHTML(nodes[i]?.name || '')} · ${v.toFixed(2)}">
            <span class="heatmap__cell-value num">${v.toFixed(2)}</span>
          </div>
        `).join('')}
      </div>
    `;
    }).join('');
}

function renderMetricsStats(heatmap, blindSpots) {
    const roster = heatmap.roster || [];
    const total = roster.length || 1;
    // Cuadrante crítico (no sabe y confía) vs. bien calibrado (sabe y confía).
    const critical = roster.filter((r) => r.quadrant === 'overconfident').length;
    const good = roster.filter((r) => r.quadrant === 'calibrated').length;

    const blind = (blindSpots || []).filter((b) => b.alert).length;
    document.getElementById('stat-blind-nodes').textContent = String(blind);
    document.getElementById('stat-blind-detail').textContent =
        `${blind} de ${(blindSpots || []).length} temas`;

    document.getElementById('stat-evaluated').textContent = String(roster.length);
    document.getElementById('stat-evaluated-detail').textContent =
        `${roster.length} de ${heatmap.students ?? roster.length} inscritos`;

    document.getElementById('stat-over').textContent = `${Math.round((critical / total) * 100)}%`;
    document.getElementById('stat-over-detail').textContent = `${critical} de ${roster.length}`;
    document.getElementById('stat-cal').textContent = `${Math.round((good / total) * 100)}%`;
    document.getElementById('stat-cal-detail').textContent = `${good} de ${roster.length}`;
}


// Mapa de calibración: ubica a cada estudiante por lo que realmente sabe (X) y
// lo que cree saber (Y); resalta la zona crítica y lista a los que están en alerta.
function renderAlertQuadrant(members) {
    const $plot = document.getElementById('quadrant-plot');
    const $list = document.getElementById('alert-list');
    if (!$plot || !$list) return;

    const roster = (members.roster || []).filter((r) => r.quadrant);
    const th = QUAD_TH * 100;

    if (roster.length === 0) {
        $plot.innerHTML = '';
        $list.innerHTML = `<li class="alertq__empty">Aún no hay estudiantes evaluados en esta sala.</li>`;
        return;
    }

    const clamp01 = (v) => Math.max(0, Math.min(1, v ?? 0));
    const dots = roster.map((r) => {
        const meta = QUAD_META[r.quadrant] || {};
        return {
            name: fullName(r.user),
            tone: meta.tone || 'stone',
            critical: !!meta.critical,
            cx: +(clamp01(r.bkt_mastery) * 100).toFixed(2),
            cy: +((1 - clamp01(r.avg_confidence)) * 100).toFixed(2),
        };
    }).map((d) => `
        <circle class="qdot${d.critical ? ' qdot--critical' : ''}" data-tone="${d.tone}"
                cx="${d.cx}" cy="${d.cy}" r="${d.critical ? 3.4 : 2.6}">
          <title>${escapeHTML(d.name)}</title>
        </circle>`).join('');

    $plot.innerHTML = `
      <svg class="qplot" viewBox="-4 -4 108 108" role="img"
           aria-label="Mapa de calibración: cada punto es un estudiante ubicado por lo que realmente sabe y lo que cree saber.">
        <rect class="qzone qzone--critical" x="0" y="0" width="${th}" height="${th}"></rect>
        <rect class="qzone qzone--good"     x="${th}" y="0" width="${100 - th}" height="${th}"></rect>
        <rect class="qzone qzone--aware"    x="0" y="${th}" width="${th}" height="${100 - th}"></rect>
        <rect class="qzone qzone--under"    x="${th}" y="${th}" width="${100 - th}" height="${100 - th}"></rect>
        <line class="qgrid" x1="${th}" y1="0" x2="${th}" y2="100"></line>
        <line class="qgrid" x1="0" y1="${th}" x2="100" y2="${th}"></line>
        ${dots}
      </svg>`;

    // Lista de alerta: crítico primero, luego "sabe pero no confía".
    const alert = roster
        .filter((r) => r.quadrant === 'overconfident' || r.quadrant === 'underconfident')
        .sort((a, b) => Number(QUAD_META[b.quadrant].critical) - Number(QUAD_META[a.quadrant].critical));

    if (alert.length === 0) {
        $list.innerHTML = `<li class="alertq__empty">Ningún estudiante en alerta por ahora.</li>`;
        return;
    }

    $list.innerHTML = alert.map((r) => {
        const gap = Math.round((r.metacognitive_gap ?? 0) * 100);
        const meta = QUAD_META[r.quadrant];
        return `
        <li class="alertq__item${meta.critical ? ' alertq__item--critical' : ''}">
          <span class="alertq__dot" data-tone="${meta.tone}" aria-hidden="true"></span>
          <span class="alertq__name">${escapeHTML(fullName(r.user))}</span>
          <span class="pill" data-quadrant="${r.quadrant}">${escapeHTML(quadrantLabel(r.quadrant))}</span>
          <span class="alertq__gap num" data-tone="${gap >= 0 ? 'amber' : 'stone'}">${gap > 0 ? '+' : ''}${gap}</span>
        </li>`;
    }).join('');
}


/* ---------- Tab Estudiantes ---------- */
function renderStudents(members) {
    const $panel = document.querySelector('[data-panel="students"]');
    const roster = members.roster || [];
    if (roster.length === 0) {
        $panel.innerHTML = `<div class="room-placeholder">Esta sala todavía no tiene estudiantes inscritos.</div>`;
        return;
    }

    const items = roster.map((r) => {
        const gap = r.metacognitive_gap ?? 0;
        const sign = gap > 0 ? '+' : '';
        const section = r.membership?.section;
        return `
        <li class="room-list__item">
            <div class="room-list__main">
                <span class="room-list__title">${escapeHTML(fullName(r.user))}</span>
                <span class="room-list__sub">${escapeHTML(r.user?.email || '')}</span>
            </div>
            <div class="room-list__aside">
                ${section ? `<span class="room-list__tag">${escapeHTML(section.code)}</span>` : ''}
                <span class="pill" data-quadrant="${r.quadrant || ''}">${escapeHTML(quadrantLabel(r.quadrant))}</span>
                <span class="room-list__metric num" title="Diferencia entre lo que cree saber y lo que realmente sabe">${sign}${Math.round(gap * 100)}</span>
            </div>
        </li>`;
    }).join('');

    $panel.innerHTML = `
        <div class="room-list__head">
            <span>${roster.length} estudiante${roster.length === 1 ? '' : 's'}</span>
            <a class="room-list__link" href="/app/students/">Gestionar estudiantes →</a>
        </div>
        <ul class="room-list">${items}</ul>`;
}


/* ---------- Tab Preguntas ---------- */
function statusLabel(s) {
    return ({ approved: 'Activa', rejected: 'Rechazada', pending: 'Por revisar' })[s] || s;
}

function renderQuestions(bank) {
    const $panel = document.querySelector('[data-panel="questions"]');
    if (!bank || bank.length === 0) {
        $panel.innerHTML = `
            <div class="room-placeholder">
                Sin preguntas todavía.
                <a class="room-list__link" href="/app/questions/">Generar o cargar preguntas →</a>
            </div>`;
        return;
    }

    const pending = bank.filter((q) => q.status === 'pending').length;
    const items = bank.slice(0, 20).map((q) => {
        const name = q.node_name || (q.node && q.node.name) || '';
        return `
        <li class="room-list__item">
            <div class="room-list__main">
                <span class="room-list__title">${escapeHTML(q.statement || '')}</span>
                <span class="room-list__sub">${escapeHTML(name)} · ${q.source === 'ai' ? 'IA' : 'Manual'}</span>
            </div>
            <div class="room-list__aside">
                <span class="pill" data-status="${q.status}">${statusLabel(q.status)}</span>
            </div>
        </li>`;
    }).join('');

    $panel.innerHTML = `
        <div class="room-list__head">
            <span>${bank.length} pregunta${bank.length === 1 ? '' : 's'}${pending ? ` · ${pending} por revisar` : ''}</span>
            <a class="room-list__link" href="/app/questions/">Gestionar banco →</a>
        </div>
        <ul class="room-list">${items}</ul>`;
}


/* ---------- Tab PDFs ---------- */
function renderPdfs(list) {
    const $panel = document.querySelector('[data-panel="pdfs"]');
    if (!list || list.length === 0) {
        $panel.innerHTML = `
            <div class="room-placeholder">
                Sin PDFs cargados.
                <a class="room-list__link" href="/app/pdfs/">Subir material →</a>
            </div>`;
        return;
    }

    const items = list.map((p) => {
        const name = p.original_name || p.name || `PDF ${p.id}`;
        const processed = p.processed ?? (p.status === 'processed');
        const st = processed ? 'processed' : (p.status === 'failed' ? 'failed' : 'pending');
        const stLabel = processed ? 'Procesado' : (p.status === 'failed' ? 'Falló' : 'Pendiente');
        return `
        <li class="room-list__item">
            <div class="room-list__main">
                <span class="room-list__title">${escapeHTML(name)}</span>
                <span class="room-list__sub num">${escapeHTML(formatDate(p.created_at))}</span>
            </div>
            <div class="room-list__aside">
                <span class="pill" data-status="${st}">${stLabel}</span>
            </div>
        </li>`;
    }).join('');

    $panel.innerHTML = `
        <div class="room-list__head">
            <span>${list.length} PDF${list.length === 1 ? '' : 's'}</span>
            <a class="room-list__link" href="/app/pdfs/">Gestionar PDFs →</a>
        </div>
        <ul class="room-list">${items}</ul>`;
}


async function bootstrap() {
    try {
        // Pantalla exclusiva del docente: si llega un estudiante (p. ej. por URL), se redirige.
        const currentUser = await auth.me();
        if (currentUser.role !== 'teacher') {
            location.replace('/app/dashboard/');
            return;
        }

        const [members, heatmap, bank, pdfList, blindSpots, allRooms] = await Promise.all([
            rooms.members(ROOM_ID).catch(() => ({ roster: [] })),
            rooms.heatmap(ROOM_ID).catch(() => ({ nodes: [], roster: [] })),
            questions.list(ROOM_ID).catch(() => []),
            pdfs.list(ROOM_ID).catch(() => []),
            rooms.blindSpots(ROOM_ID).catch(() => []),
            rooms.list().catch(() => []),
        ]);

        const current = (allRooms || []).find((r) => r.id === ROOM_ID);

        renderHeader(current, members.students);
        renderHeatmap(heatmap);
        renderMetricsStats(heatmap, blindSpots);
        renderAlertQuadrant(members);
        renderStudents(members);
        renderQuestions(bank);
        renderPdfs(pdfList);
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
