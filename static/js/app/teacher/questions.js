const _v = new URL(import.meta.url).searchParams.get('v') || '';
const { rooms: roomsApi, questions: questionsApi, pdfs: pdfsApi, tokens, ApiError } = await import(`../api.js?v=${_v}`);
const { toast } = await import(`../toast.js?v=${_v}`);


function hideModal(id) {
    const $modal = document.getElementById(id);
    if ($modal && window.bootstrap) {
        const instance = window.bootstrap.Modal.getInstance($modal) || new window.bootstrap.Modal($modal);
        instance.hide();
    }
}

function showModal(id) {
    const $modal = document.getElementById(id);
    if ($modal && window.bootstrap) {
        const instance = window.bootstrap.Modal.getInstance($modal) || new window.bootstrap.Modal($modal);
        instance.show();
    }
}


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

function activeRoomId() {
    return Number(localStorage.getItem('cogniroom.activeRoomId')) || null;
}


let ROOM_ID = null;
let ROOM_INFO = null;
let BANK = [];
let NODES = [];
let currentStatus = 'all';
let currentSource = 'all';
let currentType = 'all';
let currentSearch = '';
let currentNode = 'all';
let EDIT_ID = null;

const SVG_CHECK = '<svg class="icon-svg" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>';
const SVG_X = '<svg class="icon-svg" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
const SVG_PENCIL = '<svg class="icon-svg" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>';
const SVG_TRASH = '<svg class="icon-svg" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';


function difficultyMeta(level) {
    if (level === 'easy')   return { label: 'Fácil',   tone: 'moss' };
    if (level === 'medium') return { label: 'Media',   tone: 'amber' };
    if (level === 'hard')   return { label: 'Difícil', tone: 'rust' };
    return null;
}


function nodeName(node) {
    if (!node) return '';
    if (typeof node === 'string') return node;
    return node.name || '';
}


function nodeTopic(node) {
    if (!node || typeof node === 'string') return '';
    return node.description || '';
}


function questionText(q) {
    return q.statement || '';
}


function applyFilters(bank) {
    const q = currentSearch.trim().toLowerCase();
    return bank.filter((qst) => {
        if (currentNode !== 'all' && (qst.node_name || nodeName(qst.node) || 'Sin tema') !== currentNode) return false;
        if (currentStatus !== 'all' && qst.status !== currentStatus) return false;
        if (currentSource !== 'all' && qst.source !== currentSource) return false;
        if (currentType !== 'all' && (qst.question_type || 'single') !== currentType) return false;
        if (q) {
            const text = questionText(qst).toLowerCase();
            const name = nodeName(qst.node).toLowerCase();
            const topic = nodeTopic(qst.node).toLowerCase();
            if (!text.includes(q) && !name.includes(q) && !topic.includes(q)) return false;
        }
        return true;
    });
}


function formatDate(iso) {
    if (!iso) return '';
    return String(iso).slice(0, 10);
}


const TYPE_LABEL = { single: 'Opción única', true_false: 'Verdadero / Falso', multiple: 'Opción múltiple' };
const TYPE_ORDER = { single: 0, true_false: 1, multiple: 2 };

const BLOOM_LABEL = {
    recordar: 'Recordar', comprender: 'Comprender', aplicar: 'Aplicar',
    analizar: 'Analizar', evaluar: 'Evaluar', crear: 'Crear',
};
function bloomLabel(l) { return BLOOM_LABEL[l] || l; }

function qType(q) {
    return q.question_type || 'single';
}

