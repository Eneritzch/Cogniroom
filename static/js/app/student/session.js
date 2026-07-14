const _v = new URL(import.meta.url).searchParams.get('v') || '';
const { sessions, tokens, ApiError } = await import(`../api.js?v=${_v}`);
const { toast } = await import(`../toast.js?v=${_v}`);


function getSessionId() {
    const m = location.pathname.match(/\/app\/session\/(\d+)/);
    return m ? Number(m[1]) : null;
}

const SESSION_ID = getSessionId();

if (!tokens.access) {
    location.replace('/app/');
}
if (!SESSION_ID) {
    location.replace('/app/my-rooms/');
}


const $closeBtn = document.getElementById('session-close-btn');
if ($closeBtn) {
    $closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const ref = document.referrer;
        const sameOrigin = ref && ref.startsWith(location.origin);
        const fromHistory = sameOrigin && ref.includes('/app/history');
        const fromRooms   = sameOrigin && ref.includes('/app/my-rooms');
        if (fromHistory) location.href = '/app/history/';
        else if (fromRooms) location.href = '/app/my-rooms/';
        else if (sameOrigin && history.length > 1) history.back();
        else location.href = '/app/my-rooms/';
    });
}

let currentIndex = 0;
let currentQuestion = null;
let selectedIndices = [];
let confidenceDeclared = null;
let sessionTotal = null;


