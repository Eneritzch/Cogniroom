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
        overconfident: 'Sobreconfiado',
        underconfident: 'Subconfiado',
        calibrated: 'Calibrado',
    })[p] || '—';
}

function gapSubText(gapPts) {
    const a = Math.abs(gapPts);
    if (gapPts < -15) return `tu confianza está ${a} pts por debajo de tu dominio`;
    if (gapPts > 15)  return `tu confianza supera tu dominio en ${a} pts`;
    return 'confianza y dominio bien alineados';
}

// Momentos reveladores: alta confianza con error, o baja confianza con acierto.
function answerFlag(declared, is_correct) {
    if (!is_correct && declared >= 0.65) return { tone: 'rust', text: 'Sobreconfianza' };
    if (is_correct && declared <= 0.45)  return { tone: 'stone', text: 'Subestimación' };
    return null;
}

function fmt(n, decimals = 2) {
    return typeof n === 'number' ? n.toFixed(decimals) : '—';
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


function profileFromGap(gap) {
    if (gap > 0.15)  return 'overconfident';
    if (gap < -0.15) return 'underconfident';
    return 'calibrated';
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
        ? 'dominio sólido' : mast >= 50 ? 'en construcción' : 'requiere práctica';
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
        msg = `En este tema tu dominio real (<strong>${mast}%</strong>) supera tu confianza declarada (<strong>${conf}%</strong>). Conviene reforzar la confianza y continuar practicando para consolidarlo.`;
    } else if (n.profile === 'overconfident') {
        tone = 'amber';
        msg = `En este tema tu confianza declarada (<strong>${conf}%</strong>) supera tu dominio real (<strong>${mast}%</strong>). Conviene repasarlo antes de avanzar.`;
    } else {
        tone = 'moss';
        msg = `En este tema tu autoevaluación coincide con tu dominio real (declaraste <strong>${conf}%</strong>, dominas <strong>${mast}%</strong>). Un nivel de ajuste recomendable.`;
    }

    $box.dataset.tone = tone;
    $text.innerHTML = msg;
    $box.hidden = false;
}


function paintBkt(n) {
    document.getElementById('bkt-mastery').textContent = fmt(n.p_mastery, 3);
    document.getElementById('bkt-transit').textContent = fmt(n.p_transit, 3);
    document.getElementById('bkt-guess').textContent = fmt(n.p_guess, 3);
    document.getElementById('bkt-slip').textContent = fmt(n.p_slip, 3);
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
    const list = n.recentResponses || [];
    $count.textContent = `${list.length} respuesta${list.length === 1 ? '' : 's'}`;

    if (list.length === 0) {
        $list.innerHTML = `<li class="node-response" style="cursor:default; opacity:0.6;">
            <div class="node-response__body">
                <p class="node-response__statement">Aún no respondiste preguntas de este nodo.</p>
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
                <svg class="icon-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
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
                        Confianza ${confPct}%
                    </span>
                    <span>·</span>
                    <span>Dominio ${masteryPct}</span>
                    <span>·</span>
                    <span>Sesión #${r.id_session}</span>
                </div>
            </div>
            <span class="node-response__arrow" aria-hidden="true">
                <svg class="icon-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
            </span>
        </a>`;
    }).join('');
}


function paintNotFound() {
    document.getElementById('node-topic').textContent = '—';
    document.getElementById('node-name').textContent = 'Nodo no encontrado';
    document.getElementById('node-room-name').textContent = '—';
    document.getElementById('node-updated').textContent = 'Sin datos';
    document.getElementById('node-responses').innerHTML = `<li class="node-response" style="cursor:default;">
        <div class="node-response__body">
            <p class="node-response__statement">No tenemos datos para este nodo todavía. Volvé al dashboard y elegí otro.</p>
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
        toast('No se pudo cargar el nodo.', { kind: 'error' });
        return;
    }

    paintHeader(node);
    paintKpis(node);
    paintInsight(node);
    paintBkt(node);
    paintAi(node);
    paintResponses(node);
}


init();
