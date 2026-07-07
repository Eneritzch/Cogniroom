// Reemplaza cada <select class="form-select"> por un dropdown custom limpio.
// El <select> nativo queda oculto como fuente de verdad: al elegir una opción
// se actualiza su value y se dispara un evento 'change', así toda la lógica
// existente (listeners, lectura de .value) sigue funcionando sin cambios.

function enhance(select) {
    if (select.dataset.cselect === 'true') return;
    select.dataset.cselect = 'true';

    const wrap = document.createElement('div');
    wrap.className = 'cselect';
    select.parentNode.insertBefore(wrap, select);
    wrap.appendChild(select);
    select.classList.add('cselect__native');
    select.setAttribute('tabindex', '-1');
    select.setAttribute('aria-hidden', 'true');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cselect__button';
    button.setAttribute('aria-haspopup', 'listbox');
    button.setAttribute('aria-expanded', 'false');

    const value = document.createElement('span');
    value.className = 'cselect__value';

    const chevron = document.createElement('span');
    chevron.className = 'cselect__chevron';
    chevron.innerHTML = '<svg class="icon-svg" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>';

    button.append(value, chevron);

    const menu = document.createElement('div');
    menu.className = 'cselect__menu';
    menu.setAttribute('role', 'listbox');
    menu.hidden = true;

    wrap.append(button, menu);

    let activeIndex = -1;

    function syncLabel() {
        const opt = select.options[select.selectedIndex];
        value.textContent = (opt && opt.textContent) || 'Seleccioná…';
        value.dataset.placeholder = (!opt || opt.value === '') ? 'true' : 'false';
    }

    function buildMenu() {
        menu.innerHTML = '';
        Array.from(select.options).forEach((opt, i) => {
            const item = document.createElement('div');
            item.className = 'cselect__option';
            item.setAttribute('role', 'option');
            // Con data-desc la opción muestra un subtítulo explicativo (el botón
            // colapsado sigue mostrando solo la etiqueta corta).
            const desc = opt.dataset.desc;
            if (desc) {
                item.classList.add('cselect__option--described');
                const label = document.createElement('span');
                label.className = 'cselect__option-label';
                label.textContent = opt.textContent;
                const sub = document.createElement('span');
                sub.className = 'cselect__option-desc';
                sub.textContent = desc;
                item.append(label, sub);
            } else {
                item.textContent = opt.textContent;
            }
            item.dataset.index = String(i);
            item.dataset.selected = i === select.selectedIndex ? 'true' : 'false';
            item.setAttribute('aria-selected', i === select.selectedIndex ? 'true' : 'false');
            if (opt.disabled) item.dataset.disabled = 'true';
            menu.appendChild(item);
        });
    }

    function highlight() {
        menu.querySelectorAll('.cselect__option').forEach((el, i) => {
            el.dataset.active = i === activeIndex ? 'true' : 'false';
        });
        const act = menu.querySelector(`[data-index="${activeIndex}"]`);
        if (act) act.scrollIntoView({ block: 'nearest' });
    }

    function open() {
        buildMenu();
        menu.hidden = false;
        wrap.dataset.open = 'true';
        button.setAttribute('aria-expanded', 'true');
        activeIndex = select.selectedIndex;
        highlight();
    }

    function close() {
        menu.hidden = true;
        wrap.dataset.open = 'false';
        button.setAttribute('aria-expanded', 'false');
        activeIndex = -1;
    }

    function choose(i) {
        const opt = select.options[i];
        if (!opt || opt.disabled) return;
        if (select.selectedIndex !== i) {
            select.selectedIndex = i;
            select.dispatchEvent(new Event('change', { bubbles: true }));
        }
        syncLabel();
        close();
        button.focus();
    }

    function step(dir) {
        const last = select.options.length - 1;
        let n = activeIndex < 0 ? select.selectedIndex : activeIndex;
        for (let k = 0; k <= last; k++) {
            n = Math.max(0, Math.min(last, n + dir));
            if (!select.options[n].disabled) break;
            if (n === 0 || n === last) break;
        }
        activeIndex = n;
        highlight();
    }

    button.addEventListener('click', () => (menu.hidden ? open() : close()));

    menu.addEventListener('click', (e) => {
        const item = e.target.closest('.cselect__option');
        if (item) choose(Number(item.dataset.index));
    });

    button.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (menu.hidden) open();
            else step(e.key === 'ArrowDown' ? 1 : -1);
        } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (menu.hidden) open();
            else choose(activeIndex);
        } else if (e.key === 'Escape' && !menu.hidden) {
            e.preventDefault();
            close();
        }
    });

    document.addEventListener('click', (e) => {
        if (!wrap.contains(e.target)) close();
    });

    // Reconstruir cuando el <select> cambia sus <option> (nodos/PDFs dinámicos).
    new MutationObserver(() => {
        syncLabel();
        if (!menu.hidden) buildMenu();
    }).observe(select, { childList: true });

    select.addEventListener('change', syncLabel);

    // form.reset() no dispara 'change': re-sincronizamos la etiqueta luego.
    const form = select.closest('form');
    if (form) form.addEventListener('reset', () => setTimeout(syncLabel, 0));

    syncLabel();
}

export function enhanceSelects(root = document) {
    root.querySelectorAll('select.form-select').forEach(enhance);
}

enhanceSelects();
