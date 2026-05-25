const _v = new URL(import.meta.url).searchParams.get('v') || '';
const { auth, me, rooms, sessions, tokens, ApiError } = await import(`./api.js?v=${_v}`);
const { toast } = await import(`./toast.js?v=${_v}`);


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

    if (!items || items.length === 0) {
        $list.innerHTML = `<p class="empty">Aún no tienes salas. Crea una para empezar.</p>`;
        $count.textContent = '0 activas';
        $headerCount.textContent = '0';
        return;
    }

    $count.textContent = `${items.length} activa${items.length === 1 ? '' : 's'}`;
    $headerCount.textContent = String(items.length);

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
    if (!items || items.length === 0) {
        $list.innerHTML = `<p class="empty" style="margin:var(--s-4);">No hay puntos ciegos detectados en esta sala.</p>`;
        return;
    }
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
    if (!items || items.length === 0) {
        $list.innerHTML = `<li style="padding:var(--s-5);"><p class="empty">No hay estudiantes en riesgo. Buena noticia.</p></li>`;
        return;
    }
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
    document.getElementById('teacher-greeting').textContent = user.first_name
        ? `${user.last_name ? 'Dr/a. ' + user.last_name : user.first_name}`
        : user.username;

    try {
        const list = await rooms.list();
        renderRooms(list);

        const firstRoom = list && list[0];
        if (firstRoom) {
            document.getElementById('teacher-current-room').textContent = firstRoom.name;
            document.getElementById('metric-icc').textContent = '—';
            document.getElementById('metric-ipc').textContent = fmt(firstRoom.ipc_avg ?? 0);
            document.getElementById('metric-answers').textContent = '—';
            document.getElementById('metric-diags').textContent = '—';

            try {
                const [blindSpots, atRisk] = await Promise.all([
                    rooms.blindSpots(firstRoom.id),
                    rooms.atRisk(firstRoom.id),
                ]);
                renderBlindSpots(blindSpots);
                renderAtRisk(atRisk);
            } catch (_) {
                renderBlindSpots([]);
                renderAtRisk([]);
            }
        } else {
            document.getElementById('teacher-current-room').textContent = 'Sin salas';
            renderBlindSpots([]);
            renderAtRisk([]);
        }
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
            tokens.clear();
            location.replace('/app/');
            return;
        }
        toast(err?.message || 'Error al cargar salas', { kind: 'error' });
    }
}


async function bootstrap() {
    try {
        const user = await auth.me();
        $userName.textContent = user.username;
        $userRole.textContent = user.role;
        $userRole.dataset.role = user.role;

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
