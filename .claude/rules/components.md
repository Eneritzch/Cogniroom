# Reglas de componentes y reutilización — CogniRoom

> Estas reglas complementan [.claude/rules/CLAUDE.md](CLAUDE.md). Cuando entren en conflicto, gana esta lista (es la más específica). Léelas antes de copiar HTML o crear estilos.

---

## 0. Estructura de carpetas por rol

Templates, CSS y JS están organizados por **audiencia/rol** para que cada archivo declare a quién sirve:

```
templates/
├── landing.html                       (root, público)
└── app/
    ├── partials/                       (fragments compartidos)
    ├── public/                         (sin auth: login, design-system)
    ├── teacher/                        (solo docente: room)
    ├── student/                        (solo estudiante: session)
    └── shared/                         (ambos roles: dashboard, diagnoses)

static/
├── landing.css · landing.js            (root, público)
├── css/app/
│   ├── tokens.css · base.css           (foundation)
│   ├── components/                     (UI reutilizable)
│   ├── public/ · teacher/ · student/ · shared/
└── js/app/
    ├── api.js · toast.js · nav-auth.js (shared lib)
    └── public/ · teacher/ · student/ · shared/
```

**Regla**: ubicación del archivo = audiencia. Si un nuevo template va a verlo solo el docente, va en `teacher/`. Si lo ven ambos roles, en `shared/`.

---

## 1. DRY — nunca copies HTML que aparece en dos sitios

Si un bloque de HTML (header, footer, navegación, card, callout, etc.) **aparece o va a aparecer en dos templates o más**, NO lo dupliques. Extráelo a un partial en `templates/app/partials/` con prefijo `_` (convención Django).

### Partials existentes — úsalos siempre

| Partial | Qué contiene | Cuándo incluirlo |
|---|---|---|
| [`_app-sidebar.html`](../../templates/app/partials/_app-sidebar.html) | Sidebar lateral con logo + nav vertical + toggle colapsar | TODA página autenticada (dashboard, room, diagnoses). Acepta `with active='nombre'`. |
| [`_app-topbar.html`](../../templates/app/partials/_app-topbar.html) | Top bar con search + notificaciones + profile pill | TODA página autenticada, **después** del `_app-sidebar` y dentro del `<main class="dashboard-shell__main">` || [`_app-footer.html`](../../templates/app/partials/_app-footer.html) | Footer simple con brand + meta | Páginas con layout horizontal (no usado en dashboard-shell, que oculta footer por CSS) |
| [`_styles.html`](../../templates/app/partials/_styles.html) | Todos los `<link>` a CSS (tokens + base + components) | Dentro del `<head>` de **cada** template. Es la primera línea después del `<title>`. |
| [`_bootstrap-bundle.html`](../../templates/app/partials/_bootstrap-bundle.html) | Script bundle de Bootstrap | Al final del body, antes de los `<script>` de página |

### Cuándo crear un partial nuevo

Crea un partial cuando se cumpla **al menos una** de estas condiciones:

1. El HTML se va a usar en ≥ 2 páginas.
2. El HTML representa una unidad semántica clara (chrome, modal, callout) y es candidato natural para reutilizarse.
3. Tiene lógica de parametrización (`{% include ... with X=Y %}`).

NO crees un partial si:
- Es un fragmento corto de < 10 líneas que solo se usa en un sitio.
- La reutilización es especulativa ("podría usarse en el futuro").

---

## 2. Layout y shell autenticado

### Patrón obligatorio para pantallas autenticadas

```django
<body class="<page-name>-page dashboard-shell">

    {% include 'app/partials/_app-sidebar.html' with active='dashboard' %}

    <main class="dashboard-shell__main">

        {% include 'app/partials/_app-topbar.html' %}

        <!-- contenido específico de la página aquí -->

    </main>

    <div class="toast-host" id="toast-host" aria-live="polite" aria-atomic="true"></div>

    {% include 'app/partials/_bootstrap-bundle.html' %}
    <script type="module" src="{% static 'js/app/nav-auth.js' %}?v={% now "U" %}"></script>
    <script type="module" src="{% static 'js/app/<page>.js' %}?v={% now "U" %}"></script>
</body>
```

### Valores válidos para `active`

`dashboard`, `room`, `session`, `diagnoses`. Se usa para que el item del nav reciba `aria-current="page"`.

