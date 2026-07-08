const _v = new URL(import.meta.url).searchParams.get('v') || '';
const { rooms: roomsApi, tokens, ApiError } = await import(`../api.js?v=${_v}`);
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

// Cuadrante 2x2 (dominio real × confianza), en lenguaje claro.
const QUAD_INFO = {
    overconfident: {
        label: 'No sabe y confía', hint: 'Cree saber, pero no sabe', critical: true,
        meaning: 'Cree dominar temas que en realidad no domina. Es el caso más riesgoso: no busca ayuda porque no percibe el vacío.',
        action: 'Confróntalo con preguntas de aplicación y feedback inmediato; evita avanzar hasta consolidar la base.',
    },
    underconfident: {
        label: 'Sabe pero no confía', hint: 'Sabe más de lo que cree',
        meaning: 'Sabe más de lo que cree saber. Puede rendir por debajo de su nivel por inseguridad.',
        action: 'Refuerzo positivo y evidencia de sus aciertos para recalibrar su autoconfianza.',
    },
    aware_gap: {
        label: 'No sabe y lo reconoce', hint: 'Admite que no sabe',
        meaning: 'No domina el tema y lo reconoce. Está bien calibrado; solo necesita estudiar.',
        action: 'Material y práctica dirigida; su autoconocimiento juega a favor.',
    },
    calibrated: {
        label: 'Sabe y confía', hint: 'Bien calibrado',
        meaning: 'Su confianza coincide con lo que realmente sabe.',
        action: 'Mantén el ritmo; buen candidato para retos mayores.',
    },
};
function quadrantLabel(q) { return (QUAD_INFO[q] || {}).label || 'Sin datos'; }

// Categoría cognitiva (nivel de Bloom de la pregunta), en lenguaje claro.
const CATEGORY_LABEL = {
    recordar:   'Memoria (hechos y fechas)',
    comprender: 'Comprensión',
    aplicar:    'Aplicación',
    analizar:   'Análisis',
    evaluar:    'Evaluación / criterio',
    crear:      'Creación',
};
function categoryLabel(l) { return CATEGORY_LABEL[l] || l; }

function categoriesHTML(categories) {
    const cats = categories || [];
    if (cats.length === 0) {
        return '<p class="sdq__msg">Aún no hay preguntas categorizadas respondidas. Las preguntas generadas con IA traen su categoría automáticamente.</p>';
    }
    return `<ul class="sdcat">${cats.map((c) => {
        const acc = Math.round((c.accuracy ?? 0) * 100);
        const tone = c.weak ? 'rust' : acc >= 80 ? 'moss' : 'amber';
        return `
        <li class="sdcat__row${c.weak ? ' sdcat__row--weak' : ''}">
            <span class="sdcat__name">${escapeHTML(categoryLabel(c.level))}</span>
            <span class="sdcat__track"><span class="sdcat__fill" data-tone="${tone}" style="width:${acc}%"></span></span>
            <span class="sdcat__val num">${acc}%</span>
            <span class="sdcat__count num">${c.correct}/${c.total}</span>
        </li>`;
    }).join('')}</ul>`;
}

function activeRoomId() {
    return Number(localStorage.getItem('cogniroom.activeRoomId')) || null;
}

function initials(name) {
    return String(name || '').split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}

function fullName(s) {
    if (s.first_name || s.last_name) {
        return `${s.first_name || ''} ${s.last_name || ''}`.trim();
    }
    return s.name || '';
}

function iccTone(v) {
    if (v >= 0.65) return 'moss';
    if (v >= 0.5)  return 'amber';
    return 'rust';
}

function kpiCards(items) {
    return items.map((k) => `
        <article class="mkpi" ${k.tone ? `data-tone="${k.tone}"` : ''}>
            <span class="mkpi__v num">${k.v}</span>
            <span class="mkpi__k">${escapeHTML(k.k)}</span>
        </article>
    `).join('');
}


/* ============================ Estado ============================ */

const PAGE_SIZE = 12;

let ROOMS = [];
let CURRENT = 'all';   // 'all' | roomId
let focusRoomId = null;

let OVERVIEW = null;
let DATA = null;       // payload del heatmap de la sala en foco

let currentProfile = 'all';
let currentCurso = 'all';
let currentSearch = '';
let currentPage = 1;


/* ======================= Selector de sala ======================= */

let syncingSelect = false;

function renderRoomSelector() {
    const $select = document.getElementById('metrics-room-select');
    if ($select) {
        $select.innerHTML = '<option value="">Ver una sala…</option>'
            + ROOMS.map((r) => `<option value="${r.id}">${escapeHTML(r.name)}</option>`).join('');
        if (!$select.dataset.bound) {
            $select.dataset.bound = '1';
            $select.addEventListener('change', () => {
                if (syncingSelect) return;   // cambio programático → no re-entrar
                if ($select.value) selectView(Number($select.value));
            });
        }
    }
    const $all = document.getElementById('metrics-all-btn');
    if ($all && !$all.dataset.bound) {
        $all.dataset.bound = '1';
        $all.addEventListener('click', () => selectView('all'));
    }
    syncRoomChips();
}