function renderList() {
    const $list = document.getElementById('questions-list');
    const $meta = document.getElementById('questions-meta');
    const $pager = document.getElementById('questions-pager');
    if (!$list) return;
    if ($pager) { $pager.hidden = true; $pager.innerHTML = ''; }

    const filtered = applyFilters(BANK);
    if ($meta) {
        $meta.textContent = filtered.length === 0
            ? 'Sin resultados'
            : `${filtered.length} pregunta${filtered.length === 1 ? '' : 's'}`;
    }

    if (filtered.length === 0) {
        $list.innerHTML = `<li class="questions-empty">Sin preguntas para este filtro.</li>`;
        return;
    }

    // Agrupar por nodo (sección); dentro de cada nodo, separar por tipo.
    const byNode = new Map();
    filtered.forEach((q) => {
        const node = q.node_name || nodeName(q.node) || 'Sin tema';
        if (!byNode.has(node)) byNode.set(node, []);
        byNode.get(node).push(q);
    });
    const sections = Array.from(byNode.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    $list.innerHTML = sections.map(([node, qs]) => {
        const counts = {};
        qs.forEach((q) => { const t = qType(q); counts[t] = (counts[t] || 0) + 1; });
        const breakdown = Object.keys(counts)
            .sort((a, b) => TYPE_ORDER[a] - TYPE_ORDER[b])
            .map((t) => `${counts[t]} ${TYPE_LABEL[t]}`)
            .join(' · ');

        // El sub-encabezado por tipo solo aporta cuando el tema mezcla tipos;
        // con un solo tipo es ruido (el encabezado del tema ya lo indica).
        const multiType = Object.keys(counts).length > 1;
        const sorted = qs.slice().sort((a, b) => TYPE_ORDER[qType(a)] - TYPE_ORDER[qType(b)]);
        let lastType = null;
        const cards = sorted.map((q) => {
            const t = qType(q);
            let divider = '';
            if (multiType && t !== lastType) {
                divider = `<li class="qsection__type">${TYPE_LABEL[t]}</li>`;
            }
            lastType = t;
            return divider + cardHTML(q);
        }).join('');

        return `
        <li class="qsection">
            <header class="qsection__head" data-qsection-toggle role="button" tabindex="0" aria-expanded="true">
                <svg class="icon-svg qsection__chevron" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
                <h3 class="qsection__title">
                    <svg class="icon-svg" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="12" cy="12" r="9"></circle>
                        <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"></circle>
                    </svg>
                    ${escapeHTML(node)}
                </h3>
                <span class="qsection__count num">${qs.length}</span>
                <span class="qsection__breakdown">${breakdown}</span>
            </header>
            <ul class="qsection__list">${cards}</ul>
        </li>
        `;
    }).join('');
}


// Selector "Tema": lista TODOS los temas de la sala (incluidos los vacíos);
// al elegir uno, filtra el banco a ese tema.
function fillNodeFilter() {
    const $sel = document.getElementById('node-filter');
    if (!$sel) return;

    const names = new Set(NODES.map((n) => n.name));
    BANK.forEach((q) => names.add(q.node_name || nodeName(q.node) || 'Sin tema'));

    const ordered = Array.from(names).sort((a, b) => a.localeCompare(b));
    if (currentNode !== 'all' && !ordered.includes(currentNode)) currentNode = 'all';

    $sel.innerHTML = `<option value="all" ${currentNode === 'all' ? 'selected' : ''}>Todos los temas</option>`
        + ordered.map((name) =>
            `<option value="${escapeHTML(name)}" ${name === currentNode ? 'selected' : ''}>${escapeHTML(name)}</option>`
        ).join('');
}


function cardHTML(q) {
        const diff = difficultyMeta(q.difficulty);
        const status = q.status || (q.is_approved ? 'approved' : 'pending');
        const name = q.node_name || nodeName(q.node);
        const topic = nodeTopic(q.node);
        const sourcePdf = q.source_pdf;
        const options = Array.isArray(q.options) ? q.options : [];
        const correctSet = new Set(
            Array.isArray(q.correct_indices) && q.correct_indices.length
                ? q.correct_indices
                : (Number.isInteger(q.correct_index) ? [q.correct_index] : [])
        );
        const qtype = q.question_type || 'single';
        const typeLabel = qtype === 'true_false' ? 'V/F' : qtype === 'multiple' ? 'Múltiple' : 'Única';

        const optionsHTML = options.length >= 2 ? `
            <ol class="qcard__options">
                ${options.map((opt, idx) => `
                    <li class="qcard__option${correctSet.has(idx) ? ' qcard__option--correct' : ''}">
                        <span class="qcard__option-letter num">${String.fromCharCode(65 + idx)}</span>
                        <span class="qcard__option-text">${escapeHTML(opt)}</span>
                        ${correctSet.has(idx) ? `
                            <svg class="icon-svg" width="12" height="12" viewBox="0 0 24 24" aria-label="Respuesta correcta">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        ` : ''}
                    </li>
                `).join('')}
            </ol>
        ` : '';

        return `
        <li class="qcard" data-status="${status}">
            <header class="qcard__head">
                <span class="qcard__source" data-source="${q.source}">${q.source === 'ai' ? 'IA' : 'Manual'}</span>
                <span class="qcard__type" data-type="${qtype}">${typeLabel}</span>
                ${q.cognitive_level ? `<span class="qcard__bloom" data-bloom="${q.cognitive_level}">${bloomLabel(q.cognitive_level)}</span>` : ''}
                <span class="qcard__node">
                    <svg class="icon-svg" width="11" height="11" viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="12" cy="12" r="9"></circle>
                        <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"></circle>
                    </svg>
                    ${escapeHTML(name)}${topic ? ` <span class="qcard__topic">· ${escapeHTML(topic)}</span>` : ''}
                </span>
                ${sourcePdf ? `<span class="qcard__pdf" title="Generada de: ${escapeHTML(sourcePdf.original_name)}">
                    <svg class="icon-svg" width="11" height="11" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    ${escapeHTML(sourcePdf.original_name)}
                </span>` : ''}
                <span class="qcard__date num">${escapeHTML(formatDate(q.created_at))}</span>
            </header>

            <p class="qcard__text">${escapeHTML(questionText(q))}</p>

            ${optionsHTML}

            <footer class="qcard__foot">
                <span class="qcard__status" data-status="${status}">
                    <svg class="icon-svg" width="11" height="11" viewBox="0 0 24 24" aria-hidden="true">
                        ${status === 'approved'
                            ? '<polyline points="20 6 9 17 4 12"></polyline>'
                            : status === 'rejected'
                                ? '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>'
                                : '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="6" x2="12" y2="14"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>'}
                    </svg>
                    ${status === 'approved' ? 'Activa' : status === 'rejected' ? 'Rechazada' : 'Por revisar'}
                </span>

                ${diff ? `<span class="qcard__diff" data-tone="${diff.tone}">${diff.label}</span>` : ''}

                <div class="qcard__actions">
                    <button type="button" class="qcard__btn qcard__btn--ghost" data-action="edit" data-q-id="${q.id}">
                        <svg class="icon-svg" width="11" height="11" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M12 20h9"></path>
                            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
                        </svg>
                        Editar
                    </button>
                    ${status !== 'rejected' ? `
                        <button type="button" class="qcard__btn qcard__btn--ghost" data-action="reject" data-q-id="${q.id}">
                            <svg class="icon-svg" width="11" height="11" viewBox="0 0 24 24" aria-hidden="true">
                                <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                            Rechazar
                        </button>
                    ` : ''}
                    ${status !== 'approved' ? `
                        <button type="button" class="qcard__btn qcard__btn--primary" data-action="approve" data-q-id="${q.id}">
                            <svg class="icon-svg" width="11" height="11" viewBox="0 0 24 24" aria-hidden="true">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            Aprobar
                        </button>
                    ` : ''}
                </div>
            </footer>
        </li>
        `;
}


function render() {
    if (!ROOM_INFO) return;

    const $name = document.getElementById('room-name');
    const $q = document.getElementById('room-questions');
    const $pending = document.getElementById('room-pending');
    if ($name) $name.textContent = ROOM_INFO.name;
    if ($q) $q.textContent = String(BANK.filter((q) => q.status === 'approved').length);

    const pendingTotal = BANK.filter((q) => q.status === 'pending').length;
    if ($pending) $pending.textContent = `${pendingTotal} pendiente${pendingTotal === 1 ? '' : 's'} de aprobación`;

    fillNodeFilter();
    renderList();
}


/* Aprobar / rechazar preguntas del banco. */
document.getElementById('questions-list').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn || !ROOM_ID) return;
    const id = Number(btn.dataset.qId);
    const action = btn.dataset.action;
    if (!id) return;

    if (action === 'edit') {
        const q = BANK.find((x) => x.id === id);
        if (q) openEditQuestion(q);
        return;
    }

    btn.disabled = true;
    try {
        if (action === 'approve') await questionsApi.approve(ROOM_ID, [id]);
        else if (action === 'reject') await questionsApi.reject(ROOM_ID, [id]);
        toast(action === 'approve' ? 'Pregunta aprobada.' : 'Pregunta rechazada.', { kind: 'success' });
        await reloadBank();
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) { tokens.clear(); location.replace('/app/'); return; }
        toast(err?.body?.detail || err?.message || 'No se pudo actualizar la pregunta.', { kind: 'error' });
        btn.disabled = false;
    }
});


