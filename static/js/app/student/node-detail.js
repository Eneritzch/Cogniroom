const _v = new URL(import.meta.url).searchParams.get('v') || '';
const { tokens } = await import(`../api.js?v=${_v}`);
const { STUDENT_DATA, escapeHTML, profileLabel, fmt } = await import(`./student-mock.js?v=${_v}`);


if (!tokens.access) {
    location.replace('/app/');
}


function getNodeId() {
    const m = location.pathname.match(/\/app\/node\/([^/]+)\/?/);
    return m ? decodeURIComponent(m[1]) : null;
}


const NODE_ID = getNodeId();


function fmtDate(iso) {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}`;
}


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


function confTone(declared, isCorrect) {
    if (isCorrect && declared >= 65) return 'moss';
    if (!isCorrect && declared >= 70) return 'rust';
    return 'amber';
}


function paintHeader(n) {
    document.getElementById('node-topic').textContent = n.topic;
    document.getElementById('node-name').textContent = n.name;
    document.getElementById('node-room-name').textContent = n.roomName;
    document.getElementById('node-room-link').href = `/app/room/${n.roomId}/`;
    document.getElementById('node-updated').textContent = `Actualizado ${fmtDateLong(n.updatedAt)}`;

    const $pill = document.getElementById('node-profile-pill');
    $pill.textContent = profileLabel(n.profile);
    $pill.dataset.profile = n.profile;
}


function paintKpis(n) {
    const conf = Math.round(n.avgConfidence * 100);
    const mast = Math.round(n.bktMastery * 100);
    const gapPts = conf - mast;

    document.getElementById('node-mastery').textContent = `${mast}%`;
    document.getElementById('node-mastery').dataset.tone = masteryTone(n.bktMastery);

    document.getElementById('node-confidence').textContent = `${conf}%`;

    const gapEl = document.getElementById('node-gap');
    gapEl.textContent = `${gapPts >= 0 ? '+' : ''}${gapPts}`;
    gapEl.dataset.tone = gapToneFromPts(gapPts);

    document.getElementById('node-attempts').textContent = n.attempts;

    const $ring = document.getElementById('node-ring');
    const $fill = $ring.querySelector('.calibration-ring__fill');
    const $val = document.getElementById('node-ring-value');
    const $sub = document.getElementById('node-ring-sub');
    const r = 63;
    const C = 2 * Math.PI * r;
    const clamped = Math.max(0, Math.min(1, n.iccValue));
    const offset = C * (1 - clamped);
    $fill.setAttribute('stroke-dasharray', C.toFixed(2));
    $fill.setAttribute('stroke-dashoffset', offset.toFixed(2));
    $val.textContent = clamped.toFixed(2);
    $ring.dataset.profile = n.profile;
    $sub.textContent = `${profileLabel(n.profile)} · ${n.attempts} intentos`;

    document.getElementById('node-mastery-sub').textContent = mast >= 70
        ? 'dominio sólido' : mast >= 50 ? 'en construcción' : 'requiere práctica';
}


function paintBkt(n) {
    document.getElementById('bkt-mastery').textContent = fmt(n.pMastery, 3);
    document.getElementById('bkt-transit').textContent = fmt(n.pTransit, 3);
    document.getElementById('bkt-guess').textContent = fmt(n.pGuess, 3);
    document.getElementById('bkt-slip').textContent = fmt(n.pSlip, 3);
}


function paintTrend(n) {
    const $svg = document.getElementById('node-trend-svg');
    const $axis = document.getElementById('node-trend-axis');
    const h = n.history;
    if (!h || h.length === 0) return;

    const W = 200;
    const H = 100;
    const stepX = h.length > 1 ? W / (h.length - 1) : 0;

    const pathFor = (key) => h.map((p, i) => {
        const x = i * stepX;
        const y = H - p[key] * H;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ');

    const ns = 'http://www.w3.org/2000/svg';
    $svg.innerHTML = '';

    [0.25, 0.50, 0.75].forEach((v) => {
        const line = document.createElementNS(ns, 'line');
        line.setAttribute('x1', 0);
        line.setAttribute('x2', W);
        line.setAttribute('y1', (H - v * H).toFixed(2));
        line.setAttribute('y2', (H - v * H).toFixed(2));
        line.setAttribute('stroke', 'var(--paper-border-strong)');
        line.setAttribute('stroke-dasharray', '2 3');
        line.setAttribute('stroke-width', '0.5');
        line.setAttribute('opacity', '0.6');
        $svg.appendChild(line);
    });

    const series = [
        { key: 'icc',        color: 'var(--sage)',       width: 2 },
        { key: 'mastery',    color: 'var(--terracotta)', width: 2 },
        { key: 'confidence', color: 'var(--amber)',      width: 2 },
    ];

    series.forEach((s) => {
        const path = document.createElementNS(ns, 'path');
        path.setAttribute('d', pathFor(s.key));
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', s.color);
        path.setAttribute('stroke-width', s.width);
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        $svg.appendChild(path);

        h.forEach((p, i) => {
            const x = i * stepX;
            const y = H - p[s.key] * H;
            const c = document.createElementNS(ns, 'circle');
            c.setAttribute('cx', x);
            c.setAttribute('cy', y);
            c.setAttribute('r', '1.6');
            c.setAttribute('fill', s.color);
            $svg.appendChild(c);
        });
    });

    $axis.innerHTML = h.map((p) => `<span>${fmtDate(p.date)}</span>`).join('');

    const first = h[0];
    const last = h[h.length - 1];
    const delta = last.icc - first.icc;
    const sign = delta > 0 ? '+' : '';
    const arrow = delta > 0.02 ? '▲' : delta < -0.02 ? '▼' : '◇';
    const $delta = document.getElementById('node-trend-delta');
    $delta.textContent = `ICC ${arrow} ${sign}${fmt(delta)}`;
}


function paintAi(n) {
    if (!n.diagnosis) return;
    const $card = document.getElementById('node-ai-card');
    $card.hidden = false;
    document.getElementById('node-ai-title').textContent = n.diagnosis.title;
    document.getElementById('node-ai-body').textContent = n.diagnosis.reasoning;
    document.getElementById('node-ai-date').textContent = fmtDateLong(n.diagnosis.generatedAt);
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

    $list.innerHTML = list.map((r) => `
        <a class="node-response" href="/app/session/${r.sessionId}/review/" data-correct="${r.isCorrect}">
            <span class="node-response__icon" aria-hidden="true">
                <svg class="icon-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    ${r.isCorrect
                        ? '<polyline points="20 6 9 17 4 12"></polyline>'
                        : '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>'}
                </svg>
            </span>
            <div class="node-response__body">
                <p class="node-response__statement">${escapeHTML(r.statement)}</p>
                <div class="node-response__meta">
                    <span>${fmtDateLong(r.when)}</span>
                    <span>·</span>
                    <span class="node-response__conf" data-tone="${confTone(r.confidence, r.isCorrect)}">
                        Confianza ${r.confidence}
                    </span>
                    <span>·</span>
                    <span>Sesión #${r.sessionId}</span>
                </div>
            </div>
            <span class="node-response__arrow" aria-hidden="true">
                <svg class="icon-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
            </span>
        </a>`).join('');
}


function paintRelated(n) {
    const $card = document.getElementById('node-related-card');
    const $list = document.getElementById('node-related');
    const items = n.relatedNodes || [];
    if (items.length === 0) return;
    $card.hidden = false;
    $list.innerHTML = items.map((r) => {
        const pct = Math.round(r.mastery * 100);
        const tone = masteryTone(r.mastery);
        return `<a class="node-related__item" href="${r.link}">
            <span class="node-related__name">${escapeHTML(r.name)}</span>
            <div class="node-related__bar">
                <div class="node-related__bar-fill" data-tone="${tone}" style="width:${pct}%;"></div>
            </div>
            <span class="node-related__v">${pct}%</span>
        </a>`;
    }).join('');
}


function init() {
    const node = STUDENT_DATA.nodeDetails[NODE_ID];
    if (!node) {
        document.getElementById('node-topic').textContent = '—';
        document.getElementById('node-name').textContent = 'Nodo no encontrado';
        document.getElementById('node-room-name').textContent = '—';
        document.getElementById('node-updated').textContent = 'Sin datos';
        document.getElementById('node-responses').innerHTML = `<li class="node-response" style="cursor:default;">
            <div class="node-response__body">
                <p class="node-response__statement">No tenemos datos para este nodo todavía. Volvé al dashboard y elegí otro.</p>
            </div>
        </li>`;
        return;
    }

    paintHeader(node);
    paintKpis(node);
    paintBkt(node);
    paintTrend(node);
    paintAi(node);
    paintResponses(node);
    paintRelated(node);
}


init();
