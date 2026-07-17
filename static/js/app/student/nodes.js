const _v = new URL(import.meta.url).searchParams.get('v') || '';
const { me, tokens, ApiError } = await import(`../api.js?v=${_v}`);
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

function truncate(s, n) {
    s = String(s ?? '');
    return s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s;
}

function profileLabel(p) {
    return ({
        calibrated: 'Confianza justa',
        overconfident: 'Confía de más',
        underconfident: 'Confía de menos',
    })[p] || 'Confianza justa';
}

// Lectura humana de la brecha (cree − sabe), en puntos porcentuales. El umbral
// 20 coincide con la definición de perfil del proyecto (gap > 0.2 = sobreconfiado).
function nodeStatus(gapPct) {
    if (gapPct > 20)  return { tone: 'rust', text: 'Confía de más' };
    if (gapPct < -20) return { tone: 'stone', text: 'Confía de menos' };
    return { tone: 'moss', text: 'Confianza justa' };
}

function masteryColor(m) {
    if (m < 0.4) return 'var(--rust)';        // Por reforzar — coral (alerta)
    if (m < 0.6) return 'var(--stone)';       // En camino — cian claro
    if (m < 0.8) return 'var(--sage)';        // Bien encaminado — teal
    return 'var(--terracotta)';               // Dominado — petróleo (el más profundo)
}