/* Filtro por nodo (selector compacto). */
const $nodeFilter = document.getElementById('node-filter');
if ($nodeFilter) {
    $nodeFilter.addEventListener('change', () => {
        currentNode = $nodeFilter.value || 'all';
        renderList();
    });
}

/* Colapsar / expandir secciones de nodo. */
function toggleSection(head) {
    const sec = head.closest('.qsection');
    if (!sec) return;
    const collapsed = sec.classList.toggle('qsection--collapsed');
    head.setAttribute('aria-expanded', String(!collapsed));
}
const $listEl = document.getElementById('questions-list');
$listEl.addEventListener('click', (e) => {
    const head = e.target.closest('[data-qsection-toggle]');
    if (head) toggleSection(head);
});
$listEl.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const head = e.target.closest('[data-qsection-toggle]');
    if (!head) return;
    e.preventDefault();
    toggleSection(head);
});


async function reloadBank() {
    BANK = (await questionsApi.list(ROOM_ID)) || [];
    render();
}


/* ---- Creación de nodos / preguntas (modales) ---- */

function fillNodeSelects() {
    const selects = [document.getElementById('manual-node'), document.getElementById('gen-node')];
    const opts = NODES.length
        ? NODES.map((n) => `<option value="${n.id}">${escapeHTML(n.name)}</option>`).join('')
        : '<option value="" disabled selected>Cree un tema primero</option>';
    selects.forEach(($s) => { if ($s) $s.innerHTML = opts; });
}

