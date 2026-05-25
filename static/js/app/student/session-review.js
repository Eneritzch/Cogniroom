const _v = new URL(import.meta.url).searchParams.get('v') || '';
const { tokens } = await import(`../api.js?v=${_v}`);
const { STUDENT_DATA, escapeHTML, fmt, generateAnswersForSession } = await import(`./student-mock.js?v=${_v}`);


if (!tokens.access) {
    location.replace('/app/');
}


function getSessionId() {
    const m = location.pathname.match(/\/app\/session\/(\d+)\/review/);
    return m ? Number(m[1]) : null;
}

const SESSION_ID = getSessionId();
let currentFilter = 'all';


function fmtDate(iso) {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(2);
    const hh = String(d.getHours()).padStart(2, '0');
    const mn = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yy} · ${hh}:${mn}`;
}


function fmtDuration(min) {
    if (min == null) return '—';
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h}h ${m}m`;
}


function fmtTime(sec) {
    if (!sec) return '—';
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
}


function accuracyTone(pct) {
    if (pct >= 75) return 'moss';
    if (pct >= 50) return 'amber';
    return 'rust';
}


function gapTone(gapPts) {
    if (Math.abs(gapPts) <= 15) return 'moss';
    if (gapPts > 15)  return 'amber';
    if (gapPts < -15) return 'stone';
    return 'moss';
}


function gapForAnswer(a) {
    return a.confidenceDeclared - Math.round(a.bktMastery * 100);
}


function paintHeader(session, answers) {
    document.getElementById('review-room-name').textContent = session.roomName;
    document.getElementById('review-date').textContent = fmtDate(session.startedAt);
    document.getElementById('review-duration').textContent = fmtDuration(session.durationMin);
    document.getElementById('review-id').textContent = `Sesión #${session.id}`;

    const correct = answers.filter((a) => a.isCorrect).length;
    const pct = answers.length ? Math.round((correct / answers.length) * 100) : 0;
    document.getElementById('review-accuracy').textContent = `${pct}%`;
    document.getElementById('review-accuracy').dataset.tone = accuracyTone(pct);
    document.getElementById('review-accuracy-sub').textContent = `${correct} de ${answers.length}`;

    const dSign = session.iccDelta == null ? '' : (session.iccDelta > 0 ? '+' : '');
    const dValue = session.iccDelta == null ? '—' : `${dSign}${fmt(session.iccDelta)}`;
    const iccEl = document.getElementById('review-icc');
    iccEl.textContent = dValue;
    iccEl.dataset.tone = session.iccDelta > 0.02 ? 'moss'
        : session.iccDelta < -0.02 ? 'rust' : 'amber';

    const gaps = answers.map(gapForAnswer);
    const avgGap = gaps.length ? Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length) : 0;
    const gapEl = document.getElementById('review-gap');
    gapEl.textContent = `${avgGap >= 0 ? '+' : ''}${avgGap}`;
    gapEl.dataset.tone = avgGap > 15 ? 'amber' : avgGap < -15 ? 'stone' : 'moss';

    const aiCount = answers.filter((a) => a.aiFeedback).length;
    document.getElementById('review-ai-count').textContent = aiCount;
}


function renderStrip(answers) {
    const $strip = document.getElementById('review-strip');
    $strip.innerHTML = answers.map((a, i) => {
        const state = a.isCorrect ? 'correct' : 'wrong';
        const hasAi = a.aiFeedback ? 'true' : 'false';
        const label = `Pregunta ${i + 1}: ${a.isCorrect ? 'acertada' : 'fallada'}${a.aiFeedback ? ' (con feedback IA)' : ''}`;
        return `<li>
            <button type="button" class="review-cell" data-state="${state}" data-has-ai="${hasAi}" data-jump="${i}" aria-label="${escapeHTML(label)}" title="${escapeHTML(label)}">${i + 1}</button>
        </li>`;
    }).join('');

    $strip.querySelectorAll('[data-jump]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const idx = Number(btn.dataset.jump);
            const $q = document.getElementById(`rq-${idx}`);
            if (!$q) return;
            $q.classList.add('is-open');
            $q.scrollIntoView({ behavior: 'smooth', block: 'start' });
            updateToggleAllLabel();
        });
    });
}


