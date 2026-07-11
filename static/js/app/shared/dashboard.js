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
        calibrated: 'Confianza justa',
        overconfident: 'Confía de más',
        underconfident: 'Confía de menos',
    })[profile] || 'Confianza justa';
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
            <span class="node-card__mastery-label eyebrow">Lo que realmente sabe</span>
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
          <span>Lo que realmente sabe <span class="num">${fmt(bkt)}</span></span>
          <span>Diferencia <span class="num node-card__gap" data-tone="${tone}">${gap >= 0 ? '+' : ''}${gap}</span></span>
        </footer>
      </article>
    `;
}


function renderStudentNodes(nodes) {
    const $grid = document.getElementById('student-nodes-grid');
    const $count = document.getElementById('nodes-count');
    if (!nodes || nodes.length === 0) {
        $grid.innerHTML = `<p class="empty" style="flex:1;">Aún no hay temas registrados. Inicia una sesión para empezar a registrar lo que realmente sabe.</p>`;
        $count.textContent = '0';
        return;
    }
    $count.textContent = String(nodes.length);
    $grid.innerHTML = nodes.map(renderStudentNodeCard).join('');
}


const DIAG_RISK_LABELS = { high: 'Riesgo alto', medium: 'Riesgo medio', low: 'Riesgo bajo' };

function renderStudentDiagnosis(diag) {
    if (!diag) return;

    const classification = diag.classification || 'calibrated';
    const risk = diag.risk_level || 'medium';

    const $title = document.getElementById('student-diag-title');
    if ($title) {
        const title = diag.title || DIAG_TITLES[classification] || 'Diagnóstico disponible';
        $title.textContent = `«${title}»`;
    }

    const $risk = document.getElementById('student-diag-risk');
    if ($risk) {
        $risk.textContent = DIAG_RISK_LABELS[risk] || 'Riesgo medio';
        $risk.dataset.risk = risk;
    }
    const $class = document.getElementById('student-diag-classification');
    if ($class) {
        $class.textContent = profileLabel(classification);
        $class.dataset.profile = classification;
    }
    const $fail = document.getElementById('student-diag-failprob');
    if ($fail) {
        $fail.textContent = diag.failure_probability != null
            ? `p=${Number(diag.failure_probability).toFixed(2)}`
            : 'p=—';
    }
    const $meta = document.getElementById('student-diag-meta');
    if ($meta) $meta.hidden = false;

    const $sug = document.getElementById('student-diag-suggestion');
    const $sugText = document.getElementById('student-diag-suggestion-text');
    if (diag.recommendation && $sug && $sugText) {
        $sugText.textContent = diag.recommendation;
        $sug.hidden = false;
    } else if ($sug) {
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
            name: n.name || n.node_name || 'Tema',
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
            $readout.innerHTML = '<span class="knowledge-graph__readout-empty">// pasa el cursor sobre un tema</span>';
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
          <a href="/app/metrics/" class="room-card" data-room-id="${r.id_room ?? r.id}" style="text-decoration:none;color:inherit;">
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

    // Al abrir una sala se fija como activa; las páginas dedicadas (Métricas,
    // etc.) operan sobre esa sala.
    $list.querySelectorAll('[data-room-id]').forEach((a) => {
        a.addEventListener('click', () => {
            localStorage.setItem('cogniroom.activeRoomId', String(a.dataset.roomId));
        });
    });
}


function renderBlindSpots(items) {
    const $list = document.getElementById('teacher-blind-spots');
    if (!$list) return;
    if (!items || items.length === 0) {
        $list.innerHTML = `<p class="empty" style="padding:var(--s-3);">Sin puntos ciegos del grupo detectados todavía.</p>`;
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
              <button class="blind-spots__action" type="button">Ver tema →</button>
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
        const label = s.quadrant_label || profileLabel(profile);
        const tone = gapPts >= 0 ? 'amber' : 'stone';
        return `
          <li class="at-risk__row"${s.critical ? ' data-critical="true"' : ''}>
            <div class="at-risk__student">
              <span class="at-risk__avatar" aria-hidden="true">${escapeHTML(initials)}</span>
              <span class="at-risk__name">${escapeHTML(fullName)}</span>
            </div>
            <div><span class="pill" data-quadrant="${profile}">${escapeHTML(label)}</span></div>
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
        $list.innerHTML = `<p class="empty">No estás inscrito en ninguna sala todavía</p>`;
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
    overconfident: 'Confía de más: cree saber más de lo que realmente sabe',
    underconfident: 'Confía de menos: sabe más de lo que cree',
    calibrated: 'Confianza justa: lo que cree y lo que sabe coinciden',
};