async function refreshNodes() {
    if (!ROOM_ID) return;
    try {
        NODES = (await questionsApi.listNodes(ROOM_ID)) || [];
        fillNodeSelects();
        fillNodeFilter();
    } catch (_) { /* sin nodos: los selects muestran el placeholder */ }
}

async function refreshPdfOptions() {
    const $sel = document.getElementById('gen-pdf');
    if (!$sel || !ROOM_ID) return;
    try {
        const pdfList = (await pdfsApi.list(ROOM_ID)) || [];
        const processed = pdfList.filter((p) => p.processed);
        $sel.innerHTML = '<option value="">Sin PDF — usar el texto de abajo</option>'
            + processed.map((p) => `<option value="${p.id}">${escapeHTML(p.original_name)}</option>`).join('');
    } catch (_) { /* sin PDFs: solo queda la opción de texto */ }
}

function refreshCreators() {
    refreshNodes();
    refreshPdfOptions();
}

function apiErrorMessage(err, fallback) {
    if (err instanceof ApiError && err.status === 401) { tokens.clear(); location.replace('/app/'); return null; }
    const body = err?.body || {};
    // DRF devuelve {campo: [msg]} o {detail: msg}
    const firstField = Object.values(body).find((v) => Array.isArray(v) && v.length);
    return (firstField && firstField[0]) || body.detail || err?.message || fallback;
}

/* Nuevo nodo */
document.getElementById('node-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!ROOM_ID) return;
    const $name = document.getElementById('node-name');
    const name = $name.value.trim();
    if (!name) return;
    try {
        await questionsApi.createNode(ROOM_ID, name);
        toast('Tema creado.', { kind: 'success' });
        $name.value = '';
        await refreshNodes();   // actualiza NODES + el selector "Nodo"
        renderNodeManager();    // refresca la lista (el modal queda abierto)
        $name.focus();
    } catch (err) {
        const msg = apiErrorMessage(err, 'No se pudo crear el tema.');
        if (msg) toast(msg, { kind: 'error' });
    }
});


