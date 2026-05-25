const _v = new URL(import.meta.url).searchParams.get('v') || '';
const { tokens } = await import(`../api.js?v=${_v}`);
const { ROOM_DATA, escapeHTML } = await import(`./room-mock.js?v=${_v}`);
const { MOCK_ROOMS, getActiveRoom, setActiveRoom } = await import(`../nav-auth.js?v=${_v}`);
const { toast } = await import(`../toast.js?v=${_v}`);


if (!tokens.access) {
    location.replace('/app/');
}


const PAGE_SIZE = 6;
let currentPage = 1;


async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}


function deriveAlerts(data) {
    const pendingAI = (data.questionBank || []).filter((q) => !q.approved).length;
    const atRisk = (data.roster || []).filter((s) => Math.abs(s.gap) > 0.2).length;
    return { pendingAI, atRisk };
}


function healthTone(icc) {
    if (icc >= 0.65) return 'moss';
    if (icc >= 0.5)  return 'amber';
    return 'rust';
}


function renderCard(r, isActive) {
    const d = r.data;
    const alerts = deriveAlerts(d);
    const cursoCount = (d.cursos || []).filter((c) => c.id !== 'unico').length;
    const tone = healthTone(d.icc);

    return `
    <li class="rcard ${isActive ? 'rcard--active' : ''}">
        ${isActive ? '<span class="rcard__activedot" aria-label="Sala activa"></span>' : ''}
        <header class="rcard__head">
            <div class="rcard__id">
                <h3 class="rcard__name">${escapeHTML(d.name)}</h3>
                <div class="rcard__submeta">
                    <span>Creada ${escapeHTML(d.createdAt)}</span>
                    <span class="rcard__submeta-sep">·</span>
                    <span>Activa ${escapeHTML(d.lastActivity)}</span>
                </div>
            </div>
        </header>

        <div class="rcard__code">
            <span class="rcard__code-label eyebrow">Código</span>
            <span class="rcard__code-value num">${escapeHTML(d.accessCode)}</span>
            <div class="rcard__code-actions">
                <button type="button" class="rcard__icon-btn" data-copy="${escapeHTML(d.accessCode)}" aria-label="Copiar código" title="Copiar">
                    <svg class="icon-svg" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                        <rect x="9" y="9" width="13" height="13" rx="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                </button>
                <button type="button" class="rcard__icon-btn" data-share="${escapeHTML(d.name)}|${escapeHTML(d.accessCode)}" aria-label="Compartir" title="Compartir">
                    <svg class="icon-svg" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="18" cy="5" r="3"></circle>
                        <circle cx="6" cy="12" r="3"></circle>
                        <circle cx="18" cy="19" r="3"></circle>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                    </svg>
                </button>
            </div>
        </div>

        <div class="rcard__stats">
            <div class="rcard__stat" title="Estudiantes inscritos">
                <svg class="icon-svg" width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                </svg>
                <span class="num">${d.students}</span>
                <span class="rcard__stat-label">estudiantes</span>
            </div>
            <div class="rcard__stat" title="Preguntas en el banco">
                <svg class="icon-svg" width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span class="num">${d.questions}</span>
                <span class="rcard__stat-label">preguntas</span>
            </div>
            <div class="rcard__stat" title="Documentos PDF subidos">
                <svg class="icon-svg" width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <span class="num">${d.pdfs}</span>
                <span class="rcard__stat-label">PDFs</span>
            </div>
            ${cursoCount > 0 ? `
            <div class="rcard__stat" title="Cursos paralelos dentro de la sala">
                <svg class="icon-svg" width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                </svg>
                <span class="num">${cursoCount}</span>
                <span class="rcard__stat-label">${cursoCount === 1 ? 'curso' : 'cursos'}</span>
            </div>
            ` : ''}
            <div class="rcard__stat rcard__stat--health" data-tone="${tone}" title="Calibración promedio del grupo (qué tan bien se conocen)">
                <svg class="icon-svg" width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="9"></circle>
                    <circle cx="12" cy="12" r="4"></circle>
                </svg>
                <span class="num">${(d.icc * 100).toFixed(0)}%</span>
                <span class="rcard__stat-label">calibración</span>
            </div>
        </div>

        ${(alerts.pendingAI > 0 || alerts.atRisk > 0) ? `
        <div class="rcard__alerts">
            ${alerts.pendingAI > 0 ? `
                <span class="rcard__alert" data-kind="pending">
                    <svg class="icon-svg" width="11" height="11" viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <span class="num">${alerts.pendingAI}</span> IA por revisar
                </span>
            ` : ''}
            ${alerts.atRisk > 0 ? `
                <span class="rcard__alert" data-kind="risk">
                    <svg class="icon-svg" width="11" height="11" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    <span class="num">${alerts.atRisk}</span> en riesgo
                </span>
            ` : ''}
        </div>
        ` : ''}

        <footer class="rcard__foot">
            ${isActive
                ? '<span class="rcard__activelabel">Activa</span>'
                : `<button type="button" class="rcard__link" data-activate="${r.id}">Hacer activa</button>`
            }
            <a class="rcard__cta" href="/app/students/" data-activate="${r.id}">
                Ver detalle
                <svg class="icon-svg" width="11" height="11" viewBox="0 0 24 24" aria-hidden="true">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
            </a>
        </footer>
    </li>
    `;
}


