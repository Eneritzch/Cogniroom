const _v = new URL(import.meta.url).searchParams.get('v') || '';
const { auth, rooms, notifications, tokens } = await import(`./api.js?v=${_v}`);

function _esc(s) {
    return String(s ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}


function filterNav(role) {
    const items = document.querySelectorAll('[data-show-for]');
    items.forEach((el) => {
        const allowed = el.dataset.showFor.split(',').map((s) => s.trim());
        const matches = allowed.includes('any')
            || (role && allowed.includes(role))
            || (!role && allowed.includes('public'));
        el.hidden = !matches;
    });
    document.querySelectorAll('.app-nav, .landing-nav, .app-sidebar').forEach((nav) => {
        nav.classList.add('nav-ready');
    });
    renumberNav();
}


function renumberNav() {
    document.querySelectorAll('.app-nav, .landing-nav').forEach((nav) => {
        let n = 1;
        nav.querySelectorAll('a').forEach((link) => {
            if (link.hidden) return;
            const num = link.querySelector('.app-nav__link-num, .landing-nav__link-num');
            if (num) num.textContent = String(n).padStart(2, '0');
            n += 1;
        });
    });
}


function replaceCta(user) {
    const $cta = document.querySelector('[data-auth-cta]');
    if (!$cta) return;

    const isLanding = $cta.classList.contains('landing-header__cta');
    const ctaClass = isLanding ? 'landing-header__cta' : 'app-header__cta';
    const pulseClass = isLanding ? 'landing-header__cta-pulse' : 'app-header__cta-pulse';

    const roleLabel = user.role === 'teacher' ? 'Docente' : 'Estudiante';
    const username = user.first_name || user.username;

    $cta.outerHTML = `
        <div class="nav-auth-user" data-auth-cta>
            <a href="/app/dashboard/" class="${ctaClass}">
                <span class="${pulseClass}" aria-hidden="true"></span>
                ${username} · ${roleLabel}
            </a>
            <button type="button" class="nav-auth-logout" id="nav-logout-btn" aria-label="Cerrar sesión">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"
                     aria-hidden="true">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                Salir
            </button>
        </div>
    `;

    bindLogout(document.getElementById('nav-logout-btn'));
}


function populateTopbar(user) {
    const $name = document.getElementById('user-name');
    const $role = document.getElementById('user-role');
    const $initials = document.getElementById('user-initials');

    const firstName = user.first_name || user.username;
    const lastName = user.last_name || '';
    const fullName = lastName ? `${firstName} ${lastName}` : firstName;

    if ($name) $name.textContent = firstName;
    if ($role) {
        $role.textContent = user.role === 'teacher' ? 'Docente' : 'Estudiante';
        $role.dataset.role = user.role;
    }
    if ($initials) {
        const base = (fullName || '').trim() || user.username || '';
        $initials.textContent = base
            ? base.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase()
            : '';
    }
}


function setupSidebarToggle() {
    const SIDEBAR_KEY = 'cogniroom.sidebar.collapsed';
    const $sidebar = document.getElementById('app-sidebar');
    const $toggle = document.getElementById('app-sidebar-toggle');
    if (!$sidebar) return;

    if (localStorage.getItem(SIDEBAR_KEY) === '1') {
        $sidebar.classList.add('app-sidebar--collapsed');
        if ($toggle) $toggle.setAttribute('aria-expanded', 'false');
    }

    if ($toggle && !$toggle.dataset.bound) {
        $toggle.dataset.bound = '1';
        $toggle.addEventListener('click', () => {
            const collapsed = $sidebar.classList.toggle('app-sidebar--collapsed');
            localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0');
            $toggle.setAttribute('aria-expanded', String(!collapsed));
            $toggle.setAttribute('aria-label', collapsed ? 'Expandir menú' : 'Colapsar menú');
        });
    }

    bindLogout(document.getElementById('logout-btn'));
}


function bindLogout($btn) {
    if (!$btn || $btn.dataset.bound) return;
    $btn.dataset.bound = '1';
    $btn.addEventListener('click', async () => {
        $btn.disabled = true;
        try {
            await auth.logout();
        } finally {
            // El redirect ocurre pase lo que pase: la sesión local ya se limpió.
            location.href = '/app/';
        }
    });
}


const ACTIVE_ROOM_KEY = 'cogniroom.activeRoomId';

let _teacherRooms = [];


function getActiveRoom() {
    const stored = Number(localStorage.getItem(ACTIVE_ROOM_KEY));
    return _teacherRooms.find((r) => r.id === stored) || _teacherRooms[0] || null;
}

function setActiveRoom(roomId) {
    const room = _teacherRooms.find((r) => r.id === Number(roomId));
    if (!room) return;
    localStorage.setItem(ACTIVE_ROOM_KEY, String(room.id));
    paintActiveRoom(room);
    window.dispatchEvent(new CustomEvent('cogniroom:roomchange', { detail: room }));
}

function paintActiveRoom(room) {
    if (!room) return;
    const $name = document.getElementById('topbar-room-name');
    if ($name) $name.textContent = room.name;
    document.querySelectorAll('#topbar-room-menu .dropdown-item').forEach((el) => {
        const isActive = Number(el.dataset.roomId) === room.id;
        el.setAttribute('aria-current', isActive ? 'true' : 'false');
    });
}

async function setupRoomSelector() {
    const $wrap = document.querySelector('.dashboard-shell__room');
    const $menu = document.getElementById('topbar-room-menu');
    if (!$wrap || !$menu) return;

    try {
        _teacherRooms = (await rooms.list()) || [];
    } catch (_) {
        _teacherRooms = [];
    }

    if (!_teacherRooms.length) {
        $wrap.hidden = true;
        return;
    }

    $wrap.hidden = false;
    $menu.innerHTML = _teacherRooms.map((r) => {
        const n = r.member_count ?? 0;
        // Solo mostramos el contador cuando aporta información (>0): "0 est." en
        // cada fila era ruido. Icono + número, consistente con las tarjetas.
        const meta = n > 0
            ? `<span class="topbar-room__menu-meta" title="${n} ${n === 1 ? 'estudiante' : 'estudiantes'}">
                   <svg class="icon-svg" width="13" height="13" viewBox="0 0 24 24" aria-hidden="true">
                       <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                       <circle cx="9" cy="7" r="4"></circle>
                   </svg>${n}</span>`
            : '';
        return `
        <li>
            <button type="button" class="dropdown-item" data-room-id="${r.id}">
                <span class="topbar-room__menu-name">${_esc(r.name)}</span>
                ${meta}
            </button>
        </li>`;
    }).join('');

    $menu.querySelectorAll('.dropdown-item').forEach((btn) => {
        btn.addEventListener('click', () => setActiveRoom(btn.dataset.roomId));
    });

    // Fija la sala activa (la guardada o la primera) y pinta el topbar.
    const active = getActiveRoom();
    if (active) {
        localStorage.setItem(ACTIVE_ROOM_KEY, String(active.id));
        paintActiveRoom(active);
    }
}


async function setupCreateRoomForm() {
    const $form = document.getElementById('create-room-form');
    if (!$form || $form.dataset.bound) return;
    $form.dataset.bound = '1';

    const { toast } = await import(`./toast.js?v=${_v}`);

    $form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = $form.elements.name.value.trim();
        if (!name) {
            $form.elements.name.focus();
            return;
        }
        const subjectEl = $form.elements.subject;
        const subject = (subjectEl ? subjectEl.value : '').trim() || 'General';
        const $submit = $form.querySelector('[type="submit"]');
        if ($submit) $submit.disabled = true;
        try {
            const room = await rooms.create({ name, subject, mode: 'group' });
            localStorage.setItem(ACTIVE_ROOM_KEY, String(room.id));
            toast(`Sala "${name}" creada.`, { kind: 'success' });
            $form.reset();
            const $modal = document.getElementById('createRoomModal');
            if ($modal && window.bootstrap) {
                const instance = window.bootstrap.Modal.getInstance($modal) || new window.bootstrap.Modal($modal);
                instance.hide();
            }
            setTimeout(() => location.reload(), 400);
        } catch (err) {
            if ($submit) $submit.disabled = false;
            toast(err?.body?.detail || err?.message || 'No se pudo crear la sala.', { kind: 'error' });
        }
    });
}