function escapeHTML(s) {
    return String(s ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}

function gapTone(gap) {
    if (gap > 15)  return 'amber';
    if (gap < -15) return 'stone';
    return 'moss';
}


const $stages = {
    question: document.querySelector('[data-stage="question"]'),
    feedback: document.querySelector('[data-stage="feedback"]'),
};

const $confLevels = document.getElementById('confidence-levels');
const $answerStep = document.getElementById('answer-step');
const $optionsList = document.getElementById('options-list');
const $submit = document.getElementById('submit-answer');
const $questionEyebrow = document.getElementById('question-eyebrow');
const $questionText = document.getElementById('question-text');
const $current = document.getElementById('session-current');
const $total = document.getElementById('session-total');
const $progress = document.getElementById('session-progress-fill');
const $progressCurrent = document.getElementById('progress-current');
const $progressTotal = document.getElementById('progress-total');
const $progressCardFill = document.getElementById('progress-card-fill');

// La sesión termina cuando el backend responde `completed` (no se conoce el
// total de preguntas de antemano).
if ($total) $total.textContent = '—';


// El estudiante DEBE declarar su confianza antes de que se desbloqueen las
// opciones: es el dato que sostiene toda la medición de brecha metacognitiva.
function setAnswerLocked(locked) {
    if ($answerStep) $answerStep.dataset.locked = locked ? 'true' : 'false';
}

function updateSubmitState() {
    $submit.disabled = confidenceDeclared === null || selectedIndices.length === 0;
}

function selectConfidence(btn) {
    confidenceDeclared = Number(btn.dataset.confidence);
    $confLevels.querySelectorAll('.confidence-level').forEach((b) => {
        const on = b === btn;
        b.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    setAnswerLocked(false);
    updateSubmitState();
}

function resetConfidence() {
    confidenceDeclared = null;
    if ($confLevels) {
        $confLevels.querySelectorAll('.confidence-level').forEach((b) => {
            b.setAttribute('aria-checked', 'false');
        });
    }
    setAnswerLocked(true);
}

if ($confLevels) {
    $confLevels.addEventListener('click', (e) => {
        const btn = e.target.closest('.confidence-level');
        if (btn) selectConfidence(btn);
    });
}


function showStage(name) {
    Object.entries($stages).forEach(([k, el]) => {
        el.hidden = k !== name;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
}


function renderQuestion(q) {
    currentQuestion = q;
    selectedIndices = [];
    resetConfidence();
    $submit.disabled = true;

    const isMultiple = q.question_type === 'multiple';

    // El backend informa cuántas van respondidas y el total de la evaluación.
    if (typeof q.answered === 'number') currentIndex = q.answered;
    const num = currentIndex + 1;
    const total = typeof q.total === 'number' ? q.total : null;
    if (total != null) sessionTotal = total;

    if ($current) $current.textContent = String(num);
    if ($progressCurrent) $progressCurrent.textContent = String(num);

    if (total != null) {
        if ($total) $total.textContent = String(total);
        if ($progressTotal) $progressTotal.textContent = String(total);
        const pct = Math.min(100, (currentIndex / total) * 100);
        $progress.style.width = `${pct}%`;
        if ($progressCardFill) $progressCardFill.style.width = `${pct}%`;
    } else {
        const pct = (1 - 1 / (num + 1)) * 100;
        $progress.style.width = `${pct}%`;
    }

    const nodeName = q.node_name || q.node?.name || 'Sin tema';
    $questionEyebrow.textContent = `Pregunta ${num} · ${nodeName}`
        + (isMultiple ? ' · marque todas las correctas' : '');
    $questionText.textContent = q.statement || '—';

    const options = q.options || [];
    const role = isMultiple ? 'checkbox' : 'radio';
    $optionsList.innerHTML = options.map((optText, i) => {
        return `
          <button type="button" class="session-option" data-option-index="${i}" aria-pressed="false" role="${role}" aria-checked="false">
            <span class="session-option__id">${escapeHTML(String.fromCharCode(65 + i))}</span>
            <span class="session-option__text">${escapeHTML(optText)}</span>
          </button>
        `;
    }).join('');

    $optionsList.querySelectorAll('.session-option').forEach((btn) => {
        btn.addEventListener('click', () => {
            if (isMultiple) {
                const pressed = btn.getAttribute('aria-pressed') === 'true';
                btn.setAttribute('aria-pressed', pressed ? 'false' : 'true');
                btn.setAttribute('aria-checked', pressed ? 'false' : 'true');
            } else {
                $optionsList.querySelectorAll('.session-option').forEach((b) => {
                    b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
                    b.setAttribute('aria-checked', b === btn ? 'true' : 'false');
                });
            }
            selectedIndices = Array.from($optionsList.querySelectorAll('.session-option[aria-pressed="true"]'))
                .map((b) => Number(b.dataset.optionIndex));
            updateSubmitState();
        });
    });

    showStage('question');
}


function renderFeedback(result) {
    const correct = result.is_correct === true;
    const score = typeof result.score === 'number' ? result.score : (correct ? 1 : 0);
    const partial = !correct && score > 0;
    const scorePct = Math.round(score * 100);

    const declared = Math.round(confidenceDeclared * 100);
    const masteryRaw = result.bkt_mastery ?? result.bkt_mastery ?? 0;
    const mastery = Math.round(masteryRaw * 100);
    const gap = declared - mastery;
    const gapAbs = Math.abs(gap);
    const tone = gapTone(gap);

    const qNum = currentIndex + 1;
    document.getElementById('feedback-q-num').textContent = String(qNum);
    const $qTotal = document.getElementById('feedback-q-total');
    if ($qTotal) $qTotal.textContent = sessionTotal != null ? ` de ${sessionTotal}` : '';
    const isLast = sessionTotal != null && qNum >= sessionTotal;

    const $status = document.getElementById('feedback-status');
    $status.dataset.kind = correct ? 'correct' : (partial ? 'partial' : 'incorrect');
    if (correct) {
        $status.innerHTML = '<svg class="icon-svg" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg> Correcta';
    } else if (partial) {
        $status.innerHTML = `<svg class="icon-svg" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M12 2 a10 10 0 0 1 0 20 z" fill="currentColor" stroke="none"></path></svg> Parcial · ${scorePct}%`;
    } else {
        $status.innerHTML = '<svg class="icon-svg" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> Incorrecta';
    }

    document.getElementById('feedback-title').textContent = correct
        ? 'Tu respuesta es correcta.'
        : partial
            ? `Acertaste parcialmente (${scorePct}%).`
            : 'Tu respuesta no es correcta.';

    // La IA corre en segundo plano: el feedback inline ya no viene en la respuesta.
    // Si está pendiente, se avisa; el texto definitivo aparece en el repaso/Diagnósticos.
    const fbString = typeof result.ai_feedback === 'string' ? result.ai_feedback : '';
    const pendingMsg = result.ai_pending
        ? 'Estamos generando tu análisis con IA — lo verás en el repaso de la sesión y en Diagnósticos en unos segundos.'
        : '';
    document.getElementById('feedback-explanation').textContent = result.explanation || fbString
        || pendingMsg
        || `Lo que sabes ahora de este tema es ${mastery}%.`;

    const $declFill = document.getElementById('feedback-decl-fill');
    const $mastFill = document.getElementById('feedback-mast-fill');
    const $declNum = document.getElementById('feedback-decl-num');
    const $mastNum = document.getElementById('feedback-mast-num');
    const $hatch = document.getElementById('feedback-gap-hatch');
    const $gap = document.getElementById('feedback-gap');

    requestAnimationFrame(() => {
        $declFill.style.width = `${declared}%`;
        $mastFill.style.width = `${mastery}%`;
    });
    $declNum.textContent = String(declared);
    $mastNum.textContent = String(mastery);
    $gap.textContent = `${gap >= 0 ? '+' : ''}${gap} pts`;
    $gap.dataset.tone = tone;

    if (gapAbs > 5) {
        $hatch.style.display = 'block';
        $hatch.style.left = `${Math.min(declared, mastery)}%`;
        $hatch.style.width = `${gapAbs}%`;
    } else {
        $hatch.style.display = 'none';
    }

    document.getElementById('tile-confidence').textContent = `${declared}%`;
    document.getElementById('tile-mastery').textContent = `${mastery}%`;
    document.getElementById('tile-gap').textContent = `${gap >= 0 ? '+' : ''}${gap}`;
    document.getElementById('tile-gap').dataset.tone = tone;

    // El backend entrega ai_feedback como texto (ya mostrado en la explicación);
    // la tarjeta de diagnóstico estructurado vive en /app/diagnoses/.
    const $diag = document.getElementById('feedback-diagnosis');
    if ($diag) $diag.hidden = true;

    // Con el cupo por nodo se conoce el total: en la última pregunta se muestra
    // el CTA prominente "Terminar evaluación" + aviso, en vez del enlace
    // "Siguiente". El cierre real sigue ocurriendo cuando el backend responde
    // `completed`.
    const $nextBtn = document.getElementById('next-question');
    const $finishBtn = document.getElementById('complete-session');
    const $lastNote = document.getElementById('feedback-lastnote');
    if ($nextBtn) $nextBtn.hidden = isLast;
    if ($finishBtn) $finishBtn.hidden = !isLast;
    if ($lastNote) $lastNote.hidden = !isLast;

    showStage('feedback');
}


$submit.addEventListener('click', async () => {
    if (confidenceDeclared === null || selectedIndices.length === 0 || !currentQuestion) return;
    $submit.disabled = true;
    $submit.textContent = 'Enviando…';

    try {
        const result = await sessions.answer(SESSION_ID, {
            question_id: currentQuestion.id,
            selected_indices: selectedIndices,
            confidence_declared: confidenceDeclared,
        });
        renderFeedback(result);
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
            tokens.clear();
            location.replace('/app/');
            return;
        }
        toast(err?.message || 'No se pudo enviar la respuesta', { kind: 'error' });
        $submit.disabled = false;
        $submit.innerHTML = `Enviar respuesta <svg class="icon-svg" width="16" height="16" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`;
    }
});


document.getElementById('next-question').addEventListener('click', async () => {
    currentIndex += 1;
    await loadNextQuestion();
    $submit.disabled = true;
    $submit.innerHTML = `Enviar respuesta <svg class="icon-svg" width="16" height="16" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`;
});


document.getElementById('complete-session').addEventListener('click', async () => {
    try {
        await sessions.complete(SESSION_ID);
        toast('Sesión completada.', { kind: 'success', duration: 1500 });
        setTimeout(() => { location.href = '/app/dashboard/'; }, 700);
    } catch (err) {
        toast(err?.message || 'No se pudo cerrar la sesión', { kind: 'error' });
    }
});


async function finishSession() {
    try {
        await sessions.complete(SESSION_ID);
    } catch (_) {
        /* ya completada o error de red: igual cerramos la vista */
    }
    toast('Sesión completada.', { kind: 'success', duration: 1500 });
    setTimeout(() => { location.href = '/app/history/'; }, 800);
}


async function loadNextQuestion() {
    try {
        const q = await sessions.nextQuestion(SESSION_ID);
        if (!q || q.completed) {
            await finishSession();
            return;
        }
        renderQuestion(q);
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
            tokens.clear();
            location.replace('/app/');
            return;
        }
        toast(err?.message || 'No se pudo cargar la pregunta', { kind: 'error' });
    }
}

loadNextQuestion();
