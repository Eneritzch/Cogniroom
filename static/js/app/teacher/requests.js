const _v = new URL(import.meta.url).searchParams.get('v') || '';
const { rooms: roomsApi, tokens, ApiError, apiErrorMessage } = await import(`../api.js?v=${_v}`);
const { toast } = await import(`../toast.js?v=${_v}`);
const { enhanceSelects } = await import(`../custom-select.js?v=${_v}`);


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


function rowHTML(r) {
    const roomSections = r.room_sections || [];
    const reqSecId = r.section ? r.section.id : '';
    const askedFor = r.section
        ? ` · pidió paralelo <strong>${escapeHTML(r.section.code)}</strong>`
        : '';
    const secSelect = roomSections.length ? `
        <select class="form-select join-request-row__select" data-section-for="${r.id}" aria-label="Paralelo de ${escapeHTML(r.student.name)}">
            <option value="">Sin paralelo</option>
            ${roomSections.map((s) => `<option value="${s.id}" ${s.id === reqSecId ? 'selected' : ''}>${escapeHTML(s.code)}${s.schedule ? ` · ${escapeHTML(s.schedule)}` : ''}</option>`).join('')}
        </select>` : '';

    return `
    <li class="join-request-row" data-req="${r.id}">
        <span class="join-request-row__avatar" aria-hidden="true">${escapeHTML(r.student.initials || '')}</span>
        <div class="join-request-row__main">
            <span class="join-request-row__name">${escapeHTML(r.student.name)}</span>
            <span class="join-request-row__meta">${escapeHTML(r.student.email)} · quiere unirse a <strong>${escapeHTML(r.room.name)}</strong>${askedFor}</span>
        </div>
        <div class="join-request-row__actions">
            ${secSelect}
            <button type="button" class="ds-btn ds-btn--ink join-request-row__btn" data-approve="${r.id}">Aprobar</button>
            <button type="button" class="ds-btn ds-btn--ghost join-request-row__btn" data-reject="${r.id}">Rechazar</button>
        </div>
    </li>`;
}


function render(items) {
    const $list = document.getElementById('join-requests-list');
    const $empty = document.getElementById('requests-empty');
    if (!$list) return;

    if (!items.length) {
        $list.innerHTML = '';
        if ($empty) $empty.hidden = false;
        return;
    }
    if ($empty) $empty.hidden = true;
    $list.innerHTML = items.map(rowHTML).join('');
    // Convierte los <select> de paralelo al dropdown del design system.
    enhanceSelects($list);
}


async function load() {
    try {
        render((await roomsApi.joinRequests()) || []);
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) { tokens.clear(); location.replace('/app/'); return; }
        toast('No se pudieron cargar las solicitudes.', { kind: 'error' });
    }
}


const $list = document.getElementById('join-requests-list');
if ($list) {
    $list.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-approve], [data-reject]');
        if (!btn) return;
        const approveId = btn.dataset.approve;
        const rejectId = btn.dataset.reject;
        const $row = btn.closest('.join-request-row');
        $row.querySelectorAll('button').forEach((b) => { b.disabled = true; });
        try {
            if (approveId) {
                const $sel = $row.querySelector(`[data-section-for="${approveId}"]`);
                const sectionId = $sel && $sel.value ? Number($sel.value) : null;
                await roomsApi.approveJoin(Number(approveId), sectionId);
                toast('Estudiante aceptado en la sala.', { kind: 'success' });
            } else {
                await roomsApi.rejectJoin(Number(rejectId));
                toast('Solicitud rechazada.', { kind: 'success' });
            }
            await load();
        } catch (err) {
            $row.querySelectorAll('button').forEach((b) => { b.disabled = false; });
            toast(apiErrorMessage(err, 'No se pudo procesar la solicitud.'), { kind: 'error' });
        }
    });
}

load();
