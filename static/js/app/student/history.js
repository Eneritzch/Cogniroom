const _v = new URL(import.meta.url).searchParams.get('v') || '';
const { tokens } = await import(`../api.js?v=${_v}`);
const { STUDENT_DATA, escapeHTML, fmt } = await import(`./student-mock.js?v=${_v}`);


if (!tokens.access) {
    location.replace('/app/');
}


const PAGE_SIZE = 10;

let currentStatus = 'all';
let currentMode = 'all';
let currentSearch = '';
let currentPage = 1;


function fmtDate(iso) {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(2);
    const hh = String(d.getHours()).padStart(2, '0');
    const mn = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yy} · ${hh}:${mn}`;
}


function relDate(iso) {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now - d;
    const diffH = Math.round(diffMs / (1000 * 60 * 60));
    if (diffH < 1)  return 'hace minutos';
    if (diffH < 24) return `hace ${diffH} h`;
    const diffD = Math.round(diffH / 24);
    if (diffD === 1) return 'ayer';
    if (diffD < 7)   return `hace ${diffD} días`;
    if (diffD < 30)  return `hace ${Math.round(diffD / 7)} sem`;
    return `hace ${Math.round(diffD / 30)} meses`;
}


function fmtDuration(min) {
    if (min == null) return '—';
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h}h ${m}m`;
}


function accuracyTone(pct) {
    if (pct >= 75) return 'moss';
    if (pct >= 50) return 'amber';
    return 'rust';
}


function iccTone(delta) {
    if (delta == null) return 'amber';
    if (delta > 0.02)  return 'moss';
    if (delta < -0.02) return 'rust';
    return 'amber';
}


function iccArrow(delta) {
    if (delta == null) return '·';
    if (delta > 0.02)  return '▲';
    if (delta < -0.02) return '▼';
    return '◇';
}


function statusLabel(status) {
    return status === 'completed' ? 'Completada' : 'En curso';
}


function filtered() {
    const list = STUDENT_DATA.sessionHistory.filter((s) => {
        if (currentStatus !== 'all' && s.status !== currentStatus) return false;
        if (currentMode !== 'all' && s.mode !== currentMode) return false;
        if (currentSearch && !s.roomName.toLowerCase().includes(currentSearch)) return false;
        return true;
    });
    return list.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
}


function renderRow(s) {
    const pct = s.answered ? Math.round((s.correct / s.answered) * 100) : 0;
    const accTone = accuracyTone(pct);
    const dTone = iccTone(s.iccDelta);
    const dSign = s.iccDelta == null ? '' : (s.iccDelta > 0 ? '+' : '');
    const dValue = s.iccDelta == null ? '—' : `${dSign}${fmt(s.iccDelta)}`;
    const modeDotClass = s.mode === 'individual' ? 'history-cell__mode--individual' : '';

    const actionBtn = s.status === 'completed'
        ? `<a class="history-action" href="/app/session/${s.id}/review/" data-session-id="${s.id}">
               Revisar
               <svg class="icon-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                   <line x1="5" y1="12" x2="19" y2="12"></line>
                   <polyline points="12 5 19 12 12 19"></polyline>
               </svg>
           </a>`
        : `<a class="history-action" href="/app/session/" data-session-id="${s.id}">
               Continuar
               <svg class="icon-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                   <polygon points="5 3 19 12 5 21 5 3"></polygon>
               </svg>
           </a>`;

    return `
    <li class="history-row" role="row">
        <div class="history-cell history-cell--room" role="cell">
            <span class="history-cell__mode ${modeDotClass}" aria-hidden="true" title="${s.mode === 'individual' ? 'Sala de estudio' : 'Sala grupal'}"></span>
            <span class="history-cell__name">${escapeHTML(s.roomName)}</span>
        </div>
        <div class="history-cell history-cell--when" role="cell">
            <span class="history-mobile-label">Cuándo</span>
            <span class="history-cell__date">${fmtDate(s.startedAt)}</span>
            <span class="history-cell__rel">${relDate(s.startedAt)}</span>
        </div>
        <div class="history-cell history-cell--duration" role="cell">
            <span class="history-mobile-label">Duración</span>
            ${fmtDuration(s.durationMin)}
        </div>
        <div class="history-cell history-cell--accuracy" role="cell">
            <span class="history-mobile-label">Aciertos</span>
            <span class="history-cell__accuracy-pct" data-tone="${accTone}">${pct}%</span>
            <span class="history-cell__accuracy-sub">${s.correct}/${s.answered}</span>
        </div>
        <div class="history-cell history-cell--icc" role="cell">
            <span class="history-mobile-label">ICC</span>
            <span class="history-cell__icc" data-tone="${dTone}">${iccArrow(s.iccDelta)} ${dValue}</span>
        </div>
        <div class="history-cell history-cell--status" role="cell">
            <span class="history-mobile-label">Estado</span>
            <span class="history-status" data-status="${s.status}">${statusLabel(s.status)}</span>
        </div>
        <div class="history-cell history-cell--action" role="cell">
            ${actionBtn}
        </div>
    </li>`;
}