const STUDENT_NOTE = {
    overconfident: 'Lo que crees saber supera lo que realmente sabes en la mayoría de los temas. No es un problema de estudio — es un problema de autoconocimiento.',
    underconfident: 'Sabes más de lo que crees. Ganar confianza en lo que ya dominas es parte del trabajo.',
    calibrated: 'Lo que crees saber y lo que realmente sabes están bien alineados. Ese es un buen autoconocimiento.',
};
const STUDENT_NOTE_EMPTY = 'Aún no tienes datos. Responde una evaluación para descubrir qué tan bien te conoces.';


const CATEGORY_LABEL = {
    recordar:   'Memoria (hechos y fechas)',
    comprender: 'Comprensión',
    aplicar:    'Aplicación',
    analizar:   'Análisis',
    evaluar:    'Evaluación / criterio',
    crear:      'Creación',
};

// En qué categoría cognitiva acierta más / menos el estudiante (nivel de Bloom
// de las preguntas). Se oculta si aún no respondió preguntas categorizadas.
function renderStudentCategories(categories) {
    const $section = document.getElementById('student-categories-section');
    const $wrap = document.getElementById('student-categories');
    if (!$section || !$wrap) return;
    if (!categories || categories.length === 0) {
        $section.hidden = true;
        return;
    }
    $section.hidden = false;
    $wrap.innerHTML = categories.map((c) => {
        const acc = Math.round((c.accuracy ?? 0) * 100);
        const tone = c.weak ? 'rust' : acc >= 80 ? 'moss' : 'amber';
        const label = CATEGORY_LABEL[c.level] || c.level;
        return `
          <div class="student-cat${c.weak ? ' student-cat--weak' : ''}">
            <div class="student-cat__row">
              <span class="student-cat__name">${escapeHTML(label)}</span>
              <span class="student-cat__val num">${acc}%</span>
            </div>
            <div class="student-cat__track"><span class="student-cat__fill" data-tone="${tone}" style="width:${acc}%"></span></div>
            <span class="student-cat__hint">${c.weak ? 'Es donde más fallas — dale prioridad.' : `${c.correct} de ${c.total} correctas`}</span>
          </div>`;
    }).join('');
}


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

    // Sin respuestas todavía no hay métricas: mostrar estado neutro, no valores
    // fabricados (icc=0 daría un "gap" de +100 y un relato de sobreconfianza falso).
    const hasData = (profile.total_answers ?? 0) > 0;
    const iccAvg = profile.icc_avg ?? 0;
    const masteryAvg = profile.avg_mastery ?? 0;
    const profileKey = hasData ? (profile.predominant_profile || 'calibrated') : 'calibrated';
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
    $pill.textContent = hasData ? profileLabel(profileKey) : 'Sin datos aún';
    $pill.dataset.profile = hasData ? profileKey : '';

    const $note = document.getElementById('student-note');
    if ($note) $note.textContent = hasData ? STUDENT_NOTE[profileKey] : STUDENT_NOTE_EMPTY;

    const $mast = document.getElementById('student-mini-mastery');
    const $gap = document.getElementById('student-mini-gap');
    $mast.textContent = hasData ? fmt(masteryAvg) : '—';
    $gap.textContent = hasData ? `${gap >= 0 ? '+' : ''}${gap}` : '—';
    $gap.dataset.tone = hasData ? gapTone(gap) : '';

    renderStudentCategories(profile.categories || []);

    const latestDiag = (diagnoses || [])[0];
    if (latestDiag) {
        renderStudentDiagnosis(latestDiag);
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
    renderCalibrationBars(TEACHER_ROOMS);

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
    set('answers-value', list.reduce((s, r) => s + (r.session_count || 0), 0));
    set('diags-value', list.reduce((s, r) => s + (r.diagnosis_count || 0), 0));
}


