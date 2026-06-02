const _v = new URL(import.meta.url).searchParams.get('v') || '';
const { tokens } = await import(`../api.js?v=${_v}`);
const { ROOM_DATA, escapeHTML, profileLabel, bindRoomChange } = await import(`./room-mock.js?v=${_v}`);
const { getActiveRoom } = await import(`../nav-auth.js?v=${_v}`);


if (!tokens.access) {
    location.replace('/app/');
}


const PAGE_SIZE = 20;

let currentProfile = 'all';
let currentSection = 'all';
let currentSearch = '';
let visibleCount = PAGE_SIZE;


function fullName(user) {
    if (!user) return '';
    return `${user.first_name || ''} ${user.last_name || ''}`.trim();
}


function initials(user) {
    const parts = [user?.first_name, user?.last_name].filter(Boolean);
    return parts.map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}


function gapTone(gap) {
    if (gap > 0.15)  return 'amber';
    if (gap < -0.15) return 'stone';
    return 'moss';
}


function actionLabel(profile) {
    if (profile === 'overconfident') return 'Refuerzo';
    if (profile === 'underconfident') return 'Nota';
    return 'Detalle';
}


function summaryShort(profile, gapPts) {
    const abs = Math.abs(gapPts);
    if (profile === 'overconfident') return `Cree saber ${abs} pts más de lo real.`;
    if (profile === 'underconfident') return `Sabe ${abs} pts más de lo que cree.`;
    return 'Bien calibrado · confianza alineada con su nivel.';
}


function renderSectionChips(sections) {
    const $wrap = document.getElementById('curso-chips');
    const $group = document.getElementById('students-curso-group');
    if (!$wrap || !$group) return;

    if (!sections || sections.length <= 1) {
        $group.hidden = true;
        return;
    }
    $group.hidden = false;

    const totalStudents = sections.reduce((s, c) => s + (c.total_student || 0), 0);
    const chips = [
        `<button type="button" class="students-chip" data-curso="all" aria-pressed="${currentSection === 'all' ? 'true' : 'false'}">
            Todos <span class="students-chip__count num">${totalStudents}</span>
        </button>`,
        ...sections.map((c) => `
            <button type="button" class="students-chip" data-curso="${c.id_section}" aria-pressed="${currentSection === c.id_section ? 'true' : 'false'}">
                ${escapeHTML(`${c.code} · ${c.schedule}`)} <span class="students-chip__count num">${c.total_student || 0}</span>
            </button>
        `),
    ];
    $wrap.innerHTML = chips.join('');

    $wrap.querySelectorAll('[data-curso]').forEach((btn) => {
        btn.addEventListener('click', () => {
            currentSection = btn.dataset.curso;
            visibleCount = PAGE_SIZE;
            $wrap.querySelectorAll('[data-curso]').forEach((b) => {
                b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
            });
            renderList();
        });
    });
}


function applyFilters(roster) {
    const q = currentSearch.trim().toLowerCase();
    return roster.filter((s) => {
        if (currentProfile !== 'all' && s.profile !== currentProfile) return false;
        if (currentSection !== 'all' && s.membership?.section?.id_section !== currentSection) return false;
        if (q && !fullName(s.user).toLowerCase().includes(q)) return false;
        return true;
    });
}


