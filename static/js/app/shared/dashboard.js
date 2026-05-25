const _v = new URL(import.meta.url).searchParams.get('v') || '';
const { auth, me, rooms, sessions, tokens, ApiError } = await import(`../api.js?v=${_v}`);
const { toast } = await import(`../toast.js?v=${_v}`);


if (!tokens.access) {
    location.replace('/app/');
}

const $userName = document.getElementById('user-name');
const $userRole = document.getElementById('user-role');
const $logout = document.getElementById('logout-btn');
const $studentView = document.querySelector('[data-view="student"]');
const $teacherView = document.querySelector('[data-view="teacher"]');

$logout.addEventListener('click', () => {
    auth.logout();
    location.replace('/');
});


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
    const declared = Math.round((node.icc_value ?? 0) * 100 + (node.p_mastery ?? 0) * 100) / 2 || 50;
    const mastery = Math.round((node.p_mastery ?? 0) * 100);
    const conf = Math.min(100, Math.max(0, Math.round(declared)));
    const gap = conf - mastery;
    const gapAbs = Math.abs(gap);
    const tone = gapTone(gap);
    const attempts = node.attempts ?? 0;
    const bkt = node.p_mastery ?? 0;

    return `
      <article class="node-card">
        <header class="node-card__head">
          <div style="min-width:0;">
            ${node.topic ? `<div class="node-card__topic eyebrow">${escapeHTML(node.topic)}</div>` : ''}
            <h3 class="node-card__name">${escapeHTML(node.node_name)}</h3>
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

    const reasoning = diag.reasoning || '';
    const recommendation = diag.recommendation || '';
    const firstSentence = reasoning.split(/(?<=[.!?])\s/)[0] || reasoning;

    $title.textContent = firstSentence ? `«${firstSentence}»` : '«Diagnóstico disponible.»';
    $body.textContent = reasoning.length > firstSentence.length
        ? reasoning.slice(firstSentence.length).trim()
        : reasoning;

    if (recommendation) {
        $sugText.textContent = recommendation;
        $sug.hidden = false;
    } else {
        $sug.hidden = true;
    }
}


const DEMO_GRAPH_NODES = [
    { id: 'ley1',  topic: 'Termodinámica I', label: '1ª ley',           mastery: 0.47, declared: 0.84, attempts: 14, x: 22, y: 22 },
    { id: 'ley2',  topic: 'Termodinámica I', label: '2ª ley',           mastery: 0.55, declared: 0.78, attempts: 10, x: 42, y: 14 },
    { id: 'entr',  topic: 'Termodinámica I', label: 'Entropía',         mastery: 0.52, declared: 0.71, attempts: 9,  x: 60, y: 24 },
    { id: 'gibbs', topic: 'Termodinámica I', label: 'Gibbs',            mastery: 0.38, declared: 0.66, attempts: 7,  x: 78, y: 16 },
    { id: 'sis',   topic: 'Termodinámica I', label: 'Sist. abiertos',   mastery: 0.41, declared: 0.80, attempts: 8,  x: 35, y: 36 },
    { id: 'eq',    topic: 'Equilibrio',      label: 'Eq. químico',      mastery: 0.62, declared: 0.74, attempts: 9,  x: 86, y: 34 },
    { id: 'lech',  topic: 'Equilibrio',      label: 'Le Chatelier',     mastery: 0.61, declared: 0.80, attempts: 11, x: 72, y: 44 },
    { id: 'kpkc',  topic: 'Equilibrio',      label: 'Kp / Kc',          mastery: 0.70, declared: 0.66, attempts: 7,  x: 88, y: 52 },
    { id: 'cin1',  topic: 'Cinética',        label: 'Velocidad',        mastery: 0.66, declared: 0.55, attempts: 9,  x: 18, y: 50 },
    { id: 'cin2',  topic: 'Cinética',        label: 'Reacc. 2° orden',  mastery: 0.74, declared: 0.58, attempts: 12, x: 32, y: 58 },
    { id: 'act',   topic: 'Cinética',        label: 'E. activación',    mastery: 0.68, declared: 0.49, attempts: 8,  x: 50, y: 58 },
    { id: 'cat',   topic: 'Cinética',        label: 'Catálisis',        mastery: 0.81, declared: 0.72, attempts: 6,  x: 64, y: 60 },
];

const DEMO_GRAPH_EDGES = [
    { from: 'ley1', to: 'ley2' }, { from: 'ley1', to: 'sis' }, { from: 'ley2', to: 'entr' },
    { from: 'entr', to: 'gibbs' }, { from: 'gibbs', to: 'eq' }, { from: 'eq', to: 'lech' },
    { from: 'eq', to: 'kpkc' }, { from: 'lech', to: 'kpkc' }, { from: 'cin1', to: 'cin2' },
    { from: 'cin1', to: 'act' }, { from: 'act', to: 'cat' }, { from: 'cin2', to: 'cat' },
    { from: 'sis', to: 'cin1' }, { from: 'gibbs', to: 'eq' },
];


function renderKnowledgeGraph(graphNodes, graphEdges) {
    const $svg = document.getElementById('knowledge-graph-svg');
    const $readout = document.getElementById('knowledge-graph-readout');
    if (!$svg) return;

    const byId = Object.fromEntries(graphNodes.map((n) => [n.id, n]));
    let hover = null;

    const isLit = (id) => {
        if (!hover) return true;
        if (id === hover) return true;
        return graphEdges.some(
            (e) => (e.from === hover && e.to === id) || (e.to === hover && e.from === id),
        );
    };

    const isEdgeLit = (e) => !hover || e.from === hover || e.to === hover;

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

        graphEdges.forEach((e) => {
            const a = byId[e.from];
            const b = byId[e.to];
            if (!a || !b) return;
            const lit = isEdgeLit(e);
            const line = document.createElementNS(svgNS, 'line');
            line.setAttribute('x1', a.x);
            line.setAttribute('y1', a.y);
            line.setAttribute('x2', b.x);
            line.setAttribute('y2', b.y);
            line.setAttribute('stroke', lit ? 'var(--ink-faint)' : 'var(--paper-border)');
            line.setAttribute('stroke-width', lit ? '0.25' : '0.15');
            if (!lit) line.setAttribute('stroke-dasharray', '0.6 0.6');
            $svg.appendChild(line);
        });

        graphNodes.forEach((n) => {
            const lit = isLit(n.id);
            const r = 1.6 + n.attempts * 0.12;
            const color = masteryColor(n.mastery);
            const gap = n.declared - n.mastery;
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
            label.textContent = n.label;
            g.appendChild(label);

            const mlabel = document.createElementNS(svgNS, 'text');
            mlabel.setAttribute('x', n.x);
            mlabel.setAttribute('y', n.y + r + 4.1);
            mlabel.setAttribute('text-anchor', 'middle');
            mlabel.setAttribute('font-size', '1.3');
            mlabel.setAttribute('fill', 'var(--ink-faint)');
            mlabel.setAttribute('font-family', 'JetBrains Mono');
            mlabel.textContent = n.mastery.toFixed(2);
            g.appendChild(mlabel);

            g.addEventListener('mouseenter', () => { hover = n.id; buildSvg(); updateReadout(); });
            g.addEventListener('mouseleave', () => { hover = null; buildSvg(); updateReadout(); });

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
            <span class="knowledge-graph__readout-topic eyebrow">${escapeHTML(n.topic)}</span>
            <span class="knowledge-graph__readout-name">${escapeHTML(n.label)}</span>
            <div class="knowledge-graph__readout-nums">
                <span>m <b>${n.mastery.toFixed(2)}</b></span>
                <span>c <b>${n.declared.toFixed(2)}</b></span>
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
        const ipc = r.ipc_avg ?? 0;
        const ipcTone = ipc < 0.35 ? 'rust' : ipc < 0.5 ? 'amber' : 'moss';
        return `
          <a href="/app/room/${r.id}/" class="room-card" style="text-decoration:none;color:inherit;">
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
                <div class="room-card__meta-eyebrow eyebrow">IPC promedio</div>
                <div class="room-card__meta-v num" data-tone="${ipcTone}">${fmt(ipc)}</div>
              </div>
            </div>
          </a>
        `;
    }).join('');
}


function renderBlindSpots(items) {
    const $list = document.getElementById('teacher-blind-spots');
    if (!items || items.length === 0) return;
    $list.innerHTML = items.map((b) => {
        const ipc = b.ipc_value ?? 0;
        const tone = ipc < 0.25 ? 'rust' : ipc < 0.4 ? 'amber' : 'sage';
        return `
          <div class="blind-spots__item">
            <div class="blind-spots__row">
              <p class="blind-spots__node">${escapeHTML(b.node_name)}</p>
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
    if (!items || items.length === 0) return;
    $list.innerHTML = items.map((s) => {
        const initials = (s.student_name || '?').split(' ').map((p) => p[0]).join('').slice(0, 2);
        const gap = s.gap ?? 0;
        const risk = s.risk_level || 'medium';
        const profile = s.profile || 'overconfident';
        const tone = gap >= 0 ? 'amber' : 'stone';
        return `
          <li class="at-risk__row">
            <div class="at-risk__student">
              <span class="at-risk__avatar" aria-hidden="true">${escapeHTML(initials)}</span>
              <span class="at-risk__name">${escapeHTML(s.student_name)}</span>
            </div>
            <div><span class="pill" data-profile="${profile}">${profileLabel(profile)}</span></div>
            <div class="at-risk__gap" data-tone="${tone}">${gap > 0 ? '+' : ''}${gap} pts</div>
            <div class="at-risk__last">${escapeHTML(s.last_seen || '—')}</div>
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
        const sessionId = session.id || session.session_id;
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
      <article class="room-card" data-room-id="${r.id}">
        <header class="room-card__head">
          <div>
            <h3 class="room-card__name">${escapeHTML(r.name)}</h3>
            <p class="room-card__used">${escapeHTML(r.mode || 'group')} · código ${escapeHTML(r.access_code || '—')}</p>
          </div>
          <button type="button" class="teacher-btn teacher-btn--primary" data-start-session="${r.id}">
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


async function bootstrapStudent(user) {
    $studentView.hidden = false;
    document.getElementById('student-greeting').textContent = user.first_name || user.username;

    rooms.list()
        .then(renderStudentRooms)
        .catch(() => renderStudentRooms([]));

    try {
        const [profile, nodes] = await Promise.all([
            me.profile(),
            me.nodes(),
        ]);

        const iccAvg = profile.icc_avg ?? 0;
        const masteryAvg = nodes && nodes.length
            ? nodes.reduce((s, n) => s + (n.p_mastery ?? 0), 0) / nodes.length
            : 0;
        const declaredAvg = iccAvg + masteryAvg;
        const gap = (declaredAvg - masteryAvg) * 100;
        const profileKey = profile.predominant_profile || profileFromGap((declaredAvg - masteryAvg));

        updateCalibrationRing(
            document.getElementById('student-ring'),
            iccAvg,
            profileKey,
            `${nodes?.length || 0} nodos · 7 días`,
        );

        const $pill = document.getElementById('student-pill');
        $pill.textContent = profileLabel(profileKey);
        $pill.dataset.profile = profileKey;

        document.getElementById('student-mini-icc').textContent = fmt(iccAvg);
        document.getElementById('student-mini-icc').dataset.tone = profileKey === 'overconfident' ? 'amber' : '';
        document.getElementById('student-mini-mastery').textContent = fmt(masteryAvg);
        document.getElementById('student-mini-gap').textContent = `${gap >= 0 ? '+' : ''}${Math.round(gap)}`;
        document.getElementById('student-mini-gap').dataset.tone = gapTone(gap);

        renderStudentNodes(nodes);
        renderStudentDiagnosis(profile.last_diagnosis);
        renderKnowledgeGraph(DEMO_GRAPH_NODES, DEMO_GRAPH_EDGES);
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
            tokens.clear();
            location.replace('/app/');
            return;
        }
        toast(err?.message || 'Error al cargar datos del estudiante', { kind: 'error' });
        renderKnowledgeGraph(DEMO_GRAPH_NODES, DEMO_GRAPH_EDGES);
    }
}


async function bootstrapTeacher(user) {
    $teacherView.hidden = false;
    const $greeting = document.getElementById('teacher-greeting');
    if ($greeting) {
        $greeting.textContent = user.first_name
            ? `${user.last_name ? 'Dr/a. ' + user.last_name : user.first_name}`
            : user.username;
    }

    try {
        const list = await rooms.list();
        renderRooms(list);

        const firstRoom = list && list[0];
        if (!firstRoom) return;

        const $tcr2 = document.getElementById('teacher-current-room');
        if ($tcr2) $tcr2.textContent = firstRoom.name;
        if (firstRoom.ipc_avg != null) {
            document.getElementById('metric-ipc').textContent = fmt(firstRoom.ipc_avg);
        }

        try {
            const [blindSpots, atRisk] = await Promise.all([
                rooms.blindSpots(firstRoom.id),
                rooms.atRisk(firstRoom.id),
            ]);
            renderBlindSpots(blindSpots);
            renderAtRisk(atRisk);
        } catch (_) {
            /* mantener contenido quemado del template */
        }
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
            tokens.clear();
            location.replace('/app/');
            return;
        }
        /* sin backend disponible — el template ya muestra los datos demo */
    }
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


const ROOMS = {
    '0': {
        name: 'Todas las salas',
        students: 187,
        icc: '0.57', iccDelta: '+0.03 esta semana', iccDeltaTone: 'moss', iccHint: 'En promedio, tus salas se conocen aceptablemente.',
        gap: '+24 pts', gapDelta: '+2 pts esta semana', gapDeltaTone: 'amber', gapHint: 'Los estudiantes creen saber más de lo que saben.',
        answers: '5 299', answersDelta: 'de 187 estudiantes', answersHint: '404 únicos respondieron esta semana.',
        diags: '99', diagsDelta: '38 sin revisar', diagsDeltaTone: 'amber', diagsHint: 'El IA emitió notas al detectar descalibración.',
        weeklyActivity: { days: ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'], values: [628, 885, 784, 1100, 878, 595, 429], todayIndex: 3, total: '5 299 totales', avgLabel: 'Promedio diario' },
        kpiSparklines: { icc: [0.48, 0.50, 0.53, 0.55, 0.57], gap: [27, 26, 25, 23, 24], answers: [3950, 4380, 4720, 5050, 5299], diags: [72, 80, 88, 94, 99] },
        trend: [0.49, 0.52, 0.55, 0.57],
        trendFooter: 'Calibración global sube <span class="num" style="color:var(--moss);">+0.08</span> en el último mes.',
        profiles: { cal: 42, over: 38, und: 20 },
        profileCounts: { cal: 78, over: 72, und: 37 },
        insight: '<strong>Termodinámica I</strong> concentra el mayor riesgo: <strong>64 estudiantes</strong> creen dominar <em>«1ª ley»</em> pero solo <strong>28%</strong> acertó.',
        insightHref: '/app/room/1/',
        blindSpots: [
            { node: 'Termodinámica I · 1ª ley aplicada',         ipc: 0.18, affected: 64 },
            { node: 'Fisicoquímica · Entalpías de formación',     ipc: 0.19, affected: 35 },
            { node: 'Fisicoquímica · Equilibrio iónico',          ipc: 0.22, affected: 31 },
            { node: 'Termodinámica I · Entropía',                 ipc: 0.24, affected: 52 },
            { node: 'Cinética · Arrhenius',                       ipc: 0.42, affected: 24 },
        ],
        atRisk: [
            { name: 'Hugo Iturra',     initials: 'HI', profile: 'overconfident', gap: 42, last: 'Hoy, 12:15', risk: 'high', room: 'Fisicoquímica' },
            { name: 'Inés Quispe',     initials: 'IQ', profile: 'overconfident', gap: 38, last: 'Hoy, 09:30', risk: 'high', room: 'Fisicoquímica' },
            { name: 'Andrea Molina',   initials: 'AM', profile: 'overconfident', gap: 31, last: 'Hoy, 09:14', risk: 'high', room: 'Termodinámica I' },
            { name: 'Joaquín Riveros', initials: 'JR', profile: 'overconfident', gap: 35, last: 'Ayer',       risk: 'high', room: 'Fisicoquímica' },
            { name: 'Bruno Cárdenas',  initials: 'BC', profile: 'overconfident', gap: 24, last: 'Ayer',       risk: 'high', room: 'Termodinámica I' },
        ],
    },
    '1': {
        name: 'Termodinámica I · 2026·I',
        students: 84,
        icc: '0.58', iccDelta: '+0.04 esta semana', iccDeltaTone: 'moss', iccHint: 'La sala se conoce aceptablemente.',
        gap: '+24 pts', gapDelta: '+3 pts esta semana', gapDeltaTone: 'amber', gapHint: 'Creen saber 24 pts más que su nivel real.',
        answers: '2 471', answersDelta: 'de 84 estudiantes', answersHint: '212 únicos respondieron esta semana.',
        diags: '47', diagsDelta: '18 sin revisar', diagsDeltaTone: 'amber', diagsHint: 'El IA emitió notas cuando detectó descalibración.',
        weeklyActivity: { days: ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'], values: [288, 412, 374, 512, 408, 287, 190], todayIndex: 3, total: '2 471 totales', avgLabel: 'Promedio diario' },
        kpiSparklines: { icc: [0.50, 0.53, 0.54, 0.56, 0.58], gap: [21, 22, 23, 23, 24], answers: [1810, 2030, 2210, 2350, 2471], diags: [32, 36, 40, 44, 47] },
        trend: [0.50, 0.53, 0.56, 0.58],
        trendFooter: 'Calibración sube <span class="num" style="color:var(--moss);">+0.08</span> en el último mes.',
        profiles: { cal: 41, over: 38, und: 21 },
        profileCounts: { cal: 34, over: 32, und: 18 },
        insight: '<strong>64 estudiantes</strong> creen dominar <em>«1ª ley aplicada a sistemas abiertos»</em>, pero solo el <strong>28%</strong> acertó. Brecha promedio <span class="num">+56 pts</span>.',
        insightHref: '/app/room/1/',
        blindSpots: [
            { node: '1ª ley aplicada a sistemas abiertos', ipc: 0.18, affected: 64 },
            { node: 'Entropía como función de estado',     ipc: 0.24, affected: 52 },
            { node: 'Equilibrio químico — Le Chatelier',   ipc: 0.31, affected: 47 },
            { node: 'Energía libre de Gibbs',              ipc: 0.36, affected: 39 },
            { node: 'Cinética de reacciones de 2° orden',  ipc: 0.41, affected: 33 },
        ],
        atRisk: [
            { name: 'Andrea Molina',   initials: 'AM', profile: 'overconfident',  gap: 31,  last: 'Hoy, 09:14',  risk: 'high' },
            { name: 'Bruno Cárdenas',  initials: 'BC', profile: 'overconfident',  gap: 24,  last: 'Ayer',        risk: 'high' },
            { name: 'Camila Reyes',    initials: 'CR', profile: 'underconfident', gap: -18, last: 'Hoy, 11:02',  risk: 'medium' },
            { name: 'Daniel Tovar',    initials: 'DT', profile: 'overconfident',  gap: 19,  last: 'Hace 2 días', risk: 'medium' },
            { name: 'Elena Pinto',     initials: 'EP', profile: 'underconfident', gap: -22, last: 'Hoy, 08:40',  risk: 'medium' },
        ],
    },
    '2': {
        name: 'Cinética Química · 2026·I',
        students: 62,
        icc: '0.66', iccDelta: '+0.06 esta semana', iccDeltaTone: 'moss', iccHint: 'Buen autoconocimiento del grupo.',
        gap: '+12 pts', gapDelta: '−4 pts esta semana', gapDeltaTone: 'moss', gapHint: 'La brecha se está cerrando — buen signo.',
        answers: '1 842', answersDelta: 'de 62 estudiantes', answersHint: '154 únicos respondieron esta semana.',
        diags: '23', diagsDelta: '6 sin revisar', diagsDeltaTone: 'amber', diagsHint: 'Pocas alertas — la clase va bien encarrilada.',
        weeklyActivity: { days: ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'], values: [220, 305, 268, 392, 310, 198, 149], todayIndex: 3, total: '1 842 totales', avgLabel: 'Promedio diario' },
        kpiSparklines: { icc: [0.58, 0.60, 0.63, 0.64, 0.66], gap: [18, 16, 15, 13, 12], answers: [1380, 1520, 1620, 1740, 1842], diags: [14, 17, 19, 21, 23] },
        trend: [0.55, 0.59, 0.62, 0.66],
        trendFooter: 'Mejoría sostenida <span class="num" style="color:var(--moss);">+0.11</span> en el último mes.',
        profiles: { cal: 56, over: 24, und: 20 },
        profileCounts: { cal: 35, over: 15, und: 12 },
        insight: 'Solo <strong>15 estudiantes</strong> sobreconfiados. La clase mejoró su autoconocimiento tras la unidad de <em>velocidades de reacción</em>.',
        insightHref: '/app/room/2/',
        blindSpots: [
            { node: 'Energía de activación (Arrhenius)',  ipc: 0.42, affected: 24 },
            { node: 'Mecanismos de reacción',             ipc: 0.45, affected: 18 },
            { node: 'Catálisis heterogénea',              ipc: 0.48, affected: 14 },
        ],
        atRisk: [
            { name: 'Felipe Marín',   initials: 'FM', profile: 'overconfident', gap: 22, last: 'Hoy, 10:30', risk: 'medium' },
            { name: 'Gabriela Soto',  initials: 'GS', profile: 'overconfident', gap: 19, last: 'Ayer',       risk: 'medium' },
        ],
    },
    '3': {
        name: 'Fisicoquímica · Repaso',
        students: 41,
        icc: '0.41', iccDelta: '−0.03 esta semana', iccDeltaTone: 'rust', iccHint: 'La sala está descalibrada — necesita refuerzo.',
        gap: '+38 pts', gapDelta: '+6 pts esta semana', gapDeltaTone: 'rust', gapHint: 'Creen saber 38 pts más que su nivel real.',
        answers: '986', answersDelta: 'de 41 estudiantes', answersHint: '38 únicos respondieron esta semana.',
        diags: '29', diagsDelta: '14 sin revisar', diagsDeltaTone: 'rust', diagsHint: 'Muchas alertas — el IA ve descalibración recurrente.',
        weeklyActivity: { days: ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'], values: [120, 168, 142, 196, 160, 110, 90], todayIndex: 3, total: '986 totales', avgLabel: 'Promedio diario' },
        kpiSparklines: { icc: [0.48, 0.46, 0.44, 0.43, 0.41], gap: [32, 33, 35, 37, 38], answers: [720, 800, 870, 930, 986], diags: [18, 21, 24, 27, 29] },
        trend: [0.48, 0.45, 0.43, 0.41],
        trendFooter: 'Calibración baja <span class="num" style="color:var(--rust);">−0.07</span>. Grupo necesita refuerzo.',
        profiles: { cal: 22, over: 61, und: 17 },
        profileCounts: { cal: 9, over: 25, und: 7 },
        insight: '<strong>25 estudiantes</strong> (61%) están sobreconfiados. Es la sala con mayor brecha de toda la cohorte.',
        insightHref: '/app/room/3/',
        blindSpots: [
            { node: 'Termoquímica — entalpías de formación', ipc: 0.15, affected: 35 },
            { node: 'Equilibrio iónico en disoluciones',     ipc: 0.19, affected: 31 },
            { node: 'Cinética enzimática',                   ipc: 0.22, affected: 28 },
            { node: 'Termodinámica de mezclas',              ipc: 0.27, affected: 24 },
            { node: 'Potenciales electroquímicos',           ipc: 0.33, affected: 19 },
            { node: 'Capacidad calorífica molar',            ipc: 0.38, affected: 16 },
        ],
        atRisk: [
            { name: 'Hugo Iturra',     initials: 'HI', profile: 'overconfident',  gap: 42, last: 'Hoy, 12:15',  risk: 'high' },
            { name: 'Inés Quispe',     initials: 'IQ', profile: 'overconfident',  gap: 38, last: 'Hoy, 09:30',  risk: 'high' },
            { name: 'Joaquín Riveros', initials: 'JR', profile: 'overconfident',  gap: 35, last: 'Ayer',        risk: 'high' },
            { name: 'Karina Núñez',    initials: 'KN', profile: 'overconfident',  gap: 29, last: 'Hace 2 días', risk: 'medium' },
            { name: 'Lautaro Espina',  initials: 'LE', profile: 'underconfident', gap: -24,last: 'Hoy, 08:10',  risk: 'medium' },
            { name: 'Mariana Vega',    initials: 'MV', profile: 'overconfident',  gap: 21, last: 'Hace 3 días', risk: 'medium' },
        ],
    },
};


function renderBlindSpotsList(items) {
    return items.map((b) => {
        const tone = b.ipc < 0.25 ? 'rust' : b.ipc < 0.4 ? 'amber' : 'sage';
        return `
          <div class="blind-spots__item">
            <div class="blind-spots__row">
              <p class="blind-spots__node">${escapeHTML(b.node)}</p>
              <span class="blind-spots__ipc num">${b.ipc.toFixed(2)}</span>
            </div>
            <div class="blind-spots__bar"><div class="blind-spots__bar-fill" data-tone="${tone}" style="width:${Math.round((1 - b.ipc) * 100)}%;"></div></div>
            <div class="blind-spots__meta">
              <span><span class="num">${b.affected}</span> estudiantes</span>
              <button class="blind-spots__action" type="button">Ver →</button>
            </div>
          </div>
        `;
    }).join('');
}

function renderAtRiskList(items) {
    const profileLabelMap = { calibrated: 'Calibrado', overconfident: 'Sobreconfiado', underconfident: 'Subconfiado' };
    return items.map((s) => {
        const tone = s.gap >= 0 ? 'amber' : 'stone';
        return `
          <li class="d-students__row">
            <span class="d-students__avatar" aria-hidden="true">${escapeHTML(s.initials)}</span>
            <div class="d-students__main">
              <span class="d-students__name">${escapeHTML(s.name)}</span>
              <span class="d-students__sub">${profileLabelMap[s.profile]} · ${escapeHTML(s.last)}</span>
            </div>
            <span class="num" style="color:var(--${tone});font-size:13px;font-weight:500;white-space:nowrap;">${s.gap > 0 ? '+' : ''}${s.gap} pts</span>
            <span class="pill" data-risk="${s.risk}" style="font-size:10px;padding:2px 8px;">${s.risk === 'high' ? 'Alto' : s.risk === 'medium' ? 'Medio' : 'Bajo'}</span>
          </li>
        `;
    }).join('');
}


function updateLineChart(trend) {
    const xs = [50, 165, 280, 395];
    const yFor = (v) => 130 - ((v - 0.25) / 0.50) * 90;
    const points = trend.map((v, i) => `${xs[i]},${yFor(v).toFixed(1)}`);
    const polyline = document.getElementById('line-stroke');
    const area = document.getElementById('line-area');
    if (!polyline || !area) return;
    polyline.setAttribute('points', points.join(' '));
    area.setAttribute('d', `M ${points.join(' L ')} L ${xs[xs.length - 1]},150 L ${xs[0]},150 Z`);
    trend.forEach((v, i) => {
        const group = document.getElementById(`line-dot-${i + 1}`);
        if (!group) return;
        const y = yFor(v).toFixed(1);
        const circle = group.querySelector('circle');
        const text = group.querySelector('text');
        if (circle) circle.setAttribute('cy', y);
        if (text) {
            text.setAttribute('y', (parseFloat(y) - 11).toFixed(1));
            text.textContent = v.toFixed(2);
        }
    });
}


function updateGauge(value) {
    const $arc = document.getElementById('gauge-arc');
    if (!$arc) return;
    const clamped = Math.max(0, Math.min(1, value));
    const startAngle = 180;
    const endAngle = 180 - (180 * clamped);
    const cx = 80, cy = 90, r = 60;
    const rad = (deg) => (deg * Math.PI) / 180;
    const x1 = cx + r * Math.cos(rad(startAngle));
    const y1 = cy + r * Math.sin(rad(startAngle));
    const x2 = cx + r * Math.cos(rad(endAngle));
    const y2 = cy + r * Math.sin(rad(endAngle));
    const largeArc = clamped > 0.5 ? 1 : 0;
    $arc.setAttribute('d', `M ${x1.toFixed(2)},${y1.toFixed(2)} A ${r},${r} 0 ${largeArc} 1 ${x2.toFixed(2)},${y2.toFixed(2)}`);
}


function renderWeekChart(week) {
    const $plot = document.getElementById('d-chart-plot');
    if (!$plot || !week) return;

    const max = Math.max(...week.values, 1);
    const ceiling = niceCeiling(max);
    const avg = Math.round(week.values.reduce((s, v) => s + v, 0) / week.values.length);
    const avgPct = (avg / ceiling) * 100;

    document.querySelectorAll('[data-y-max]').forEach((el) => { el.textContent = ceiling; });
    document.querySelectorAll('[data-y-mid]').forEach((el) => { el.textContent = Math.round(ceiling / 2); });

    const $avg = document.getElementById('d-chart-avg');
    if ($avg) $avg.textContent = avg;

    const peakIndex = week.values.indexOf(max);
    const $headline = document.getElementById('d-chart-headline');
    if ($headline) {
        $headline.innerHTML = `Día más activo: <strong>${escapeHTML(week.days[peakIndex])}</strong> con <strong class="num">${max}</strong> respuestas`;
    }

    const bars = week.values.map((v, i) => {
        const pct = (v / ceiling) * 100;
        const isActive = i === week.todayIndex;
        return `
            <div class="d-chart__col${isActive ? ' d-chart__col--active' : ''}">
                ${isActive ? '<span class="d-chart__today">Hoy</span>' : ''}
                <span class="d-chart__value num">${v}</span>
                <div class="d-chart__bar-wrap">
                    <div class="d-chart__bar" style="height:${pct.toFixed(1)}%"></div>
                </div>
                <span class="d-chart__day${isActive ? ' d-chart__day--active' : ''}">${escapeHTML(week.days[i])}</span>
            </div>
        `;
    }).join('');

    const PLOT_H = 220, TOP_PAD = 18, BOT_PAD = 28;
    const barArea = PLOT_H - TOP_PAD - BOT_PAD;
    const avgBottomPx = BOT_PAD + (avgPct / 100) * barArea;

    $plot.innerHTML = `
        <div class="d-chart__avg-line" style="bottom:${avgBottomPx.toFixed(1)}px"></div>
        ${bars}
    `;
}


function niceCeiling(max) {
    if (max <= 50) return 50;
    if (max <= 100) return 100;
    if (max <= 200) return 200;
    if (max <= 500) return Math.ceil(max / 100) * 100;
    if (max <= 1000) return Math.ceil(max / 100) * 100;
    return Math.ceil(max / 250) * 250;
}


function renderSparkline($svg, values) {
    if (!$svg || !values || values.length < 2) return;
    const w = 100, h = 28, pad = 2;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = (max - min) || 1;
    const pts = values.map((v, i) => {
        const x = pad + (i / (values.length - 1)) * (w - 2 * pad);
        const y = h - pad - ((v - min) / range) * (h - 2 * pad);
        return [x, y];
    });
    const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const last = pts[pts.length - 1];
    const area = `${path} L ${last[0].toFixed(1)},${h} L ${pts[0][0].toFixed(1)},${h} Z`;
    $svg.innerHTML = `
        <path class="d-kpi__sparkline-area" d="${area}"/>
        <path class="d-kpi__sparkline-line" d="${path}"/>
        <circle class="d-kpi__sparkline-dot" cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="2.2"/>
    `;
}


function setKpi(key, opts) {
    const $v = document.getElementById(`${key}-value`);
    const $chip = document.getElementById(`${key}-chip`);
    const $chipText = document.getElementById(`${key}-chip-text`);
    const $hint = document.getElementById(`${key}-hint`);
    const $spark = document.getElementById(`spark-${key}`);

    if ($v && opts.value != null) $v.textContent = opts.value;
    if ($chipText && opts.chipText != null) $chipText.textContent = opts.chipText;
    if ($chip) {
        if (opts.tone) $chip.dataset.tone = opts.tone;
        else $chip.removeAttribute('data-tone');
    }
    if ($hint && opts.hint != null) $hint.textContent = opts.hint;
    if ($spark && opts.spark) renderSparkline($spark, opts.spark);
}


function renderKpis(room) {
    const sparks = room.kpiSparklines || {};
    setKpi('icc', {
        value: room.icc,
        chipText: room.iccDelta,
        tone: room.iccDeltaTone || 'moss',
        hint: room.iccHint,
        spark: sparks.icc,
    });
    setKpi('gap', {
        value: room.gap,
        chipText: room.gapDelta,
        tone: room.gapDeltaTone || 'amber',
        hint: room.gapHint,
        spark: sparks.gap,
    });
    setKpi('answers', {
        value: room.answers,
        chipText: room.answersDelta,
        tone: null,
        hint: room.answersHint,
        spark: sparks.answers,
    });
    setKpi('diags', {
        value: room.diags,
        chipText: room.diagsDelta,
        tone: room.diagsDeltaTone || 'amber',
        hint: room.diagsHint,
        spark: sparks.diags,
    });
}


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


function renderRoomsCompare() {
    const $list = document.getElementById('rooms-compare');
    if (!$list) return;

    const icons = {
        '1': '<svg class="icon-svg" width="14" height="14" viewBox="0 0 24 24"><path d="M12 2v6m0 0a4 4 0 0 0 4 4h2a4 4 0 0 1-4 4v6"/></svg>',
        '2': '<svg class="icon-svg" width="14" height="14" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z"/></svg>',
        '3': '<svg class="icon-svg" width="14" height="14" viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
    };

    const items = Object.entries(ROOMS).map(([id, room]) => `
      <li class="d-rooms__row" data-switch-room="${id}" tabindex="0">
        <span class="d-rooms__icon">${icons[id] || icons['3']}</span>
        <div class="d-rooms__main">
          <span class="d-rooms__name">${escapeHTML(room.name.split(' · ')[0])}</span>
          <span class="d-rooms__sub">${room.students} est.</span>
        </div>
        <span class="d-rooms__icc num">${room.icc}</span>
      </li>
    `).join('');

    $list.innerHTML = items;

    $list.querySelectorAll('[data-switch-room]').forEach((row) => {
        row.addEventListener('click', () => switchRoom(row.dataset.switchRoom));
        row.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                switchRoom(row.dataset.switchRoom);
            }
        });
    });
}


function switchRoom(roomId) {
    const room = ROOMS[String(roomId)];
    if (!room) return;

    const bind = (key, value, isHTML = false) => {
        document.querySelectorAll(`[data-bind="${key}"]`).forEach((el) => {
            if (isHTML) el.innerHTML = value;
            else el.textContent = value;
        });
    };

    const $tcr = document.getElementById('teacher-current-room');
    if ($tcr) $tcr.textContent = room.name;

    renderKpis(room);

    bind('insight', room.insight, true);
    document.querySelectorAll('[data-bind="insight-cta-href"]').forEach((el) => {
        el.setAttribute('href', room.insightHref);
    });

    room.trend.forEach((v, i) => bind(`trend-${i}`, v.toFixed(2)));
    bind('trend-footer', room.trendFooter, true);
    updateLineChart(room.trend);

    bind('donut-total', `${room.students} est.`);
    bind('prof-cal-count',  String(room.profileCounts.cal));
    bind('prof-over-count', String(room.profileCounts.over));
    bind('prof-und-count',  String(room.profileCounts.und));
    renderDotMatrix(room.profileCounts);
    renderDonut(room.profileCounts);

    if (room.weeklyActivity) {
        renderWeekChart(room.weeklyActivity);
        bind('week-total', room.weeklyActivity.total);
    }

    const iccPct = Math.round(parseFloat(room.icc) * 100);
    bind('gauge-pct', `${iccPct}%`);
    bind('gauge-label', 'Calibración del grupo');
    updateGauge(parseFloat(room.icc));

    bind('next-room', room.name.split(' · ')[0]);
    bind('next-students', String(room.students));
    bind('next-questions', String(Math.max(8, Math.floor(room.students / 6))));

    bind('bs-count', `${room.blindSpots.length} detectados`);
    bind('ar-count', `${room.atRisk.length} en riesgo`);

    const $bs = document.getElementById('teacher-blind-spots');
    const $ar = document.getElementById('teacher-at-risk');
    if ($bs) $bs.innerHTML = renderBlindSpotsList(room.blindSpots);
    if ($ar) $ar.innerHTML = renderAtRiskList(room.atRisk);
}


if (document.querySelector('[data-view="teacher"]')) {
    const { getActiveRoom } = await import(`../nav-auth.js?v=${_v}`);

    const init = () => {
        renderRoomsCompare();
        const room = getActiveRoom();
        switchRoom(String(room.id));
    };

    document.addEventListener('DOMContentLoaded', init);
    setTimeout(init, 0);

    window.addEventListener('cogniroom:roomchange', (e) => {
        switchRoom(String(e.detail.id));
    });
}