function bindData(key, value) {
    document.querySelectorAll(`[data-bind="${key}"]`).forEach((el) => { el.textContent = value; });
}


function countProfiles(roster) {
    // Se cuenta por CUADRANTE (dominio real × confianza), no por el perfil de 3
    // vías basado en la brecha: así "Salud del grupo" coincide con las alertas.
    let cal = 0, over = 0, und = 0, aware = 0, nodata = 0;
    (roster || []).forEach((s) => {
        switch (s.quadrant) {
            case 'calibrated':     cal += 1;   break;
            case 'overconfident':  over += 1;  break;
            case 'underconfident': und += 1;   break;
            case 'aware_gap':      aware += 1; break;
            default:               nodata += 1;  // sin datos cognitivos aún
        }
    });
    return { cal, over, und, aware, nodata };
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
    const R = 48;
    const C = 2 * Math.PI * R;
    const total = (counts.cal || 0) + (counts.over || 0) + (counts.und || 0) + (counts.aware || 0);

    const set = (sel, len, offset) => {
        const el = document.querySelector(sel);
        if (!el) return;
        // Con extremos redondeados, un segmento de longitud 0 se dibuja como un
        // puntito; lo ocultamos para que el estado vacío/parcial se vea limpio.
        el.style.visibility = len > 0 ? 'visible' : 'hidden';
        el.style.strokeDasharray  = `${len.toFixed(2)} ${(C - len + 1).toFixed(2)}`;
        el.style.strokeDashoffset = `${(-offset).toFixed(2)}`;
    };

    // La leyenda siempre refleja los conteos reales.
    const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v || 0; };
    setVal('donut-cal', counts.cal);
    setVal('donut-over', counts.over);
    setVal('donut-und', counts.und);
    setVal('donut-aware', counts.aware);

    const $pct = document.getElementById('donut-pct');
    const $label = document.querySelector('.d-donut__label');

    // Nadie con datos aún: anillo vacío + "Sin datos", no un 100% fabricado.
    if (total === 0) {
        set('.d-donut__seg--cal',  0, 0);
        set('.d-donut__seg--over', 0, 0);
        set('.d-donut__seg--und',  0, 0);
        set('.d-donut__seg--aware', 0, 0);
        if ($pct) { $pct.textContent = '—'; $pct.removeAttribute('data-tone'); }
        if ($label) $label.textContent = (counts.nodata || 0) > 0 ? 'Sin evaluaciones' : 'Sin estudiantes';
        return;
    }

    const calArc   = (counts.cal   / total) * C;
    const overArc  = (counts.over  / total) * C;
    const undArc   = (counts.und   / total) * C;
    const awareArc = (counts.aware / total) * C;

    set('.d-donut__seg--cal',   calArc,   0);
    set('.d-donut__seg--over',  overArc,  calArc);
    set('.d-donut__seg--und',   undArc,   calArc + overArc);
    set('.d-donut__seg--aware', awareArc, calArc + overArc + undArc);

    // El centro resume la salud metacognitiva: % del grupo cuya confianza coincide
    // con lo que realmente sabe. Son DOS cuadrantes alineados: "sabe y confía" (cal)
    // y "no sabe y lo reconoce" (aware) — ambos son "bien calibrados". Solo están
    // descalibrados los que confían de más (over) o de menos (und).
    const calPct = Math.round(((counts.cal + counts.aware) / total) * 100);
    if ($pct) {
        $pct.textContent = `${calPct}%`;
        $pct.setAttribute('data-tone', calPct >= 60 ? 'moss' : calPct >= 35 ? 'amber' : 'rust');
    }
    if ($label) $label.textContent = 'Bien calibrados';
}