function renderList() {
    const room = getActiveRoom();
    const data = ROOM_DATA[room.id];
    if (!data) return;

    const $rows = document.getElementById('students-rows');
    const $meta = document.getElementById('students-meta');
    const $pager = document.getElementById('students-pager');
    const $more = document.getElementById('students-more');
    if (!$rows) return;

    const filtered = applyFilters(data.roster);
    const visible = filtered.slice(0, visibleCount);

    if ($meta) {
        let sectionLabel = '';
        if (currentSection !== 'all') {
            const sec = (data.sections || []).find((c) => c.id_section === currentSection);
            sectionLabel = sec ? ` · ${sec.code}` : '';
        }
        $meta.textContent = `Mostrando ${visible.length} de ${filtered.length}${sectionLabel}`;
    }

    if (filtered.length === 0) {
        $rows.innerHTML = `<li class="students-list__empty">Sin estudiantes para este filtro.</li>`;
        if ($pager) $pager.hidden = true;
        return;
    }

    $rows.innerHTML = visible.map((s) => {
        const mastery = Math.round((s.bkt_mastery ?? 0) * 100);
        const gap = s.metacognitive_gap ?? 0;
        const gapPts = Math.round(gap * 100);
        const confidence = Math.round((s.avg_confidence ?? 0) * 100);
        const tone = gapTone(gap);
        const gapText = gapPts > 0 ? `+${gapPts}` : `${gapPts}`;
        const sectionCode = s.membership?.section?.code || '';
        const name = fullName(s.user);

        return `
        <li class="student-card" data-profile="${s.profile}">
            <div class="student-card__head">
                <span class="student-card__avatar" aria-hidden="true">${initials(s.user)}</span>
                <div class="student-card__id">
                    <div class="student-card__name">${escapeHTML(name)}</div>
                    <div class="student-card__meta">
                        ${sectionCode ? `<span class="student-card__curso">${escapeHTML(sectionCode)}</span>` : ''}
                    </div>
                </div>
                <span class="pill student-card__pill" data-profile="${s.profile}">${profileLabel(s.profile)}</span>
            </div>

            <div class="student-card__bars">
                <div class="microbar" title="Cree saber ${confidence}%">
                    <span class="microbar__label">Cree</span>
                    <div class="microbar__track">
                        <div class="microbar__fill microbar__fill--declared" style="width:${confidence}%"></div>
                    </div>
                    <span class="microbar__val num">${confidence}%</span>
                </div>
                <div class="microbar" title="Realmente sabe ${mastery}%">
                    <span class="microbar__label">Sabe</span>
                    <div class="microbar__track">
                        <div class="microbar__fill microbar__fill--mastery" style="width:${mastery}%"></div>
                    </div>
                    <span class="microbar__val num">${mastery}%</span>
                </div>
            </div>

            <div class="student-card__foot">
                <span class="student-card__diff" data-tone="${tone}" title="${summaryShort(s.profile, gapPts)}">${gapText} pts</span>
                <button type="button" class="student-card__action">
                    ${actionLabel(s.profile)}
                    <svg class="icon-svg" width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                </button>
            </div>
        </li>
        `;
    }).join('');

    if ($pager && $more) {
        const remaining = filtered.length - visibleCount;
        if (remaining > 0) {
            $pager.hidden = false;
            $more.textContent = `Mostrar ${Math.min(PAGE_SIZE, remaining)} más`;
        } else {
            $pager.hidden = true;
        }
    }
}


function render() {
    const room = getActiveRoom();
    const data = ROOM_DATA[room.id];
    if (!data) return;

    document.getElementById('room-name').textContent = data.name;
    document.getElementById('room-students').textContent = String(data.students);

    visibleCount = PAGE_SIZE;
    currentSection = 'all';

    renderSectionChips(data.sections);
    renderList();
}


document.querySelectorAll('[data-profile-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
        currentProfile = btn.dataset.profileFilter;
        visibleCount = PAGE_SIZE;
        document.querySelectorAll('[data-profile-filter]').forEach((b) => {
            b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        });
        renderList();
    });
});


const $search = document.getElementById('students-search');
if ($search) {
    let t = null;
    $search.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => {
            currentSearch = $search.value;
            visibleCount = PAGE_SIZE;
            renderList();
        }, 150);
    });
}


const $more = document.getElementById('students-more');
if ($more) {
    $more.addEventListener('click', () => {
        visibleCount += PAGE_SIZE;
        renderList();
    });
}


bindRoomChange(render);