function syncRoomChips() {
    const $all = document.getElementById('metrics-all-btn');
    if ($all) $all.setAttribute('aria-pressed', CURRENT === 'all' ? 'true' : 'false');
    const $select = document.getElementById('metrics-room-select');
    if ($select) {
        // Actualiza el valor y la etiqueta del select custom sin disparar navegación.
        syncingSelect = true;
        $select.value = CURRENT === 'all' ? '' : String(CURRENT);
        $select.dispatchEvent(new Event('change'));
        syncingSelect = false;
    }
}


/* ===================== Cambio de vista ===================== */

function selectView(target) {
    CURRENT = target;
    syncRoomChips();

    const $all = document.getElementById('view-all');
    const $room = document.getElementById('view-room');
    const $heading = document.getElementById('metrics-heading');
    const $sub = document.getElementById('metrics-subtitle');

    if (target === 'all') {
        if ($all) $all.hidden = false;
        if ($room) $room.hidden = true;
        if ($heading) $heading.textContent = 'Todas mis salas';
        if ($sub) $sub.textContent = 'Compara el estado cognitivo de tus salas de un vistazo';
        loadAll();
        return;
    }

    focusRoomId = Number(target);
    localStorage.setItem('cogniroom.activeRoomId', String(focusRoomId));
    if ($all) $all.hidden = true;
    if ($room) $room.hidden = false;
    loadRoom(focusRoomId);
}


/* ===================== Vista: todas mis salas ===================== */

async function loadAll() {
    const $kpis = document.getElementById('mall-kpis');
    const $empty = document.getElementById('mall-empty');
    const $legend = document.getElementById('mall-legend');
    const $charts = document.getElementById('mall-charts');
    if ($kpis) $kpis.innerHTML = '';
    if ($empty) $empty.hidden = true;

    let payload;
    try {
        payload = await roomsApi.metricsSummary();
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) { tokens.clear(); location.replace('/app/'); return; }
        toast('No se pudo cargar el resumen de salas.', { kind: 'error' });
        return;
    }

    const rooms = payload.rooms || [];
    const totals = payload.totals || {};

    if (rooms.length === 0) {
        if ($legend) $legend.hidden = true;
        if ($charts) $charts.hidden = true;
        if ($empty) {
            $empty.hidden = false;
            $empty.innerHTML = '<p class="mall-empty__text">Aún no tienes salas con estudiantes. Crea una sala y agrega estudiantes para ver sus métricas.</p>';
        }
        return;
    }
    if ($legend) $legend.hidden = false;
    if ($charts) $charts.hidden = false;

    const icc = Math.round((totals.avg_icc ?? 0) * 100);
    if ($kpis) $kpis.innerHTML = kpiCards([
        { v: totals.rooms ?? rooms.length, k: 'Salas' },
        { v: totals.students ?? 0, k: 'Estudiantes' },
        { v: `${icc}%`, k: 'Calibración prom.', tone: iccTone(totals.avg_icc ?? 0) },
        { v: totals.at_risk ?? 0, k: 'En riesgo', tone: (totals.at_risk ? 'amber' : '') },
        { v: totals.critical ?? 0, k: 'Críticos', tone: (totals.critical ? 'rust' : '') },
    ]);

    renderDonut(rooms);
    renderColumns(rooms);
}

