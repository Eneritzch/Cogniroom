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

function gapTone(gap) {
    if (gap > 15)  return 'amber';
    if (gap < -15) return 'stone';
    return 'moss';
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
    const suggestion = diag.student_recommendation || '';
    if (suggestion && $sug && $sugText) {
        $sugText.textContent = suggestion;
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
        const hint = c.weak ? 'Es donde más fallas — dale prioridad.' : `${c.correct} de ${c.total} correctas`;
        return `
          <div class="student-cat${c.weak ? ' student-cat--weak' : ''}" title="${escapeHTML(hint)}">
            <span class="student-cat__name">${escapeHTML(label)}</span>
            <div class="student-cat__track"><span class="student-cat__fill" data-tone="${tone}" style="width:${acc}%"></span></div>
            <span class="student-cat__val num">${acc}%</span>
          </div>`;
    }).join('');
}


async function bootstrapStudent(user) {
    $studentView.hidden = false;
    document.getElementById('student-greeting').textContent = user.first_name || user.username;

    let profile, nodes, diagnoses;
    try {
        [profile, nodes, diagnoses] = await Promise.all([
            me.profile(),
            me.nodes(),
            me.diagnoses(),
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


async function bootstrapTeacher() {
    $teacherView.hidden = false;

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

    // El panel solo grafica la distribución de cuadrantes de la sala activa; el
    // detalle (puntos ciegos, en riesgo, listados) vive en /app/metrics/.
    const heatmap = await rooms.heatmap(room.id).catch(() => null);
    renderDonut(countProfiles(heatmap && heatmap.roster));
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
            await bootstrapTeacher();
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

    // Bien calibrados = los dos cuadrantes alineados: "sabe y confía" y "no sabe y lo
    // reconoce". Descalibrados son solo los que confían de más o de menos.
    const calPct = Math.round(((counts.cal + counts.aware) / total) * 100);
    if ($pct) {
        $pct.textContent = `${calPct}%`;
        $pct.setAttribute('data-tone', calPct >= 60 ? 'moss' : calPct >= 35 ? 'amber' : 'rust');
    }
    if ($label) $label.textContent = 'Bien calibrados';
}


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


// Cambia la sala activa: persiste y emite roomchange (que dispara loadRoomData
// acá y, en otras páginas docentes, su propia recarga).
