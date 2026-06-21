const _v = new URL(import.meta.url).searchParams.get('v') || '';
const { rooms: roomsApi, pdfs: pdfsApi, tokens, ApiError } = await import(`../api.js?v=${_v}`);
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

function activeRoomId() {
    return Number(localStorage.getItem('cogniroom.activeRoomId')) || null;
}


let ROOM_ID = null;
let ROOM_INFO = null;
let FILES = [];


function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}


function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return escapeHTML(String(iso));
    return d.toISOString().slice(0, 10);
}


function render() {
    if (!ROOM_INFO) return;

    const $name = document.getElementById('room-name');
    const $count = document.getElementById('room-pdfs');
    if ($name) $name.textContent = ROOM_INFO.name;
    if ($count) $count.textContent = String(FILES.length);

    const $list = document.getElementById('pdfs-list');
    if (!$list) return;

    if (FILES.length === 0) {
        $list.innerHTML = `<li class="pdf-item" style="opacity:0.6;cursor:default;">
            <div class="pdf-item__main"><div class="pdf-item__name">Todavía no subiste material de origen.</div></div>
        </li>`;
        return;
    }

    $list.innerHTML = FILES.map((p) => {
        const originalName = p.original_name ?? p.name ?? '';
        const sizeBytes = typeof p.size_bytes === 'number' ? p.size_bytes : null;
        const createdAt = p.created_at ?? p.date ?? '';
        const processed = typeof p.processed === 'boolean'
            ? p.processed
            : (p.status === 'processed');
        const fileUrl = p.file_path ?? '';
        return `
        <li class="pdf-item" data-file="${escapeHTML(fileUrl)}" data-name="${escapeHTML(originalName)}">
            <span class="pdf-item__icon" aria-hidden="true">
                <svg class="icon-svg" width="20" height="20" viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
            </span>
            <div class="pdf-item__main">
                <div class="pdf-item__name">${escapeHTML(originalName)}</div>
                <div class="pdf-item__meta">
                    <span>${escapeHTML(sizeBytes !== null ? formatBytes(sizeBytes) : (p.size ?? ''))}</span>
                    <span class="pdf-item__meta-sep">·</span>
                    <span>${escapeHTML(formatDate(createdAt))}</span>
                </div>
            </div>
            <span class="pdf-item__status" data-status="${processed ? 'processed' : 'pending'}">
                ${processed ? 'Procesado' : (p.status === 'failed' ? 'Falló' : 'Pendiente')}
            </span>
            <button type="button" class="pdf-item__del" data-pdf-id="${p.id}" aria-label="Eliminar PDF">
                <svg class="icon-svg" width="16" height="16" viewBox="0 0 24 24">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                </svg>
            </button>
        </li>
    `;
    }).join('');
}


/* Eliminar PDF */
document.getElementById('pdfs-list').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-pdf-id]');
    if (!btn || !ROOM_ID) return;
    const id = Number(btn.dataset.pdfId);
    if (!id) return;
    btn.disabled = true;
    try {
        await pdfsApi.delete(ROOM_ID, id);
        toast('PDF eliminado.', { kind: 'success' });
        await reloadFiles();
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) { tokens.clear(); location.replace('/app/'); return; }
        toast(err?.body?.detail || 'No se pudo eliminar el PDF.', { kind: 'error' });
        btn.disabled = false;
    }
});


/* ---------- Visor flotante de PDF ---------- */
const $pdfView = document.getElementById('pdfview-overlay');
const $pdfFrame = document.getElementById('pdfview-frame');
const $pdfTitle = document.getElementById('pdfview-title');
const $pdfOpen = document.getElementById('pdfview-open');
let pdfBlobUrl = null;

