const _v = new URL(import.meta.url).searchParams.get('v') || '';
const { sessions, tokens, ApiError } = await import(`./api.js?v=${_v}`);
const { toast } = await import(`./toast.js?v=${_v}`);


function getSessionId() {
    const m = location.pathname.match(/\/app\/session\/(\d+)/);
    return m ? Number(m[1]) : null;
}

const SESSION_ID = getSessionId();
const IS_DEMO = SESSION_ID === null;

if (!IS_DEMO && !tokens.access) {
    location.replace('/app/');
}

const SESSION_LENGTH = 12;
let currentIndex = 0;
let currentQuestion = null;
let selectedOption = null;
let confidence = 75;


const DEMO_QUESTION = {
    id: 'demo-7',
    node_name: 'Entropía y 2ª ley',
    statement: 'En un proceso espontáneo de expansión adiabática irreversible de un gas ideal, ¿qué ocurre con la entropía?',
    options: [
        { id: 'a', text: 'La entropía del sistema disminuye porque se libera calor al entorno.' },
        { id: 'b', text: 'La entropía del universo aumenta, incluso si la del sistema disminuye.' },
        { id: 'c', text: 'La entropía permanece constante por ser proceso reversible.' },
        { id: 'd', text: 'No es posible determinar el cambio de entropía sin conocer el volumen.' },
    ],
};

const DEMO_CORRECT = 'b';

function fakeAnswerResult(answer, conf) {
    const isCorrect = answer === DEMO_CORRECT;
    const mastery = 0.48;
    const gap = conf - mastery * 100;
    const miscalibrated = Math.abs(gap) > 25;
    return {
        is_correct: isCorrect,
        bkt_mastery: mastery,
        explanation: 'En un proceso irreversible, ΔS_universo > 0 siempre. La 2ª ley no se aplica al sistema aislado de tu intuición, sino al universo termodinámico completo.',
        ai_feedback: miscalibrated ? {
            title: '«Tu seguridad va más rápido que tu dominio.»',
            reasoning: `Declaraste ${conf} de confianza, pero tu probabilidad real de acertar este tipo de pregunta sobre entropía es ${Math.round(mastery * 100)}. No es la primera vez que pasa: en las últimas 5 preguntas del mismo nodo, tu gap promedio es +24 puntos.`,
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
    confidence = Number(e.target.value);
    $confValue.textContent = String(confidence);
    $confHint.textContent = String(confidence);
});


function showStage(name) {
    Object.entries($stages).forEach(([k, el]) => {
        el.hidden = k !== name;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
}


function renderQuestion(q) {
    currentQuestion = q;
    selectedOption = null;
    $submit.disabled = true;

    $current.textContent = String(currentIndex + 1);
    $progress.style.width = `${((currentIndex + 1) / SESSION_LENGTH) * 100}%`;
    $questionEyebrow.textContent = `Pregunta ${currentIndex + 1} · ${q.node_name || 'Sin nodo'}`;
    $questionText.textContent = q.statement || q.text || '—';

    const options = q.options || [];
    $optionsList.innerHTML = options.map((opt, i) => {
        const id = opt.id != null ? String(opt.id) : String.fromCharCode(97 + i);
        const text = opt.text || opt;
        return `
          <button type="button" class="session-option" data-option-id="${escapeHTML(id)}" aria-pressed="false" role="radio" aria-checked="false">
            <span class="session-option__id">${escapeHTML(String.fromCharCode(65 + i))}</span>
            <span class="session-option__text">${escapeHTML(text)}</span>
          </button>
        `;
    }).join('');

    $optionsList.querySelectorAll('.session-option').forEach((btn) => {
        btn.addEventListener('click', () => {
            $optionsList.querySelectorAll('.session-option').forEach((b) => {
                b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
                b.setAttribute('aria-checked', b === btn ? 'true' : 'false');
            });
            selectedOption = btn.dataset.optionId;
            $submit.disabled = false;
        });
    });

    showStage('question');
}


function renderFeedback(result) {
    const correct = result.is_correct === true;
    const declared = Math.round(confidence);
    const mastery = Math.round((result.bkt_mastery ?? result.mastery ?? 0) * 100);
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
        document.getElementById('feedback-diag-title').textContent = aiFeedback.title || '«Descalibración detectada.»';
        document.getElementById('feedback-diag-body').textContent = aiFeedback.reasoning || aiFeedback.body || '';
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

    showStage('feedback');
}


$submit.addEventListener('click', async () => {
    if (!selectedOption || !currentQuestion) return;
    $submit.disabled = true;
    $submit.textContent = 'Enviando…';

    if (IS_DEMO) {
        setTimeout(() => renderFeedback(fakeAnswerResult(selectedOption, confidence)), 300);
        return;
    }

    try {
        const result = await sessions.answer(SESSION_ID, {
            question_id: currentQuestion.id,
            answer: selectedOption,
            confidence,
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