/* ---- Notificaciones (campana del topbar) ---- */

let _notifs = [];

function timeAgo(iso) {
    const diff = Math.max(0, Date.now() - new Date(iso).getTime());
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'ahora';
    if (m < 60) return `hace ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `hace ${h} h`;
    return `hace ${Math.floor(h / 24)} d`;
}

function renderNotifications(unread) {
    const $dot = document.getElementById('notif-dot');
    const $list = document.getElementById('notif-list');
    const $readall = document.getElementById('notif-readall');
    if (!$list) return;

    if ($dot) $dot.hidden = !(unread > 0);
    if ($readall) $readall.hidden = !(unread > 0);

    if (!_notifs.length) {
        $list.innerHTML = '<li class="notif-panel__empty">Sin notificaciones.</li>';
        return;
    }
    $list.innerHTML = _notifs.map((n) => `
        <li>
            <a class="notif-item${n.is_read ? '' : ' notif-item--unread'}" href="${_esc(n.link || '#')}">
                <span class="notif-item__title">${_esc(n.title)}</span>
                ${n.body ? `<span class="notif-item__body">${_esc(n.body)}</span>` : ''}
                <span class="notif-item__time">${timeAgo(n.created_at)}</span>
            </a>
        </li>
    `).join('');
}

async function setupNotifications() {
    const $trigger = document.getElementById('notif-trigger');
    const $readall = document.getElementById('notif-readall');
    if (!$trigger) return;

    try {
        const data = await notifications.list();
        _notifs = data.results || [];
        renderNotifications(data.unread_count || 0);
    } catch (_) {
        return;
    }

    async function markAllRead() {
        const $dot = document.getElementById('notif-dot');
        if ($dot && $dot.hidden) return; // ya no hay sin leer
        try { await notifications.markRead(); } catch (_) { /* best-effort */ }
        if ($dot) $dot.hidden = true;
        if ($readall) $readall.hidden = true;
    }

    // Abrir el panel marca todo como leído (limpia el badge), sin quitar el
    // resaltado de las que se están viendo ahora.
    $trigger.addEventListener('shown.bs.dropdown', markAllRead);
    if ($readall) $readall.addEventListener('click', markAllRead);
}


async function setupRequestsBadge() {
    const $badge = document.getElementById('requests-badge');
    if (!$badge) return;
    try {
        const reqs = (await rooms.joinRequests()) || [];
        if (reqs.length > 0) {
            $badge.textContent = String(reqs.length);
            $badge.hidden = false;
        } else {
            $badge.hidden = true;
        }
    } catch (_) { /* best-effort: el badge simplemente no aparece */ }
}


async function updateNav() {
    setupSidebarToggle();

    if (!tokens.access) {
        filterNav(null);
        return;
    }

    try {
        const user = await auth.me();
        filterNav(user.role);
        replaceCta(user);
        await populateTopbar(user);
        setupNotifications();
        if (user.role === 'teacher') {
            setupRoomSelector();
            setupCreateRoomForm();
            setupRequestsBadge();
        }
    } catch (_) {
        tokens.clear();
        filterNav(null);
    }
}

updateNav();


export { getActiveRoom, setActiveRoom, ACTIVE_ROOM_KEY };
