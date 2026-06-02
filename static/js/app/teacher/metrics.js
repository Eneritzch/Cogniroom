const _v = new URL(import.meta.url).searchParams.get('v') || '';
const { tokens } = await import(`../api.js?v=${_v}`);
const { ROOM_DATA, escapeHTML, profileLabel, bindRoomChange } = await import(`./room-mock.js?v=${_v}`);
const { getActiveRoom } = await import(`../nav-auth.js?v=${_v}`);


if (!tokens.access) {
    location.replace('/app/');
}


const PAGE_SIZE = 12;

let currentProfile = 'all';
let currentCurso = 'all';
let currentSearch = '';
let currentPage = 1;


function cellColor(v) {
    if (v >= 0.7) return `color-mix(in oklab, var(--sage) ${v * 70}%, var(--paper-surface))`;
    if (v >= 0.5) return `color-mix(in oklab, var(--amber) ${v * 50}%, var(--paper-surface))`;
    return `color-mix(in oklab, var(--rust) ${(1 - v) * 60}%, var(--paper-surface))`;
}


function cellColorBold(v) {
    if (v >= 0.7) return `color-mix(in oklab, var(--sage) 78%, var(--paper-surface))`;
    if (v >= 0.5) return `color-mix(in oklab, var(--amber) 72%, var(--paper-surface))`;
    return `color-mix(in oklab, var(--rust) 72%, var(--paper-surface))`;
}


function profileShort(p) {
    return ({ calibrated: 'Cal.', overconfident: 'Sobre.', underconfident: 'Sub.' })[p] || '—';
}


function avg(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((s, v) => s + v, 0) / arr.length;
}


function rowAvg(row) {
    return avg(row.cells);
}


function nodeAvg(roster, nodeIndex) {
    return avg(roster.map((r) => r.cells[nodeIndex]));
}


function initials(name) {
    return name.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}


function fullName(s) {
    if (s.first_name || s.last_name) {
        return `${s.first_name || ''} ${s.last_name || ''}`.trim();
    }
    return s.name || '';
}


function applyFilters(roster) {
    const q = currentSearch.trim().toLowerCase();
    return roster.filter((s) => {
        if (currentProfile !== 'all' && s.profile !== currentProfile) return false;
        if (currentCurso !== 'all' && s.id_section !== currentCurso) return false;
        if (q && !fullName(s).toLowerCase().includes(q)) return false;
        return true;
    });
}


function nodeName(n) {
    return typeof n === 'string' ? n : (n && n.name) || '';
}


function nodeTopic(n) {
    return (n && typeof n === 'object' && n.description) ? n.description : '';
}


function renderInsights(data) {
    const $wrap = document.getElementById('metrics-insights');
    if (!$wrap) return;

    const nodeAverages = data.nodes.map((node, i) => ({ node, avg: nodeAvg(data.roster, i) }));
    nodeAverages.sort((a, b) => a.avg - b.avg);
    const weakest = nodeAverages[0];
    const strongest = nodeAverages[nodeAverages.length - 1];

    const studentAverages = data.roster.map((s) => ({ name: fullName(s), avg: rowAvg(s), profile: s.profile }));
    studentAverages.sort((a, b) => a.avg - b.avg);
    const lowest = studentAverages[0];
    const highest = studentAverages[studentAverages.length - 1];

    $wrap.innerHTML = `
        <article class="insight-card insight-card--weak">
            <span class="insight-card__k">Tema más débil</span>
            <strong class="insight-card__v">${escapeHTML(nodeName(weakest.node))}</strong>
            <span class="insight-card__sub">
                <span class="num">${Math.round(weakest.avg * 100)}%</span> de dominio promedio
            </span>
        </article>
        <article class="insight-card insight-card--strong">
            <span class="insight-card__k">Tema más fuerte</span>
            <strong class="insight-card__v">${escapeHTML(nodeName(strongest.node))}</strong>
            <span class="insight-card__sub">
                <span class="num">${Math.round(strongest.avg * 100)}%</span> de dominio promedio
            </span>
        </article>
        <article class="insight-card insight-card--risk">
            <span class="insight-card__k">Estudiante a apoyar</span>
            <strong class="insight-card__v">${escapeHTML(lowest.name)}</strong>
            <span class="insight-card__sub">
                <span class="num">${Math.round(lowest.avg * 100)}%</span> · ${escapeHTML(profileLabel(lowest.profile))}
            </span>
        </article>
        <article class="insight-card insight-card--top">
            <span class="insight-card__k">Estudiante destacado</span>
            <strong class="insight-card__v">${escapeHTML(highest.name)}</strong>
            <span class="insight-card__sub">
                <span class="num">${Math.round(highest.avg * 100)}%</span> · ${escapeHTML(profileLabel(highest.profile))}
            </span>
        </article>
    `;
}


