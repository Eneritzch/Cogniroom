
import { auth, cognitive, tokens, ApiError } from './api.js';
import { toast } from './toast.js';

const $userName = document.getElementById('user-name');
const $userRole = document.getElementById('user-role');
const $logout = document.getElementById('logout-btn');
const $iccValue = document.getElementById('icc-value');
const $iccCaption = document.getElementById('icc-caption');
const $profilePill = document.getElementById('profile-pill');
const $nodesCount = document.getElementById('nodes-count');
const $lastDiagText = document.getElementById('last-diag-text');
const $riskPill = document.getElementById('risk-pill');
const $nodesGrid = document.getElementById('nodes-grid');
const $diagCard = document.getElementById('diagnosis-card');

if (!tokens.access) {
    location.replace('/app/');
}

$logout.addEventListener('click', () => {
    auth.logout();
    location.replace('/app/');
});

function fmt(n, digits = 2) {
    if (n == null || Number.isNaN(n)) return '—';
    return Number(n).toFixed(digits);
}

function profileLabel(profile) {
    return ({
        calibrated: 'Calibrado',
        overconfident: 'Sobreconfiado',
        underconfident: 'Subconfiado',
    })[profile] || '—';
}

function trendIcon(trend) {
    return ({
        mejorando: '↑',
        empeorando: '↓',
        estable: '→',
    })[trend] || '→';
}

function animateNumber(el, target, digits = 2) {
    const start = 0;
    const duration = 800;
    const t0 = performance.now();
    const tick = (now) => {
        const p = Math.min(1, (now - t0) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = (start + (target - start) * eased).toFixed(digits);
        if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
}

function nodeCardHTML(node) {
    const profile = node.profile || 'calibrated';
    const icc = node.icc_value != null ? fmt(node.icc_value) : null;
    const mastery = node.p_mastery ?? 0;
    return `
      <div class="col">
        <article class="card h-100" aria-labelledby="n-${node.node_id}">
          <header class="d-flex justify-content-between align-items-start gap-3">
            <div>
              <p class="card-eyebrow">${escapeHTML(node.trend || 'estable')} ${trendIcon(node.trend)}</p>
              <h3 id="n-${node.node_id}" class="card-title">${escapeHTML(node.node_name)}</h3>
            </div>
            <span class="pill" data-profile="${profile}">${profileLabel(profile)}</span>
          </header>

          <div class="dual-bar" aria-label="Comparación confianza vs dominio">
            <div class="dual-bar__row">
              <span class="dual-bar__label">Dominio</span>
              <div class="dual-bar__track"><div class="dual-bar__fill dual-bar__fill--reality" style="--value: ${mastery}"></div></div>
              <span class="dual-bar__value">${fmt(mastery)}</span>
            </div>
            <div class="dual-bar__row">
              <span class="dual-bar__label">ICC</span>
              <div class="dual-bar__track"><div class="dual-bar__fill" style="--value: ${node.icc_value ?? 0}"></div></div>
              <span class="dual-bar__value">${icc ?? '—'}</span>
            </div>
          </div>
        </article>
      </div>
    `;
}

function escapeHTML(s) {
    return String(s ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}

async function bootstrap() {
    try {
        const [user, profile, nodes] = await Promise.all([
            auth.me(),
            cognitive.myProfile(),
            cognitive.myNodes(),
        ]);

        renderUser(user);
        renderProfile(profile);
        renderNodes(nodes);
        renderDiagnosis(profile.last_diagnosis);
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
            tokens.clear();
            location.replace('/app/');
            return;
        }
        toast(err?.message || 'Error al cargar datos', { kind: 'error' });
    }
}

function renderUser(user) {
    $userName.textContent = user.username;
    $userRole.textContent = user.role;
    $userRole.dataset.role = user.role;
}

function renderProfile(profile) {
    if (profile.icc_avg != null) {
        animateNumber($iccValue, profile.icc_avg);
    }
    const p = profile.predominant_profile;
    if (p) {
        $profilePill.textContent = profileLabel(p);
        $profilePill.dataset.profile = p;
    }
    $nodesCount.textContent = profile.bkt_states?.length ?? 0;
}

function renderNodes(nodes) {
    if (!nodes || nodes.length === 0) {
        $nodesGrid.innerHTML = `
          <div class="col-12">
            <p class="empty mb-0">Aún no hay nodos rastreados. Inicia una sesión para empezar a registrar tu dominio.</p>
          </div>`;
        return;
    }
    $nodesGrid.innerHTML = nodes.map(nodeCardHTML).join('');
}

function renderDiagnosis(diag) {
    if (!diag) {
        $lastDiagText.textContent = 'Aún no hay diagnóstico generado.';
        $riskPill.hidden = true;
        return;
    }
    $lastDiagText.textContent = diag.reasoning?.slice(0, 140) || 'Diagnóstico disponible.';
    $riskPill.hidden = false;
    $riskPill.textContent = `Riesgo ${diag.risk_level}`;
    $riskPill.dataset.risk = diag.risk_level;

    $diagCard.innerHTML = `
      <header class="d-flex flex-wrap gap-3 align-items-center mb-4">
        <span class="pill" data-profile="${escapeHTML(diag.classification)}">${profileLabel(diag.classification)}</span>
        <span class="pill" data-risk="${escapeHTML(diag.risk_level)}">Riesgo ${escapeHTML(diag.risk_level)}</span>
        <span class="card-meta">predicción de fallo: ${fmt(diag.failure_probability)}</span>
      </header>

      <h3 class="card-title">Razonamiento</h3>
      <p>${escapeHTML(diag.reasoning) || '—'}</p>

      <h3 class="card-title mt-4">Recomendación</h3>
      <p>${escapeHTML(diag.recommendation) || '—'}</p>

      ${diag.risk_node?.length ? `
        <h3 class="card-title mt-4">Nodos en riesgo</h3>
        <ul>${diag.risk_node.map(n => `<li>${escapeHTML(n)}</li>`).join('')}</ul>
      ` : ''}
    `;
}

bootstrap();
