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

function activeRoomId() {
    return Number(localStorage.getItem('cogniroom.activeRoomId')) || null;
}


const PAGE_SIZE = 12;

let DATA = null;
let ROOM_INFO = null;
let currentProfile = 'all';
let currentCurso = 'all';
let currentSearch = '';
let currentPage = 1;


function cellTone(v) {
    if (v >= 0.7) return 'strong';
    if (v >= 0.5) return 'mid';
    return 'weak';
}


function avg(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((s, v) => s + v, 0) / arr.length;
}


function rowAvg(row) {
    return avg(row.cells);
}


function nodeAvg(roster, nodeIndex) {
    return avg(roster.map((r) => r.cells[nodeIndex]));
}


function initials(name) {
    return name.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}


function fullName(s) {
    if (s.first_name || s.last_name) {
        return `${s.first_name || ''} ${s.last_name || ''}`.trim();
    }
    return s.name || '';
}


function applyFilters(roster) {
    const q = currentSearch.trim().toLowerCase();
    return roster.filter((s) => {
        if (currentProfile !== 'all' && s.quadrant !== currentProfile) return false;
        if (currentCurso !== 'all' && s.id_section !== currentCurso) return false;
        if (q && !fullName(s).toLowerCase().includes(q)) return false;
        return true;
    });
}


function nodeName(n) {
    return typeof n === 'string' ? n : (n && n.name) || '';
}


function nodeTopic(n) {
    return (n && typeof n === 'object' && n.description) ? n.description : '';
}


function renderInsights(data) {
    const $wrap = document.getElementById('metrics-insights');
    if (!$wrap) return;

    const nodeAverages = data.nodes.map((node, i) => ({ node, avg: nodeAvg(data.roster, i) }));
    nodeAverages.sort((a, b) => a.avg - b.avg);
    const weakest = nodeAverages[0];
    const strongest = nodeAverages[nodeAverages.length - 1];

    const studentAverages = data.roster.map((s) => ({ name: fullName(s), avg: rowAvg(s), quadrant: s.quadrant }));
    studentAverages.sort((a, b) => a.avg - b.avg);
    const lowest = studentAverages[0];
    const highest = studentAverages[studentAverages.length - 1];

    $wrap.innerHTML = `
        <article class="insight-card insight-card--weak">
            <span class="insight-card__k">Tema más débil</span>
            <strong class="insight-card__v">${escapeHTML(nodeName(weakest.node))}</strong>
            <span class="insight-card__sub">
                el grupo domina <span class="num">${Math.round(weakest.avg * 100)}%</span> en promedio
            </span>
        </article>
        <article class="insight-card insight-card--strong">
            <span class="insight-card__k">Tema más fuerte</span>
            <strong class="insight-card__v">${escapeHTML(nodeName(strongest.node))}</strong>
            <span class="insight-card__sub">
                el grupo domina <span class="num">${Math.round(strongest.avg * 100)}%</span> en promedio
            </span>
        </article>
        <article class="insight-card insight-card--risk">
            <span class="insight-card__k">Estudiante a apoyar</span>
            <strong class="insight-card__v">${escapeHTML(lowest.name)}</strong>
            <span class="insight-card__sub">
                <span class="num">${Math.round(lowest.avg * 100)}%</span> · ${escapeHTML(quadrantLabel(lowest.quadrant))}
            </span>
        </article>
        <article class="insight-card insight-card--top">
            <span class="insight-card__k">Estudiante destacado</span>
            <strong class="insight-card__v">${escapeHTML(highest.name)}</strong>
            <span class="insight-card__sub">
                <span class="num">${Math.round(highest.avg * 100)}%</span> · ${escapeHTML(quadrantLabel(highest.quadrant))}
            </span>
        </article>
    `;
}


// Setter compartido: sincroniza chips y tarjetas de resumen, y re-renderiza.
function setQuadrantFilter(q) {
    currentProfile = q;
    currentPage = 1;
    document.querySelectorAll('[data-profile-filter]').forEach((b) => {
        b.setAttribute('aria-pressed', b.dataset.profileFilter === q ? 'true' : 'false');
    });
    document.querySelectorAll('[data-quadrant-tile]').forEach((t) => {
        t.setAttribute('aria-pressed', t.dataset.quadrantTile === q ? 'true' : 'false');
    });
    renderHeatmap();
}