function renderCursoChips(sections) {
    const $wrap = document.getElementById('metrics-curso-chips');
    const $group = document.getElementById('metrics-curso-group');
    if (!$wrap || !$group) return;

    if (!sections || sections.length <= 1) {
        $group.hidden = true;
        return;
    }
    $group.hidden = false;

    const totalStudents = sections.reduce((s, c) => s + (c.students || 0), 0);
    const chips = [
        `<button type="button" class="metrics-chip" data-curso="all" aria-pressed="${currentCurso === 'all' ? 'true' : 'false'}">
            Todos <span class="metrics-chip__count num">${totalStudents}</span>
        </button>`,
        ...sections.map((c) => `
            <button type="button" class="metrics-chip" data-curso="${c.id_section}" aria-pressed="${currentCurso === c.id_section ? 'true' : 'false'}">
                ${escapeHTML(c.code || c.name)} <span class="metrics-chip__count num">${c.students || 0}</span>
            </button>
        `),
    ];
    $wrap.innerHTML = chips.join('');

    $wrap.querySelectorAll('[data-curso]').forEach((btn) => {
        btn.addEventListener('click', () => {
            currentCurso = btn.dataset.curso;
            currentPage = 1;
            $wrap.querySelectorAll('[data-curso]').forEach((b) => {
                b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
            });
            renderHeatmap();
        });
    });
}


function renderHeatmap() {
    const room = getActiveRoom();
    const data = ROOM_DATA[room.id];
    if (!data) return;

    const $header = document.getElementById('heatmap-header');
    const $rows = document.getElementById('heatmap-rows');
    const $footer = document.getElementById('heatmap-footer');
    const $meta = document.getElementById('metrics-meta');
    if (!$header || !$rows || !$footer) return;

    const filtered = applyFilters(data.roster);
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    const startIdx = (currentPage - 1) * PAGE_SIZE;
    const visible = filtered.slice(startIdx, startIdx + PAGE_SIZE);

    if ($meta) {
        $meta.textContent = filtered.length === 0
            ? 'Sin estudiantes para este filtro'
            : `${startIdx + 1}–${startIdx + visible.length} de ${filtered.length} estudiantes`;
    }

    if (filtered.length === 0) {
        $header.innerHTML = '';
        $rows.innerHTML = `<div class="heatmap__empty">Sin estudiantes para este filtro.</div>`;
        $footer.innerHTML = '';
        renderPager(0, 1);
        return;
    }

    $header.innerHTML = `
        <div class="heatmap__row-name heatmap__row-name--header">
            <span class="eyebrow">Estudiante</span>
        </div>
        ${data.nodes.map((n) => {
            const topic = nodeTopic(n);
            return `<div class="heatmap__header-cell eyebrow" ${topic ? `title="${escapeHTML(topic)}"` : ''}>${escapeHTML(nodeName(n))}</div>`;
        }).join('')}
        <div class="heatmap__summary heatmap__summary--header eyebrow">Promedio</div>
    `;

    $rows.innerHTML = visible.map((row) => {
        const rAvg = rowAvg(row);
        const displayName = fullName(row);
        return `
        <div class="heatmap__row">
            <div class="heatmap__row-name">
                <span class="heatmap__row-avatar" aria-hidden="true">${initials(displayName)}</span>
                <span class="heatmap__row-name-text">${escapeHTML(displayName)}</span>
                <span class="pill" data-profile="${row.profile}">${profileShort(row.profile)}</span>
            </div>
            ${row.cells.map((v, i) => `
                <div class="heatmap__cell" style="background:${cellColor(v)};"
                     title="${escapeHTML(displayName)} · ${escapeHTML(nodeName(data.nodes[i]))} · ${Math.round(v * 100)}%">
                    <span class="heatmap__cell-value">${Math.round(v * 100)}</span>
                </div>
            `).join('')}
            <div class="heatmap__summary">${Math.round(rAvg * 100)}%</div>
        </div>
        `;
    }).join('');

    $footer.innerHTML = `
        <div class="heatmap__row-name heatmap__row-name--footer">
            <span class="eyebrow">Promedio del tema</span>
        </div>
        ${data.nodes.map((_, i) => {
            const v = nodeAvg(data.roster, i);
            return `<div class="heatmap__cell heatmap__cell--avg" style="background:${cellColorBold(v)};">
                <span class="heatmap__cell-value">${Math.round(v * 100)}</span>
            </div>`;
        }).join('')}
        <div class="heatmap__summary heatmap__summary--total">${Math.round(avg(data.roster.map(rowAvg)) * 100)}%</div>
    `;

    renderPager(filtered.length, totalPages);
}


