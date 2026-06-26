const _v = new URL(import.meta.url).searchParams.get('v') || '';
const { auth, me, rooms, sessions, tokens, ApiError } = await import(`../api.js?v=${_v}`);
const { toast } = await import(`../toast.js?v=${_v}`);


if (!tokens.access) {
    location.replace('/app/');
}

const $userName = document.getElementById('user-name');
const $userRole = document.getElementById('user-role');
const $studentView = document.querySelector('[data-view="student"]');
const $teacherView = document.querySelector('[data-view="teacher"]');
// El logout (#logout-btn) lo cablea nav-auth.js; no se duplica acá.


function fmt(n, digits = 2) {
    if (n == null || Number.isNaN(n)) return '—';
    return Number(n).toFixed(digits);
}

function escapeHTML(s) {
    return String(s ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}

function profileLabel(profile) {
    return ({
        calibrated: 'Calibrado',
        overconfident: 'Sobreconfiado',
        underconfident: 'Subconfiado',
    })[profile] || 'Calibrado';
}

function profileFromGap(gap) {
    if (gap > 0.2)  return 'overconfident';
    if (gap < -0.2) return 'underconfident';
    return 'calibrated';
}

function gapTone(gap) {
    if (gap > 15)  return 'amber';
    if (gap < -15) return 'stone';
    return 'moss';
}

function masteryColor(m) {
    if (m < 0.4) return 'var(--rust)';
    if (m < 0.6) return 'var(--amber)';
    if (m < 0.8) return 'var(--sage)';
    return 'var(--moss)';
}


function updateCalibrationRing(container, value, profile, sublabel) {
    const clamped = Math.max(0, Math.min(1, value || 0));
    const svg = container.querySelector('.calibration-ring__svg');
    const fill = container.querySelector('.calibration-ring__fill');
    const valueEl = container.querySelector('.calibration-ring__value');
    const subEl = container.querySelector('.calibration-ring__sublabel');

    const size = parseFloat(svg.getAttribute('width'));
    const strokeWidth = parseFloat(fill.getAttribute('stroke-width'));
    const r = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * r;
    const offset = circumference * (1 - clamped);

    fill.setAttribute('stroke-dasharray', circumference.toFixed(2));
    fill.setAttribute('stroke-dashoffset', offset.toFixed(2));
    container.dataset.profile = profile;
    valueEl.textContent = clamped.toFixed(2);
    if (sublabel && subEl) subEl.textContent = sublabel;
}


function renderStudentNodeCard(node) {
    const mastery = Math.round((node.p_mastery ?? 0) * 100);
    const conf = Math.round((node.avg_confidence ?? 0) * 100);
    const gap = conf - mastery;
    const gapAbs = Math.abs(gap);
    const tone = gapTone(gap);
    const attempts = node.attempts ?? 0;
    const bkt = node.p_mastery ?? 0;
    const topic = node.description ? `<span class="node-card__topic eyebrow">${escapeHTML(node.description)}</span>` : '';

    return `
      <article class="node-card">
        <header class="node-card__head">
          <div style="min-width:0;">
            ${topic}
            <h3 class="node-card__name">${escapeHTML(node.name)}</h3>
          </div>
          <div class="node-card__mastery">
            <span class="node-card__mastery-value num">${mastery}<span class="node-card__mastery-value-unit">%</span></span>
            <span class="node-card__mastery-label eyebrow">mastery</span>
          </div>
        </header>
        <div class="dual-bar">
          <div class="dual-bar__rows">
            <div class="dual-bar__row">
              <span class="dual-bar__num">${conf}</span>
              <div class="dual-bar__track">
                <div class="dual-bar__fill dual-bar__fill--declared" style="width:${conf}%;"></div>
              </div>
            </div>
            <div class="dual-bar__row">
              <span class="dual-bar__num">${mastery}</span>
              <div class="dual-bar__track">
                <div class="dual-bar__fill dual-bar__fill--mastery" style="width:${mastery}%;"></div>
                ${gapAbs > 5 ? `<div class="dual-bar__gap-hatch" style="left:${Math.min(conf, mastery)}%;width:${gapAbs}%;"></div>` : ''}
              </div>
            </div>
          </div>
        </div>
        <footer class="node-card__meta">
          <span><span class="num">${attempts}</span> intentos</span>
          <span>BKT <span class="num">${fmt(bkt)}</span></span>
          <span>gap <span class="num node-card__gap" data-tone="${tone}">${gap >= 0 ? '+' : ''}${gap}</span></span>
        </footer>
      </article>
    `;
}


function renderStudentNodes(nodes) {
    const $grid = document.getElementById('student-nodes-grid');
    const $count = document.getElementById('nodes-count');
    if (!nodes || nodes.length === 0) {
        $grid.innerHTML = `<p class="empty" style="flex:1;">Aún no hay nodos rastreados. Inicia una sesión para empezar a registrar tu dominio.</p>`;
        $count.textContent = '0';
        return;
    }
    $count.textContent = String(nodes.length);
    $grid.innerHTML = nodes.map(renderStudentNodeCard).join('');
}


function renderStudentDiagnosis(diag) {
    const $title = document.getElementById('student-diag-title');
    const $body = document.getElementById('student-diag-body');
    const $sug = document.getElementById('student-diag-suggestion');
    const $sugText = document.getElementById('student-diag-suggestion-text');

    if (!diag) return;

    const title = diag.title || '';
    const reasoning = diag.reasoning || '';
    const recommendation = diag.recommendation || '';

    $title.textContent = title ? `«${title}»` : '«Diagnóstico disponible.»';
    $body.textContent = reasoning;

    if (recommendation) {
        $sugText.textContent = recommendation;
        $sug.hidden = false;
    } else {
        $sug.hidden = true;
    }
}


// Construye los nodos del grafo desde los nodos reales del estudiante,
// distribuyéndolos en una grilla (el backend no modela posiciones x/y).
function buildGraphNodes(nodes) {
    if (!nodes || !nodes.length) return [];
    const cols = Math.min(4, Math.ceil(Math.sqrt(nodes.length)));
    const totalRows = Math.ceil(nodes.length / cols);
    return nodes.map((n, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = ((col + 0.5) / cols) * 88 + 6;
        const y = totalRows > 1 ? ((row + 0.5) / totalRows) * 56 + 7 : 35;
        return {
            id_node: n.node_id,
            name: n.name || n.node_name || 'Nodo',
            description: n.description || '',
            p_mastery: n.p_mastery ?? 0,
            avg_confidence: n.avg_confidence ?? (n.p_mastery ?? 0),
            attempts: n.attempts ?? 0,
            x, y,
        };
    });
}


function renderKnowledgeGraph(graphNodes) {
    const $svg = document.getElementById('knowledge-graph-svg');
    const $readout = document.getElementById('knowledge-graph-readout');
    if (!$svg) return;

    const byId = Object.fromEntries(graphNodes.map((n) => [n.id_node, n]));
    let hover = null;

    const buildSvg = () => {
        const svgNS = 'http://www.w3.org/2000/svg';
        $svg.innerHTML = '';

        const defs = document.createElementNS(svgNS, 'defs');
        defs.innerHTML = `<pattern id="kg-grid" width="5" height="5" patternUnits="userSpaceOnUse">
            <path d="M 5 0 L 0 0 0 5" fill="none" stroke="var(--paper-border)" stroke-width="0.1"/>
        </pattern>`;
        $svg.appendChild(defs);

        const bg = document.createElementNS(svgNS, 'rect');
        bg.setAttribute('width', '100');
        bg.setAttribute('height', '70');
        bg.setAttribute('fill', 'url(#kg-grid)');
        bg.setAttribute('opacity', '0.6');
        $svg.appendChild(bg);

        graphNodes.forEach((n) => {
            const lit = !hover || hover === n.id_node;
            const r = 1.6 + n.attempts * 0.12;
            const color = masteryColor(n.p_mastery);
            const gap = n.avg_confidence - n.p_mastery;
            const isOver = gap > 0.15;

            const g = document.createElementNS(svgNS, 'g');
            g.style.cursor = 'pointer';
            g.style.opacity = lit ? '1' : '0.25';
            g.style.transition = 'opacity 200ms';

            if (isOver) {
                const aura = document.createElementNS(svgNS, 'circle');
                aura.setAttribute('cx', n.x);
                aura.setAttribute('cy', n.y);
                aura.setAttribute('r', r + 1.6);
                aura.setAttribute('fill', 'none');
                aura.setAttribute('stroke', 'var(--amber)');
                aura.setAttribute('stroke-width', '0.18');
                aura.setAttribute('stroke-dasharray', '0.8 0.6');
                aura.setAttribute('opacity', '0.6');
                const animate = document.createElementNS(svgNS, 'animateTransform');
                animate.setAttribute('attributeName', 'transform');
                animate.setAttribute('type', 'rotate');
                animate.setAttribute('from', `0 ${n.x} ${n.y}`);
                animate.setAttribute('to', `360 ${n.x} ${n.y}`);
                animate.setAttribute('dur', '40s');
                animate.setAttribute('repeatCount', 'indefinite');
                aura.appendChild(animate);
                g.appendChild(aura);
            }

            [
                [n.x - r - 0.8, n.y, n.x - r - 0.3, n.y],
                [n.x + r + 0.3, n.y, n.x + r + 0.8, n.y],
                [n.x, n.y - r - 0.8, n.x, n.y - r - 0.3],
                [n.x, n.y + r + 0.3, n.x, n.y + r + 0.8],
            ].forEach(([x1, y1, x2, y2]) => {
                const tick = document.createElementNS(svgNS, 'line');
                tick.setAttribute('x1', x1);
                tick.setAttribute('y1', y1);
                tick.setAttribute('x2', x2);
                tick.setAttribute('y2', y2);
                tick.setAttribute('stroke', 'var(--ink-faint)');
                tick.setAttribute('stroke-width', '0.1');
                g.appendChild(tick);
            });

            const circle = document.createElementNS(svgNS, 'circle');
            circle.setAttribute('cx', n.x);
            circle.setAttribute('cy', n.y);
            circle.setAttribute('r', r);
            circle.setAttribute('fill', color);
            circle.setAttribute('stroke', 'var(--paper)');
            circle.setAttribute('stroke-width', '0.4');
            g.appendChild(circle);

            const label = document.createElementNS(svgNS, 'text');
            label.setAttribute('x', n.x);
            label.setAttribute('y', n.y + r + 2.2);
            label.setAttribute('text-anchor', 'middle');
            label.setAttribute('font-size', '1.6');
            label.setAttribute('fill', 'var(--ink)');
            label.setAttribute('font-family', 'Inter');
            label.setAttribute('font-weight', '500');
            label.textContent = n.name;
            g.appendChild(label);

            const mlabel = document.createElementNS(svgNS, 'text');
            mlabel.setAttribute('x', n.x);
            mlabel.setAttribute('y', n.y + r + 4.1);
            mlabel.setAttribute('text-anchor', 'middle');
            mlabel.setAttribute('font-size', '1.3');
            mlabel.setAttribute('fill', 'var(--ink-faint)');
            mlabel.setAttribute('font-family', 'JetBrains Mono');
            mlabel.textContent = n.p_mastery.toFixed(2);
            g.appendChild(mlabel);

            g.addEventListener('mouseenter', () => { hover = n.id_node; buildSvg(); updateReadout(); });
            g.addEventListener('mouseleave', () => { hover = null; buildSvg(); updateReadout(); });
            g.addEventListener('click', () => { location.href = `/app/node/${n.id_node}/`; });

            $svg.appendChild(g);
        });
    };

    const updateReadout = () => {
        if (!hover) {
            $readout.innerHTML = '<span class="knowledge-graph__readout-empty">// hover sobre un nodo</span>';
            return;
        }
        const n = byId[hover];
        $readout.innerHTML = `
            <span class="knowledge-graph__readout-name">${escapeHTML(n.name)}</span>
            <div class="knowledge-graph__readout-nums">
                <span>m <b>${n.p_mastery.toFixed(2)}</b></span>
                <span>c <b>${n.avg_confidence.toFixed(2)}</b></span>
                <span>n <b>${n.attempts}</b></span>
            </div>
        `;
    };

    buildSvg();
}


function renderRooms(items) {
    const $list = document.getElementById('teacher-rooms-list');
    const $count = document.getElementById('rooms-count-meta');
    const $headerCount = document.getElementById('teacher-rooms-count');

    if (!items || items.length === 0) return;
    if (!$list) return;

    if ($count) $count.textContent = `${items.length} activa${items.length === 1 ? '' : 's'}`;
    if ($headerCount) $headerCount.textContent = String(items.length);

    $list.innerHTML = items.map((r) => {
        const subject = r.subject || '';
        return `
          <a href="/app/room/${r.id_room ?? r.id}/" class="room-card" style="text-decoration:none;color:inherit;">
            <header class="room-card__head">
              <div>
                <h3 class="room-card__name">${escapeHTML(r.name)}</h3>
                <p class="room-card__used">${escapeHTML(r.mode || 'group')} · ${escapeHTML(r.access_code || '')}</p>
              </div>
              <span class="room-card__more" aria-hidden="true">
                <svg class="icon-svg" width="16" height="16" viewBox="0 0 24 24">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </span>
            </header>
            <div class="room-card__meta">
              <div>
                <div class="room-card__meta-eyebrow eyebrow">Estudiantes</div>
                <div class="room-card__meta-v num">${r.member_count ?? 0}</div>
              </div>
              <div class="room-card__meta-end">
                <div class="room-card__meta-eyebrow eyebrow">Materia</div>
                <div class="room-card__meta-v">${escapeHTML(subject)}</div>
              </div>
            </div>
          </a>
        `;
    }).join('');
}


function renderBlindSpots(items) {
    const $list = document.getElementById('teacher-blind-spots');
    if (!$list) return;
    if (!items || items.length === 0) {
        $list.innerHTML = `<p class="empty" style="padding:var(--s-3);">Sin puntos ciegos detectados todavía.</p>`;
        return;
    }
    $list.innerHTML = items.map((b) => {
        const ipc = b.ipc_value ?? 0;
        const tone = ipc < 0.25 ? 'rust' : ipc < 0.4 ? 'amber' : 'sage';
        const nodeName = b.node?.name ?? b.node_name ?? '—';
        const topic = b.node?.description ?? b.description ?? '';
        return `
          <div class="blind-spots__item">
            <div class="blind-spots__row">
              <p class="blind-spots__node">${escapeHTML(nodeName)}${topic ? ` <span class="eyebrow">· ${escapeHTML(topic)}</span>` : ''}</p>
              <span class="blind-spots__ipc num">${fmt(ipc)}</span>
            </div>
            <div class="blind-spots__bar">
              <div class="blind-spots__bar-fill" data-tone="${tone}" style="width:${(1 - ipc) * 100}%;"></div>
            </div>
            <div class="blind-spots__meta">
              <span><span class="num">${b.total_student ?? 0}</span> estudiantes afectados</span>
              <button class="blind-spots__action" type="button">Ver nodo →</button>
            </div>
          </div>
        `;
    }).join('');
}


function renderAtRisk(items) {
    const $list = document.getElementById('teacher-at-risk');
    if (!$list) return;
    if (!items || items.length === 0) {
        $list.innerHTML = `<li class="empty" style="padding:var(--s-3);list-style:none;">Ningún estudiante en riesgo por ahora.</li>`;
        return;
    }
    $list.innerHTML = items.map((s) => {
        const fullName = `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim() || s.username || '—';
        const initials = fullName.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
        const gapValue = s.metacognitive_gap ?? 0;
        const gapPts = Math.round(gapValue * 100);
        const risk = s.risk_level || 'medium';
        const profile = s.profile || 'overconfident';
        const tone = gapPts >= 0 ? 'amber' : 'stone';
        return `
          <li class="at-risk__row">
            <div class="at-risk__student">
              <span class="at-risk__avatar" aria-hidden="true">${escapeHTML(initials)}</span>
              <span class="at-risk__name">${escapeHTML(fullName)}</span>
            </div>
            <div><span class="pill" data-profile="${profile}">${profileLabel(profile)}</span></div>
            <div class="at-risk__gap" data-tone="${tone}">${gapPts > 0 ? '+' : ''}${gapPts} pts</div>
            <div><span class="pill" data-risk="${risk}">Riesgo ${risk === 'high' ? 'alto' : risk === 'medium' ? 'medio' : 'bajo'}</span></div>
          </li>
        `;
    }).join('');
}


async function startSession(roomId, $btn) {
    if ($btn) {
        $btn.disabled = true;
        $btn.textContent = 'Iniciando…';
    }
    try {
        const session = await sessions.create(roomId);
        const sessionId = session.id || session.id_session;
        if (!sessionId) throw new Error('La API no devolvió un id de sesión.');
        location.href = `/app/session/${sessionId}/`;
    } catch (err) {
        toast(err?.message || 'No se pudo iniciar la sesión', { kind: 'error' });
        if ($btn) {
            $btn.disabled = false;
            $btn.textContent = 'Empezar evaluación';
        }
    }
}


function renderStudentRooms(items) {
    const $list = document.getElementById('student-rooms-list');
    const $count = document.getElementById('student-rooms-count');

    if (!items || items.length === 0) {
        $list.innerHTML = `<p class="empty">No estás inscrito en ninguna sala todavía. Pedile al docente el código de acceso.</p>`;
        $count.textContent = '0 salas';
        return;
    }

    $count.textContent = `${items.length} sala${items.length === 1 ? '' : 's'}`;
    $list.innerHTML = items.map((r) => `
      <article class="room-card" data-room-id="${r.id_room ?? r.id}">
        <header class="room-card__head">
          <div>
            <h3 class="room-card__name">${escapeHTML(r.name)}</h3>
            <p class="room-card__used">${escapeHTML(r.mode || 'group')} · código ${escapeHTML(r.access_code || '—')}</p>
          </div>
          <button type="button" class="teacher-btn teacher-btn--primary" data-start-session="${r.id_room ?? r.id}">
            Empezar evaluación
            <svg class="icon-svg" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </header>
      </article>
    `).join('');

    $list.querySelectorAll('[data-start-session]').forEach((btn) => {
        btn.addEventListener('click', () => {
            startSession(Number(btn.dataset.startSession), btn);
        });
    });
}


const DIAG_TITLES = {
    overconfident: 'Brecha de sobreconfianza detectada',
    underconfident: 'Subestimación del propio dominio',
    calibrated: 'Calibración alineada',
};


async function bootstrapStudent(user) {
    $studentView.hidden = false;
    document.getElementById('student-greeting').textContent = user.first_name || user.username;

    let profile, nodes, diagnoses, roomList;
    try {
        [profile, nodes, diagnoses, roomList] = await Promise.all([
            me.profile(),
            me.nodes(),
            me.diagnoses(),
            rooms.list(),
        ]);
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
            tokens.clear();
            location.replace('/app/');
            return;
        }
        toast('No se pudo cargar tu panel.', { kind: 'error' });
        return;
    }

    renderStudentRooms(roomList || []);

    const iccAvg = profile.icc_avg ?? 0;
    const masteryAvg = profile.avg_mastery ?? 0;
    const profileKey = profile.predominant_profile || 'calibrated';
    // gap aproximado desde ICC (ICC = 1 − |gap|), con el signo del perfil.
    const gapAbs = Math.round(Math.abs(1 - iccAvg) * 100);
    const gap = profileKey === 'underconfident' ? -gapAbs : gapAbs;

    updateCalibrationRing(
        document.getElementById('student-ring'),
        iccAvg,
        profileKey,
        `${profile.total_answers ?? 0} respuestas`,
    );

    const $pill = document.getElementById('student-pill');
    $pill.textContent = profileLabel(profileKey);
    $pill.dataset.profile = profileKey;

    document.getElementById('student-mini-icc').textContent = fmt(iccAvg);
    document.getElementById('student-mini-icc').dataset.tone = profileKey === 'overconfident' ? 'amber' : '';
    document.getElementById('student-mini-mastery').textContent = fmt(masteryAvg);
    document.getElementById('student-mini-gap').textContent = `${gap >= 0 ? '+' : ''}${gap}`;
    document.getElementById('student-mini-gap').dataset.tone = gapTone(gap);

    const latestDiag = (diagnoses || [])[0];
    if (latestDiag) {
        renderStudentDiagnosis({
            title: latestDiag.title || DIAG_TITLES[latestDiag.classification] || 'Diagnóstico disponible',
            reasoning: latestDiag.reasoning,
            recommendation: latestDiag.recommendation,
        });
    }

    // El grafo y la grilla de nodos se movieron a su página dedicada
    // (/app/nodes/). Acá solo se conserva el "nodo prioritario" del hero.
    const graphNodes = buildGraphNodes(nodes || []);
    if (graphNodes.length) {
        renderHeroFocus(graphNodes);
    }
}


function renderHeroFocus(graphNodes) {
    if (!graphNodes || !graphNodes.length) return;
    const ranked = graphNodes
        .map((n) => ({ ...n, gap: (n.avg_confidence ?? 0) - (n.p_mastery ?? 0) }))
        .sort((a, b) => b.gap - a.gap);
    const focus = ranked[0];
    if (!focus) return;

    const $name = document.getElementById('hero-focus-name');
    const $topic = document.getElementById('hero-focus-topic');
    const $mastery = document.getElementById('hero-focus-mastery');
    const $conf = document.getElementById('hero-focus-conf');
    const $gap = document.getElementById('hero-focus-gap');
    const $cta = document.getElementById('hero-focus-cta');
    if (!$name) return;

    $name.textContent = focus.name;
    $topic.textContent = focus.description || '';
    $mastery.textContent = (focus.p_mastery ?? 0).toFixed(2);
    $conf.textContent = (focus.avg_confidence ?? 0).toFixed(2);
    const gapPts = Math.round(focus.gap * 100);
    $gap.textContent = `${gapPts > 0 ? '+' : ''}${gapPts}`;
    $gap.dataset.tone = gapPts > 15 ? 'amber' : gapPts < -15 ? 'rust' : 'moss';
    $cta.href = `/app/node/${focus.id_node}/`;
}


let TEACHER_ROOMS = [];


async function bootstrapTeacher(user) {
    $teacherView.hidden = false;
    const $greeting = document.getElementById('teacher-greeting');
    if ($greeting) {
        $greeting.textContent = user.first_name
            ? `${user.last_name ? 'Dr/a. ' + user.last_name : user.first_name}`
            : user.username;
    }

    let list;
    try {
        list = await rooms.list();
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
            tokens.clear();
            location.replace('/app/');
        }
        return;
    }
    TEACHER_ROOMS = list || [];

    renderKpis(TEACHER_ROOMS);
    renderRooms(TEACHER_ROOMS);
    renderRoomsCompare(TEACHER_ROOMS);

    if (!TEACHER_ROOMS.length) return;

    const stored = Number(localStorage.getItem('cogniroom.activeRoomId'));
    const active = TEACHER_ROOMS.find((r) => r.id === stored) || TEACHER_ROOMS[0];
    localStorage.setItem('cogniroom.activeRoomId', String(active.id));
    await loadRoomData(active.id);

    window.addEventListener('cogniroom:roomchange', (e) => loadRoomData(e.detail.id));
}


function renderKpis(list) {
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = String(v); };
    set('rooms-value', list.filter((r) => r.is_active !== false).length);
    set('students-value', list.reduce((s, r) => s + (r.member_count || 0), 0));
    set('answers-value', list.reduce((s, r) => s + (r.answer_count || 0), 0));
    set('diags-value', list.reduce((s, r) => s + (r.diagnosis_count || 0), 0));
}


function bindData(key, value) {
    document.querySelectorAll(`[data-bind="${key}"]`).forEach((el) => { el.textContent = value; });
}


function countProfiles(roster) {
    let cal = 0, over = 0, und = 0;
    (roster || []).forEach((s) => {
        if (s.profile === 'overconfident') over += 1;
        else if (s.profile === 'underconfident') und += 1;
        else cal += 1;
    });
    return { cal, over, und };
}


async function loadRoomData(roomId) {
    const room = TEACHER_ROOMS.find((r) => r.id === Number(roomId)) || TEACHER_ROOMS[0];
    if (!room) return;

    const $tcr = document.getElementById('teacher-current-room');
    if ($tcr) $tcr.textContent = room.name;
    bindData('room-subject', room.subject || '');
    bindData('room-access-code', room.access_code || '');
    bindData('room-mode', room.mode || 'group');
    bindData('donut-total', `${room.member_count ?? 0} est.`);
    bindData('next-room', String(room.name).split(' · ')[0]);
    bindData('next-students', String(room.member_count ?? 0));
    bindData('next-questions', String(room.question_count ?? 0));

    const [heatmap, blindSpots, atRisk] = await Promise.all([
        rooms.heatmap(room.id).catch(() => null),
        rooms.blindSpots(room.id).catch(() => []),
        rooms.atRisk(room.id).catch(() => []),
    ]);

    const counts = countProfiles(heatmap && heatmap.roster);
    bindData('prof-cal-count', String(counts.cal));
    bindData('prof-over-count', String(counts.over));
    bindData('prof-und-count', String(counts.und));
    renderDonut(counts);
    renderDotMatrix(counts);

    bindData('bs-count', `${(blindSpots || []).length} detectados`);
    bindData('ar-count', `${(atRisk || []).length} en riesgo`);
    renderBlindSpots(blindSpots || []);
    renderAtRisk(atRisk || []);
}


async function bootstrap() {
    try {
        const user = await auth.me();
        if ($userName) $userName.textContent = user.first_name || user.username;
        if ($userRole) {
            $userRole.textContent = user.role === 'teacher' ? 'Docente' : 'Estudiante';
            $userRole.dataset.role = user.role;
        }
        const $initials = document.getElementById('user-initials');
        if ($initials) {
            const base = (user.first_name || user.username || '').trim();
            $initials.textContent = base
                ? base.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase()
                : 'TQ';
        }

        if (user.role === 'teacher') {
            await bootstrapTeacher(user);
        } else {
            await bootstrapStudent(user);
        }
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
            tokens.clear();
            location.replace('/app/');
            return;
        }
        toast(err?.message || 'Error al cargar la sesión', { kind: 'error' });
    }
}

bootstrap();




function renderDonut(counts) {
    const total = (counts.cal || 0) + (counts.over || 0) + (counts.und || 0);
    if (total === 0) return;

    const R = 48;
    const C = 2 * Math.PI * R;
    const calArc  = (counts.cal  / total) * C;
    const overArc = (counts.over / total) * C;
    const undArc  = (counts.und  / total) * C;

    const set = (sel, len, offset) => {
        const el = document.querySelector(sel);
        if (!el) return;
        el.style.strokeDasharray  = `${len.toFixed(2)} ${(C - len + 1).toFixed(2)}`;
        el.style.strokeDashoffset = `${(-offset).toFixed(2)}`;
    };

    set('.d-donut__seg--cal',  calArc,  0);
    set('.d-donut__seg--over', overArc, calArc);
    set('.d-donut__seg--und',  undArc,  calArc + overArc);

    const calPct = Math.round((counts.cal / total) * 100);
    const $pct = document.getElementById('donut-pct');
    if ($pct) $pct.textContent = `${calPct}%`;
    const $cal = document.getElementById('donut-cal');   if ($cal)  $cal.textContent  = counts.cal;
    const $over = document.getElementById('donut-over'); if ($over) $over.textContent = counts.over;
    const $und = document.getElementById('donut-und');   if ($und)  $und.textContent  = counts.und;
}


function renderDotMatrix(counts) {
    const $matrix = document.getElementById('dot-matrix');
    if (!$matrix) return;
    const dots = [];
    for (let i = 0; i < counts.cal; i++)  dots.push('moss');
    for (let i = 0; i < counts.over; i++) dots.push('amber');
    for (let i = 0; i < counts.und; i++)  dots.push('stone');

    const cols = 14;
    const rows = Math.ceil(dots.length / cols);
    const r = 5;
    const gap = 4;
    const step = r * 2 + gap;
    const w = cols * step - gap;
    const h = rows * step - gap;

    const circles = dots.map((c, i) => {
        const cx = (i % cols) * step + r;
        const cy = Math.floor(i / cols) * step + r;
        return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--${c})"/>`;
    }).join('');

    $matrix.innerHTML = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" class="dot-matrix__svg">${circles}</svg>`;
}


const _roomIcon = '<svg class="icon-svg" width="14" height="14" viewBox="0 0 24 24"><path d="M3 21V8l9-5 9 5v13"></path><path d="M9 21V12h6v9"></path></svg>';


function renderRoomsCompare(list) {
    const $list = document.getElementById('rooms-compare');
    if (!$list) return;

    $list.innerHTML = (list || []).map((r) => `
      <li class="d-rooms__row" data-switch-room="${r.id}" tabindex="0">
        <span class="d-rooms__icon">${_roomIcon}</span>
        <div class="d-rooms__main">
          <span class="d-rooms__name">${escapeHTML(String(r.name).split(' · ')[0])}</span>
          <span class="d-rooms__sub">${r.member_count ?? 0} est.</span>
        </div>
        <span class="d-rooms__subject">${escapeHTML(r.subject || '')}</span>
      </li>
    `).join('');

    $list.querySelectorAll('[data-switch-room]').forEach((row) => {
        const go = () => switchActiveRoom(Number(row.dataset.switchRoom));
        row.addEventListener('click', go);
        row.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
        });
    });
}


// Cambia la sala activa: persiste y emite roomchange (que dispara loadRoomData
// acá y, en otras páginas docentes, su propia recarga).
function switchActiveRoom(id) {
    localStorage.setItem('cogniroom.activeRoomId', String(id));
    window.dispatchEvent(new CustomEvent('cogniroom:roomchange', { detail: { id } }));
}