async function openPdfViewer(url, name) {
    if (!$pdfView || !url) return;
    if ($pdfTitle) $pdfTitle.textContent = name || 'Documento';
    if ($pdfOpen) $pdfOpen.href = url;  // "abrir en pestaña" usa la URL directa
    $pdfView.hidden = false;
    if (!$pdfFrame) return;
    // El PDF se sirve con X-Frame-Options: DENY, que impide incrustarlo en un
    // iframe por URL. Lo descargamos y lo mostramos como blob (sin esa cabecera).
    $pdfFrame.removeAttribute('src');
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
        pdfBlobUrl = URL.createObjectURL(blob);
        $pdfFrame.src = pdfBlobUrl;
    } catch (_) {
        toast('No se pudo cargar el PDF aquí. Probá "Abrir en pestaña nueva".', { kind: 'error' });
    }
}

function closePdfViewer() {
    if (!$pdfView) return;
    $pdfView.hidden = true;
    if ($pdfFrame) $pdfFrame.removeAttribute('src');
    if (pdfBlobUrl) { URL.revokeObjectURL(pdfBlobUrl); pdfBlobUrl = null; }
}

/* Abrir el visor al hacer clic en un PDF (sin interferir con el boton de borrar). */
document.getElementById('pdfs-list').addEventListener('click', (e) => {
    if (e.target.closest('.pdf-item__del')) return;
    const item = e.target.closest('.pdf-item');
    if (!item || !item.dataset.file) return;
    openPdfViewer(item.dataset.file, item.dataset.name);
});

document.getElementById('pdfview-close')?.addEventListener('click', closePdfViewer);
$pdfView?.addEventListener('click', (e) => { if (e.target === $pdfView) closePdfViewer(); });
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && $pdfView && !$pdfView.hidden) closePdfViewer();
});


/* Subir PDF */
const $uploadBtn = document.getElementById('pdf-upload-btn');
const $fileInput = document.getElementById('pdf-file-input');
if ($uploadBtn && $fileInput) {
    $uploadBtn.addEventListener('click', () => $fileInput.click());
    $fileInput.addEventListener('change', async () => {
        const file = $fileInput.files && $fileInput.files[0];
        if (!file || !ROOM_ID) return;
        if (!file.name.toLowerCase().endsWith('.pdf')) {
            toast('El archivo debe ser un PDF.', { kind: 'error' });
            $fileInput.value = '';
            return;
        }
        $uploadBtn.disabled = true;
        const prev = $uploadBtn.innerHTML;
        $uploadBtn.textContent = 'Subiendo…';
        try {
            await pdfsApi.upload(ROOM_ID, file);
            toast(`"${file.name}" subido.`, { kind: 'success' });
            await reloadFiles();
        } catch (err) {
            if (err instanceof ApiError && err.status === 401) { tokens.clear(); location.replace('/app/'); return; }
            toast(err?.body?.detail || err?.message || 'No se pudo subir el PDF.', { kind: 'error' });
        } finally {
            $fileInput.value = '';
            $uploadBtn.disabled = false;
            $uploadBtn.innerHTML = prev;
        }
    });
}


async function reloadFiles() {
    FILES = (await pdfsApi.list(ROOM_ID)) || [];
    render();
}


async function load() {
    let list;
    try {
        list = await roomsApi.list();
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) { tokens.clear(); location.replace('/app/'); return; }
        toast('No se pudieron cargar las salas.', { kind: 'error' });
        return;
    }
    const stored = activeRoomId();
    ROOM_INFO = (list || []).find((r) => r.id === stored) || (list || [])[0];
    if (!ROOM_INFO) {
        const $list = document.getElementById('pdfs-list');
        if ($list) $list.innerHTML = `<li class="pdf-item" style="opacity:0.6;"><div class="pdf-item__main"><div class="pdf-item__name">Creá una sala para subir material.</div></div></li>`;
        return;
    }
    ROOM_ID = ROOM_INFO.id;
    localStorage.setItem('cogniroom.activeRoomId', String(ROOM_ID));
    try {
        FILES = (await pdfsApi.list(ROOM_ID)) || [];
        render();
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) { tokens.clear(); location.replace('/app/'); return; }
        toast('No se pudieron cargar los PDFs.', { kind: 'error' });
    }
}


window.addEventListener('cogniroom:roomchange', load);

load();