/* ---- Gestión de nodos (modal): renombrar / borrar vacíos ---- */
function renderNodeManager() {
    const $list = document.getElementById('qnode-list');
    if (!$list) return;
    const counts = new Map();
    BANK.forEach((q) => {
        const n = q.node_name || nodeName(q.node) || 'Sin tema';
        counts.set(n, (counts.get(n) || 0) + 1);
    });
    if (!NODES.length) {
        $list.innerHTML = '<li class="qnode qnode--empty">Todavía no hay temas. Cree el primero arriba.</li>';
        return;
    }
    const sorted = [...NODES].sort((a, b) => a.name.localeCompare(b.name));
    $list.innerHTML = sorted.map((n) => {
        const c = counts.get(n.name) || 0;
        const label = c === 0 ? 'sin preguntas' : `${c} ${c === 1 ? 'pregunta' : 'preguntas'}`;
        return `
        <li class="qnode" data-node-id="${n.id}" data-node-name="${escapeHTML(n.name)}">
            <span class="qnode__name">${escapeHTML(n.name)}</span>
            <span class="qnode__count num">${label}</span>
            <div class="qnode__actions">
                <button type="button" class="qnode__btn" data-qnode="rename" aria-label="Renombrar ${escapeHTML(n.name)}">${SVG_PENCIL}</button>
                <button type="button" class="qnode__btn qnode__btn--danger" data-qnode="delete" ${c > 0 ? 'disabled' : ''} title="${c > 0 ? 'Tiene preguntas: no se puede borrar' : 'Borrar tema'}" aria-label="Borrar ${escapeHTML(n.name)}">${SVG_TRASH}</button>
            </div>
        </li>`;
    }).join('');
}

function startNodeRename(li) {
    const name = li.dataset.nodeName || '';
    li.innerHTML = `
        <input class="form-control qnode__input" type="text" value="${escapeHTML(name)}" maxlength="200" aria-label="Nuevo nombre del tema">
        <div class="qnode__actions">
            <button type="button" class="qnode__btn" data-qnode="save" aria-label="Guardar">${SVG_CHECK}</button>
            <button type="button" class="qnode__btn" data-qnode="cancel" aria-label="Cancelar">${SVG_X}</button>
        </div>`;
    const $input = li.querySelector('.qnode__input');
    $input.focus();
    $input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); li.querySelector('[data-qnode="save"]').click(); }
        if (e.key === 'Escape') { e.preventDefault(); renderNodeManager(); }
    });
}

async function saveNodeRename(li, nodeId) {
    const val = (li.querySelector('.qnode__input')?.value || '').trim();
    if (!val) { toast('El nombre no puede estar vacío.', { kind: 'error' }); return; }
    try {
        await questionsApi.updateNode(ROOM_ID, nodeId, val);
        toast('Tema renombrado.', { kind: 'success' });
        await refreshNodes();
        await reloadBank();   // las preguntas traen el node_name actualizado
        renderNodeManager();
    } catch (err) {
        const msg = apiErrorMessage(err, 'No se pudo renombrar el tema.');
        if (msg) toast(msg, { kind: 'error' });
    }
}

function confirmNodeDelete(li) {
    const $actions = li.querySelector('.qnode__actions');
    if (!$actions) return;
    $actions.innerHTML = `
        <span class="qnode__confirm">¿Borrar?</span>
        <button type="button" class="qnode__btn qnode__btn--danger" data-qnode="delete-yes" aria-label="Sí, borrar">${SVG_CHECK}</button>
        <button type="button" class="qnode__btn" data-qnode="delete-no" aria-label="No borrar">${SVG_X}</button>`;
}

async function doNodeDelete(nodeId) {
    try {
        await questionsApi.deleteNode(ROOM_ID, nodeId);
        toast('Tema borrado.', { kind: 'success' });
        await refreshNodes();
        renderNodeManager();
        renderList();
    } catch (err) {
        const msg = apiErrorMessage(err, 'No se pudo borrar el tema.');
        if (msg) toast(msg, { kind: 'error' });
        renderNodeManager();
    }
}

const $qnodeList = document.getElementById('qnode-list');
if ($qnodeList) {
    $qnodeList.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-qnode]');
        if (!btn || !ROOM_ID) return;
        const li = btn.closest('.qnode');
        if (!li) return;
        const nodeId = Number(li.dataset.nodeId);
        const action = btn.dataset.qnode;
        if (action === 'rename') startNodeRename(li);
        else if (action === 'save') saveNodeRename(li, nodeId);
        else if (action === 'cancel') renderNodeManager();
        else if (action === 'delete') confirmNodeDelete(li);
        else if (action === 'delete-yes') doNodeDelete(nodeId);
        else if (action === 'delete-no') renderNodeManager();
    });
}

const $nodeModalEl = document.getElementById('nodeModal');
if ($nodeModalEl) {
    $nodeModalEl.addEventListener('shown.bs.modal', renderNodeManager);
}