function renderOptions(a) {
    const letters = ['A', 'B', 'C', 'D'];
    return a.options.map((opt, idx) => {
        const isCorrect = idx === a.correctIndex;
        const isPicked = idx === a.selectedIndex;
        let state = '';
        let flag = '';
        if (isCorrect && isPicked) {
            state = 'correct';
            flag = `<span class="rq__opt-flag" data-flag="picked-ok">Tu respuesta · Correcta</span>`;
        } else if (isCorrect) {
            state = 'correct';
            flag = `<span class="rq__opt-flag" data-flag="correct">Correcta</span>`;
        } else if (isPicked) {
            state = 'picked-wrong';
            flag = `<span class="rq__opt-flag" data-flag="picked">Tu respuesta</span>`;
        }
        return `<li class="rq__opt" data-state="${state}">
            <span class="rq__opt-letter">${letters[idx]}</span>
            <span class="rq__opt-text">${escapeHTML(opt.text)}</span>
            ${flag}
        </li>`;
    }).join('');
}


function renderQuestion(a, i) {
    const conf = a.confidenceDeclared;
    const mast = Math.round(a.bktMastery * 100);
    const gap = conf - mast;
    const gapT = gapTone(gap);
    const hasAi = !!a.aiFeedback;

    const aiBlock = hasAi
        ? `<aside class="rq__ai" role="note" aria-label="Feedback del tutor cognitivo">
            <header class="rq__ai-head">
                <svg class="icon-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"></path>
                </svg>
                Tutor cognitivo · Claude
            </header>
            <h4 class="rq__ai-title">${escapeHTML(a.aiFeedback.title)}</h4>
            <p class="rq__ai-body">${escapeHTML(a.aiFeedback.reasoning)}</p>
            ${a.aiFeedback.recommendation ? `<div class="rq__ai-rec">
                <svg class="icon-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
                ${escapeHTML(a.aiFeedback.recommendation)}
            </div>` : ''}
        </aside>`
        : '';

    return `<li class="rq" id="rq-${i}" data-correct="${a.isCorrect}" data-has-ai="${hasAi}" data-filter-key="${filterKeyFor(a)}">
        <button type="button" class="rq__head" aria-expanded="false" data-toggle="${i}">
            <span class="rq__num">${i + 1}</span>
            <div class="rq__head-body">
                <div class="rq__meta">
                    <span class="rq__node">${escapeHTML(a.node)}</span>
                    <span class="rq__statediv">
                        <svg class="icon-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            ${a.isCorrect
                                ? '<polyline points="20 6 9 17 4 12"></polyline>'
                                : '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>'}
                        </svg>
                        ${a.isCorrect ? 'Acertada' : 'Fallada'}
                    </span>
                    ${hasAi ? `<span class="rq__ai-tag">
                        <svg class="icon-svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"></path>
                        </svg>
                        Feedback IA
                    </span>` : ''}
                </div>
                <p class="rq__statement">${escapeHTML(a.statement)}</p>
            </div>
            <span class="rq__time">${fmtTime(a.timeSpentSec)}</span>
            <span class="rq__chev" aria-hidden="true">
                <svg class="icon-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </span>
        </button>
        <div class="rq__body">
            <ul class="rq__options">
                ${renderOptions(a)}
            </ul>
            <div class="rq__metrics" aria-label="Confianza declarada vs. mastery">
                <div class="rq__metrics-head">
                    <span>Confianza vs. mastery</span>
                    <span class="rq__metrics-gap" data-tone="${gapT}">gap ${gap >= 0 ? '+' : ''}${gap} pts</span>
                </div>
                <div class="rq__bar">
                    <span class="rq__bar-label rq__bar-label--decl"><span class="rq__dot" aria-hidden="true"></span>Declaraste</span>
                    <div class="rq__bar-track"><div class="rq__bar-fill rq__bar-fill--decl" style="width:${conf}%;"></div></div>
                    <span class="rq__bar-num">${conf}</span>
                </div>
                <div class="rq__bar">
                    <span class="rq__bar-label rq__bar-label--mast"><span class="rq__dot" aria-hidden="true"></span>Tu mastery</span>
                    <div class="rq__bar-track"><div class="rq__bar-fill rq__bar-fill--mast" style="width:${mast}%;"></div></div>
                    <span class="rq__bar-num">${mast}</span>
                </div>
            </div>
            ${aiBlock}
        </div>
    </li>`;
}


