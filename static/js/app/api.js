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
    login: (email, password) => request('/auth/login/', {
        method: 'POST', body: { email, password }, auth: false,
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
    logout: () => {
        // Cierre de sesión a prueba de fallos: primero se limpia el estado local
        // (instantáneo, no depende de la red), luego se revoca el refresh en el
        // servidor en segundo plano (keepalive sobrevive a la navegación).
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
    join:        (access_code, section_id) => request('/rooms/join/', {
        method: 'POST',
        body: section_id != null ? { access_code, section_id } : { access_code },
    }),
    members:     (roomId) => request(`/rooms/${roomId}/members/`),
    blindSpots:  (roomId) => request(`/rooms/${roomId}/metrics/blind-spots/`),
    atRisk:      (roomId) => request(`/rooms/${roomId}/metrics/at-risk/`),
    heatmap:     (roomId) => request(`/rooms/${roomId}/metrics/heatmap/`),
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