/* Dona: distribución global por cuadrante (suma de todas las salas). */
function renderDonut(rooms) {
    const $el = document.getElementById('mall-donut');
    if (!$el) return;
    const order = ['calibrated', 'underconfident', 'aware_gap', 'overconfident'];
    const sums = { calibrated: 0, underconfident: 0, aware_gap: 0, overconfident: 0 };
    rooms.forEach((r) => { const q = r.quadrants || {}; order.forEach((k) => { sums[k] += (q[k] || 0); }); });
    const total = order.reduce((a, k) => a + sums[k], 0);

    const cx = 50, cy = 50, rad = 38, sw = 15;
    const C = 2 * Math.PI * rad;
    let acc = 0;
    const arcs = total === 0 ? '' : order.filter((k) => sums[k] > 0).map((k) => {
        const len = (sums[k] / total) * C;
        const seg = `<circle class="donut__seg" data-quadrant="${k}" cx="${cx}" cy="${cy}" r="${rad}" stroke-width="${sw}"
            stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-acc).toFixed(2)}"><title>${quadrantLabel(k)}: ${sums[k]}</title></circle>`;
        acc += len;
        return seg;
    }).join('');

    $el.innerHTML = `
      <div class="donut__ring">
        <svg viewBox="0 0 100 100" class="donut__svg" role="img" aria-label="Distribución global por cuadrante cognitivo">
          <circle class="donut__track" cx="${cx}" cy="${cy}" r="${rad}" stroke-width="${sw}"></circle>
          <g transform="rotate(-90 ${cx} ${cy})">${arcs}</g>
        </svg>
        <div class="donut__center">
          <span class="donut__center-v num">${total}</span>
          <span class="donut__center-k">evaluados</span>
        </div>
      </div>
      <ul class="donut__legend">
        ${order.map((k) => {
            const pct = total ? Math.round((sums[k] / total) * 100) : 0;
            return `
          <li class="donut__legrow">
            <span class="donut__legdot" data-quadrant="${k}"></span>
            <span class="donut__leglabel">${escapeHTML(quadrantLabel(k))}</span>
            <span class="donut__legval num">${sums[k]}</span>
            <span class="donut__legpct num">${pct}%</span>
          </li>`;
        }).join('')}
      </ul>`;
}

/* Columnas: calibración por sala (mini bar-chart con rejilla + meta, clic entra). */
function renderColumns(rooms) {
    const $el = document.getElementById('mall-cols');
    if (!$el) return;

    const cols = rooms.map((r) => {
        const has = (r.evaluated || 0) > 0;
        const icc = Math.round((r.avg_icc ?? 0) * 100);
        const tone = iccTone(r.avg_icc ?? 0);
        const h = has ? Math.max(icc, 2) : 0;
        const riskDot = r.at_risk_count
            ? `<span class="col__risk${r.critical_count ? ' is-critical' : ''}" title="${r.at_risk_count} en riesgo${r.critical_count ? `, ${r.critical_count} crítico(s)` : ''}"></span>`
            : '';
        return `
        <button type="button" class="col${has ? '' : ' col--empty'}" data-room-focus="${r.id}"
                title="${escapeHTML(r.name)} · ${has ? icc + '% de calibración' : 'sin evaluaciones'}"
                aria-label="${escapeHTML(r.name)}: ${has ? icc + '% de calibración' : 'sin evaluaciones'}, ver detalle">
            <span class="col__val num">${has ? icc + '%' : '—'}${riskDot}</span>
            <span class="col__track"><span class="col__bar" data-tone="${tone}" style="height:${h}%"></span></span>
            <span class="col__name">${escapeHTML(r.name)}</span>
        </button>`;
    }).join('');

    const grid = [0, 50, 100].map((p) =>
        `<span class="colchart__line" style="bottom:${p}%"><span class="colchart__line-label num">${p}</span></span>`
    ).join('');
    const target = '<span class="colchart__target" style="bottom:60%"><span class="colchart__target-label">meta 60%</span></span>';

    $el.innerHTML = `
      <div class="colchart">
        <div class="colchart__grid">${grid}${target}</div>
        <div class="cols">${cols}</div>
      </div>`;

    $el.querySelectorAll('[data-room-focus]').forEach((c) => {
        c.addEventListener('click', () => selectView(Number(c.dataset.roomFocus)));
    });
}


/* ===================== Vista: sala en foco ===================== */

async function loadRoom(id) {
    const $body = document.getElementById('mroom-body');
    const $empty = document.getElementById('mroom-empty');
    const $kpis = document.getElementById('mroom-kpis');
    if ($kpis) $kpis.innerHTML = '';
    if ($body) $body.hidden = true;
    if ($empty) $empty.hidden = true;

    const room = ROOMS.find((r) => r.id === id);
    const $heading = document.getElementById('metrics-heading');
    const $sub = document.getElementById('metrics-subtitle');
    if ($heading) $heading.textContent = room ? room.name : 'Sala';


    let overview, heat;
    try {
        [overview, heat] = await Promise.all([
            roomsApi.metricsOverview(id),
            roomsApi.heatmap(id),
        ]);
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) { tokens.clear(); location.replace('/app/'); return; }
        toast('No se pudieron cargar las métricas de la sala.', { kind: 'error' });
        return;
    }
    OVERVIEW = overview;
    DATA = heat;
    renderRoomFocus();
}