### Pantallas que NO usan el shell

- `landing.html` — público, tiene su propio `landing-header`
- `login.html` (index.html) — auth, tiene su propio `auth-shell` (split panel)
- `session.html` — modo focus de evaluación, header minimal sin nav
- `design-system.html` — público, top nav simple

---

## 3. Componentes UI compartidos en CSS

Vive en `static/css/app/components/`. **Nunca dupliques estilos de estos**:

| Archivo | Componentes | Cuándo usarlos |
|---|---|---|
| `buttons.css` | `.btn-primary`, `.btn-outline-secondary` (overrides Bootstrap) | Botones de página completa, CTAs |
| `forms.css` | `.form-control`, `.form-select`, `.form-label` | Cualquier input/select |
| `chrome.css` | `.app-header`, `.app-nav`, `.app-footer`, header CTAs, nav-auth user | Top nav y footer de páginas legacy |
| `pills.css` | `.pill[data-profile]`, `.pill[data-risk]`, `.role-badge` | Etiquetas semánticas de estado |
| `feedback.css` | `.empty`, `.skeleton`, `.cogni-toast`, `.toast-host` | Estados vacíos, loading, notificaciones |
| `metrics.css` | `.calibration-ring`, `.dual-bar`, `.node-card`, `.ai-diagnosis`, `.knowledge-graph` | Componentes signature del dominio |

Si necesitas un componente NUEVO que pueda reutilizarse, **créalo en `components/`** con su archivo propio y agrégalo al `_styles.html`.

Si es exclusivo de una página, vive en `static/css/app/<page>.css`.

---

## 4. HTML semántico — obligatorio

Cada template debe usar **etiquetas con significado**, nunca `<div>` cuando hay una mejor:

| Etiqueta | Para qué |
|---|---|
| `<header>` | Encabezado del documento o de una sección |
| `<nav>` | Barra de navegación |
| `<main>` | Contenido principal (uno por página) |
| `<section>` | Bloques temáticos con título propio |
| `<article>` | Unidad de contenido auto-suficiente (card, post) |
| `<aside>` | Contenido relacionado pero secundario (sidebar, callout) |
| `<footer>` | Pie de sección o documento |
| `<figure>` + `<figcaption>` | Imágenes/gráficos con descripción |
| `<dl>` + `<dt>` + `<dd>` | Listas de definiciones (BKT/ICC/IPC en el landing) |
| `<button type="button">` | Acciones que NO navegan |
| `<a href="...">` | Navegación a otra URL |

### Atributos obligatorios

- `lang="es"` en `<html>`
- `<title>` y `<meta name="description">` en cada template
- `aria-label` en botones que solo tienen icono
- `aria-current="page"` en el item activo del nav
- `aria-hidden="true"` en iconos decorativos (SVG sin texto)
- `<svg role="img"><title>...</title>` si el SVG comunica algo sin texto al lado
- `alt=""` en imágenes decorativas, `alt="descripción"` en informativas

---

## 5. Responsive — mobile-first siempre

### Regla única e inviolable

- **Base** = mobile. Sin media query.
- **`@media (min-width: 768px)`** = desktop. Única.
- Nada de `min-width: 1024px`, `1200px`, `480px`, etc.

```css
/* BIEN */
.card { padding: var(--s-4); }
@media (min-width: 768px) { .card { padding: var(--s-8); } }

/* MAL */
.card { padding: var(--s-8); }
@media (max-width: 1023px) { .card { padding: var(--s-4); } }
```

### Si un componente NO funciona con un solo breakpoint

Replantea el componente, no añadas más breakpoints.

---

## 6. Layout: SOLO Flexbox

**Prohibido `display: grid`** en CSS propio. Usa siempre `display: flex` + `flex` shorthand.

- Bootstrap grid (`.row`, `.col-*`) está permitido porque internamente es flex.
- Para 2 columnas iguales: `display: flex` + `flex: 1` en cada hijo.
- Para columnas distintas: `flex: 0 0 240px` (fijo) + `flex: 1` (resto).
- Para grids de cards uniformes: `display: flex; flex-wrap: wrap; gap: var(--s-4);` + `flex: 1 1 280px` en cada hijo.

