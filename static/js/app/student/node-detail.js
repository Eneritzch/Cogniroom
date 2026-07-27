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
        overconfident: 'Confía de más',
        underconfident: 'Confía de menos',
        calibrated: 'Confianza justa',
    })[p] || '—';
}

function gapSubText(gapPts) {
    const a = Math.abs(gapPts);
    if (gapPts < -15) return `lo que cree saber está ${a} pts por debajo de lo que sabe`;
    if (gapPts > 15)  return `lo que cree saber supera lo que sabe en ${a} pts`;
    return 'lo que cree saber y lo que sabe están bien alineados';
}

// Momentos reveladores: alta confianza con error, o baja confianza con acierto.
function answerFlag(declared, is_correct) {
    if (!is_correct && declared >= 0.65) return { tone: 'rust', text: 'Confió de más' };
    if (is_correct && declared <= 0.45)  return { tone: 'stone', text: 'Se subestimó' };
    return null;
}

function getNodeId() {
    const m = location.pathname.match(/\/app\/node\/([^/]+)\/?/);
    return m ? decodeURIComponent(m[1]) : null;
}


const NODE_ID = getNodeId();


function fmtDateLong(iso) {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(2);
    const hh = String(d.getHours()).padStart(2, '0');
    const mn = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yy} · ${hh}:${mn}`;
}


function masteryTone(m) {
    if (m < 0.4) return 'rust';
    if (m < 0.6) return 'amber';
    if (m < 0.8) return 'sage';
    return 'moss';
}


function gapToneFromPts(gapPts) {
    if (Math.abs(gapPts) <= 15) return 'moss';
    if (gapPts > 15)  return 'amber';
    if (gapPts < -15) return 'stone';
    return 'moss';
}


function confTone(declared, is_correct) {
    if (is_correct && declared >= 0.65) return 'moss';
    if (!is_correct && declared >= 0.70) return 'rust';
    return 'amber';
}


function paintHeader(n) {
    document.getElementById('node-topic').textContent = n.description || '';
    document.getElementById('node-name').textContent = n.name;
    document.getElementById('node-room-name').textContent = n.room.name;
    document.getElementById('node-updated').textContent = `Actualizado ${fmtDateLong(n.updated_at)}`;

    const $pill = document.getElementById('node-profile-pill');
    $pill.textContent = profileLabel(n.profile);
    $pill.dataset.profile = n.profile;
}


function paintKpis(n) {
    const conf = Math.round(n.avg_confidence * 100);
    const mast = Math.round(n.bkt_mastery * 100);
    const gapPts = conf - mast;

    document.getElementById('node-mastery').textContent = `${mast}%`;
    document.getElementById('node-mastery').dataset.tone = masteryTone(n.bkt_mastery);

    document.getElementById('node-confidence').textContent = `${conf}%`;

    const $mastBar = document.getElementById('node-mastery-bar');
    if ($mastBar) { $mastBar.style.width = `${mast}%`; $mastBar.dataset.tone = masteryTone(n.bkt_mastery); }
    const $confBar = document.getElementById('node-confidence-bar');
    if ($confBar) $confBar.style.width = `${conf}%`;

    const gapEl = document.getElementById('node-gap');
    gapEl.textContent = `${gapPts >= 0 ? '+' : ''}${gapPts}`;
    gapEl.dataset.tone = gapToneFromPts(gapPts);
    document.getElementById('node-gap-sub').textContent = gapSubText(gapPts);

    document.getElementById('node-attempts').textContent = n.attempts;

    const $ring = document.getElementById('node-ring');
    const $fill = $ring.querySelector('.calibration-ring__fill');
    const $val = document.getElementById('node-ring-value');
    const $sub = document.getElementById('node-ring-sub');
    const r = 63;
    const C = 2 * Math.PI * r;
    const clamped = Math.max(0, Math.min(1, n.icc_value));
    const offset = C * (1 - clamped);
    $fill.setAttribute('stroke-dasharray', C.toFixed(2));
    $fill.setAttribute('stroke-dashoffset', offset.toFixed(2));
    $val.textContent = `${Math.round(clamped * 100)}%`;
    $ring.dataset.profile = n.profile;
    $sub.textContent = `${profileLabel(n.profile)} · ${n.attempts} pregunta${n.attempts === 1 ? '' : 's'}`;

    document.getElementById('node-mastery-sub').textContent = mast >= 70
        ? 'nivel sólido' : mast >= 50 ? 'en construcción' : 'requiere práctica';
}


function paintInsight(n) {
    const $box = document.getElementById('node-insight');
    const $text = document.getElementById('node-insight-text');
    if (!$box || !$text) return;

    const conf = Math.round(n.avg_confidence * 100);
    const mast = Math.round(n.bkt_mastery * 100);

    let msg;
    let tone;
    if (n.profile === 'underconfident') {
        tone = 'stone';
        msg = `En este tema lo que realmente sabe (<strong>${mast}%</strong>) supera lo que cree saber (<strong>${conf}%</strong>). Conviene reforzar la confianza y continuar practicando para consolidarlo.`;
    } else if (n.profile === 'overconfident') {
        tone = 'amber';
        msg = `En este tema lo que cree saber (<strong>${conf}%</strong>) supera lo que realmente sabe (<strong>${mast}%</strong>). Conviene repasarlo antes de avanzar.`;
    } else {
        tone = 'moss';
        msg = `En este tema tu autoevaluación coincide con lo que realmente sabe (cree saber <strong>${conf}%</strong>, domina <strong>${mast}%</strong>). Un nivel de ajuste recomendable.`;
    }

    $box.dataset.tone = tone;
    $text.innerHTML = msg;
    $box.hidden = false;
}


function paintBkt(n) {
    setBktRow('bkt-mastery', n.p_mastery);
    setBktRow('bkt-transit', n.p_transit);
    setBktRow('bkt-guess', n.p_guess);
    setBktRow('bkt-slip', n.p_slip);
}

// Cada parámetro del modelo (0–1) se muestra como % con barra: el número solo
// no le dice nada al estudiante; la barra hace tangible la magnitud.
function setBktRow(id, value) {
    const pct = Math.round(Math.max(0, Math.min(1, value ?? 0)) * 100);
    document.getElementById(id).textContent = `${pct}%`;
    const bar = document.getElementById(`${id}-bar`);
    if (bar) bar.style.width = `${pct}%`;
}


// widget "Tendencia · últimas 7 semanas" removido (ventana temporal prohibida por schema v2026-06).
// Limpiar #node-trend-svg, #node-trend-axis, #node-trend-delta y el <article class="node-card--trend"> en node-detail.html.


function paintAi(n) {
    if (!n.diagnosis) return;
    const $card = document.getElementById('node-ai-card');
    $card.hidden = false;
    document.getElementById('node-ai-title').textContent = n.diagnosis.title;
    document.getElementById('node-ai-body').textContent = n.diagnosis.reasoning || '';
    document.getElementById('node-ai-date').textContent = fmtDateLong(n.diagnosis.generated_at);
    if (n.diagnosis.recommendation) {
        document.getElementById('node-ai-rec').hidden = false;
        document.getElementById('node-ai-rec-text').textContent = n.diagnosis.recommendation;
    }
}


function paintResponses(n) {
    const $list = document.getElementById('node-responses');
    const $count = document.getElementById('node-responses-count');
    const list = n.recent_answers || [];
    $count.textContent = `${list.length} respuesta${list.length === 1 ? '' : 's'}`;

    if (list.length === 0) {
        $list.innerHTML = `<li class="node-response" style="cursor:default; opacity:0.6;">
            <div class="node-response__body">
                <p class="node-response__statement">Aún no ha respondido preguntas de este tema.</p>
            </div>
        </li>`;
        return;
    }

    $list.innerHTML = list.map((r) => {
        const confPct = Math.round((r.confidence_declared ?? 0) * 100);
        const masteryFallback = Math.max(0, (r.confidence_declared ?? 0) - 0.15);
        const masteryVal = r.bkt_mastery ?? masteryFallback;
        const masteryPct = `${Math.round(masteryVal * 100)}%`;
        const flag = answerFlag(r.confidence_declared ?? 0, r.is_correct);
        return `
        <a class="node-response" href="/app/session/${r.id_session}/review/" data-correct="${r.is_correct}">
            <span class="node-response__icon" aria-hidden="true">
                <svg aria-hidden="true" class="icon-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    ${r.is_correct
                        ? '<polyline points="20 6 9 17 4 12"></polyline>'
                        : '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>'}
                </svg>
            </span>
            <div class="node-response__body">
                <p class="node-response__statement">${escapeHTML(r.statement)}</p>
                ${flag ? `<span class="node-response__flag" data-tone="${flag.tone}">${flag.text}</span>` : ''}
                <div class="node-response__meta">
                    <span>${fmtDateLong(r.answered_at)}</span>
                    <span>·</span>
                    <span class="node-response__conf" data-tone="${confTone(r.confidence_declared, r.is_correct)}">
                        Cree saber ${confPct}%
                    </span>
                    <span>·</span>
                    <span>Sabe ${masteryPct}</span>
                    <span>·</span>
                    <span>Sesión #${r.id_session}</span>
                </div>
            </div>
            <span class="node-response__arrow" aria-hidden="true">
                <svg aria-hidden="true" class="icon-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
            </span>
        </a>`;
    }).join('');
}


// Categorías cognitivas (nivel de Bloom) con etiqueta corta e icono, para un
// feedback visual y sin jerga de en qué tipo de pregunta acierta el estudiante.
const CATEGORY = {
    recordar:   { label: 'Memoria',     icon: '<rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>' },
    comprender: { label: 'Comprensión', icon: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>' },
    aplicar:    { label: 'Aplicación',  icon: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>' },
    analizar:   { label: 'Análisis',    icon: '<circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>' },
    evaluar:    { label: 'Criterio',    icon: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>' },
    crear:      { label: 'Creación',    icon: '<path d="M12 3v18"></path><path d="M3 12h18"></path>' },
};

const CAT_STATUS = { rust: 'Repasa', amber: 'A medias', moss: 'Bien' };

function catTone(acc) {
    if (acc < 0.5) return 'rust';
    if (acc < 0.8) return 'amber';
    return 'moss';
}

function paintCategories(n) {
    const $section = document.getElementById('node-cats');
    const $grid = document.getElementById('node-cats-grid');
    if (!$section || !$grid) return;

    const cats = n.categories || [];
    if (cats.length === 0) { $section.hidden = true; return; }
    $section.hidden = false;

    $grid.innerHTML = cats.map((c) => {
        const acc = Math.round((c.accuracy ?? 0) * 100);
        const tone = catTone(c.accuracy ?? 0);
        const meta = CATEGORY[c.level] || { label: c.level, icon: '<circle cx="12" cy="12" r="9"></circle>' };
        return `
          <article class="catcard" data-tone="${tone}" title="${escapeHTML(meta.label)}: ${c.correct} de ${c.total} correctas">
            <span class="catcard__icon" aria-hidden="true">
              <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${meta.icon}</svg>
            </span>
            <span class="catcard__pct num">${acc}%</span>
            <span class="catcard__label">${escapeHTML(meta.label)}</span>
            <div class="catcard__bar"><span class="catcard__fill" style="width:${acc}%"></span></div>
            <span class="catcard__status">${CAT_STATUS[tone]}</span>
          </article>`;
    }).join('');
}


function paintNotFound() {
    document.getElementById('node-topic').textContent = '—';
    document.getElementById('node-name').textContent = 'Tema no encontrado';
    document.getElementById('node-room-name').textContent = '—';
    document.getElementById('node-updated').textContent = 'Sin datos';
    document.getElementById('node-responses').innerHTML = `<li class="node-response" style="cursor:default;">
        <div class="node-response__body">
            <p class="node-response__statement">No tenemos datos para este tema todavía. Vuelva al dashboard y elija otro.</p>
        </div>
    </li>`;
}


async function init() {
    if (!NODE_ID) {
        paintNotFound();
        return;
    }
    let node;
    try {
        node = await me.node(NODE_ID);
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
            tokens.clear();
            location.replace('/app/');
            return;
        }
        if (err instanceof ApiError && err.status === 404) {
            paintNotFound();
            return;
        }
        toast('No se pudo cargar el tema.', { kind: 'error' });
        return;
    }

    paintHeader(node);
    paintKpis(node);
    paintInsight(node);
    paintCategories(node);
    paintBkt(node);
    paintAi(node);
    paintResponses(node);
}


init();