function renderRoomFocus() {
    if (!OVERVIEW) return;
    const $body = document.getElementById('mroom-body');
    const $empty = document.getElementById('mroom-empty');
    const $kpis = document.getElementById('mroom-kpis');

    const q = OVERVIEW.quadrants || {};
    const atrisk = (q.overconfident || 0) + (q.underconfident || 0);
    const icc = Math.round((OVERVIEW.avg_icc ?? 0) * 100);
    if ($kpis) $kpis.innerHTML = kpiCards([
        { v: `${OVERVIEW.evaluated}/${OVERVIEW.students}`, k: 'Evaluados' },
        { v: `${icc}%`, k: 'Calibración', tone: iccTone(OVERVIEW.avg_icc ?? 0) },
        { v: atrisk, k: 'En riesgo', tone: (atrisk ? 'amber' : '') },
        { v: q.overconfident || 0, k: 'Críticos', tone: (q.overconfident ? 'rust' : '') },
    ]);

    if (!OVERVIEW.evaluated) {
        if ($body) $body.hidden = true;
        if ($empty) {
            $empty.hidden = false;
            $empty.innerHTML = '<p class="mroom-empty__text">Aún no hay evaluaciones en esta sala. Cuando tus estudiantes respondan, aquí verás su mapa cognitivo, sus puntos ciegos y a quién atender primero.</p>';
        }
        return;
    }
    if ($empty) $empty.hidden = true;
    if ($body) $body.hidden = false;

    renderQuadMap(OVERVIEW.scatter);
    renderGroupSkills(OVERVIEW.categories);
    renderAttend(OVERVIEW.attend_first);
    renderBlindSpots(OVERVIEW.blind_spots);

    // Heatmap (detalle) + su filtro por curso.
    currentProfile = 'all';
    currentCurso = 'all';
    currentSearch = '';
    currentPage = 1;
    document.querySelectorAll('[data-profile-filter]').forEach((b) => {
        b.setAttribute('aria-pressed', b.dataset.profileFilter === 'all' ? 'true' : 'false');
    });
    const $search = document.getElementById('metrics-search');
    if ($search) $search.value = '';
    renderCursoChips(DATA.sections);
    renderHeatmap();
}


/* ---- Mapa de cuadrantes (dispersión dominio × confianza) ---- */
function renderQuadMap(scatter) {
    const $el = document.getElementById('quad-map');
    if (!$el) return;
    const pts = scatter || [];

    const P = 9, S = 100 - 2 * P;
    const X = (c) => P + c * S;
    const Y = (m) => (100 - P) - m * S;   // eje vertical invertido (SVG)
    const TH = 0.6;
    const tx = X(TH).toFixed(2);
    const ty = Y(TH).toFixed(2);
    const right = (100 - P).toFixed(2);
    const bottom = (100 - P).toFixed(2);

    const zones = `
      <rect class="qm-zone" data-quadrant="calibrated"     x="${tx}" y="${P}"  width="${(100 - P - tx).toFixed(2)}" height="${(ty - P).toFixed(2)}"></rect>
      <rect class="qm-zone" data-quadrant="underconfident" x="${P}"  y="${P}"  width="${(tx - P).toFixed(2)}"        height="${(ty - P).toFixed(2)}"></rect>
      <rect class="qm-zone" data-quadrant="overconfident"  x="${tx}" y="${ty}" width="${(100 - P - tx).toFixed(2)}" height="${(bottom - ty).toFixed(2)}"></rect>
      <rect class="qm-zone" data-quadrant="aware_gap"      x="${P}"  y="${ty}" width="${(tx - P).toFixed(2)}"        height="${(bottom - ty).toFixed(2)}"></rect>`;

    const grid = `
      <line class="qm-th" x1="${tx}" y1="${P}" x2="${tx}" y2="${bottom}"></line>
      <line class="qm-th" x1="${P}" y1="${ty}" x2="${right}" y2="${ty}"></line>
      <line class="qm-frame" x1="${P}" y1="${bottom}" x2="${right}" y2="${bottom}"></line>
      <line class="qm-frame" x1="${P}" y1="${P}" x2="${P}" y2="${bottom}"></line>`;

    // Jitter determinístico para que puntos idénticos no se solapen del todo.
    const dots = pts.map((s, i) => {
        const jx = ((i % 3) - 1) * 0.6;
        const jy = ((Math.floor(i / 3) % 3) - 1) * 0.6;
        const name = fullName(s);
        return `<circle class="qm-dot" data-quadrant="${s.quadrant}" data-student-id="${s.id}"
                    cx="${(X(s.confidence) + jx).toFixed(2)}" cy="${(Y(s.mastery) + jy).toFixed(2)}" r="2.3">
                    <title>${escapeHTML(name)} · realmente sabe ${Math.round(s.mastery * 100)}% · cree saber ${Math.round(s.confidence * 100)}%</title>
                </circle>`;
    }).join('');

    $el.innerHTML = `
      <div class="quadmap__grid">
        <span class="quadmap__yaxis">Realmente sabe →</span>
        <div class="quadmap__plot">
          <svg viewBox="0 0 100 100" class="quadmap__svg" role="img" aria-label="Mapa de cuadrantes: cada punto es un estudiante">
            ${zones}${grid}${dots}
          </svg>
          <span class="quadmap__corner" data-corner="tl">Sabe / no confía</span>
          <span class="quadmap__corner" data-corner="tr">Sabe y confía</span>
          <span class="quadmap__corner" data-corner="bl">No sabe / lo admite</span>
          <span class="quadmap__corner" data-corner="br">No sabe y confía</span>
        </div>
        <span class="quadmap__xaxis">Cree saber →</span>
      </div>`;

    $el.querySelectorAll('.qm-dot').forEach((dot) => {
        dot.addEventListener('click', () => openStudentDetail(Number(dot.dataset.studentId)));
    });
}