function filterKeyFor(a) {
    const keys = ['all'];
    keys.push(a.isCorrect ? 'correct' : 'wrong');
    if (a.aiFeedback) keys.push('ai');
    return keys.join(' ');
}


function applyFilter() {
    const $items = document.querySelectorAll('.rq');
    let visible = 0;
    $items.forEach(($q) => {
        const matches = currentFilter === 'all' || $q.dataset.filterKey.includes(currentFilter);
        $q.hidden = !matches;
        if (matches) visible++;
    });
    document.getElementById('review-empty').hidden = visible > 0;
    document.getElementById('review-meta').textContent = visible === 0
        ? ''
        : `Mostrando ${visible} pregunta${visible === 1 ? '' : 's'}`;
}


function updateToggleAllLabel() {
    const all = document.querySelectorAll('.rq');
    const open = document.querySelectorAll('.rq.is-open');
    const $btn = document.getElementById('toggle-all-btn');
    const $label = document.getElementById('toggle-all-label');
    if (open.length === all.length && all.length > 0) {
        $btn.classList.add('is-expanded');
        $label.textContent = 'Colapsar todas';
    } else {
        $btn.classList.remove('is-expanded');
        $label.textContent = 'Expandir todas';
    }
}


function init() {
    const session = STUDENT_DATA.sessionHistory.find((s) => s.id === SESSION_ID);
    const answers = STUDENT_DATA.sessionAnswers[SESSION_ID]
        || (session ? generateAnswersForSession(session) : null);

    if (!session || !answers || answers.length === 0) {
        document.querySelector('.review-stats').hidden = true;
        document.querySelector('.review-strip').hidden = true;
        document.querySelector('.review-toolbar').hidden = true;
        document.getElementById('review-meta').hidden = true;
        document.getElementById('review-questions').hidden = true;

        document.querySelector('.eyebrow').textContent = 'Revisión no disponible';
        document.getElementById('review-room-name').textContent = session
            ? session.roomName
            : 'Esta sesión aún no se puede revisar';
        document.getElementById('review-date').textContent = session ? fmtDate(session.startedAt) : '';
        document.getElementById('review-duration').textContent = session ? fmtDuration(session.durationMin) : '';
        document.getElementById('review-id').textContent = session ? `Sesión #${session.id}` : '';

        const $empty = document.getElementById('review-empty');
        $empty.hidden = false;
        $empty.querySelector('.review-empty__title').textContent = session
            ? 'Sesión sin detalle disponible'
            : 'Sesión no encontrada';
        $empty.querySelector('.review-empty__body').textContent = session
            ? 'Esta sesión existe en tu historial pero todavía no tiene datos de revisión cargados.'
            : 'La sesión que buscás no existe o fue eliminada. Volvé al historial y elegí otra.';
        return;
    }

    paintHeader(session, answers);
    renderStrip(answers);

    const $list = document.getElementById('review-questions');
    $list.innerHTML = answers.map((a, i) => renderQuestion(a, i)).join('');

    $list.querySelectorAll('[data-toggle]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const $q = btn.closest('.rq');
            const open = $q.classList.toggle('is-open');
            btn.setAttribute('aria-expanded', String(open));
            updateToggleAllLabel();
        });
    });

    document.querySelectorAll('[data-filter]').forEach((btn) => {
        btn.addEventListener('click', () => {
            currentFilter = btn.dataset.filter;
            document.querySelectorAll('[data-filter]').forEach((b) => {
                b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
            });
            applyFilter();
        });
    });

    document.getElementById('toggle-all-btn').addEventListener('click', () => {
        const all = document.querySelectorAll('.rq');
        const open = document.querySelectorAll('.rq.is-open');
        const shouldOpen = open.length < all.length;
        all.forEach(($q) => $q.classList.toggle('is-open', shouldOpen));
        all.forEach(($q) => {
            const $btn = $q.querySelector('[data-toggle]');
            if ($btn) $btn.setAttribute('aria-expanded', String(shouldOpen));
        });
        updateToggleAllLabel();
    });

    applyFilter();
    updateToggleAllLabel();
}


init();
