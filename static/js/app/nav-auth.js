const _v = new URL(import.meta.url).searchParams.get('v') || '';
const { auth, tokens } = await import(`./api.js?v=${_v}`);


function filterNav(role) {
    const items = document.querySelectorAll('[data-show-for]');
    items.forEach((el) => {
        const allowed = el.dataset.showFor.split(',').map((s) => s.trim());
        const matches = allowed.includes('any')
            || (role && allowed.includes(role))
            || (!role && allowed.includes('public'));
        el.hidden = !matches;
    });
    document.querySelectorAll('.app-nav, .landing-nav').forEach((nav) => {
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

    document.getElementById('nav-logout-btn').addEventListener('click', () => {
        tokens.clear();
        location.href = '/';
    });
}


async function updateNav() {
    if (!tokens.access) {
        filterNav(null);
        return;
    }

    try {
        const user = await auth.me();
        filterNav(user.role);
        replaceCta(user);
    } catch (_) {
        tokens.clear();
        filterNav(null);
    }
}

updateNav();