function renderPager(total) {
    const $pager = document.getElementById('history-pager');
    const pages = Math.ceil(total / PAGE_SIZE);
    if (pages <= 1) {
        $pager.innerHTML = '';
        return;
    }

    const arrowLeft = `<svg class="icon-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"></polyline></svg>`;
    const arrowRight = `<svg class="icon-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>`;

    const buttons = [];
    buttons.push(`<button type="button" class="rooms-pager__btn" data-page="prev" ${currentPage === 1 ? 'disabled' : ''} aria-label="Página anterior">${arrowLeft}</button>`);
    for (let i = 1; i <= pages; i++) {
        buttons.push(`<button type="button" class="rooms-pager__btn" data-page="${i}" ${i === currentPage ? 'aria-current="page"' : ''}>${i}</button>`);
    }
    buttons.push(`<button type="button" class="rooms-pager__btn" data-page="next" ${currentPage === pages ? 'disabled' : ''} aria-label="Página siguiente">${arrowRight}</button>`);

    $pager.innerHTML = `
      <span class="rooms-pager__info">Página ${currentPage} de ${pages}</span>
      <div class="rooms-pager__nav">${buttons.join('')}</div>
    `;

    $pager.querySelectorAll('[data-page]').forEach((b) => {
        b.addEventListener('click', () => {
            const v = b.dataset.page;
            if (v === 'prev') currentPage = Math.max(1, currentPage - 1);
            else if (v === 'next') currentPage = Math.min(pages, currentPage + 1);
            else currentPage = Number(v);
            render();
        });
    });
}


function renderStats() {
    const all = STUDENT_DATA.sessionHistory;
    const completed = all.filter((s) => s.status === 'completed');
    const totalAns = completed.reduce((sum, s) => sum + s.answered, 0);
    const totalCor = completed.reduce((sum, s) => sum + s.correct, 0);
    const totalMin = completed.reduce((sum, s) => sum + (s.durationMin || 0), 0);
    const accPct = totalAns ? Math.round((totalCor / totalAns) * 100) : 0;
    const iccSum = completed.reduce((sum, s) => sum + (s.iccDelta || 0), 0);

    document.getElementById('h-total').textContent = all.length;
    document.getElementById('h-accuracy').textContent = `${accPct}%`;
    document.getElementById('h-accuracy').dataset.tone = accuracyTone(accPct);
    document.getElementById('h-time').textContent = fmtDuration(totalMin);
    const iccEl = document.getElementById('h-icc');
    iccEl.textContent = `${iccSum >= 0 ? '+' : ''}${fmt(iccSum)}`;
    iccEl.dataset.tone = iccTone(iccSum);
}


function render() {
    const $rows = document.getElementById('history-rows');
    const $empty = document.getElementById('history-empty');
    const list = filtered();

    document.getElementById('history-count').textContent = list.length;

    const $meta = document.getElementById('history-meta');
    if ($meta) {
        $meta.textContent = list.length === 0
            ? ''
            : `Mostrando ${list.length} sesión${list.length === 1 ? '' : 'es'}`;
    }

    if (list.length === 0) {
        $rows.innerHTML = '';
        $empty.hidden = false;
        renderPager(0);
        return;
    }

    $empty.hidden = true;

    const totalPages = Math.ceil(list.length / PAGE_SIZE);
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * PAGE_SIZE;
    const slice = list.slice(start, start + PAGE_SIZE);

    $rows.innerHTML = slice.map(renderRow).join('');
    renderPager(list.length);
}


document.querySelectorAll('[data-status-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
        currentStatus = btn.dataset.statusFilter;
        currentPage = 1;
        document.querySelectorAll('[data-status-filter]').forEach((b) => {
            b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        });
        render();
    });
});


document.querySelectorAll('[data-mode-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
        currentMode = btn.dataset.modeFilter;
        currentPage = 1;
        document.querySelectorAll('[data-mode-filter]').forEach((b) => {
            b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        });
        render();
    });
});


const $search = document.getElementById('history-search');
$search.addEventListener('input', () => {
    currentSearch = $search.value.trim().toLowerCase();
    currentPage = 1;
    render();
});


renderStats();
render();