function renderPager(total, totalPages) {
    const $pager = document.getElementById('metrics-pager');
    if (!$pager) return;

    if (total === 0 || totalPages <= 1) {
        $pager.innerHTML = '';
        $pager.hidden = true;
        return;
    }
    $pager.hidden = false;

    const pages = pageRange(currentPage, totalPages);
    const parts = [];
    parts.push(`<span class="metrics-pager__info">Página ${currentPage} de ${totalPages}</span>`);
    parts.push(`<button type="button" class="metrics-pager__btn" data-page-go="prev" ${currentPage === 1 ? 'disabled' : ''} aria-label="Anterior">‹</button>`);
    pages.forEach((p) => {
        if (p === '…') {
            parts.push(`<span class="metrics-pager__ellipsis">…</span>`);
        } else {
            parts.push(`<button type="button" class="metrics-pager__btn" data-page-go="${p}" ${p === currentPage ? 'aria-current="page"' : ''}>${p}</button>`);
        }
    });
    parts.push(`<button type="button" class="metrics-pager__btn" data-page-go="next" ${currentPage === totalPages ? 'disabled' : ''} aria-label="Siguiente">›</button>`);
    $pager.innerHTML = parts.join('');

    $pager.querySelectorAll('[data-page-go]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.pageGo;
            if (target === 'prev') currentPage = Math.max(1, currentPage - 1);
            else if (target === 'next') currentPage = Math.min(totalPages, currentPage + 1);
            else currentPage = Number(target);
            renderHeatmap();
        });
    });
}


function pageRange(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 4) return [1, 2, 3, 4, 5, '…', total];
    if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total];
    return [1, '…', current - 1, current, current + 1, '…', total];
}


function render() {
    const room = getActiveRoom();
    const data = ROOM_DATA[room.id];
    if (!data) return;

    document.getElementById('room-name').textContent = data.name;
    document.getElementById('room-students').textContent = String(data.students);

    currentPage = 1;
    currentCurso = 'all';

    renderInsights(data);
    renderCursoChips(data.sections || data.cursos);
    renderHeatmap();
}


document.querySelectorAll('[data-profile-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
        currentProfile = btn.dataset.profileFilter;
        currentPage = 1;
        document.querySelectorAll('[data-profile-filter]').forEach((b) => {
            b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        });
        renderHeatmap();
    });
});


const $search = document.getElementById('metrics-search');
if ($search) {
    let t = null;
    $search.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => {
            currentSearch = $search.value;
            currentPage = 1;
            renderHeatmap();
        }, 150);
    });
}


bindRoomChange(render);