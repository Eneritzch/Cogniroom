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
    if (gapPct > 20)  return { tone: 'amber', text: 'Confía de más' };
    if (gapPct < -20) return { tone: 'stone', text: 'Confía de menos' };
    return { tone: 'moss', text: 'Confianza justa' };
}

function masteryColor(m) {
    if (m < 0.4) return 'var(--rust)';
    if (m < 0.6) return 'var(--amber)';
    if (m < 0.8) return 'var(--sage)';
    return 'var(--moss)';
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


// Constelación: vos en el centro, los nodos orbitando en una elipse.
const KG_CX = 50;
const KG_CY = 35;

function buildGraphNodes(nodes) {
    if (!nodes || !nodes.length) return [];
    const n = nodes.length;
    const Rx = 33;
    const Ry = 23;
    return nodes.map((node, i) => {
        let x;
        let y;
        if (n === 1) {
            x = KG_CX;
            y = KG_CY - 20;
        } else {
            const ang = (-90 + (i / n) * 360) * Math.PI / 180;
            x = KG_CX + Rx * Math.cos(ang);
            y = KG_CY + Ry * Math.sin(ang);
        }
        return {
            id_node: node.node_id,
            name: node.name || node.node_name || 'Tema',
            description: node.description || '',
            p_mastery: node.p_mastery ?? 0,
            avg_confidence: node.avg_confidence ?? (node.p_mastery ?? 0),
            attempts: node.attempts ?? 0,
            x, y,
        };
    });
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
function renderKnowledgeGraph(graphNodes) {
    const $svg = document.getElementById('knowledge-graph-svg');
    const $readout = document.getElementById('knowledge-graph-readout');
    if (!$svg) return;
    $svg.innerHTML = '';

    let hover = null;
    const byId = Object.fromEntries(graphNodes.map((n) => [n.id_node, n]));

    const updateReadout = () => {
        if (!$readout) return;
        if (!hover) {
            $readout.innerHTML = '<span class="knowledge-graph__readout-empty">Pasa el cursor sobre un tema</span>';
            return;
        }
        const n = byId[hover];
        const know = Math.round(n.p_mastery * 100);
        const think = Math.round(n.avg_confidence * 100);
        const st = nodeStatus(think - know);
        $readout.innerHTML = `
            <span class="knowledge-graph__readout-name">${escapeHTML(n.name)}</span>
            <div class="knowledge-graph__readout-nums">
                <span>Sabe <b>${know}%</b></span>
                <span>Cree saber <b>${think}%</b></span>
            </div>
            <span class="knowledge-graph__readout-tag" data-tone="${st.tone}">${st.text}</span>
        `;
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
    $svg.appendChild(el('rect', { width: 100, height: 70, fill: 'url(#kg-grid)', opacity: 0.6 }));

    // Conexiones con dashes que fluyen del centro al nodo.
    const lines = graphNodes.map((n) => {
        const line = el('line', {
            x1: KG_CX, y1: KG_CY, x2: n.x, y2: n.y,
            stroke: 'var(--sage)', 'stroke-width': 0.25,
            'stroke-dasharray': '0.8 1.4', opacity: 0.4,
        });
        line.appendChild(el('animate', {
            attributeName: 'stroke-dashoffset', from: 4.4, to: 0, dur: '1.6s', repeatCount: 'indefinite',
        }));
        $svg.appendChild(line);
        return line;
    });

    // Núcleo "VOS" con glow pulsante.
    const glow = el('circle', { cx: KG_CX, cy: KG_CY, r: 8, fill: 'url(#kg-core)' });
    glow.appendChild(el('animate', { attributeName: 'r', values: '7;10.5;7', dur: '3.5s', repeatCount: 'indefinite' }));
    glow.appendChild(el('animate', { attributeName: 'opacity', values: '0.9;0.5;0.9', dur: '3.5s', repeatCount: 'indefinite' }));
    $svg.appendChild(glow);
    $svg.appendChild(el('circle', { cx: KG_CX, cy: KG_CY, r: 2.6, fill: 'var(--sage)', stroke: 'var(--paper)', 'stroke-width': 0.5 }));
    const coreLabel = el('text', {
        x: KG_CX, y: KG_CY + 5.6, 'text-anchor': 'middle', 'font-size': 1.5,
        'letter-spacing': 0.3, fill: 'var(--ink-muted)', 'font-family': 'JetBrains Mono',
    });
    coreLabel.textContent = 'VOS';
    $svg.appendChild(coreLabel);

    // Nodos: cada uno es un grupo; el float traslada el grupo entero.
    const items = graphNodes.map((n, i) => {
        const baseR = 1.8 + n.attempts * 0.12;
        const color = masteryColor(n.p_mastery);
        const over = (n.avg_confidence - n.p_mastery) > 0.2;

        const g = el('g', {});
        g.style.cursor = 'pointer';

        if (over) {
            const aura = el('circle', {
                cx: n.x, cy: n.y, r: baseR + 1.8, fill: 'none', stroke: 'var(--amber)',
                'stroke-width': 0.2, 'stroke-dasharray': '0.8 0.6', opacity: 0.75,
            });
            aura.appendChild(el('animateTransform', {
                attributeName: 'transform', type: 'rotate',
                from: `0 ${n.x} ${n.y}`, to: `360 ${n.x} ${n.y}`, dur: '28s', repeatCount: 'indefinite',
            }));
            g.appendChild(aura);
        }
        const halo = el('circle', { cx: n.x, cy: n.y, r: baseR + 0.9, fill: color, opacity: 0.18 });
        g.appendChild(halo);
        const circle = el('circle', { cx: n.x, cy: n.y, r: baseR, fill: color, stroke: 'var(--paper)', 'stroke-width': 0.4 });
        g.appendChild(circle);
        const label = el('text', {
            x: n.x, y: n.y + baseR + 2.4, 'text-anchor': 'middle', 'font-size': 1.7,
            fill: 'var(--ink)', 'font-family': 'Inter', 'font-weight': 500,
        });
        label.textContent = n.name;
        g.appendChild(label);
        const mlabel = el('text', {
            x: n.x, y: n.y + baseR + 4.3, 'text-anchor': 'middle', 'font-size': 1.3,
            fill: 'var(--ink-faint)', 'font-family': 'JetBrains Mono',
        });
        mlabel.textContent = n.p_mastery.toFixed(2);
        g.appendChild(mlabel);

        g.addEventListener('mouseenter', () => {
            hover = n.id_node;
            halo.setAttribute('r', baseR + 2.4);
            halo.setAttribute('opacity', '0.34');
            updateReadout();
        });
        g.addEventListener('mouseleave', () => {
            hover = null;
            halo.setAttribute('r', baseR + 0.9);
            halo.setAttribute('opacity', '0.18');
            updateReadout();
        });
        g.addEventListener('click', () => { location.href = `/app/node/${n.id_node}/`; });
        $svg.appendChild(g);

        return {
            n, g, line: lines[i],
            baseX: n.x, baseY: n.y,
            phase: i * 1.7,
            ampX: 1 + (i % 3) * 0.3,
            ampY: 0.8 + (i % 2) * 0.4,
            speed: 0.4 + (i % 4) * 0.08,
            delay: i * 0.09,
        };
    });

    // Loop: flotación orgánica + entrada escalonada + énfasis de hover.
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
            const lit = !hover || hover === it.n.id_node;
            it.g.style.opacity = (appear * (lit ? 1 : 0.28)).toFixed(3);
            const lineOp = hover === it.n.id_node ? 0.85 : (hover ? 0.08 : 0.4 * appear);
            it.line.setAttribute('opacity', lineOp.toFixed(3));
        });
        requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    updateReadout();
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

    const graphNodes = buildGraphNodes(nodes || []);
    if (graphNodes.length) renderKnowledgeGraph(graphNodes);
}

load();