/* ---- Habilidades del grupo (categorías cognitivas) ---- */
function renderGroupSkills(categories) {
    const $el = document.getElementById('group-skills');
    if (!$el) return;
    const cats = categories || [];
    if (cats.length === 0) {
        $el.innerHTML = '<p class="gskills__empty">Aún no hay preguntas categorizadas respondidas en esta sala. Las preguntas generadas con IA traen su categoría cognitiva automáticamente.</p>';
        return;
    }
    $el.innerHTML = `<ul class="gskills__list">${cats.map((c) => {
        const acc = Math.round((c.accuracy ?? 0) * 100);
        const tone = c.weak ? 'rust' : acc >= 80 ? 'moss' : 'amber';
        return `
        <li class="gskill${c.weak ? ' gskill--weak' : ''}">
            <div class="gskill__top">
                <span class="gskill__name">${escapeHTML(categoryLabel(c.level))}</span>
                <span class="gskill__val num">${acc}%</span>
            </div>
            <span class="gskill__track"><span class="gskill__fill" data-tone="${tone}" style="width:${acc}%"></span></span>
            <span class="gskill__count num">${c.correct} de ${c.total} correctas</span>
        </li>`;
    }).join('')}</ul>`;
}


/* ---- Atender primero ---- */
function renderAttend(list) {
    const $el = document.getElementById('attend-list');
    if (!$el) return;
    const items = list || [];
    if (items.length === 0) {
        $el.innerHTML = '<li class="attend__empty">Nadie descalibrado por ahora — el grupo mantiene su confianza alineada con lo que sabe.</li>';
        return;
    }
    $el.innerHTML = items.map((a) => {
        const name = fullName(a);
        const gap = Math.round((a.metacognitive_gap ?? 0) * 100);
        const cat = a.weak_category ? `<span class="attend__cat">Flojo en ${escapeHTML(categoryLabel(a.weak_category))}</span>` : '';
        const diag = a.diagnosis ? `<p class="attend__diag">${escapeHTML(a.diagnosis)}</p>` : '';
        return `
        <li class="attend__row${a.critical ? ' attend__row--critical' : ''}">
            <span class="attend__avatar" aria-hidden="true">${initials(name)}</span>
            <div class="attend__main">
                <div class="attend__idline">
                    <span class="attend__name">${escapeHTML(name)}</span>
                    <span class="pill" data-quadrant="${a.quadrant}">${escapeHTML(a.quadrant_label)}</span>
                    ${a.critical ? '<span class="attend__flag">Crítico</span>' : ''}
                </div>
                <div class="attend__metaline">
                    <span class="attend__gap num">brecha ${gap > 0 ? '+' : ''}${gap}</span>
                    ${cat}
                </div>
                ${diag}
            </div>
            <button type="button" class="attend__btn" data-student-id="${a.id}">Ver</button>
        </li>`;
    }).join('');

    $el.querySelectorAll('[data-student-id]').forEach((btn) => {
        btn.addEventListener('click', () => openStudentDetail(Number(btn.dataset.studentId)));
    });
}


/* ---- Puntos ciegos del grupo ---- */
function renderBlindSpots(list) {
    const $el = document.getElementById('blindspots-list');
    if (!$el) return;
    const items = list || [];
    if (items.length === 0) {
        $el.innerHTML = '<li class="bspot-empty">Aún no hay datos por tema.</li>';
        return;
    }
    $el.innerHTML = items.map((s) => {
        const pct = Math.round((s.ipc_value ?? 0) * 100);
        const tone = s.alert ? 'rust' : pct >= 65 ? 'moss' : 'amber';
        return `
        <li class="bspot${s.alert ? ' bspot--alert' : ''}">
            <span class="bspot__name">${escapeHTML(s.node_name)}</span>
            <span class="bspot__track"><span class="bspot__fill" data-tone="${tone}" style="width:${pct}%"></span></span>
            <span class="bspot__val num">${pct}%</span>
            <span class="bspot__n num" title="${s.total_student} estudiantes con datos">${s.total_student}</span>
        </li>`;
    }).join('');
}


/* ===================== Heatmap (detalle) ===================== */