function renderDotMatrix(counts) {
    const $matrix = document.getElementById('dot-matrix');
    if (!$matrix) return;
    const dots = [];
    for (let i = 0; i < counts.cal; i++)   dots.push('moss');
    for (let i = 0; i < counts.over; i++)  dots.push('rust');
    for (let i = 0; i < counts.und; i++)   dots.push('stone');
    for (let i = 0; i < (counts.aware || 0); i++) dots.push('amber');

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


function renderCalibrationBars(list) {
    const $el = document.getElementById('calibration-bars');
    if (!$el) return;

    const rooms = (list || []).filter((r) => r.is_active !== false);
    if (!rooms.length) {
        $el.innerHTML = '<li class="empty" style="margin:0;">Aún no hay salas con datos de calibración.</li>';
        return;
    }

    // Ordenadas de mejor a peor calibración. Se reparten el ancho (responsive).
    const top = [...rooms].sort((a, b) => (b.icc || 0) - (a.icc || 0));
    $el.innerHTML = top.map((r) => {
        const icc = r.icc || 0;
        const pct = Math.round(icc * 100);
        const tone = icc >= 0.65 ? 'moss' : icc >= 0.5 ? 'amber' : 'rust';
        const name = escapeHTML(String(r.name).split(' · ')[0]);
        const full = escapeHTML(r.name);
        const atRisk = r.at_risk_count || 0;
        const riskTxt = `${atRisk} ${atRisk === 1 ? 'estudiante' : 'estudiantes'} por intervenir`;
        let desc;
        if (pct === 0) {
            desc = 'Aún sin evaluaciones para medir la calibración.';
        } else if (icc >= 0.65) {
            desc = 'El grupo se conoce bien: lo que creen saber coincide con lo que realmente saben.';
        } else if (icc >= 0.5) {
            desc = 'Calibración media: hay una brecha notable entre lo que creen y lo que saben.';
        } else {
            desc = 'Baja calibración: la mayoría cree saber bastante más (o menos) de lo que realmente sabe.';
        }
        return `
      <li class="calbar">
        <span class="calbar__tip">
          <span class="calbar__tip-name">${full}</span>
          <span class="calbar__tip-pct" data-tone="${tone}">${pct}% de calibración</span>
          <span class="calbar__tip-desc">${desc}</span>
          <span class="calbar__tip-risk" data-has-risk="${atRisk > 0}">${riskTxt}</span>
        </span>
        <span class="calbar__val num">${pct}%</span>
        <span class="calbar__track">
          <span class="calbar__fill" data-tone="${tone}" style="height:${pct}%"></span>
        </span>
        <span class="calbar__name" title="${full}">${name}</span>
      </li>`;
    }).join('');
}


function renderRoomsCompare(list) {
    const $list = document.getElementById('rooms-compare');
    if (!$list) return;

    // Tamaño fijo: solo las 4 salas más recientes (la lista viene ordenada por
    // -created_at). Para verlas todas está el enlace del encabezado a /app/rooms/.
    $list.innerHTML = (list || []).slice(0, 4).map((r) => {
        const n = r.member_count ?? 0;
        const sub = n > 0
            ? `<span class="d-rooms__sub">${n} ${n === 1 ? 'estudiante' : 'estudiantes'}</span>`
            : '';
        return `
      <li class="d-rooms__row" data-switch-room="${r.id}" tabindex="0">
        <span class="d-rooms__icon">${_roomIcon}</span>
        <div class="d-rooms__main">
          <span class="d-rooms__name">${escapeHTML(String(r.name).split(' · ')[0])}</span>
          ${sub}
        </div>
      </li>`;
    }).join('');

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
