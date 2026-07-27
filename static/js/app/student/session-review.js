const _v = new URL(import.meta.url).searchParams.get('v') || '';
const { sessions, tokens, ApiError } = await import(`../api.js?v=${_v}`);
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


function getSessionId() {
    const m = location.pathname.match(/\/app\/session\/(\d+)\/review/);
    return m ? Number(m[1]) : null;
}

const SESSION_ID = getSessionId();
let currentFilter = 'all';

// Frontera de perfil overconfident/underconfident: |gap| > 0.2 (canónico en
// services/icc_calculator). Aquí el gap va en puntos (conf−dominio, ×100).
const PROFILE_GAP_PTS = 20;


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


function durationMinFromSession(session) {
    if (!session.started_at || !session.finished_at) return null;
    const start = new Date(session.started_at).getTime();
    const end = new Date(session.finished_at).getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;
    return Math.round((end - start) / 60000);
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
    if (gapPts > PROFILE_GAP_PTS) return 'amber';
    if (gapPts < -PROFILE_GAP_PTS) return 'stone';
    return 'moss';
}


function confidencePct(a) {
    return Math.round((a.confidence_declared ?? 0) * 100);
}


function masteryPct(a) {
    const fallback = Math.max(0, (a.confidence_declared ?? 0) - 0.15);
    return Math.round((a.bkt_mastery ?? fallback) * 100);
}


function gapForAnswer(a) {
    return confidencePct(a) - masteryPct(a);
}


// Nota determinista para aciertos descalibrados: la IA se reserva para explicar
// fallos; en un acierto ya se conoce la dirección de la brecha.
function calibrationNote(a) {
    if (!a.is_correct) return null;
    const gap = gapForAnswer(a);
    if (gap > PROFILE_GAP_PTS) {
        return {
            title: 'Acertaste, pero con más seguridad de la que tu dominio respalda',
            body: 'Buen resultado. Aun así declaraste bastante más confianza de la que tu '
                + 'historial en este tema sostiene todavía: que la seguridad la respalde la '
                + 'práctica, no solo el acierto de hoy.',
        };
    }
    if (gap < -PROFILE_GAP_PTS) {
        return {
            title: 'Acertaste y sabías más de lo que creías',
            body: 'Respondiste bien con poca confianza declarada: dominas el tema mejor de lo '
                + 'que crees. Puedes confiar un poco más en ti la próxima vez.',
        };
    }
    return null;
}


function paintHeader(session, answers) {
    const durationMin = durationMinFromSession(session);
    document.getElementById('review-room-name').textContent = session.room?.name || '';
    document.getElementById('review-date').textContent = fmtDate(session.started_at);
    document.getElementById('review-duration').textContent = fmtDuration(durationMin);

    const correct = answers.filter((a) => a.is_correct).length;
    const pct = answers.length ? Math.round((correct / answers.length) * 100) : 0;
    document.getElementById('review-accuracy').textContent = `${pct}%`;
    document.getElementById('review-accuracy').dataset.tone = accuracyTone(pct);
    document.getElementById('review-accuracy-sub').textContent = `${correct} de ${answers.length}`;

    const gaps = answers.map(gapForAnswer);
    const avgGap = gaps.length ? Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length) : 0;
    const gapEl = document.getElementById('review-gap');
    gapEl.textContent = `${avgGap >= 0 ? '+' : ''}${avgGap}`;
    gapEl.dataset.tone = avgGap > PROFILE_GAP_PTS ? 'amber' : avgGap < -PROFILE_GAP_PTS ? 'stone' : 'moss';

    const aiCount = answers.filter((a) => !a.is_correct && a.ai_feedback).length;
    document.getElementById('review-ai-count').textContent = aiCount;
}