/* ---- Pregunta manual: opciones dinámicas según el tipo ---- */
const MANUAL_MIN_OPTS = 2;
const MANUAL_MAX_OPTS = 6;

function manualType() {
    return document.getElementById('manual-type').value;
}

function readManualOptionValues() {
    return Array.from(document.querySelectorAll('#manual-options [data-opt-input]')).map((i) => i.value);
}

function readManualCorrect() {
    return Array.from(document.querySelectorAll('#manual-options input[name="manual-correct"]:checked'))
        .map((i) => Number(i.value));
}

function renderManualOptions(values, correct) {
    const type = manualType();
    const $box = document.getElementById('manual-options');
    const $hint = document.getElementById('manual-correct-hint');
    const $add = document.getElementById('manual-add-option');
    const inputType = type === 'multiple' ? 'checkbox' : 'radio';
    const fixed = type === 'true_false';

    let opts = values && values.length ? values.slice() : ['', '', '', ''];
    if (fixed) opts = ['Verdadero', 'Falso'];
    if (opts.length < MANUAL_MIN_OPTS) opts = opts.concat(Array(MANUAL_MIN_OPTS - opts.length).fill(''));
    if (opts.length > MANUAL_MAX_OPTS) opts = opts.slice(0, MANUAL_MAX_OPTS);

    let correctSet;
    if (inputType === 'radio') {
        const first = correct && correct.length ? correct[0] : 0;
        correctSet = new Set([first < opts.length ? first : 0]);
    } else {
        correctSet = new Set((correct || []).filter((i) => i < opts.length));
    }

    const removable = !fixed && opts.length > MANUAL_MIN_OPTS;
    $box.innerHTML = opts.map((val, i) => `
        <div class="qmodal__option" data-opt-row="${i}">
            <input type="${inputType}" name="manual-correct" value="${i}" ${correctSet.has(i) ? 'checked' : ''}
                   aria-label="Opción ${String.fromCharCode(65 + i)} correcta">
            <span class="qmodal__option-letter num">${String.fromCharCode(65 + i)}</span>
            <input class="form-control" type="text" data-opt-input="${i}" required
                   placeholder="Opción ${String.fromCharCode(65 + i)}" value="${escapeHTML(val)}" ${fixed ? 'readonly' : ''}>
            ${removable ? `<button type="button" class="qmodal__option-remove" data-opt-remove="${i}" aria-label="Quitar opción">
                <svg class="icon-svg" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>` : ''}
        </div>
    `).join('');

    if ($hint) $hint.textContent = type === 'multiple' ? 'marque todas las correctas' : 'marque la correcta';
    if ($add) $add.hidden = fixed || opts.length >= MANUAL_MAX_OPTS;
}

document.getElementById('manual-type').addEventListener('change', () => renderManualOptions(null, null));

document.getElementById('manual-add-option').addEventListener('click', () => {
    const vals = readManualOptionValues();
    if (vals.length >= MANUAL_MAX_OPTS) return;
    vals.push('');
    renderManualOptions(vals, readManualCorrect());
});

document.getElementById('manual-options').addEventListener('click', (e) => {
    const rm = e.target.closest('[data-opt-remove]');
    if (!rm) return;
    const idx = Number(rm.dataset.optRemove);
    const vals = readManualOptionValues().filter((_, i) => i !== idx);
    const correct = readManualCorrect().filter((i) => i !== idx).map((i) => (i > idx ? i - 1 : i));
    renderManualOptions(vals, correct);
});

renderManualOptions(null, null);

/* ---- Edición de preguntas (reusa el modal manual) ---- */
function setManualMode(editId) {
    const $title = document.getElementById('manualQuestionLabel');
    const $submit = document.getElementById('manual-submit');
    if ($title) $title.textContent = editId ? 'Editar pregunta' : 'Crear pregunta manual';
    if ($submit) $submit.textContent = editId ? 'Guardar cambios' : 'Guardar pregunta';
}