```css
/* BIEN */
.row { display: flex; gap: var(--s-4); }
.row > .sidebar { flex: 0 0 240px; }
.row > .main    { flex: 1; min-width: 0; }

/* MAL */
.row { display: grid; grid-template-columns: 240px 1fr; gap: var(--s-4); }
```

### Excepción: `display: grid` interno de Bootstrap o iframes embebidos

No aplica — es código de terceros, no nuestro.

---

## 7. Design system — sistema cerrado

### Color

**Nunca** un hex literal en CSS propio. Usa solo variables de [`tokens.css`](../../static/css/app/tokens.css):

- Marca: `--sage`, `--sage-strong`, `--sage-soft`, `--terracotta`, `--terracotta-soft`
- Estado: `--moss` (success), `--amber` (warning), `--rust` (danger), `--stone` (info)
- Neutros: `--paper`, `--paper-elevated`, `--paper-surface`, `--paper-border`, `--paper-border-strong`
- Tinta: `--ink`, `--ink-muted`, `--ink-faint`

Aliases del dominio (consume estos cuando hablas del producto):
- `--color-calibrated`, `--color-overconfident`, `--color-underconfident`
- `--color-risk-high`, `--color-risk-medium`, `--color-risk-low`

### Tipografía

- UI/prosa: `var(--font-sans)` (Inter)
- Números/métricas/código: `var(--font-mono)` (JetBrains Mono) — aplícalo a TODO número que el usuario lea o compare (ICC, BKT, %, IDs)

### Escala numérica

- Tamaños de fuente: `--fs-xs/sm/base/md/lg/xl/2xl/display`
- Espaciado: `--s-1/2/3/4/5/6/8/10/12/16/20`
- Radios: `--r-xs/sm/md/lg/xl/pill`

Ningún valor numérico inventado. Si necesitas algo intermedio, replantea el componente.

---

## 8. JavaScript — módulos compartidos en `lib`

### Módulos disponibles (en `static/js/app/`)

| Módulo | Qué hace | Cuándo importarlo |
|---|---|---|
| `api.js` | Cliente HTTP + JWT + refresh | Cualquier página que llame al backend |
| `toast.js` | Notificaciones (`.cogni-toast`) | Cualquier página que necesite feedback |
| `nav-auth.js` | Filtrado de nav por rol + topbar populate + sidebar toggle + logout | TODA página con sidebar (auto-detecta) |

### Import dinámico con cache-busting

**Todo JS que importe `api.js` o `toast.js`** debe usar este patrón para que el cache-buster se propague:

```js
const _v = new URL(import.meta.url).searchParams.get('v') || '';
const { auth, tokens, ApiError } = await import(`./api.js?v=${_v}`);
const { toast } = await import(`./toast.js?v=${_v}`);
```

Sin esto, los imports quedan cacheados aunque el wrapper se refresque.

---

## 9. Hooks de UI compartidos — usa `nav-auth.js`

`nav-auth.js` se encarga automáticamente de:

1. **Sidebar toggle** (collapse/expand + persist en `localStorage` con key `cogniroom.sidebar.collapsed`)
2. **Logout button** (cualquier `#logout-btn` en la página)
3. **Topbar profile** (rellena `#user-name`, `#user-role`, `#user-initials` con datos del JWT)
4. **Filtrado del nav** por rol (oculta items con `data-show-for` que no matcheen)
5. **Reemplazo de CTA pública** (cambia "Entrar" por widget user en landing/design-system)

**No dupliques esta lógica** en JS de páginas. Si necesitas un comportamiento extra del sidebar, añádelo a `nav-auth.js` con guardas defensivas (`if (!$el) return`).

---

## 10. Checklist antes de hacer commit

1. ¿Estoy duplicando HTML que ya existe como partial? → usá `{% include %}`
2. ¿Estoy hardcodeando un color, tamaño, espaciado o radio? → usá tokens
3. ¿Usé `<div>` cuando había una etiqueta semántica? → reemplazá
4. ¿Mi componente tiene más de un breakpoint? → replantealo
5. ¿Usé `display: grid`? → cambialo a `flex`
6. ¿Mi botón solo tiene icono y no tiene `aria-label`? → agregalo
7. ¿Estoy bindeando logout, sidebar toggle o user info manualmente? → ya lo hace `nav-auth.js`