// Resumen visual por cuadrante: una tarjeta por grupo, con conteo y color;
// clic filtra el heatmap a ese cuadrante (segundo clic quita el filtro).
function renderQuadrantSummary(roster) {
    const $wrap = document.getElementById('metrics-quadrants');
    if (!$wrap) return;

    const counts = { overconfident: 0, underconfident: 0, aware_gap: 0, calibrated: 0 };
    (roster || []).forEach((s) => { if (counts[s.quadrant] != null) counts[s.quadrant] += 1; });

    const order = ['overconfident', 'underconfident', 'aware_gap', 'calibrated'];
    $wrap.innerHTML = order.map((q) => {
        const info = QUAD_INFO[q];
        return `
        <button type="button" class="mq-tile${info.critical ? ' mq-tile--critical' : ''}"
                data-quadrant="${q}" data-quadrant-tile="${q}"
                aria-pressed="${currentProfile === q ? 'true' : 'false'}">
            <span class="mq-tile__count num">${counts[q]}</span>
            <span class="mq-tile__label">${info.label}</span>
            <span class="mq-tile__hint">${info.hint}</span>
        </button>`;
    }).join('');

    $wrap.querySelectorAll('[data-quadrant-tile]').forEach((t) => {
        t.addEventListener('click', () => {
            const q = t.dataset.quadrantTile;
            setQuadrantFilter(currentProfile === q ? 'all' : q);
        });
    });
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
            currentCurso = btn.dataset.curso;
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


function render() {
    if (!DATA) return;

    const $name = document.getElementById('room-name');
    const $students = document.getElementById('room-students');
    if ($name) $name.textContent = DATA.name;
    if ($students) $students.textContent = String(DATA.students);

    currentPage = 1;
    currentCurso = 'all';

    if (!DATA.roster || DATA.roster.length === 0 || !DATA.nodes || DATA.nodes.length === 0) {
        const $rows = document.getElementById('heatmap-rows');
        const $header = document.getElementById('heatmap-header');
        const $footer = document.getElementById('heatmap-footer');
        if ($header) $header.innerHTML = '';
        if ($footer) $footer.innerHTML = '';
        if ($rows) $rows.innerHTML = `<div class="heatmap__empty">Aún no hay datos de evaluación en esta sala.</div>`;
        const $insights = document.getElementById('metrics-insights');
        if ($insights) $insights.innerHTML = '';
        const $quads = document.getElementById('metrics-quadrants');
        if ($quads) $quads.innerHTML = '';
        return;
    }

    renderQuadrantSummary(DATA.roster);
    renderInsights(DATA);
    renderCursoChips(DATA.sections);
    renderHeatmap();
}


async function load() {
    let list;
    try {
        list = await roomsApi.list();
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) { tokens.clear(); location.replace('/app/'); return; }
        toast('No se pudieron cargar las salas.', { kind: 'error' });
        return;
    }
    const stored = activeRoomId();
    ROOM_INFO = (list || []).find((r) => r.id === stored) || (list || [])[0];
    if (!ROOM_INFO) {
        const $rows = document.getElementById('heatmap-rows');
        if ($rows) $rows.innerHTML = `<div class="heatmap__empty">Creá una sala para ver sus métricas.</div>`;
        return;
    }
    localStorage.setItem('cogniroom.activeRoomId', String(ROOM_INFO.id));
    try {
        DATA = await roomsApi.heatmap(ROOM_INFO.id);
        render();
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) { tokens.clear(); location.replace('/app/'); return; }
        toast('No se pudieron cargar las métricas.', { kind: 'error' });
    }
}


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


window.addEventListener('cogniroom:roomchange', load);


/* ---- Resumen del estudiante (clic en su fila) ---- */
function showModal(id) {
    const $m = document.getElementById(id);
    if ($m && window.bootstrap) {
        (window.bootstrap.Modal.getInstance($m) || new window.bootstrap.Modal($m)).show();
    }
}

async function openStudentDetail(studentId) {
    if (!ROOM_INFO || !studentId) return;
    const $body = document.getElementById('student-detail-body');
    const $title = document.getElementById('student-detail-title');
    if ($title) $title.textContent = 'Resumen del estudiante';
    if ($body) $body.innerHTML = '<p class="sdq__msg">Cargando…</p>';
    showModal('studentDetailModal');
    try {
        renderStudentDetail(await roomsApi.studentDetail(ROOM_INFO.id, studentId));
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
            <li class="sdq-node">
                <span class="sdq-node__name">${escapeHTML(n.node_name)}</span>
                <span class="sdq-node__track"><span class="sdq-node__fill" style="width:${nm}%"></span></span>
                <span class="sdq-node__nums num">${nm}% / ${nc}%</span>
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
      </div>`;
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

load();