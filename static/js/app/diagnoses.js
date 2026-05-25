const _v = new URL(import.meta.url).searchParams.get('v') || '';
const { auth, me, tokens, ApiError } = await import(`./api.js?v=${_v}`);
const { toast } = await import(`./toast.js?v=${_v}`);


if (!tokens.access) {
    location.replace('/app/');
}

const $userName = document.getElementById('user-name');
const $userRole = document.getElementById('user-role');
const $logout = document.getElementById('logout-btn');
const $list = document.getElementById('diag-list');
const $empty = document.getElementById('diag-empty');
const $summary = document.getElementById('diag-summary');
const $total = document.getElementById('diag-total');
const $lastRisk = document.getElementById('diag-last-risk');
const $profile = document.getElementById('diag-profile');


$logout.addEventListener('click', () => {
    auth.logout();
    location.replace('/');
});


function escapeHTML(s) {
    return String(s ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}

function profileLabel(p) {
    return ({
        calibrated: 'Calibrado',
        overconfident: 'Sobreconfiado',
        underconfident: 'Subconfiado',
    })[p] || '—';
}

function riskLabel(r) {
    return ({ low: 'Riesgo bajo', medium: 'Riesgo medio', high: 'Riesgo alto' })[r] || '—';
}

function formatDate(iso) {
    if (!iso) return '—';
    try {
        const d = new Date(iso);
        return d.toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
    } catch (_) {
        return iso;
    }
}


function renderDiagnosis(diag) {
    const reasoning = diag.reasoning || '';
    const firstSentence = reasoning.split(/(?<=[.!?])\s/)[0] || reasoning;
    const body = reasoning.length > firstSentence.length
        ? reasoning.slice(firstSentence.length).trim()
        : '';
    const recommendation = diag.recommendation || '';
    const date = formatDate(diag.generated_at);
    const risk = diag.risk_level || 'medium';
    const classification = diag.classification || 'calibrated';

    return `
      <article class="ai-diagnosis">
        <header class="ai-diagnosis__head eyebrow">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"
               style="color:var(--sage);" aria-hidden="true">
            <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"></path>
          </svg>
          Tutor cognitivo · Claude
        </header>
        <h3 class="ai-diagnosis__title">«${escapeHTML(firstSentence)}»</h3>
        ${body ? `<p class="ai-diagnosis__body">${escapeHTML(body)}</p>` : ''}
        ${recommendation ? `
          <div class="ai-diagnosis__suggestion" role="note">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"
                 style="color:var(--sage);" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
            <span>${escapeHTML(recommendation)}</span>
          </div>
        ` : ''}
        <footer class="diagnoses-item__meta">
          <span class="pill" data-profile="${escapeHTML(classification)}">${profileLabel(classification)}</span>
          <span class="pill" data-risk="${escapeHTML(risk)}">${riskLabel(risk)}</span>
          <span>Predicción de fallo: <span class="num">${diag.failure_probability != null ? Number(diag.failure_probability).toFixed(2) : '—'}</span></span>
          <span style="margin-left:auto;">${escapeHTML(date)}</span>
        </footer>
      </article>
    `;
}


async function bootstrap() {
    try {
        const user = await auth.me();
        $userName.textContent = user.username;
        $userRole.textContent = user.role;
        $userRole.dataset.role = user.role;

        const [profile, diagnoses] = await Promise.all([
            me.profile(),
            me.diagnoses(),
        ]);

        if (!diagnoses || !diagnoses.length) {
            $list.hidden = true;
            $empty.hidden = false;
            return;
        }

        $summary.hidden = false;
        $total.textContent = String(diagnoses.length);

        const latest = diagnoses[0];
        $lastRisk.textContent = riskLabel(latest.risk_level || 'medium');
        $lastRisk.dataset.risk = latest.risk_level || 'medium';

        const dominant = profile.predominant_profile || latest.classification || 'calibrated';
        $profile.textContent = profileLabel(dominant);
        $profile.dataset.profile = dominant;

        $list.innerHTML = diagnoses.map(renderDiagnosis).join('');
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
            tokens.clear();
            location.replace('/app/');
            return;
        }
        toast(err?.message || 'Error al cargar diagnósticos', { kind: 'error' });
        $list.hidden = true;
        $empty.hidden = false;
    }
}

bootstrap();
