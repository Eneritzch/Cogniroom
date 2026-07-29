const _v = new URL(import.meta.url).searchParams.get('v') || '';
const { rooms: roomsApi, pdfs: pdfsApi, tokens, ApiError, apiErrorMessage } = await import(`../api.js?v=${_v}`);
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
        $list.innerHTML = `<li class="pdfs-empty">Todavía no subió material de origen. Use “Subir documento” (PDF, PPTX o DOCX) para añadir el primero.</li>`;
        return;
    }

    $list.innerHTML = FILES.map((p) => {
        const originalName = p.original_name ?? p.name ?? '';
        const sizeBytes = typeof p.size_bytes === 'number' ? p.size_bytes : null;
        const createdAt = p.created_at ?? p.date ?? '';
        const processed = typeof p.processed === 'boolean'
            ? p.processed
            : (p.status === 'processed');
        const statusKey = processed ? 'processed' : (p.status === 'failed' ? 'failed' : 'pending');
        const statusLabel = processed ? 'Procesado' : (p.status === 'failed' ? 'Falló' : 'Pendiente');
        const fileUrl = p.file_path ?? '';
        return `
        <li class="pdf-item" data-id="${p.id}" data-file="${escapeHTML(fileUrl)}" data-name="${escapeHTML(originalName)}" role="button" tabindex="0" aria-label="Abrir ${escapeHTML(originalName)}">
            <div class="pdf-item__top">
                <span class="pdf-item__icon" aria-hidden="true">
                    <svg aria-hidden="true" class="icon-svg" width="20" height="20" viewBox="0 0 24 24">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                </span>
                <span class="pdf-item__status" data-status="${statusKey}">${statusLabel}</span>
            </div>
            <div class="pdf-item__name" title="${escapeHTML(originalName)}">${escapeHTML(originalName)}</div>
            <div class="pdf-item__meta">
                <span>${escapeHTML(sizeBytes !== null ? formatBytes(sizeBytes) : (p.size ?? ''))}</span>
                <span class="pdf-item__meta-sep">·</span>
                <span>${escapeHTML(formatDate(createdAt))}</span>
            </div>
            <div class="pdf-item__foot">
                <span class="pdf-item__open">
                    <svg class="icon-svg" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    Ver documento
                </span>
                <button type="button" class="pdf-item__del" data-pdf-id="${p.id}" aria-label="Eliminar documento">
                    <svg aria-hidden="true" class="icon-svg" width="16" height="16" viewBox="0 0 24 24">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                    </svg>
                </button>
            </div>
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
        toast(apiErrorMessage(err, 'No se pudo eliminar el PDF.'), { kind: 'error' });
        btn.disabled = false;
    }
});


/* ---------- Visor flotante (solo PDF) ---------- */
const $pdfView = document.getElementById('pdfview-overlay');
const $pdfFrame = document.getElementById('pdfview-frame');
const $pdfTitle = document.getElementById('pdfview-title');
const $pdfOpen = document.getElementById('pdfview-open');
let pdfBlobUrl = null;

// PDF: se incrusta como blob (el servidor manda X-Frame-Options: DENY, que
// impide el iframe por URL directa).
async function openPdfViewer(url, name) {
    if (!$pdfView || !url) return;
    if ($pdfTitle) $pdfTitle.textContent = name || 'Documento';
    if ($pdfOpen) $pdfOpen.href = url;  // "abrir en pestaña" usa la URL directa
    $pdfView.hidden = false;
    if (!$pdfFrame) return;
    $pdfFrame.removeAttribute('src');
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
        pdfBlobUrl = URL.createObjectURL(blob);
        $pdfFrame.src = pdfBlobUrl;
    } catch (_) {
        toast('No se pudo cargar el PDF aquí. Prueba "Abrir en pestaña nueva".', { kind: 'error' });
    }
}

// Word/PPTX no se previsualizan en el navegador (no es un formato visual): se
// descargan directamente. Solo el PDF abre el visor.
function downloadFile(url, name) {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = name || '';
    document.body.appendChild(a);
    a.click();
    a.remove();
}

function openDocViewer(item) {
    const name = item.dataset.name || '';
    const url = item.dataset.file || '';
    if (name.toLowerCase().endsWith('.pdf')) {
        openPdfViewer(url, name);
    } else {
        downloadFile(url, name);
    }
}

function closePdfViewer() {
    if (!$pdfView) return;
    $pdfView.hidden = true;
    if ($pdfFrame) $pdfFrame.removeAttribute('src');
    if (pdfBlobUrl) { URL.revokeObjectURL(pdfBlobUrl); pdfBlobUrl = null; }
}

/* Abrir el visor al hacer clic (sin interferir con el boton de borrar). */
document.getElementById('pdfs-list').addEventListener('click', (e) => {
    if (e.target.closest('.pdf-item__del')) return;
    const item = e.target.closest('.pdf-item');
    if (!item || !item.dataset.file) return;
    openDocViewer(item);
});

document.getElementById('pdfs-list').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (e.target.closest('.pdf-item__del')) return;
    const item = e.target.closest('.pdf-item');
    if (!item || !item.dataset.file) return;
    e.preventDefault();
    openDocViewer(item);
});

document.getElementById('pdfview-close')?.addEventListener('click', closePdfViewer);
$pdfView?.addEventListener('click', (e) => { if (e.target === $pdfView) closePdfViewer(); });
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && $pdfView && !$pdfView.hidden) closePdfViewer();
});


/* Subir documento (PDF · PPTX · DOCX) */
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB — igual que PDFUploadSerializer
const ALLOWED_EXTENSIONS = ['.pdf', '.pptx', '.docx'];
const UPLOAD_HINT_DEFAULT = 'PDF, PPTX o DOCX · máximo 10 MB';
const $uploadBtn = document.getElementById('pdf-upload-btn');
const $fileInput = document.getElementById('pdf-file-input');
const $uploadHint = document.getElementById('pdf-upload-hint');
if ($uploadBtn && $fileInput) {
    $uploadBtn.addEventListener('click', () => $fileInput.click());
    $fileInput.addEventListener('change', async () => {
        const file = $fileInput.files && $fileInput.files[0];
        if (!file) return;
        // Sin sala propia no hay destino para el archivo: se avisa en lugar de
        // descartar la selección en silencio.
        if (!ROOM_ID) {
            toast('Cree una sala de estudio para subir material.', { kind: 'error' });
            $fileInput.value = '';
            return;
        }
        const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
            toast('El documento debe ser PDF, PPTX o DOCX.', { kind: 'error' });
            $fileInput.value = '';
            return;
        }
        // Validación de tamaño en cliente: mismo límite que el backend (10 MB),
        // así se avisa al instante sin subir megabytes para que el server lo rechace.
        if (file.size > MAX_UPLOAD_BYTES) {
            const mb = (file.size / (1024 * 1024)).toFixed(1);
            toast(`El documento pesa ${mb} MB y el máximo son 10 MB. Comprímelo o divídelo.`, { kind: 'error' });
            if ($uploadHint) {
                $uploadHint.textContent = `Ese archivo pesa ${mb} MB · máximo 10 MB`;
                $uploadHint.dataset.state = 'error';
            }
            $fileInput.value = '';
            return;
        }
        if ($uploadHint) {
            $uploadHint.textContent = UPLOAD_HINT_DEFAULT;
            delete $uploadHint.dataset.state;
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
            toast(apiErrorMessage(err, 'No se pudo subir el PDF.'), { kind: 'error' });
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
    // Solo salas que el usuario administra: a las grupales a las que se unió
    // (membership != null) no se les sube material.
    const owned = (list || []).filter((r) => !r.membership);
    const stored = activeRoomId();
    ROOM_INFO = owned.find((r) => r.id === stored) || owned[0];
    if (!ROOM_INFO) {
        const $list = document.getElementById('pdfs-list');
        if ($list) $list.innerHTML = `<li class="pdfs-empty">Cree una sala de estudio para subir material.</li>`;
        if ($uploadBtn) $uploadBtn.disabled = true;
        if ($uploadHint) {
            $uploadHint.textContent = 'Cree una sala de estudio para subir material';
            $uploadHint.dataset.state = 'error';
        }
        return;
    }
    ROOM_ID = ROOM_INFO.id;
    localStorage.setItem('cogniroom.activeRoomId', String(ROOM_ID));
    // Al crear la sala, `roomchange` reejecuta load(): hay que rehabilitar el botón.
    if ($uploadBtn) $uploadBtn.disabled = false;
    if ($uploadHint && $uploadHint.dataset.state === 'error') {
        $uploadHint.textContent = UPLOAD_HINT_DEFAULT;
        delete $uploadHint.dataset.state;
    }
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
