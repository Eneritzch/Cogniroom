# Reglas de diseño y desarrollo — CogniRoom

Reglas operativas de obligado cumplimiento al escribir o modificar código en este repo. Complementan el contexto en `CLAUDE.md` (raíz). Cuando una recomendación entra en conflicto con estas reglas, gana esta lista.

---

## 1. Diseño mobile-first y responsive — UN SOLO breakpoint

- **Empezar siempre por móvil**. Estilos base sin media query → corresponden al viewport más pequeño. Las media queries añaden complejidad **hacia arriba**, nunca hacia abajo.
- **Un único breakpoint en todo el proyecto: `768px`** (documentado como `--bp-md` en `tokens.css`). Forma exacta:

  ```css
  /* base = móvil */
  .componente { ... }

  /* desktop */
  @media (min-width: 768px) {
    .componente { ... }
  }
  ```

  Nada de `min-width: 960px`, `min-width: 1024px`, ni breakpoints intermedios. Si un componente requiere otro breakpoint, replantear el componente.
- Para layouts ya responsivos: usar las clases responsive de Bootstrap (`.col-12 .col-md-6`, `.d-none .d-md-block`) que ya están alineadas con el sistema.
- Tamaños de tap: cualquier elemento interactivo (botón, link, dot) debe tener al menos `44 × 44 px` en móvil (WCAG 2.5.5).
- Ningún `max-width` fijo en `px` para contenido textual sin un fallback fluido. Preferir `max-width: 60ch` o `clamp(...)`.
- Probar siempre el render a `375 px`, `768 px` y `1280 px` antes de dar por terminada una vista.

## 1.b Layout: solo Flexbox

- **Prohibido `display: grid` en CSS propio del proyecto.** Toda composición de layout se hace con Flexbox.
- Para columnas múltiples con tamaños relativos: combinar `display: flex` con `flex: <n>` o `flex-basis`. Ejemplo:

  ```css
  .hero-split-layout {
    display: flex;
    flex-direction: column;
    gap: var(--s-12);
  }
  @media (min-width: 768px) {
    .hero-split-layout { flex-direction: row; }
    .hero-main-side    { flex: 1.2; }  /* equivalente a 1.2fr */
    .hero-info-side    { flex: 0.8; }  /* equivalente a 0.8fr */
  }
  ```

- Para grids de tarjetas con celdas iguales: usar `flex-wrap: wrap` + `flex: 1 1 <basis>`:

  ```css
  .ds-grid       { display: flex; flex-wrap: wrap; gap: var(--s-6); }
  .ds-grid > *   { flex: 1 1 320px; }
  ```

- Para layouts de columnas/filas estándar de Bootstrap (`.row`, `.col-*`, `.row-cols-*`) está permitido — internamente Bootstrap usa Flexbox, no CSS Grid.
- Centrado: `display: flex; align-items: center; justify-content: center;` — nunca `place-items: center`.

## 2. Sin emojis — solo iconos SVG inline

- **Prohibido** usar emojis Unicode (✅ ⚠️ 🚀 etc.) en HTML, JS, CSS o copy de UI.
- Iconos: SVG **inline** con `viewBox` y `stroke="currentColor"` para que hereden color del contexto.
- Tamaños recomendados: `14 × 14`, `18 × 18`, `20 × 20`, `24 × 24` (alinean con la escala de espaciado).
- Atributos obligatorios:
  - Si el icono **acompaña** texto: `aria-hidden="true"`.
  - Si el icono va **solo** (sin texto): `<svg role="img"><title>Descripción</title>...</svg>` o el botón contenedor lleva `aria-label`.
