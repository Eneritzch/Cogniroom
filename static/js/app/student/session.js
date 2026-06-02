const _v = new URL(import.meta.url).searchParams.get('v') || '';
const { sessions, tokens, ApiError } = await import(`../api.js?v=${_v}`);
const { toast } = await import(`../toast.js?v=${_v}`);


function getSessionId() {
    const m = location.pathname.match(/\/app\/session\/(\d+)/);
    return m ? Number(m[1]) : null;
}

const SESSION_ID = getSessionId();
const IS_DEMO = SESSION_ID === null;

if (!IS_DEMO && !tokens.access) {
    location.replace('/app/');
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

const SESSION_LENGTH = 12;
let currentIndex = 0;
let currentQuestion = null;
let selectedIndex = null;
let confidenceDeclared = 0.75;


const DEMO_QUESTION = {
    id_question: 7,
    id_node: 14,
    node: {
        id_node: 14,
        name: 'Entropía y 2ª ley',
        description: 'Termodinámica clásica',
    },
    statement: 'En un proceso espontáneo de expansión adiabática irreversible de un gas ideal, ¿qué ocurre con la entropía?',
    options: [
        'La entropía del sistema disminuye porque se libera calor al entorno.',
        'La entropía del universo aumenta, incluso si la del sistema disminuye.',
        'La entropía permanece constante por ser proceso reversible.',
        'No es posible determinar el cambio de entropía sin conocer el volumen.',
    ],
    correct_index: 1,
    difficulty: 'hard',
    source: 'ai',
    is_approved: true,
};

const DEMO_CORRECT_INDEX = 1;

function fakeAnswerResult(selIndex, confDeclared) {
    const isCorrect = selIndex === DEMO_CORRECT_INDEX;
    const bktMastery = 0.48;
    const gap = confDeclared - bktMastery;
    const miscalibrated = Math.abs(gap) > 0.25;
    return {
        is_correct: isCorrect,
        bkt_mastery: bktMastery,
        explanation: 'En un proceso irreversible, ΔS_universo > 0 siempre. La 2ª ley no se aplica al sistema aislado de tu intuición, sino al universo termodinámico completo.',
        ai_feedback: miscalibrated ? {
            title: 'Tendencia a sobreestimar dominio en entropía',
            classification: 'overconfident',
            failure_probability: 0.62,
            risk_level: 'medium',
            risk_node: ['Entropía y 2ª ley', 'Procesos irreversibles'],
            node: {
                id_node: 14,
                name: 'Entropía y 2ª ley',
                description: 'Termodinámica clásica',
            },
            reasoning: `Declaraste ${Math.round(confDeclared * 100)} de confianza, pero tu probabilidad real de acertar este tipo de pregunta sobre entropía es ${Math.round(bktMastery * 100)}. La brecha es persistente en este nodo.`,
            recommendation: 'Antes de la próxima sesión, intentá enunciar la 2ª ley en tus propias palabras y aplicarla a un caso que NO esté en el apunte.',
        } : null,
    };
}


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

const $confSlider = document.getElementById('confidence-slider');
const $confValue = document.getElementById('confidence-value');
const $confHint = document.getElementById('hint-confidence');
const $optionsList = document.getElementById('options-list');
const $submit = document.getElementById('submit-answer');
const $questionEyebrow = document.getElementById('question-eyebrow');
const $questionText = document.getElementById('question-text');
const $current = document.getElementById('session-current');
const $total = document.getElementById('session-total');
const $progress = document.getElementById('session-progress-fill');

$total.textContent = String(SESSION_LENGTH);


$confSlider.addEventListener('input', (e) => {
    const sliderValue = Number(e.target.value);
    confidenceDeclared = sliderValue / 100;
    $confValue.textContent = String(sliderValue);
    $confHint.textContent = String(sliderValue);
});


function showStage(name) {
    Object.entries($stages).forEach(([k, el]) => {
        el.hidden = k !== name;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
}


function renderQuestion(q) {
    currentQuestion = q;
    selectedIndex = null;
    $submit.disabled = true;

    $current.textContent = String(currentIndex + 1);
    $progress.style.width = `${((currentIndex + 1) / SESSION_LENGTH) * 100}%`;
    const nodeName = q.node?.name || 'Sin nodo';
    $questionEyebrow.textContent = `Pregunta ${currentIndex + 1} · ${nodeName}`;
    $questionText.textContent = q.statement || '—';

    const options = q.options || [];
    $optionsList.innerHTML = options.map((optText, i) => {
        return `
          <button type="button" class="session-option" data-option-index="${i}" aria-pressed="false" role="radio" aria-checked="false">
            <span class="session-option__id">${escapeHTML(String.fromCharCode(65 + i))}</span>
            <span class="session-option__text">${escapeHTML(optText)}</span>
          </button>
        `;
    }).join('');

    $optionsList.querySelectorAll('.session-option').forEach((btn) => {
        btn.addEventListener('click', () => {
            $optionsList.querySelectorAll('.session-option').forEach((b) => {
                b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
                b.setAttribute('aria-checked', b === btn ? 'true' : 'false');
            });
            selectedIndex = Number(btn.dataset.optionIndex);
            $submit.disabled = false;
        });
    });

    showStage('question');
}


function renderFeedback(result) {
    const correct = result.is_correct === true;
    const declared = Math.round(confidenceDeclared * 100);
    const masteryRaw = result.bkt_mastery ?? result.bkt_mastery ?? 0;
    const mastery = Math.round(masteryRaw * 100);
    const gap = declared - mastery;
    const gapAbs = Math.abs(gap);
    const tone = gapTone(gap);

    document.getElementById('feedback-q-num').textContent = String(currentIndex + 1);

    const $status = document.getElementById('feedback-status');
    $status.dataset.kind = correct ? 'correct' : 'incorrect';
    $status.innerHTML = correct
        ? '<svg class="icon-svg" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg> Correcta'
        : '<svg class="icon-svg" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> Incorrecta';

    document.getElementById('feedback-title').textContent = correct
        ? 'Tu respuesta es correcta.'
        : 'Tu respuesta no es correcta.';

    document.getElementById('feedback-explanation').textContent = result.explanation
        || `Tu mastery actual para este nodo es ${(mastery / 100).toFixed(2)}.`;

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

    document.getElementById('tile-confidence').textContent = String(declared);
    document.getElementById('tile-mastery').textContent = String(mastery);
    document.getElementById('tile-gap').textContent = `${gap >= 0 ? '+' : ''}${gap}`;
    document.getElementById('tile-gap').dataset.tone = tone;

    const $diag = document.getElementById('feedback-diagnosis');
    const aiFeedback = result.ai_feedback;
    if (aiFeedback && (aiFeedback.title || aiFeedback.reasoning)) {
        document.getElementById('feedback-diag-title').textContent = aiFeedback.title || 'Descalibración detectada';
        document.getElementById('feedback-diag-body').textContent = aiFeedback.reasoning || '';
        const $sug = document.getElementById('feedback-diag-sug');
        if (aiFeedback.recommendation) {
            document.getElementById('feedback-diag-sug-text').textContent = aiFeedback.recommendation;
            $sug.hidden = false;
        } else {
            $sug.hidden = true;
        }
        $diag.hidden = false;
    } else {
        $diag.hidden = true;
    }

    const isLast = currentIndex >= SESSION_LENGTH - 1;
    const $nextBtn = document.getElementById('next-question');
    const $finishBtn = document.getElementById('complete-session');
    if ($nextBtn) $nextBtn.hidden = isLast;
    if ($finishBtn) $finishBtn.hidden = !isLast;

    showStage('feedback');
}


$submit.addEventListener('click', async () => {
    if (selectedIndex === null || !currentQuestion) return;
    $submit.disabled = true;
    $submit.textContent = 'Enviando…';

    if (IS_DEMO) {
        setTimeout(() => renderFeedback(fakeAnswerResult(selectedIndex, confidenceDeclared)), 300);
        return;
    }

    try {
        const result = await sessions.answer(SESSION_ID, {
            id_question: currentQuestion.id_question,
            selected_index: selectedIndex,
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
    if (currentIndex >= SESSION_LENGTH) {
        toast('Llegaste al final de la sesión.', { kind: 'success' });
        return;
    }
    await loadNextQuestion();
    $submit.disabled = true;
    $submit.innerHTML = `Enviar respuesta <svg class="icon-svg" width="16" height="16" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`;
});


document.getElementById('complete-session').addEventListener('click', async () => {
    if (IS_DEMO) {
        toast('Demo finalizada.', { kind: 'success', duration: 1500 });
        setTimeout(() => { location.href = '/'; }, 700);
        return;
    }
    try {
        await sessions.complete(SESSION_ID);
        toast('Sesión completada.', { kind: 'success', duration: 1500 });
        setTimeout(() => { location.href = '/app/dashboard/'; }, 700);
    } catch (err) {
        toast(err?.message || 'No se pudo cerrar la sesión', { kind: 'error' });
    }
});


async function loadNextQuestion() {
    if (IS_DEMO) {
        renderQuestion(DEMO_QUESTION);
        return;
    }
    try {
        const q = await sessions.nextQuestion(SESSION_ID);
        if (!q) {
            toast('Esta sesión no tiene más preguntas.', { kind: 'success' });
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