function openEditQuestion(q) {
    EDIT_ID = q.id;
    const nodeId = (q.node && typeof q.node === 'object') ? q.node.id : q.node;
    const $node = document.getElementById('manual-node');
    if ($node && nodeId != null) {
        $node.value = String(nodeId);
        $node.dispatchEvent(new Event('change', { bubbles: true }));
    }
    // El tipo se setea primero: su 'change' resetea las opciones; luego se rellenan.
    const $type = document.getElementById('manual-type');
    $type.value = q.question_type || 'single';
    $type.dispatchEvent(new Event('change', { bubbles: true }));

    const $diff = document.getElementById('manual-difficulty');
    $diff.value = q.difficulty || 'medium';
    $diff.dispatchEvent(new Event('change', { bubbles: true }));

    document.getElementById('manual-statement').value = q.statement || '';

    const opts = Array.isArray(q.options) ? q.options : [];
    const correct = (Array.isArray(q.correct_indices) && q.correct_indices.length)
        ? q.correct_indices
        : (Number.isInteger(q.correct_index) ? [q.correct_index] : []);
    renderManualOptions(opts, correct);

    setManualMode(q.id);
    showModal('manualQuestionModal');
}

// Al cerrar el modal manual, vuelve a modo "crear" (limpio) para la próxima vez.
document.getElementById('manualQuestionModal').addEventListener('hidden.bs.modal', () => {
    EDIT_ID = null;
    setManualMode(null);
    document.getElementById('manual-form').reset();
    renderManualOptions(null, null);
});


/* Crear pregunta manual */
document.getElementById('manual-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!ROOM_ID) return;
    const nodeId = Number(document.getElementById('manual-node').value);
    if (!nodeId) { toast('Elija un tema (cree uno si no hay).', { kind: 'error' }); return; }

    const type = manualType();
    const options = readManualOptionValues().map((o) => o.trim());
    if (options.some((o) => !o)) { toast('Complete todas las opciones.', { kind: 'error' }); return; }
    const correct = readManualCorrect();
    if (!correct.length) { toast('Marque al menos una opción correcta.', { kind: 'error' }); return; }
    if (type === 'multiple' && correct.length < 2) {
        toast('Opción múltiple requiere al menos 2 correctas.', { kind: 'error' }); return;
    }

    const payload = {
        node_id: nodeId,
        statement: document.getElementById('manual-statement').value.trim(),
        question_type: type,
        options,
        correct_indices: correct,
        difficulty: document.getElementById('manual-difficulty').value,
    };

    const $submit = document.getElementById('manual-submit');
    $submit.disabled = true;
    try {
        if (EDIT_ID) {
            await questionsApi.update(ROOM_ID, EDIT_ID, payload);
        } else {
            await questionsApi.manual(ROOM_ID, payload);
        }
        toast(EDIT_ID ? 'Pregunta actualizada.' : 'Pregunta creada.', { kind: 'success' });
        e.target.reset();
        renderManualOptions(null, null);
        hideModal('manualQuestionModal');
        await reloadBank();
    } catch (err) {
        const msg = apiErrorMessage(err, EDIT_ID ? 'No se pudo guardar la pregunta.' : 'No se pudo crear la pregunta.');
        if (msg) toast(msg, { kind: 'error' });
    } finally {
        $submit.disabled = false;
    }
});

/* Generar con IA */
document.getElementById('generate-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!ROOM_ID) return;
    const nodeId = Number(document.getElementById('gen-node').value);
    if (!nodeId) { toast('Elija un tema (cree uno si no hay).', { kind: 'error' }); return; }
    const pdfId = document.getElementById('gen-pdf').value;
    const content = document.getElementById('gen-content').value.trim();
    if (!pdfId && !content) {
        toast('Pegue contenido o elija un PDF como fuente.', { kind: 'error' });
        return;
    }

    const payload = {
        node_id: nodeId,
        difficulty: document.getElementById('gen-difficulty').value,
        count: Number(document.getElementById('gen-count').value) || 5,
    };
    const genType = document.getElementById('gen-type').value;
    if (genType) payload.question_type = genType;
    if (pdfId) payload.pdf_id = Number(pdfId);
    else payload.content = content;

    const $submit = document.getElementById('generate-submit');
    const original = $submit.textContent;
    $submit.disabled = true;
    $submit.textContent = 'Generando…';
    try {
        const res = await questionsApi.generate(ROOM_ID, payload);
        const n = res?.created_count ?? 0;
        toast(n ? `${n} pregunta${n === 1 ? '' : 's'} generada${n === 1 ? '' : 's'}.` : 'La IA no devolvió preguntas. Pruebe con más contenido.', {
            kind: n ? 'success' : 'error',
        });
        if (n) {
            e.target.reset();
            hideModal('generateQuestionModal');
            currentStatus = 'pending';
            document.querySelectorAll('[data-status-filter]').forEach((b) => {
                b.setAttribute('aria-pressed', b.dataset.statusFilter === 'pending' ? 'true' : 'false');
            });
            await reloadBank();
        }
    } catch (err) {
        const msg = apiErrorMessage(err, 'No se pudieron generar las preguntas.');
        if (msg) toast(msg, { kind: 'error' });
    } finally {
        $submit.disabled = false;
        $submit.textContent = original;
    }
});


