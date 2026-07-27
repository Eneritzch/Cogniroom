/**
 * Cliente API — fetch wrapper con JWT, manejo de refresh y errores tipados.
 * Todos los módulos UI llaman aquí, no directamente a fetch.
 */

const API_BASE = '/api/v1';
const TOKEN_KEY = 'cogniroom.access';
const REFRESH_KEY = 'cogniroom.refresh';

export const tokens = {
    get access() { return localStorage.getItem(TOKEN_KEY); },
    set access(v) { v ? localStorage.setItem(TOKEN_KEY, v) : localStorage.removeItem(TOKEN_KEY); },
    get refresh() { return localStorage.getItem(REFRESH_KEY); },
    set refresh(v) { v ? localStorage.setItem(REFRESH_KEY, v) : localStorage.removeItem(REFRESH_KEY); },
    clear() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
    },
};

export class ApiError extends Error {
    constructor(message, status, body) {
        super(message);
        this.status = status;
        this.body = body;
    }
}

/**
 * Mensaje legible desde un error de API. DRF devuelve errores de campo como
 * {campo: ["msg"]} (p. ej. {file: ["El PDF supera 10 MB"]}) o {detail: "msg"};
 * leer solo `detail` se pierde los de campo. Este helper cubre ambos.
 */
export function apiErrorMessage(err, fallback = 'Ocurrió un error.') {
    const body = err && err.body;
    if (body && typeof body === 'object') {
        const field = Object.values(body).find((v) => Array.isArray(v) && v.length);
        if (field) return String(field[0]);
        if (typeof body.detail === 'string') return body.detail;
    }
    return (err && err.message) || fallback;
}

async function request(path, { method = 'GET', body, auth = true, isFormData = false } = {}) {
    const headers = {};
    if (!isFormData) headers['Content-Type'] = 'application/json';
    if (auth && tokens.access) headers['Authorization'] = `Bearer ${tokens.access}`;

    const init = { method, headers };
    if (body !== undefined) {
        init.body = isFormData ? body : JSON.stringify(body);
    }

    const res = await fetch(API_BASE + path, init);

    if (res.status === 204) return null;

    let data = null;
    try { data = await res.json(); } catch (_) { /* no body */ }

    if (!res.ok) {
        const msg = data?.detail || `HTTP ${res.status}`;
        throw new ApiError(msg, res.status, data);
    }
    return data;
}