function cellTone(v) {
    if (v >= 0.7) return 'strong';
    if (v >= 0.5) return 'mid';
    return 'weak';
}
function avg(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((s, v) => s + v, 0) / arr.length;
}
function rowAvg(row) { return avg(row.cells); }
function nodeAvg(roster, nodeIndex) { return avg(roster.map((r) => r.cells[nodeIndex])); }
function nodeName(n) { return typeof n === 'string' ? n : (n && n.name) || ''; }
function nodeTopic(n) { return (n && typeof n === 'object' && n.description) ? n.description : ''; }

function applyFilters(roster) {
    const query = currentSearch.trim().toLowerCase();
    return roster.filter((s) => {
        if (currentProfile !== 'all' && s.quadrant !== currentProfile) return false;
        if (currentCurso !== 'all' && s.id_section !== currentCurso) return false;
        if (query && !fullName(s).toLowerCase().includes(query)) return false;
        return true;
    });
}

function setQuadrantFilter(q) {
    currentProfile = q;
    currentPage = 1;
    document.querySelectorAll('[data-profile-filter]').forEach((b) => {
        b.setAttribute('aria-pressed', b.dataset.profileFilter === q ? 'true' : 'false');
    });
    renderHeatmap();
}

function renderCursoChips(sections) {
    const $wrap = document.getElementById('metrics-curso-chips');
    const $group = document.getElementById('metrics-curso-group');
    if (!$wrap || !$group) return;

    if (!sections || sections.length <= 1) {
        $group.hidden = true;
        return;
    }
    $group.hidden = false;

    const totalStudents = sections.reduce((s, c) => s + (c.students || 0), 0);
    const chips = [
        `<button type="button" class="metrics-chip" data-curso="all" aria-pressed="${currentCurso === 'all' ? 'true' : 'false'}">
            Todos <span class="metrics-chip__count num">${totalStudents}</span>
        </button>`,
        ...sections.map((c) => `
            <button type="button" class="metrics-chip" data-curso="${c.id_section}" aria-pressed="${currentCurso === c.id_section ? 'true' : 'false'}">
                ${escapeHTML(c.code || c.name)} <span class="metrics-chip__count num">${c.students || 0}</span>
            </button>
        `),
    ];
    $wrap.innerHTML = chips.join('');

    $wrap.querySelectorAll('[data-curso]').forEach((btn) => {
        btn.addEventListener('click', () => {
            currentCurso = btn.dataset.curso === 'all' ? 'all' : Number(btn.dataset.curso);
            currentPage = 1;
            $wrap.querySelectorAll('[data-curso]').forEach((b) => {
                b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
            });
            renderHeatmap();
        });
    });
}

function renderHeatmap() {
    const data = DATA;
    if (!data) return;

    const $header = document.getElementById('heatmap-header');
    const $rows = document.getElementById('heatmap-rows');
    const $footer = document.getElementById('heatmap-footer');
    const $meta = document.getElementById('metrics-meta');
    if (!$header || !$rows || !$footer) return;

    if (!data.roster || data.roster.length === 0 || !data.nodes || data.nodes.length === 0) {
        $header.innerHTML = '';
        $footer.innerHTML = '';
        $rows.innerHTML = `<div class="heatmap__empty">Aún no hay datos de evaluación en esta sala.</div>`;
        if ($meta) $meta.textContent = '';
        renderPager(0, 1);
        return;
    }

    const filtered = applyFilters(data.roster);
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    const startIdx = (currentPage - 1) * PAGE_SIZE;
    const visible = filtered.slice(startIdx, startIdx + PAGE_SIZE);

    if ($meta) {
        $meta.textContent = filtered.length === 0
            ? 'Sin estudiantes para este filtro'
            : `${startIdx + 1}–${startIdx + visible.length} de ${filtered.length} estudiante${filtered.length === 1 ? '' : 's'}`;
    }

    if (filtered.length === 0) {
        $header.innerHTML = '';
        $rows.innerHTML = `<div class="heatmap__empty">Sin estudiantes para este filtro.</div>`;
        $footer.innerHTML = '';
        renderPager(0, 1);
        return;
    }

    $header.innerHTML = `
        <div class="heatmap__row-name heatmap__row-name--header">
            <span class="eyebrow">Estudiante</span>
        </div>
        ${data.nodes.map((n) => {
            const topic = nodeTopic(n);
            return `<div class="heatmap__header-cell eyebrow" ${topic ? `title="${escapeHTML(topic)}"` : ''}>${escapeHTML(nodeName(n))}</div>`;
        }).join('')}
        <div class="heatmap__summary heatmap__summary--header eyebrow">Promedio</div>
    `;

    $rows.innerHTML = visible.map((row) => {
        const rAvg = rowAvg(row);
        const displayName = fullName(row);
        return `
        <div class="heatmap__row">
            <div class="heatmap__row-name heatmap__row-name--click" data-student-id="${row.id ?? ''}"
                 role="button" tabindex="0" aria-label="Ver resumen de ${escapeHTML(displayName)}">
                <span class="heatmap__row-avatar" aria-hidden="true">${initials(displayName)}</span>
                <span class="heatmap__row-id">
                    <span class="heatmap__row-name-text" title="${escapeHTML(displayName)}">${escapeHTML(displayName)}</span>
                    <span class="pill" data-quadrant="${row.quadrant || ''}">${escapeHTML(quadrantLabel(row.quadrant))}</span>
                </span>
            </div>
            ${row.cells.map((v, i) => {
                const pct = Math.round(v * 100);
                return `
                <div class="hm-cell" data-tone="${cellTone(v)}"
                     title="${escapeHTML(displayName)} · ${escapeHTML(nodeName(data.nodes[i]))} · ${pct}%">
                    <span class="hm-cell__pct num">${pct}%</span>
                    <span class="hm-cell__bar"><span class="hm-cell__fill" style="width:${pct}%;"></span></span>
                </div>`;
            }).join('')}
            <div class="heatmap__summary">${Math.round(rAvg * 100)}%</div>
        </div>
        `;
    }).join('');

    $footer.innerHTML = `
        <div class="heatmap__row-name heatmap__row-name--footer">
            <span class="eyebrow">Promedio del tema</span>
        </div>
        ${data.nodes.map((_, i) => {
            const v = nodeAvg(data.roster, i);
            const pct = Math.round(v * 100);
            return `<div class="hm-cell hm-cell--avg" data-tone="${cellTone(v)}">
                <span class="hm-cell__pct num">${pct}%</span>
                <span class="hm-cell__bar"><span class="hm-cell__fill" style="width:${pct}%;"></span></span>
            </div>`;
        }).join('')}
        <div class="heatmap__summary heatmap__summary--total">${Math.round(avg(data.roster.map(rowAvg)) * 100)}%</div>
    `;

    renderPager(filtered.length, totalPages);
}