function render() {
    const $list = document.getElementById('rooms-list');
    const $count = document.getElementById('rooms-count');
    const $meta = document.getElementById('rooms-meta');
    if (!$list) return;

    const active = getActiveRoom();
    const rooms = MOCK_ROOMS.map((r) => ({ ...r, data: ROOM_DATA[r.id] })).filter((r) => r.data);

    if ($count) $count.textContent = String(rooms.length);

    const totalPages = Math.max(1, Math.ceil(rooms.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    const startIdx = (currentPage - 1) * PAGE_SIZE;
    const visible = rooms.slice(startIdx, startIdx + PAGE_SIZE);

    if ($meta) {
        $meta.textContent = rooms.length <= PAGE_SIZE
            ? ''
            : `${startIdx + 1}–${startIdx + visible.length} de ${rooms.length}`;
    }

    $list.innerHTML = visible.map((r) => renderCard(r, r.id === active.id)).join('');

    renderPager(rooms.length, totalPages);
    bindActions();
}


function renderPager(total, totalPages) {
    const $pager = document.getElementById('rooms-pager');
    if (!$pager) return;

    if (total === 0 || totalPages <= 1) {
        $pager.innerHTML = '';
        $pager.hidden = true;
        return;
    }
    $pager.hidden = false;

    const parts = [];
    parts.push(`<span class="rooms-pager__info">Página ${currentPage} de ${totalPages}</span>`);
    parts.push(`<button type="button" class="rooms-pager__btn" data-page-go="prev" ${currentPage === 1 ? 'disabled' : ''} aria-label="Anterior">‹</button>`);
    for (let p = 1; p <= totalPages; p++) {
        parts.push(`<button type="button" class="rooms-pager__btn" data-page-go="${p}" ${p === currentPage ? 'aria-current="page"' : ''}>${p}</button>`);
    }
    parts.push(`<button type="button" class="rooms-pager__btn" data-page-go="next" ${currentPage === totalPages ? 'disabled' : ''} aria-label="Siguiente">›</button>`);
    $pager.innerHTML = parts.join('');

    $pager.querySelectorAll('[data-page-go]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.pageGo;
            if (target === 'prev') currentPage = Math.max(1, currentPage - 1);
            else if (target === 'next') currentPage = Math.min(totalPages, currentPage + 1);
            else currentPage = Number(target);
            render();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
}


function bindActions() {
    document.querySelectorAll('[data-copy]').forEach((btn) => {
        btn.addEventListener('click', async () => {
            const code = btn.dataset.copy;
            const ok = await copyToClipboard(code);
            toast(
                ok ? `Código ${code} copiado al portapapeles.` : `No se pudo copiar el código.`,
                { kind: ok ? 'success' : 'error' },
            );
        });
    });

    document.querySelectorAll('[data-share]').forEach((btn) => {
        btn.addEventListener('click', async () => {
            const [name, code] = btn.dataset.share.split('|');
            const text = `Únete a "${name}" en CogniRoom con el código ${code}`;
            if (navigator.share) {
                try {
                    await navigator.share({ title: name, text });
                    return;
                } catch { /* user cancelled */ }
            }
            const ok = await copyToClipboard(text);
            toast(
                ok ? 'Texto de invitación copiado al portapapeles.' : 'No se pudo copiar la invitación.',
                { kind: ok ? 'success' : 'error' },
            );
        });
    });

    document.querySelectorAll('[data-activate]').forEach((el) => {
        el.addEventListener('click', () => {
            setActiveRoom(Number(el.dataset.activate));
            if (el.tagName !== 'A') render();
        });
    });
}


window.addEventListener('cogniroom:roomchange', render);

render();