- Fuente recomendada: [lucide.dev](https://lucide.dev) (los SVG ya usados en el repo siguen su estilo: `stroke-width: 2`, `stroke-linecap: round`, `stroke-linejoin: round`).

```html
<!-- BIEN -->
<button class="btn btn-primary" aria-label="Empezar">
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" stroke-width="2" stroke-linecap="round"
       stroke-linejoin="round" aria-hidden="true">
    <line x1="5" y1="12" x2="19" y2="12"></line>
    <polyline points="12 5 19 12 12 19"></polyline>
  </svg>
  Empezar
</button>

<!-- MAL -->
<button class="btn btn-primary">🚀 Empezar</button>
```

## 3. Color: sistema cerrado en `static/app/css/tokens.css`

- **Nunca** escribir un valor de color literal (`#0d6efd`, `rgb(...)`, `rgba(...)`, `hsl(...)`) en un componente CSS o estilo inline. Excepción: dentro del propio `tokens.css`.
- El sistema completo son **6 colores semánticos + neutros**. No introducir colores fuera de aquí.

| Token | Uso |
|---|---|
| `--color-primary` · `--color-primary-strong` · `--color-primary-glow` | marca principal (cyan) |
| `--color-secondary` · `--color-secondary-glow` | marca secundaria (violet) |
| `--color-success` · `--color-success-bg` | confirmación |
| `--color-warning` · `--color-warning-bg` | advertencia |
| `--color-danger` · `--color-danger-bg` | alerta / error |
| `--color-info` · `--color-info-bg` | informativo |
| `--color-bg` · `--color-bg-elevated` · `--color-surface` · `--color-surface-2` · `--color-border` · `--color-border-strong` | superficies neutras |
| `--color-text` · `--color-text-muted` · `--color-text-faint` · `--color-text-on-accent` | texto |

- Estados cognitivos y riesgo son **alias** que apuntan a uno de los 6 anteriores. Consume el alias semántico cuando hablas del dominio:
  - `--color-calibrated` → `var(--color-success)`
  - `--color-overconfident` → `var(--color-warning)`
  - `--color-underconfident` → `var(--color-info)`
  - `--color-risk-high` → `var(--color-danger)` · `--color-risk-medium` → `var(--color-warning)` · `--color-risk-low` → `var(--color-success)`
- **No crear colores nuevos**. Si hace falta un matiz, replantear si encaja en uno de los 6 estados antes de añadirlo.

```css
/* BIEN */
.alerta { background: var(--color-warning-bg); color: var(--color-warning); }

/* BIEN — alias del dominio */
.pill[data-profile="overconfident"] { background: var(--color-overconfident-bg); color: var(--color-overconfident); }

/* MAL */
.alerta { background: rgba(245, 158, 11, 0.12); color: #f59e0b; }
```

## 4. Gradientes: también desde los tokens

- El gradiente canónico de marca está en `tokens.css` como `--gradient-brand` (`primary` → `secondary`, 135°).
- Para cualquier gradiente, **consumir un token**. No escribir `linear-gradient(...)` directamente con literales en componentes.
- Si necesitas un gradiente compuesto (radiales para fondos, glass effects, etc.), construirlo combinando tokens existentes — nunca introducir hex literales:

```css
/* BIEN */
.hero { background: var(--gradient-brand); }
.panel {
  background:
    radial-gradient(circle at 20% 0%, var(--color-secondary-glow), transparent 50%),
    radial-gradient(circle at 80% 100%, var(--color-primary-glow), transparent 50%),
    linear-gradient(180deg, var(--color-bg-elevated), var(--color-bg));
}

/* MAL */
.hero { background: linear-gradient(135deg, #00d8ff, #8b7dff); }
```

## 5. Tipografía ya establecida

- **UI / prosa / cualquier texto** → `var(--font-sans)` (Inter). No cargar otras fuentes sans-serif.
- **Datos numéricos / métricas / código** → `var(--font-mono)` (JetBrains Mono). Aplicar siempre que se muestre un número que el usuario va a leer/comparar (ICC, BKT, gap, %, IDs).
- Escala: `--fs-xs` (12) · `--fs-sm` (14) · `--fs-base` (16) · `--fs-md` (18) · `--fs-lg` (22) · `--fs-xl` (28) · `--fs-2xl` (40) · `--fs-display` (64). No inventar tamaños fuera de esta escala.
- Pesos: `--fw-regular` 400 · `--fw-medium` 500 · `--fw-semibold` 600 · `--fw-bold` 700. Saltarse pesos intermedios.
- Line-height: `--lh-tight` para títulos display, `--lh-snug` para subtítulos, `--lh-base` para prosa.
- Tracking: `--tracking-tight` para titulares, `--tracking-caps` para uppercase pequeño (eyebrows, labels), `--tracking-wide` para botones.

## 6. Arquitectura MVT — Modelo · Vista · Template

Recordar siempre la separación:

- **Model** (`apps/<app>/models.py`): entidades + reglas universales en `save()` cuando aplican siempre (auto-aprobación de preguntas manuales, normalización de datos). Nunca lógica de UI ni HTTP aquí.
- **View** (`apps/<app>/views.py`): controladores. Validan entrada, orquestan servicios, devuelven respuesta. **Usar `APIView`, no `ViewSet`**. Endpoints explícitos.
- **Template** (`templates/`): HTML semántico con DTL (`{% load static %}`, `{% url %}`, `{% block %}`).
- **Servicios** (`services/`): lógica transversal sin ORM (BKT, ICC, Claude). Reciben primitivos, devuelven primitivos.

### Reglas de backend que no se rompen

- **Permisos** en `apps/users/permissions.py`. Aplicar a nivel `APIView` con `permission_classes = [IsTeacher]`. **No** validar permisos en serializers.
- **Serializers separados por intención**: lectura, escritura, acción (ej. `RoomSerializer`, `RoomCreateSerializer`, `JoinRoomSerializer`).
- **FK entre apps**: usar string reference (`'evaluation_sessions.EvaluationSession'`) para no crear imports circulares.
- **Migraciones del app `sessions`**: requieren label explícito → `python manage.py makemigrations evaluation_sessions`.
- **Claude solo se llama si `icc < 0.6`**. Mantener este gate. Si la API key falta, devolver defaults vacíos — el flujo del estudiante **nunca** se rompe por un fallo de IA.
- **JWT**: no tocar `ACCESS_TOKEN_LIFETIME` (8 h) ni `REFRESH_TOKEN_LIFETIME` (7 d) sin justificación.
- **CORS**: whitelist explícita en `CORS_ALLOWED_ORIGINS`. Nunca `CORS_ALLOW_ALL_ORIGINS = True`.
- **No SQL crudo** salvo medición justificada. ORM en todas las queries.

## 7. Buenas prácticas de diseño (frontend)

- **HTML semántico** siempre: `<header>`, `<main>`, `<section>`, `<article>`, `<nav>`, `<footer>`, `<aside>`, `<figure>`, `<fieldset>`, `<legend>`. Nada de `<div>` cuando hay una etiqueta con significado.
- **Accesibilidad obligatoria**:
  - `lang="es"` en `<html>`.
  - `<title>` y `<meta name="description">` en cada template.
  - `aria-label` / `aria-current` / `aria-invalid` / `aria-live` / `aria-hidden` donde corresponda.
  - Labels visibles asociadas a inputs (`<label for="...">`).
  - Foco visible — no eliminar el outline; sólo personalizarlo (ya hecho en `:focus-visible`).
- **BEM ligero** en clases propias: `.bloque__elemento--modificador`. No en clases de Bootstrap.
- **No estilos inline** salvo CSS variables dinámicas (`style="--value: 0.78"`). Si necesitas estilo, abrirlo como clase.
- **Sin `!important`**. Si lo necesitas, hay un problema de orden de carga o especificidad.
- **Bootstrap se usa donde aporta** (grid, utilities, forms, btn, modal, alert, dropdown). **Custom se usa donde manda la marca** (hero, glass cards, plexus, dual-bar, calibration-ring, métricas con gradiente). El mapeo está en el README — respetarlo.
- **JS en módulos ES**. Sin globals. Sin jQuery. Bootstrap 5 ya no la necesita.
- **Toast**: usar `.cogni-toast` (clase propia), nunca `.toast` directo (chocaría con Bootstrap, que la mantiene oculta hasta `.show`).

## 8. Convenciones de código

- **Sin comentarios redundantes**. Solo comentar el *por qué* no obvio (constraints, workarounds, decisiones contraintuitivas). Nada de `// suma 1 a x` cuando el código dice `x += 1`.
- **Nombres claros sobre comentarios**: prefiere renombrar antes que explicar.
- **Sin TODO/FIXME** sin un issue/PR asociado.
- Convertir fechas relativas a absolutas cuando se persisten (`"el jueves"` → `"2026-05-07"`).

## 9. Checklist mental antes de dar una vista por terminada

1. ¿Se ve bien a 375 px? ¿Y a 768 px? ¿Y a 1280 px?
2. ¿Hay algún color o gradiente que **no** salga de un token?
3. ¿Hay algún emoji? ¿Algún icono que no sea SVG inline?
4. ¿Los iconos sin texto tienen `aria-label` o `<title>`?
5. ¿Los inputs tienen `<label>` asociado?
6. ¿Las clases custom siguen BEM o están duplicando una utility de Bootstrap?
7. ¿Hay estilos inline que deberían ser una clase?
8. ¿Las métricas numéricas usan `font-mono`?