function renderPager(total, totalPages) {
    const $pager = document.getElementById('metrics-pager');
    if (!$pager) return;

    if (total === 0 || totalPages <= 1) {
        $pager.innerHTML = '';
        $pager.hidden = true;
        return;
    }
    $pager.hidden = false;

    const pages = pageRange(currentPage, totalPages);
    const parts = [];
    parts.push(`<span class="metrics-pager__info">Página ${currentPage} de ${totalPages}</span>`);
    parts.push(`<button type="button" class="metrics-pager__btn" data-page-go="prev" ${currentPage === 1 ? 'disabled' : ''} aria-label="Anterior">‹</button>`);
    pages.forEach((p) => {
        if (p === '…') {
            parts.push(`<span class="metrics-pager__ellipsis">…</span>`);
        } else {
            parts.push(`<button type="button" class="metrics-pager__btn" data-page-go="${p}" ${p === currentPage ? 'aria-current="page"' : ''}>${p}</button>`);
        }
    });
    parts.push(`<button type="button" class="metrics-pager__btn" data-page-go="next" ${currentPage === totalPages ? 'disabled' : ''} aria-label="Siguiente">›</button>`);
    $pager.innerHTML = parts.join('');

    $pager.querySelectorAll('[data-page-go]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.pageGo;
            if (target === 'prev') currentPage = Math.max(1, currentPage - 1);
            else if (target === 'next') currentPage = Math.min(totalPages, currentPage + 1);
            else currentPage = Number(target);
            renderHeatmap();
        });
    });
}

function pageRange(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 4) return [1, 2, 3, 4, 5, '…', total];
    if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total];
    return [1, '…', current - 1, current, current + 1, '…', total];
}


/* ===================== Detalle del estudiante ===================== */

function showModal(id) {
    const $m = document.getElementById(id);
    if ($m && window.bootstrap) {
        (window.bootstrap.Modal.getInstance($m) || new window.bootstrap.Modal($m)).show();
    }
}

async function openStudentDetail(studentId) {
    if (!focusRoomId || !studentId) return;
    const $body = document.getElementById('student-detail-body');
    const $title = document.getElementById('student-detail-title');
    if ($title) $title.textContent = 'Resumen del estudiante';
    if ($body) $body.innerHTML = '<p class="sdq__msg">Cargando…</p>';
    showModal('studentDetailModal');
    try {
        renderStudentDetail(await roomsApi.studentDetail(focusRoomId, studentId));
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) { tokens.clear(); location.replace('/app/'); return; }
        if ($body) $body.innerHTML = '<p class="sdq__msg">No se pudo cargar el resumen.</p>';
    }
}