/* ---------- Auth ---------- */
export const auth = {
    login: (identifier, password) => request('/auth/login/', {
        method: 'POST', body: { identifier, password }, auth: false,
    }),
    register: (payload) => request('/auth/register/', {
        method: 'POST', body: payload, auth: false,
    }),
    institutions: () => request('/auth/institutions/', { auth: false }),
    resolveTeacherCode: (code) => request('/auth/teacher-code/resolve/', {
        method: 'POST', body: { code }, auth: false,
    }),
    me: () => request('/auth/me/'),
    updateMe: (payload) => request('/auth/me/', { method: 'PATCH', body: payload }),
    changePassword: (current_password, new_password) => request('/auth/change-password/', {
        method: 'POST', body: { current_password, new_password },
    }),
    requestPasswordReset: (email) => request('/auth/password-reset/', {
        method: 'POST', body: { email }, auth: false,
    }),
    confirmPasswordReset: (uid, token, new_password) => request('/auth/password-reset/confirm/', {
        method: 'POST', body: { uid, token, new_password }, auth: false,
    }),
    logout: () => {
        // Cierre a prueba de fallos: primero limpia el estado local (no depende de la red)
        // y luego revoca el refresh en segundo plano (keepalive sobrevive a la navegación).
        const refresh = tokens.refresh;
        const access = tokens.access;
        tokens.clear();

        if (refresh && access) {
            try {
                fetch(API_BASE + '/auth/logout/', {
                    method: 'POST',
                    keepalive: true,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${access}`,
                    },
                    body: JSON.stringify({ refresh }),
                }).catch(() => {});
            } catch (_) { /* red caída: la sesión local ya quedó cerrada */ }
        }
    },
};

/* ---------- Notificaciones ---------- */
export const notifications = {
    list:     () => request('/notifications/'),
    markRead: (ids) => request('/notifications/mark-read/', {
        method: 'POST', body: ids ? { ids } : {},
    }),
};

/* ---------- Datos cognitivos del usuario actual ---------- */
export const me = {
    profile:   () => request('/profile/'),
    nodes:     () => request('/nodes/'),
    node:      (nodeId) => request(`/nodes/${nodeId}/`),
    sessions:  () => request('/sessions/'),
    diagnoses: () => request('/diagnoses/'),
};

/* ---------- Rooms ---------- */
export const rooms = {
    list:        () => request('/rooms/'),
    create:      (data) => request('/rooms/', { method: 'POST', body: data }),
    update:      (roomId, data) => request(`/rooms/${roomId}/`, { method: 'PATCH', body: data }),
    archive:     (roomId, archived = true) => request(`/rooms/${roomId}/`, { method: 'PATCH', body: { archived } }),
    remove:      (roomId, confirm) => request(`/rooms/${roomId}/`, { method: 'DELETE', body: confirm ? { confirm } : undefined }),
    join:        (access_code, section_id) => request('/rooms/join/', {
        method: 'POST',
        body: section_id != null ? { access_code, section_id } : { access_code },
    }),
    members:     (roomId) => request(`/rooms/${roomId}/members/`),
    assignSection: (roomId, studentId, sectionId) => request(`/rooms/${roomId}/members/${studentId}/section/`, {
        method: 'PATCH', body: { section_id: sectionId },
    }),
    enrollSearch: (roomId, q) => request(`/rooms/${roomId}/enroll/${q ? `?q=${encodeURIComponent(q)}` : ''}`),
    enroll:       (roomId, studentId, sectionId) => request(`/rooms/${roomId}/enroll/`, {
        method: 'POST',
        body: sectionId != null ? { student_id: studentId, section_id: sectionId } : { student_id: studentId },
    }),
    unenroll:     (roomId, studentId) => request(`/rooms/${roomId}/members/${studentId}/`, { method: 'DELETE' }),
    studentDetail: (roomId, studentId) => request(`/rooms/${roomId}/students/${studentId}/`),
    blindSpots:  (roomId) => request(`/rooms/${roomId}/metrics/blind-spots/`),
    atRisk:      (roomId) => request(`/rooms/${roomId}/metrics/at-risk/`),
    heatmap:     (roomId) => request(`/rooms/${roomId}/metrics/heatmap/`),
    metricsSummary: () => request('/rooms/metrics/summary/'),
    metricsOverview: (roomId, sectionId) => request(`/rooms/${roomId}/metrics/overview/${sectionId && sectionId !== 'all' ? `?section_id=${sectionId}` : ''}`),

    // Autoinscripción por institución (alumno) + aprobación (docente).
    // El alumno declara su paralelo (section_id); el docente puede corregirlo al aprobar.
    discover:      (q) => request(`/rooms/discover/${q ? `?q=${encodeURIComponent(q)}` : ''}`),
    requestJoin:   (roomId, sectionId) => request(`/rooms/${roomId}/request-join/`, {
        method: 'POST', body: sectionId != null ? { section_id: sectionId } : undefined,
    }),
    cancelJoin:    (roomId) => request(`/rooms/${roomId}/request-join/`, { method: 'DELETE' }),
    joinRequests:  () => request('/rooms/join-requests/'),
    approveJoin:   (reqId, sectionId) => request(`/rooms/join-requests/${reqId}/approve/`, {
        method: 'POST', body: sectionId != null ? { section_id: sectionId } : undefined,
    }),
    rejectJoin:    (reqId) => request(`/rooms/join-requests/${reqId}/reject/`, { method: 'POST' }),
};

/* ---------- Sections (room-scoped) ---------- */
export const sections = {
    list:   (roomId) => request(`/rooms/${roomId}/sections/`),
    create: (roomId, data) => request(`/rooms/${roomId}/sections/`, { method: 'POST', body: data }),
    update: (roomId, sectionId, data) => request(`/rooms/${roomId}/sections/${sectionId}/`, {
        method: 'PATCH', body: data,
    }),
    delete: (roomId, sectionId) => request(`/rooms/${roomId}/sections/${sectionId}/`, { method: 'DELETE' }),
};

/* ---------- Questions ---------- */
export const questions = {
    listNodes:  (roomId) => request(`/rooms/${roomId}/nodes/`),
    createNode: (roomId, name) => request(`/rooms/${roomId}/nodes/`, {
        method: 'POST', body: { name },
    }),
    updateNode: (roomId, nodeId, payload) => request(`/rooms/${roomId}/nodes/${nodeId}/`, {
        method: 'PATCH', body: payload,
    }),
    deleteNode: (roomId, nodeId) => request(`/rooms/${roomId}/nodes/${nodeId}/`, {
        method: 'DELETE',
    }),
    list:     (roomId) => request(`/rooms/${roomId}/questions/`),
    generate: (roomId, payload) => request(`/rooms/${roomId}/questions/generate/`, {
        method: 'POST', body: payload,
    }),
    manual:   (roomId, payload) => request(`/rooms/${roomId}/questions/manual/`, {
        method: 'POST', body: payload,
    }),
    approve:  (roomId, ids) => request(`/rooms/${roomId}/questions/approve/`, {
        method: 'POST', body: { question_ids: ids },
    }),
    reject:   (roomId, ids) => request(`/rooms/${roomId}/questions/reject/`, {
        method: 'POST', body: { question_ids: ids },
    }),
    update:   (roomId, questionId, payload) => request(`/rooms/${roomId}/questions/${questionId}/`, {
        method: 'PATCH', body: payload,
    }),
};

/* ---------- PDFs ---------- */
export const pdfs = {
    list:   (roomId) => request(`/rooms/${roomId}/pdfs/`),
    detail: (roomId, pdfId) => request(`/rooms/${roomId}/pdfs/${pdfId}/`),
    upload: (roomId, file) => {
        const fd = new FormData();
        fd.append('file', file);
        return request(`/rooms/${roomId}/pdfs/`, {
            method: 'POST', body: fd, isFormData: true,
        });
    },
    delete: (roomId, pdfId) => request(`/rooms/${roomId}/pdfs/${pdfId}/`, { method: 'DELETE' }),
};

/* ---------- Sessions ---------- */
export const sessions = {
    create:       (roomId, nodeIds) => request('/sessions/', {
        method: 'POST',
        body: (nodeIds && nodeIds.length)
            ? { room_id: roomId, node_ids: nodeIds }
            : { room_id: roomId },
    }),
    nextQuestion: (sessionId) => request(`/sessions/${sessionId}/next-question/`),
    answer:       (sessionId, payload) => request(`/sessions/${sessionId}/answers/`, {
        method: 'POST', body: payload,
    }),
    review:       (sessionId) => request(`/sessions/${sessionId}/review/`),
    complete:     (sessionId) => request(`/sessions/${sessionId}/complete/`, { method: 'POST' }),
};