function renderNodeCard(node) {
    const mastery = Math.round((node.p_mastery ?? 0) * 100);
    const conf = Math.round((node.avg_confidence ?? 0) * 100);
    const gap = conf - mastery;
    const gapAbs = Math.abs(gap);
    const st = nodeStatus(gap);
    const attempts = node.attempts ?? 0;
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
            <span class="node-card__mastery-label eyebrow">domina el tema</span>
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
          <span><span class="num">${attempts}</span> ${attempts === 1 ? 'intento' : 'intentos'}</span>
          <span class="node-card__status" data-tone="${st.tone}">${st.text}</span>
        </footer>
      </article>
    `;
}


function renderNodes(nodes) {
    const $grid = document.getElementById('student-nodes-grid');
    const $count = document.getElementById('nodes-count');
    if (!$grid) return;
    if (!nodes || nodes.length === 0) {
        $grid.innerHTML = '<p class="empty" style="flex:1;">Aún no hay temas seguidos. Inicie una evaluación para empezar a registrar lo que sabe.</p>';
        if ($count) $count.textContent = '0';
        return;
    }
    if ($count) $count.textContent = String(nodes.length);
    $grid.innerHTML = nodes.map(renderNodeCard).join('');
}


// Mapa jerárquico: TÚ al centro, las SALAS en una órbita interna, y los TEMAS de
// cada sala en su propio sector (con el color de la sala). Elipse (Y aplastada)
// para caber en el viewBox 100x70.
const KG_CX = 50;
const KG_CY = 35;
const KG_YS = 0.72;
const ROOM_PALETTE = ['--sage', '--terracotta', '--stone', '--moss', '--amber', '--rust', '--sage-strong', '--terracotta-soft'];

function buildGraph(nodes) {
    const byRoom = new Map();
    for (const node of (nodes || [])) {
        const key = node.room_id ?? `s-${node.room_name || ''}`;
        if (!byRoom.has(key)) byRoom.set(key, { id: key, name: node.room_name || 'Sin sala', topics: [] });
        byRoom.get(key).topics.push(node);
    }
    const rooms = [...byRoom.values()];
    const R = rooms.length;

    const roomNodes = [];
    const topicNodes = [];
    rooms.forEach((room, ri) => {
        const angle = R === 1 ? -Math.PI / 2 : -Math.PI / 2 + (ri / R) * Math.PI * 2;
        const color = `var(${ROOM_PALETTE[ri % ROOM_PALETTE.length]})`;
        const rx = KG_CX + 15 * Math.cos(angle);
        const ry = KG_CY + 15 * KG_YS * Math.sin(angle);
        roomNodes.push({ id: `room-${room.id}`, name: room.name, count: room.topics.length, x: rx, y: ry, color });

        const T = room.topics.length;
        const sliceHalf = (Math.PI * 2 / Math.max(R, 1)) * 0.42;
        room.topics.forEach((t, ti) => {
            const a = T === 1 ? angle : angle - sliceHalf + (ti / (T - 1)) * 2 * sliceHalf;
            const rad = 25 + (ti % 2) * 4;  // escalonar par/impar reduce solapes
            topicNodes.push({
                id_node: t.node_id,
                name: t.name || t.node_name || 'Tema',
                roomColor: color,
                roomX: rx, roomY: ry,
                p_mastery: t.p_mastery ?? 0,
                avg_confidence: t.avg_confidence ?? (t.p_mastery ?? 0),
                attempts: t.attempts ?? 0,
                x: KG_CX + rad * Math.cos(a),
                y: KG_CY + rad * KG_YS * Math.sin(a),
            });
        });
    });
    return { roomNodes, topicNodes };
}


const SVGNS = 'http://www.w3.org/2000/svg';
function el(tag, attrs) {
    const node = document.createElementNS(SVGNS, tag);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    return node;
}


// Constelación viva: nodos que flotan, conexiones con energía fluyendo, núcleo
// pulsante, hover que resalta y entrada animada. Se construye una vez y un loop
// de requestAnimationFrame actualiza posiciones (barato, son pocos nodos).
function renderKnowledgeGraph(graph) {
    const $svg = document.getElementById('knowledge-graph-svg');
    const $readout = document.getElementById('knowledge-graph-readout');
    if (!$svg) return;
    $svg.innerHTML = '';
    const { roomNodes, topicNodes } = graph;

    let hover = null;  // { kind: 'topic' | 'room', id }
    const topicById = Object.fromEntries(topicNodes.map((n) => [n.id_node, n]));
    const roomById = Object.fromEntries(roomNodes.map((r) => [r.id, r]));

    const updateReadout = () => {
        if (!$readout) return;
        if (!hover) {
            $readout.innerHTML = '<span class="knowledge-graph__readout-empty">Pasa el cursor sobre un tema · rueda para acercar · arrastra para mover</span>';
            return;
        }
        if (hover.kind === 'room') {
            const r = roomById[hover.id];
            $readout.innerHTML = `
                <span class="knowledge-graph__readout-name">${escapeHTML(r.name)}</span>
                <div class="knowledge-graph__readout-nums"><span>${r.count} tema${r.count === 1 ? '' : 's'}</span></div>`;
            return;
        }
        const n = topicById[hover.id];
        const know = Math.round(n.p_mastery * 100);
        const think = Math.round(n.avg_confidence * 100);
        const st = nodeStatus(think - know);
        $readout.innerHTML = `
            <span class="knowledge-graph__readout-name">${escapeHTML(n.name)}</span>
            <div class="knowledge-graph__readout-nums">
                <span>Sabe <b>${know}%</b></span>
                <span>Cree saber <b>${think}%</b></span>
            </div>
            <span class="knowledge-graph__readout-tag" data-tone="${st.tone}">${st.text}</span>`;
    };

    const defs = el('defs', {});
    defs.innerHTML = `
        <pattern id="kg-grid" width="5" height="5" patternUnits="userSpaceOnUse">
          <path d="M 5 0 L 0 0 0 5" fill="none" stroke="var(--paper-border)" stroke-width="0.1"/>
        </pattern>
        <radialGradient id="kg-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="var(--sage)" stop-opacity="0.6"/>
          <stop offset="100%" stop-color="var(--sage)" stop-opacity="0"/>
        </radialGradient>`;
    $svg.appendChild(defs);
    // Fondo amplio: la grilla llena la vista al hacer zoom/pan y es la superficie
    // de arrastre para mover el mapa (los nodos van encima y reciben su click).
    const bg = el('rect', { x: -100, y: -100, width: 300, height: 300, fill: 'url(#kg-grid)', opacity: 0.6 });
    $svg.appendChild(bg);

    // TÚ -> sala (dashes que fluyen, con el color de la sala).
    roomNodes.forEach((r) => {
        const line = el('line', {
            x1: KG_CX, y1: KG_CY, x2: r.x, y2: r.y,
            stroke: r.color, 'stroke-width': 0.35, 'stroke-dasharray': '0.9 1.2', opacity: 0.5,
        });
        line.appendChild(el('animate', { attributeName: 'stroke-dashoffset', from: 4.2, to: 0, dur: '1.8s', repeatCount: 'indefinite' }));
        $svg.appendChild(line);
    });

    // sala -> tema (el float del tema actualiza el extremo).
    const topicLines = topicNodes.map((n) => {
        const line = el('line', {
            x1: n.roomX, y1: n.roomY, x2: n.x, y2: n.y,
            stroke: n.roomColor, 'stroke-width': 0.22, 'stroke-dasharray': '0.6 1.1', opacity: 0.35,
        });
        $svg.appendChild(line);
        return line;
    });

    // Núcleo TÚ con glow pulsante.
    const glow = el('circle', { cx: KG_CX, cy: KG_CY, r: 8, fill: 'url(#kg-core)' });
    glow.appendChild(el('animate', { attributeName: 'r', values: '7;10.5;7', dur: '3.5s', repeatCount: 'indefinite' }));
    glow.appendChild(el('animate', { attributeName: 'opacity', values: '0.9;0.5;0.9', dur: '3.5s', repeatCount: 'indefinite' }));
    $svg.appendChild(glow);
    $svg.appendChild(el('circle', { cx: KG_CX, cy: KG_CY, r: 2.6, fill: 'var(--sage)', stroke: 'var(--paper)', 'stroke-width': 0.5 }));
    const coreLabel = el('text', {
        x: KG_CX, y: KG_CY + 5.6, 'text-anchor': 'middle', 'font-size': 1.5,
        'letter-spacing': 0.3, fill: 'var(--ink-muted)', 'font-family': 'Inter', 'font-weight': 600,
    });
    coreLabel.textContent = 'TÚ';
    $svg.appendChild(coreLabel);

    // Salas: nodo intermedio discreto + etiqueta eyebrow (mono, mayúscula, muted).
    roomNodes.forEach((r) => {
        const g = el('g', {});
        g.style.cursor = 'pointer';
        g.appendChild(el('circle', { cx: r.x, cy: r.y, r: 1.9, fill: r.color, opacity: 0.12 }));
        g.appendChild(el('circle', { cx: r.x, cy: r.y, r: 1.3, fill: 'var(--paper)', stroke: r.color, 'stroke-width': 0.45 }));
        const lbl = el('text', {
            x: r.x, y: r.y < KG_CY ? r.y - 2.5 : r.y + 3,
            'text-anchor': 'middle', 'font-size': 1.2,
            'letter-spacing': 0.18, fill: 'var(--ink-faint)', 'font-family': 'Inter', 'font-weight': 600,
        });
        lbl.textContent = truncate((r.name || '').toUpperCase(), 16);
        g.appendChild(lbl);
        g.addEventListener('mouseenter', () => { hover = { kind: 'room', id: r.id }; updateReadout(); });
        g.addEventListener('mouseleave', () => { hover = null; updateReadout(); });
        $svg.appendChild(g);
    });

    // Temas: cada uno flota; su línea a la sala lo sigue.
    const items = topicNodes.map((n, i) => {
        const baseR = 1.5 + n.attempts * 0.08;
        const color = masteryColor(n.p_mastery);
        const over = (n.avg_confidence - n.p_mastery) > 0.2;

        const g = el('g', {});
        g.style.cursor = 'pointer';
        if (over) {
            const aura = el('circle', {
                cx: n.x, cy: n.y, r: baseR + 1.5, fill: 'none', stroke: 'var(--rust)',
                'stroke-width': 0.22, 'stroke-dasharray': '0.7 0.6', opacity: 0.7,
            });
            aura.appendChild(el('animateTransform', {
                attributeName: 'transform', type: 'rotate',
                from: `0 ${n.x} ${n.y}`, to: `360 ${n.x} ${n.y}`, dur: '28s', repeatCount: 'indefinite',
            }));
            g.appendChild(aura);
        }
        const halo = el('circle', { cx: n.x, cy: n.y, r: baseR + 0.7, fill: color, opacity: 0.14 });
        g.appendChild(halo);
        g.appendChild(el('circle', { cx: n.x, cy: n.y, r: baseR, fill: color, stroke: 'var(--paper)', 'stroke-width': 0.4 }));
        const label = el('text', {
            x: n.x, y: n.y < KG_CY ? n.y - baseR - 1.2 : n.y + baseR + 2,
            'text-anchor': 'middle', 'font-size': 1.3,
            fill: 'var(--ink-muted)', 'font-family': 'Inter', 'font-weight': 500,
        });
        label.textContent = truncate(n.name, 16);
        g.appendChild(label);

        g.addEventListener('mouseenter', () => {
            hover = { kind: 'topic', id: n.id_node };
            halo.setAttribute('r', baseR + 2);
            halo.setAttribute('opacity', '0.3');
            updateReadout();
        });
        g.addEventListener('mouseleave', () => {
            hover = null;
            halo.setAttribute('r', baseR + 0.7);
            halo.setAttribute('opacity', '0.14');
            updateReadout();
        });
        g.addEventListener('click', () => { location.href = `/app/node/${n.id_node}/`; });
        $svg.appendChild(g);

        return {
            n, g, line: topicLines[i], baseX: n.x, baseY: n.y,
            phase: i * 1.7,
            ampX: 0.8 + (i % 3) * 0.25,
            ampY: 0.6 + (i % 2) * 0.35,
            speed: 0.4 + (i % 4) * 0.08,
            delay: i * 0.06,
        };
    });

    // Loop: flotación de temas + entrada + énfasis de hover.
    const startT = performance.now();
    const frame = (now) => {
        const t = (now - startT) / 1000;
        items.forEach((it) => {
            const dx = it.ampX * Math.sin(t * it.speed + it.phase);
            const dy = it.ampY * Math.cos(t * it.speed * 0.85 + it.phase);
            it.g.setAttribute('transform', `translate(${dx.toFixed(3)} ${dy.toFixed(3)})`);
            it.line.setAttribute('x2', (it.baseX + dx).toFixed(3));
            it.line.setAttribute('y2', (it.baseY + dy).toFixed(3));

            const appear = Math.min(1, Math.max(0, (t - it.delay) / 0.5));
            const on = hover && hover.kind === 'topic' && hover.id === it.n.id_node;
            const lit = !hover || on;
            it.g.style.opacity = (appear * (lit ? 1 : 0.3)).toFixed(3);
            it.line.setAttribute('opacity', ((on ? 0.8 : 0.35) * appear).toFixed(3));
        });
        requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    updateReadout();

    // --- Zoom (rueda, hacia el cursor) + pan (arrastrar el fondo) ---
    const VB0 = { x: 0, y: 0, w: 100, h: 70 };
    const vb = { ...VB0 };
    const applyVB = () => $svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);

    $svg.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = $svg.getBoundingClientRect();
        const mx = vb.x + ((e.clientX - rect.left) / rect.width) * vb.w;
        const my = vb.y + ((e.clientY - rect.top) / rect.height) * vb.h;
        const factor = e.deltaY < 0 ? 0.85 : 1 / 0.85;
        const nw = Math.max(28, Math.min(100, vb.w * factor));
        const nh = nw * 0.7;
        vb.x = mx - (mx - vb.x) * (nw / vb.w);
        vb.y = my - (my - vb.y) * (nh / vb.h);
        vb.w = nw; vb.h = nh;
        applyVB();
    }, { passive: false });

    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    bg.style.cursor = 'grab';
    bg.addEventListener('mousedown', (e) => {
        dragging = true; lastX = e.clientX; lastY = e.clientY;
        bg.style.cursor = 'grabbing';
    });
    window.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        const rect = $svg.getBoundingClientRect();
        vb.x -= ((e.clientX - lastX) / rect.width) * vb.w;
        vb.y -= ((e.clientY - lastY) / rect.height) * vb.h;
        lastX = e.clientX; lastY = e.clientY;
        applyVB();
    });
    window.addEventListener('mouseup', () => { dragging = false; bg.style.cursor = 'grab'; });
    // Doble clic en el fondo: volver a la vista completa.
    $svg.addEventListener('dblclick', () => { Object.assign(vb, VB0); applyVB(); });
}


// Mensaje que orienta y da ánimo: interpreta el perfil y señala por dónde empezar.
function renderInsight(profileKey, nodes) {
    const $box = document.getElementById('nodes-insight');
    const $text = document.getElementById('nodes-insight-text');
    if (!$box || !$text) return;

    if (!nodes.length) {
        $box.hidden = true;
        return;
    }

    const base = {
        overconfident: 'Lo que cree saber suele superar lo que realmente sabe. Reconocerlo es el primer paso para corregirlo.',
        underconfident: 'Lo que realmente sabe supera lo que cree saber: sus bases son más sólidas de lo que indican sus respuestas.',
        calibrated: 'Tu autoevaluación coincide con lo que realmente sabe. Esa precisión favorece el aprendizaje.',
    }[profileKey] || '';

    const weakest = [...nodes].sort((a, b) => (a.p_mastery ?? 0) - (b.p_mastery ?? 0))[0];
    const wpct = Math.round((weakest.p_mastery ?? 0) * 100);
    const wname = escapeHTML(weakest.name || weakest.node_name || 'el tema que menos domina');

    const action = wpct >= 80
        ? ' Todos tus temas presentan un nivel sólido; conviene mantenerlo.'
        : ` Conviene comenzar por <strong>${wname}</strong> (${wpct}%), el tema con mayor margen de mejora.`;

    $text.innerHTML = base + action;
    $box.hidden = false;
}


function renderSummary(profile, nodes) {
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    const pct = (x) => (x == null || Number.isNaN(x)) ? '—' : `${Math.round(x * 100)}%`;

    // Sin respuestas todavía no hay perfil: estado neutro en vez de valores
    // fabricados (perfil "calibrated" y 0% no son reales sin evaluaciones).
    const hasData = (profile.total_answers ?? 0) > 0;
    set('nodes-hero-icc', hasData ? pct(profile.icc_avg) : '—');
    set('nodes-hero-mastery', hasData ? pct(profile.avg_mastery) : '—');
    set('nodes-hero-count', String((nodes || []).length));

    const profileKey = profile.predominant_profile || 'calibrated';
    const $pill = document.getElementById('nodes-hero-pill');
    if ($pill) {
        $pill.textContent = hasData ? profileLabel(profileKey) : 'Sin datos aún';
        $pill.dataset.profile = hasData ? profileKey : '';
    }
    const hints = {
        overconfident: 'lo que cree saber supera lo que sabe',
        underconfident: 'lo que sabe supera lo que cree saber',
        calibrated: 'tu autoevaluación es precisa',
    };
    set('nodes-hero-profile-hint', hasData ? (hints[profileKey] || '') : 'aún no te has evaluado');

    renderInsight(profileKey, nodes || []);
}


async function load() {
    let profile, nodes;
    try {
        [profile, nodes] = await Promise.all([me.profile(), me.nodes()]);
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
            tokens.clear();
            location.replace('/app/');
            return;
        }
        toast('No se pudieron cargar tus temas.', { kind: 'error' });
        return;
    }

    renderSummary(profile || {}, nodes || []);
    renderNodes(nodes || []);

    const graph = buildGraph(nodes || []);
    if (graph.topicNodes.length) renderKnowledgeGraph(graph);
}

load();