function renderStudentDetail(d) {
    const st = d.student || {};
    const name = `${st.first_name || ''} ${st.last_name || ''}`.trim() || st.username || 'Estudiante';
    const sum = d.summary || {};
    const q = sum.quadrant;
    const info = QUAD_INFO[q] || {};
    const conf = Math.round((sum.avg_confidence ?? 0) * 100);
    const mast = Math.round((sum.bkt_mastery ?? 0) * 100);
    const gap = Math.round((sum.metacognitive_gap ?? 0) * 100);

    const $title = document.getElementById('student-detail-title');
    if ($title) $title.textContent = name;

    const nodes = d.nodes || [];
    const nodesHTML = nodes.length === 0
        ? '<li class="sdq__msg">Todavía no respondió en ningún tema.</li>'
        : nodes.map((n) => {
            const nm = Math.round((n.bkt_mastery ?? 0) * 100);
            const nc = Math.round((n.avg_confidence ?? 0) * 100);
            return `
            <li class="sdq-node" title="${escapeHTML(n.node_name)} · realmente sabe ${nm}% · cree saber ${nc}%">
                <span class="sdq-node__name">${escapeHTML(n.node_name)}</span>
                <span class="sdq-node__track"><span class="sdq-node__fill" style="width:${nm}%"></span></span>
                <span class="sdq-node__nums">
                    <span class="sdq-node__stat">Sabe <span class="num" data-tone="sage">${nm}%</span></span>
                    <span class="sdq-node__sep">·</span>
                    <span class="sdq-node__stat">Cree <span class="num" data-tone="terracotta">${nc}%</span></span>
                </span>
            </li>`;
        }).join('');

    const $body = document.getElementById('student-detail-body');
    $body.innerHTML = `
      <div class="sdq">
        <span class="pill sdq__pill" data-quadrant="${q || ''}">${escapeHTML(quadrantLabel(q))}</span>
        <p class="sdq__meaning">${escapeHTML(info.meaning || 'Aún no hay datos suficientes de este estudiante.')}</p>

        <div class="sdq__stats">
          <div class="sdq__stat"><span class="sdq__stat-v num" data-tone="terracotta">${conf}%</span><span class="sdq__stat-k">Cree saber</span></div>
          <div class="sdq__stat"><span class="sdq__stat-v num" data-tone="sage">${mast}%</span><span class="sdq__stat-k">Realmente sabe</span></div>
          <div class="sdq__stat"><span class="sdq__stat-v num">${gap > 0 ? '+' : ''}${gap}</span><span class="sdq__stat-k">Diferencia (pts)</span></div>
        </div>

        ${info.action ? `
        <div class="sdq__action">
          <span class="eyebrow">Qué hacer</span>
          <p>${escapeHTML(info.action)}</p>
        </div>` : ''}

        <div class="sdq__nodes">
          <span class="eyebrow">Por tema · realmente sabe / cree saber</span>
          <ul>${nodesHTML}</ul>
        </div>

        <div class="sdq__cats">
          <span class="eyebrow">Errores por categoría · aciertos</span>
          ${categoriesHTML(d.categories)}
        </div>
      </div>`;
}


/* ===================== Bindings estáticos ===================== */

document.querySelectorAll('[data-profile-filter]').forEach((btn) => {
    btn.addEventListener('click', () => setQuadrantFilter(btn.dataset.profileFilter));
});

const $search = document.getElementById('metrics-search');
if ($search) {
    let t = null;
    $search.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => {
            currentSearch = $search.value;
            currentPage = 1;
            renderHeatmap();
        }, 150);
    });
}

const $heatRows = document.getElementById('heatmap-rows');
if ($heatRows) {
    $heatRows.addEventListener('click', (e) => {
        const el = e.target.closest('[data-student-id]');
        if (el && el.dataset.studentId) openStudentDetail(Number(el.dataset.studentId));
    });
    $heatRows.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const el = e.target.closest('[data-student-id]');
        if (el && el.dataset.studentId) { e.preventDefault(); openStudentDetail(Number(el.dataset.studentId)); }
    });
}

// El topbar cambia la sala activa globalmente → enfocamos esa sala en métricas.
window.addEventListener('cogniroom:roomchange', (e) => {
    const id = e.detail && e.detail.id;
    if (id && ROOMS.some((r) => r.id === Number(id))) selectView(Number(id));
});


/* ===================== Init ===================== */

async function init() {
    try {
        ROOMS = (await roomsApi.list()) || [];
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) { tokens.clear(); location.replace('/app/'); return; }
        toast('No se pudieron cargar las salas.', { kind: 'error' });
        return;
    }
    renderRoomSelector();

    if (ROOMS.length === 0) {
        selectView('all');
        return;
    }
    const stored = activeRoomId();
    const startRoom = ROOMS.find((r) => r.id === stored) || ROOMS[0];
    selectView(startRoom.id);
}

init();
