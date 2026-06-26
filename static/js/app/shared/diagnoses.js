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

const PROBLEM_LABEL = {
    vacio_conceptual: 'Vacío conceptual',
    confusion_conceptual: 'Confusión conceptual',
    error_procedimental: 'Error procedimental',
    aplicacion_incorrecta: 'Aplicación incorrecta',
    sin_patron: 'Sin patrón claro',
};
function problemLabel(p) { return PROBLEM_LABEL[p] || ''; }

const DIAG_TITLES = {
    overconfident: 'Brecha de sobreconfianza detectada',
    underconfident: 'Subestimación del propio dominio',
    calibrated: 'Calibración alineada',
};


let DIAGNOSES = [];
let currentRisk = 'all';
let currentProfile = 'all';


function riskLabel(r) {
    return ({ low: 'Riesgo bajo', medium: 'Riesgo medio', high: 'Riesgo alto' })[r] || '—';
}


function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const mm = months[d.getMonth()];
    const yy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mn = String(d.getMinutes()).padStart(2, '0');
    return `${dd} ${mm} ${yy} · ${hh}:${mn}`;
}


function predominantProfile(list) {
    if (list.length === 0) return null;
    const counts = {};
    list.forEach((d) => { counts[d.classification] = (counts[d.classification] || 0) + 1; });
    let best = null, max = 0;
    Object.entries(counts).forEach(([k, v]) => { if (v > max) { max = v; best = k; } });
    return best;
}


function renderDiagnosis(diag) {
    const classification = diag.classification || 'calibrated';
    const title = diag.title || DIAG_TITLES[classification] || 'Diagnóstico cognitivo';
    const reasoning = diag.reasoning || '';
    const recommendation = diag.recommendation || '';
    const date = formatDate(diag.generated_at);
    const risk = diag.risk_level || 'medium';
    const problemType = diag.problem_type || '';
    const failureProb = diag.failure_probability != null
        ? Number(diag.failure_probability).toFixed(2)
        : '—';
    const roomName = (diag.room && diag.room.name) || '';
    const mainNode = diag.node_name ? { name: diag.node_name } : null;
    const sessionId = diag.session || diag.id_session || null;
    const riskNodes = Array.isArray(diag.risk_node) ? diag.risk_node : [];

    return `
      <article class="ai-diagnosis" data-risk="${escapeHTML(risk)}" data-profile="${escapeHTML(classification)}">
        <header class="ai-diagnosis__head eyebrow">
          <svg class="icon-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"></path>
          </svg>
          Tutor cognitivo · Claude
          <span class="ai-diagnosis__context">
            <span class="ai-diagnosis__context-room">${escapeHTML(roomName)}</span>
            ${mainNode ? `<span class="ai-diagnosis__context-sep">·</span>
              <span class="ai-diagnosis__context-node">${escapeHTML(mainNode.name || '')}${mainNode.description ? ` <span class="ai-diagnosis__context-topic">(${escapeHTML(mainNode.description)})</span>` : ''}</span>` : ''}
            ${riskNodes.length ? `<span class="ai-diagnosis__context-sep">·</span>
              <span class="ai-diagnosis__context-node">${riskNodes.map((n) => escapeHTML(n)).join(', ')}</span>` : ''}
          </span>
        </header>
        <h3 class="ai-diagnosis__title">${escapeHTML(title)}</h3>
        ${reasoning ? `<p class="ai-diagnosis__body">${escapeHTML(reasoning)}</p>` : ''}
        ${recommendation ? `
          <div class="ai-diagnosis__suggestion" role="note">
            <svg class="icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
            <span>${escapeHTML(recommendation)}</span>
          </div>
        ` : ''}
        <footer class="diagnoses-item__meta">
          <span class="pill" data-profile="${escapeHTML(classification)}">${profileLabel(classification)}</span>
          ${problemType ? `<span class="pill" data-problem="${escapeHTML(problemType)}">${problemLabel(problemType)}</span>` : ''}
          <span class="pill" data-risk="${escapeHTML(risk)}">${riskLabel(risk)}</span>
          <span class="diagnoses-item__failure">Predicción de fallo: <span class="num">${failureProb}</span></span>
          ${sessionId ? `<a class="diagnoses-item__link" href="/app/session/${sessionId}/review/">Ver sesión →</a>` : ''}
          <span class="diagnoses-item__date">${escapeHTML(date)}</span>
        </footer>
      </article>
    `;
}


function applyFilters(all) {
    return all
        .filter((d) => currentRisk === 'all' || d.risk_level === currentRisk)
        .filter((d) => currentProfile === 'all' || d.classification === currentProfile)
        .sort((a, b) => new Date(b.generated_at) - new Date(a.generated_at));
}


function paintStats(all) {
    document.getElementById('diag-total').textContent = all.length;
    document.getElementById('diag-count-high').textContent = all.filter((d) => d.risk_level === 'high').length;
    document.getElementById('diag-count-medium').textContent = all.filter((d) => d.risk_level === 'medium').length;
    document.getElementById('diag-count-low').textContent = all.filter((d) => d.risk_level === 'low').length;

    const dominant = predominantProfile(all);
    const $prof = document.getElementById('diag-profile-text');
    const $sub = document.getElementById('diag-profile-sub');
    if (dominant) {
        $prof.textContent = profileLabel(dominant);
        $prof.dataset.tone = dominant === 'overconfident' ? 'amber'
            : dominant === 'underconfident' ? 'stone' : 'moss';
        $sub.textContent = `${all.filter((d) => d.classification === dominant).length} de ${all.length} diagnósticos`;
    } else {
        $prof.textContent = '—';
        $sub.textContent = 'sin datos aún';
    }
}


function render() {
    const all = DIAGNOSES;
    const $list = document.getElementById('diag-list');
    const $empty = document.getElementById('diag-empty');
    const $meta = document.getElementById('diag-meta');

    paintStats(all);

    if (all.length === 0) {
        $list.hidden = true;
        $empty.hidden = false;
        $meta.textContent = '';
        return;
    }

    const filtered = applyFilters(all);

    $meta.textContent = filtered.length === 0
        ? ''
        : `Mostrando ${filtered.length} diagnóstico${filtered.length === 1 ? '' : 's'}`;

    if (filtered.length === 0) {
        $list.hidden = true;
        $empty.hidden = false;
        $empty.querySelector('.diagnoses-empty__title').textContent = 'Sin resultados.';
        $empty.querySelector('.diagnoses-empty__body').textContent = 'Probá quitando algún filtro o seleccionando otro nivel de riesgo.';
        const $cta = $empty.querySelector('.diagnoses-empty__cta');
        if ($cta) $cta.hidden = true;
        return;
    }

    $empty.hidden = true;
    $list.hidden = false;
    $list.innerHTML = filtered.map(renderDiagnosis).join('');
}


document.querySelectorAll('[data-risk-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
        currentRisk = btn.dataset.riskFilter;
        document.querySelectorAll('[data-risk-filter]').forEach((b) => {
            b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        });
        render();
    });
});

document.querySelectorAll('[data-profile-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
        currentProfile = btn.dataset.profileFilter;
        document.querySelectorAll('[data-profile-filter]').forEach((b) => {
            b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        });
        render();
    });
});


async function loadDiagnoses() {
    try {
        const data = await me.diagnoses();
        DIAGNOSES = data || [];
        render();
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
            tokens.clear();
            location.replace('/app/');
            return;
        }
        toast('No se pudieron cargar los diagnósticos.', { kind: 'error' });
    }
}

render();
loadDiagnoses();