function renderStrip(answers) {
    const $strip = document.getElementById('review-strip');
    $strip.innerHTML = answers.map((a, i) => {
        const state = a.is_correct ? 'correct' : 'wrong';
        const hasAi = a.ai_feedback ? 'true' : 'false';
        const label = `Pregunta ${i + 1}: ${a.is_correct ? 'acertada' : 'fallada'}${a.ai_feedback ? ' (con feedback IA)' : ''}`;
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
    const correctSet = new Set(
        Array.isArray(a.correct_indices) && a.correct_indices.length
            ? a.correct_indices
            : (Number.isInteger(a.correct_index) ? [a.correct_index] : [])
    );
    const pickedSet = new Set(
        Array.isArray(a.selected_indices) && a.selected_indices.length
            ? a.selected_indices
            : (Number.isInteger(a.selected_index) ? [a.selected_index] : [])
    );
    return a.options.map((optText, idx) => {
        const isCorrect = correctSet.has(idx);
        const isPicked = pickedSet.has(idx);
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
            <span class="rq__opt-letter">${String.fromCharCode(65 + idx)}</span>
            <span class="rq__opt-text">${escapeHTML(optText)}</span>
            ${flag}
        </li>`;
    }).join('');
}


function renderQuestion(a, i) {
    const conf = confidencePct(a);
    const mast = masteryPct(a);
    const gap = conf - mast;
    const gapT = gapTone(gap);
    const hasAi = !!a.ai_feedback;
    const coach = calibrationNote(a);
    const nodeName = a.node?.name || '';
    const nodeTopic = a.node?.description || '';

    let aiBlock = '';
    if (hasAi) {
        const text = String(a.ai_feedback || '').trim();
        const firstSentence = text.split(/(?<=[.!?])\s/)[0] || text;
        const body = text.length > firstSentence.length
            ? text.slice(firstSentence.length).trim()
            : '';
        aiBlock = `<aside class="rq__ai" role="note" aria-label="Feedback del tutor cognitivo">
            <header class="rq__ai-head">
                <svg class="icon-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"></path>
                </svg>
                Tutor cognitivo
            </header>
            <h4 class="rq__ai-title">«${escapeHTML(firstSentence)}»</h4>
            ${body ? `<p class="rq__ai-body">${escapeHTML(body)}</p>` : ''}
        </aside>`;
    } else if (coach) {
        aiBlock = `<aside class="rq__ai" data-variant="coach" role="note" aria-label="Nota de calibración">
            <header class="rq__ai-head">
                <svg class="icon-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="9"></circle>
                    <circle cx="12" cy="12" r="4"></circle>
                    <line x1="12" y1="2" x2="12" y2="4"></line>
                    <line x1="12" y1="20" x2="12" y2="22"></line>
                    <line x1="2" y1="12" x2="4" y2="12"></line>
                    <line x1="20" y1="12" x2="22" y2="12"></line>
                </svg>
                Nota de calibración
            </header>
            <h4 class="rq__ai-title">«${escapeHTML(coach.title)}»</h4>
            <p class="rq__ai-body">${escapeHTML(coach.body)}</p>
        </aside>`;
    }

    return `<li class="rq" id="rq-${i}" data-correct="${a.is_correct}" data-has-ai="${hasAi}" data-filter-key="${filterKeyFor(a)}">
        <button type="button" class="rq__head" aria-expanded="false" data-toggle="${i}">
            <span class="rq__num">${i + 1}</span>
            <div class="rq__head-body">
                <div class="rq__meta">
                    <span class="rq__node">${escapeHTML(nodeName)}${nodeTopic ? ` · ${escapeHTML(nodeTopic)}` : ''}</span>
                    <span class="rq__statediv">
                        <svg class="icon-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            ${a.is_correct
                                ? '<polyline points="20 6 9 17 4 12"></polyline>'
                                : '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>'}
                        </svg>
                        ${a.is_correct ? 'Acertada' : 'Fallada'}
                    </span>
                    ${hasAi ? `<span class="rq__ai-tag" data-kind="ai">
                        <svg class="icon-svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"></path>
                        </svg>
                        Feedback IA
                    </span>` : coach ? `<span class="rq__ai-tag" data-kind="confidence">
                        <svg class="icon-svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <circle cx="12" cy="12" r="9"></circle>
                            <circle cx="12" cy="12" r="4"></circle>
                        </svg>
                        Revisa tu confianza
                    </span>` : ''}
                </div>
                <p class="rq__statement">${escapeHTML(a.statement)}</p>
            </div>
            <span class="rq__time">${fmtTime(a.response_time_sec)}</span>
            <span class="rq__chev" aria-hidden="true">
                <svg aria-hidden="true" class="icon-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </span>
        </button>
        <div class="rq__body">
            <ul class="rq__options">
                ${renderOptions(a)}
            </ul>
            <div class="rq__metrics" aria-label="Lo que cree saber vs. lo que sabe">
                <div class="rq__metrics-head">
                    <span>Lo que cree saber vs. lo que sabe</span>
                    <span class="rq__metrics-gap" data-tone="${gapT}">diferencia ${gap >= 0 ? '+' : ''}${gap} pts</span>
                </div>
                <div class="rq__bar">
                    <span class="rq__bar-label rq__bar-label--decl"><span class="rq__dot" aria-hidden="true"></span>Cree saber</span>
                    <div class="rq__bar-track"><div class="rq__bar-fill rq__bar-fill--decl" style="width:${conf}%;"></div></div>
                    <span class="rq__bar-num">${conf}</span>
                </div>
                <div class="rq__bar">
                    <span class="rq__bar-label rq__bar-label--mast"><span class="rq__dot" aria-hidden="true"></span>Lo que sabe</span>
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
    keys.push(a.is_correct ? 'correct' : 'wrong');
    if (a.ai_feedback) keys.push('ai');
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


function renderUnavailable(session) {
    document.querySelector('.review-stats').hidden = true;
    document.querySelector('.review-strip').hidden = true;
    document.querySelector('.review-toolbar').hidden = true;
    document.getElementById('review-meta').hidden = true;
    document.getElementById('review-questions').hidden = true;

    document.querySelector('.eyebrow').textContent = 'Revisión no disponible';
    document.getElementById('review-room-name').textContent = session
        ? (session.room?.name || '')
        : 'Esta sesión aún no se puede revisar';
    document.getElementById('review-date').textContent = session ? fmtDate(session.started_at) : '';
    document.getElementById('review-duration').textContent = session ? fmtDuration(durationMinFromSession(session)) : '';

    const $empty = document.getElementById('review-empty');
    $empty.hidden = false;
    $empty.querySelector('.review-empty__title').textContent = session
        ? 'Sesión sin detalle disponible'
        : 'Sesión no encontrada';
    $empty.querySelector('.review-empty__body').textContent = session
        ? 'Esta sesión existe en tu historial pero todavía no tiene respuestas registradas.'
        : 'La sesión que busca no existe o no es suya. Vuelva al historial y elija otra.';
}


async function init() {
    if (!SESSION_ID) {
        renderUnavailable(null);
        return;
    }

    let data;
    try {
        data = await sessions.review(SESSION_ID);
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
            tokens.clear();
            location.replace('/app/');
            return;
        }
        renderUnavailable(null);
        return;
    }

    const session = data.session;
    const answers = data.answers || [];

    if (!session || answers.length === 0) {
        renderUnavailable(session);
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
