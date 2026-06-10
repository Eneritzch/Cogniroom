const _v = new URL(import.meta.url).searchParams.get('v') || '';
const { auth, rooms, tokens } = await import(`./api.js?v=${_v}`);

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


async function loadMockOverride(role) {
    try {
        if (role === 'student') {
            const m = await import(`./student/student-mock.js?v=${_v}`);
            return m.STUDENT_DATA?.profile || null;
        }
        if (role === 'teacher') {
            const m = await import(`./teacher/teacher-mock.js?v=${_v}`);
            return m.TEACHER_DATA?.profile || null;
        }
    } catch (_) {
        return null;
    }
    return null;
}


async function populateTopbar(user) {
    const $name = document.getElementById('user-name');
    const $role = document.getElementById('user-role');
    const $initials = document.getElementById('user-initials');

    const mock = await loadMockOverride(user.role);
    const firstName = (mock?.first_name) || user.first_name || user.username;
    const lastName  = (mock?.last_name)  || user.last_name  || '';
    const fullName  = lastName ? `${firstName} ${lastName}` : firstName;

    if ($name) $name.textContent = firstName;
    if ($role) {
        $role.textContent = user.role === 'teacher' ? 'Docente' : 'Estudiante';
        $role.dataset.role = user.role;
    }
    if ($initials) {
        const base = fullName.trim() || user.username || '';
        $initials.textContent = base
            ? base.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase()
            : 'TQ';
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
    $menu.innerHTML = _teacherRooms.map((r) => `
        <li>
            <button type="button" class="dropdown-item" data-room-id="${r.id}">
                <span>${_esc(r.name)}</span>
                <span class="topbar-room__menu-meta">${r.member_count ?? 0} est.</span>
            </button>
        </li>
    `).join('');

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
        if (user.role === 'teacher') {
            setupRoomSelector();
            setupCreateRoomForm();
        }
    } catch (_) {
        tokens.clear();
        filterNav(null);
    }
}

updateNav();


export { getActiveRoom, setActiveRoom, ACTIVE_ROOM_KEY };