/* Resumen simple antes de generar (sin tokens/costo). */
let genEstTimer = null;

function scheduleGenEstimate() {
    clearTimeout(genEstTimer);
    genEstTimer = setTimeout(updateGenEstimate, 300);
}

function updateGenEstimate() {
    const $est = document.getElementById('gen-estimate');
    if (!$est) return;
    const $pdf = document.getElementById('gen-pdf');
    const pdfId = $pdf?.value;
    const content = document.getElementById('gen-content')?.value.trim() || '';
    // Hace falta una fuente: texto pegado o un PDF elegido.
    if (!content && !pdfId) { $est.hidden = true; return; }
    const count = Number(document.getElementById('gen-count')?.value) || 5;
    const source = pdfId
        ? (($pdf.options[$pdf.selectedIndex]?.text || '').trim() || 'el PDF seleccionado')
        : 'el contenido pegado';
    $est.hidden = false;
    $est.textContent = `Generará ${count} pregunta${count === 1 ? '' : 's'} a partir de ${source}.`;
}

document.getElementById('gen-content')?.addEventListener('input', scheduleGenEstimate);
document.getElementById('gen-count')?.addEventListener('input', scheduleGenEstimate);
['gen-difficulty', 'gen-node', 'gen-pdf'].forEach((id) => {
    document.getElementById(id)?.addEventListener('change', scheduleGenEstimate);
});
// Al abrir el modal, estimar si ya hay una fuente (PDF preseleccionado o texto).
document.getElementById('generateQuestionModal')?.addEventListener('shown.bs.modal', updateGenEstimate);


async function load() {
    let list;
    try {
        list = await roomsApi.list();
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) { tokens.clear(); location.replace('/app/'); return; }
        toast('No se pudieron cargar las salas.', { kind: 'error' });
        return;
    }
    // Esta página gestiona el banco de una sala que el usuario administra: el
    // docente sus salas, el estudiante sus salas de estudio. Las salas grupales
    // a las que un estudiante se unió (membership != null) no se gestionan acá.
    const owned = (list || []).filter((r) => !r.membership);
    const stored = activeRoomId();
    ROOM_INFO = owned.find((r) => r.id === stored) || owned[0];
    if (!ROOM_INFO) {
        const $list = document.getElementById('questions-list');
        if ($list) $list.innerHTML = `<li class="questions-empty">Cree una sala de estudio para gestionar su banco de preguntas.</li>`;
        return;
    }
    ROOM_ID = ROOM_INFO.id;
    localStorage.setItem('cogniroom.activeRoomId', String(ROOM_ID));
    try {
        BANK = (await questionsApi.list(ROOM_ID)) || [];
        render();
        refreshCreators();
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) { tokens.clear(); location.replace('/app/'); return; }
        toast('No se pudo cargar el banco de preguntas.', { kind: 'error' });
    }
}


document.querySelectorAll('[data-status-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
        currentStatus = btn.dataset.statusFilter;
        document.querySelectorAll('[data-status-filter]').forEach((b) => {
            b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        });
        renderList();
    });
});

document.querySelectorAll('[data-source-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
        currentSource = btn.dataset.sourceFilter;
        document.querySelectorAll('[data-source-filter]').forEach((b) => {
            b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        });
        renderList();
    });
});

document.querySelectorAll('[data-type-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
        currentType = btn.dataset.typeFilter;
        document.querySelectorAll('[data-type-filter]').forEach((b) => {
            b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        });
        renderList();
    });
});


const $search = document.getElementById('questions-search');
if ($search) {
    let t = null;
    $search.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => {
            currentSearch = $search.value;
            renderList();
        }, 150);
    });
}


window.addEventListener('cogniroom:roomchange', load);

load();
