# CogniRoom

> Sistema de evaluación cognitiva adaptativa para detectar **sobreconfianza académica** en estudiantes universitarios.

CogniRoom mide la brecha entre lo que el estudiante **cree saber** (confianza declarada) y lo que **realmente sabe** (dominio inferido por Bayesian Knowledge Tracing), y usa IA (Claude Sonnet 4.5) para diagnóstico cualitativo y predicción de riesgo.

---

## Índice

- [Visión general](#visión-general)
- [Arquitectura — Modelo · Vista · Template (MVT)](#arquitectura--modelo--vista--template-mvt)
- [Stack](#stack)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Puesta en marcha](#puesta-en-marcha)
- [Variables de entorno](#variables-de-entorno)
- [Design system y front-end](#design-system-y-front-end)
- [Endpoints — vistas HTML y API REST](#endpoints--vistas-html-y-api-rest)
- [Seguridad y buenas prácticas](#seguridad-y-buenas-prácticas)
- [Documentación adicional](#documentación-adicional)

---

## Visión general

CogniRoom es una plataforma web donde docentes crean **salas** (clases), suben **PDFs** de material, generan **preguntas** (manuales o asistidas por IA) y los estudiantes responden en **sesiones de evaluación adaptativa**. Cada respuesta:

1. Actualiza el dominio del estudiante (BKT — Corbett & Anderson 1994).
2. Mide la **calibración cognitiva** (ICC = `1 − |confianza − dominio|`).
3. Detecta perfiles **sobreconfiados / calibrados / subconfiados**.
4. Si la calibración está desalineada (`ICC < 0.6`), invoca a Claude para explicar el error y sugerir intervención.
5. Calcula **puntos ciegos colectivos** (IPC promedio por nodo en salas grupales).

---

## Arquitectura — Modelo · Vista · Template (MVT)

CogniRoom es un **monolito modular Django** que combina dos roles del mismo backend:

- **Sirve la UI** mediante el patrón clásico **MVT** de Django (templates HTML).
- **Expone una API REST JSON** mediante Django REST Framework para el cliente JavaScript que consume datos.

El detalle y la justificación de la arquitectura están en [docs/architecture.md](docs/architecture.md).

```
┌─────────────────────────────────────────────────────────────────┐
│  Navegador                                                      │
│  ┌──────────────────────┐      ┌──────────────────────────┐     │
│  │  Templates (HTML)    │◀────▶│  JS modules (fetch API)  │     │
│  │  CSS puro + tokens   │      │  api.js · auth.js · ...  │     │
│  └──────────┬───────────┘      └────────────┬─────────────┘     │
└─────────────┼──────────────────────────────-┼───────────────────┘
              │ render (TemplateView)         │ JSON + JWT
┌─────────────▼───────────────────────────────▼───────────────────┐
│                      Django + DRF                               │
│                                                                 │
│   TEMPLATE  ◀── View ──▶  MODEL                                 │
│  templates/  apps/*/views.py  apps/*/models.py                  │
│                                                                 │
│   apps:   users · rooms · questions · sessions · cognitive      │
│                                                                 │
│   services/  (lógica de dominio, sin ORM)                       │
│     bkt_engine.py  · icc_calculator.py  · claude_service.py     │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                       ┌──────▼──────┐
                       │ PostgreSQL  │
                       └─────────────┘
```

**Cómo se materializa MVT en este repo:**

| Capa | Responsabilidad | Ubicación |
|---|---|---|
| **Model** | Entidades, reglas de negocio universales (ej. auto-aprobación en `Question.save()`) | `apps/<app>/models.py` |
| **View** | Controladores: validan entrada, orquestan servicios, devuelven respuesta. `APIView` para JSON, `TemplateView` para HTML | `apps/<app>/views.py`, `config/urls.py` |
| **Template** | HTML semántico con Django Template Language (`{% load static %}`, `{% url %}`, `{% block %}`) | `templates/` |
| **Servicios** | Lógica transversal sin dependencia del ORM. Reciben primitivos, devuelven primitivos | `services/` |
| **Static** | CSS puro con design tokens + JS modules | `static/app/css`, `static/app/js` |

> **Importante:** las vistas HTML (`/`, `/app/`, `/app/dashboard/`) hacen render Django; el JS consume después la API REST en `/api/...` con el access token JWT guardado en `localStorage`. No hay duplicación: el HTML es el chasis, la API es el cerebro.

---

## Stack

- **Python 3.11** · **Django 5.1** · **Django REST Framework 3.15**
- **PostgreSQL 14+** vía `psycopg[binary]`
- **JWT** vía `djangorestframework-simplejwt`
- **Claude Sonnet 4.5** vía SDK oficial `anthropic`
- **pdfplumber** para extracción de texto
- **python-decouple** para variables de entorno
- **django-cors-headers** para CORS controlado
- **Front-end**: HTML5 semántico + **Bootstrap 5.3** (vía CDN) + design tokens propios + JS vanilla en módulos ES

Sin Docker, sin Redis, sin Celery — todo síncrono, una sola instancia.

---

## Estructura del proyecto

```
Cogniroom/
├── config/                     # Configuración Django
│   ├── settings.py             # JWT, CORS, DRF, BD
│   ├── urls.py                 # Rutas raíz: HTML + /api/
│   └── wsgi.py / asgi.py
│
├── apps/                       # Apps de dominio (monolito modular)
│   ├── users/                  # User custom + JWT auth + permisos
│   ├── rooms/                  # Salas (group/individual) + membresías
│   ├── questions/              # Nodos · Preguntas · PDFs
│   ├── sessions/               # ⚠️ label='evaluation_sessions'
│   └── cognitive/              # BKTState · ICC · IPC · AIDiagnosis
│
├── services/                   # Lógica de dominio sin ORM
│   ├── bkt_engine.py           # Bayes manual (Corbett & Anderson 1994)
│   ├── icc_calculator.py       # Índice de calibración cognitiva
│   └── claude_service.py       # Wrapper SDK Anthropic
│
├── templates/                  # MVT — capa "T"
│   └── app/
│       ├── landing.html        # Página pública (/)
│       ├── index.html          # App / login (/app/)
│       ├── dashboard.html      # Panel autenticado (/app/dashboard/)
│       └── design-system.html  # Showcase del DS (/app/design-system/)
│
├── static/app/                 # Assets estáticos (collectstatic-friendly)
│   ├── css/
│   │   ├── tokens.css          # Design tokens: color, tipografía, espaciado
│   │   ├── styles.css          # Componentes base
│   │   ├── landing.css         # Estilos específicos de landing
│   │   └── design-system.css   # Showcase
│   └── js/
│       ├── api.js              # Cliente fetch + JWT + refresh
│       ├── auth.js             # Login/registro/logout
│       ├── dashboard.js        # Lógica del panel
│       ├── toast.js            # Notificaciones
│       └── design-system.js
│
├── docs/
│   ├── architecture.md         # Decisión: monolito modular
│   └── database.md             # Esquema BD + diagrama Mermaid
│
├── manage.py
├── requirements.txt
├── .env.example
└── CLAUDE.md                   # Reglas para asistentes IA
```

---

## Puesta en marcha

```powershell
# 1. Clonar y entrar
git clone https://github.com/Eneritzch/Cogniroom.git
cd Cogniroom

# 2. Entorno virtual
python -m venv venv
venv\Scripts\activate

# 3. Dependencias
pip install -r requirements.txt

# 4. Variables de entorno
copy .env.example .env
# editar .env y poner ANTHROPIC_API_KEY si quieres IA

# 5. Crear base de datos
psql -U postgres -c "CREATE DATABASE cogniroom;"

# 6. Migraciones (apps custom requieren labels explícitos)
python manage.py makemigrations users rooms questions evaluation_sessions cognitive
python manage.py migrate

# 7. Datos demo
python manage.py seed_demo

# 8. Servidor
python manage.py runserver
```

**URLs después de arrancar:**

| URL | Qué es |
|---|---|
| `http://127.0.0.1:8000/` | Landing pública |
| `http://127.0.0.1:8000/app/` | Login + entrada a la app |
| `http://127.0.0.1:8000/app/dashboard/` | Panel autenticado |
| `http://127.0.0.1:8000/app/design-system/` | Showcase del design system |
| `http://127.0.0.1:8000/api/` | Catálogo de endpoints JSON |
| `http://127.0.0.1:8000/admin/` | Admin Django |

**Credenciales seed:**

| Rol | Email | Password |
|---|---|---|
| teacher | teacher@cogniroom.com | password123 |
| student | student1@cogniroom.com | password123 |
| student | student2@cogniroom.com | password123 |
| student | student3@cogniroom.com | password123 |

---

## Variables de entorno

`.env` (ver `.env.example`):

```env
SECRET_KEY=...                 # obligatorio en prod, no commitear
DEBUG=True                     # False en prod
ANTHROPIC_API_KEY=...          # opcional — sin clave, IA devuelve defaults sin romper el flujo

DB_NAME=cogniroom
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
```

---

## Design system y front-end

El front-end combina **Bootstrap 5.3** como capa de utilidades / grid / componentes con un **design system propio** sostenido sobre design tokens en CSS variables. La marca CogniRoom prevalece: nuestros tokens **mapean** las variables de Bootstrap (`--bs-primary`, `--bs-body-bg`, etc.), de modo que cualquier componente nativo de Bootstrap se renderiza ya en paleta CogniRoom sin necesidad de overrides por componente.

### Orden de carga de CSS (importa)

```html
<!-- 1. Inter font -->
<link rel="stylesheet" href="https://rsms.me/inter/inter.css">

<!-- 2. Bootstrap base (defaults) -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/.../bootstrap.min.css">

<!-- 3. Tokens CogniRoom — pisan las variables de Bootstrap -->
<link rel="stylesheet" href="{% static 'app/css/tokens.css' %}">

<!-- 4. Componentes propios -->
<link rel="stylesheet" href="{% static 'app/css/styles.css' %}">
<link rel="stylesheet" href="{% static 'app/css/landing.css' %}">  {# por página #}
```

`tokens.css` debe cargarse **siempre después** de Bootstrap, sino los defaults azules genéricos ganan.

### Capas CSS

```
bootstrap.min.css   → grid, utilities, componentes nativos (btn, card, modal, navbar...)
   │
   ▼
tokens.css          → design tokens CogniRoom + bridge a variables --bs-*
   │
   ▼
styles.css          → componentes propios (auth-shell, glass-info-card, app-header)
   │
   ├── landing.css        → estilos exclusivos de la landing
   └── design-system.css  → estilos del showcase
```

### Cuándo usar Bootstrap vs CSS propio

| Caso | Usar |
|---|---|
| Layout (filas, columnas, container) | clases Bootstrap (`.container-xl`, `.row`, `.col-md-6`, `.row-cols-*`) |
| Espaciado, alineación, flex utilities | utilities Bootstrap (`.d-flex`, `.gap-3`, `.mt-4`, `.justify-content-between`) |
| Componente genérico (modal, dropdown, alert, tooltip, offcanvas) | componente Bootstrap |
| Formularios | `.form-control`, `.form-select`, `.form-label`, `.mb-3` |
| Botones primarios / secundarios / outline | `.btn .btn-primary` (ya viene con gradiente de marca) |
| Hero, glass cards, plexus canvas, aurora | CSS propio en `landing.css` |
| Pills semánticas (perfil cognitivo, riesgo) | `.pill[data-profile]` / `.pill[data-risk]` (custom — colores semánticos) |
| Métricas grandes con gradiente | `.metric-value` (custom) |
| Toasts | `.cogni-toast` (custom — namespace para no chocar con `.toast` de Bootstrap) |
| Cualquier color hard-coded | NO — siempre `var(--color-*)` o `var(--bs-*)` |

### Mapeo de migración (de qué se reemplazó)

| Antes (custom) | Ahora (Bootstrap) |
|---|---|
| `.btn .btn--primary` | `.btn .btn-primary` (gradiente brand vía override) |
| `.btn .btn--ghost` | `.btn .btn-outline-secondary` |
| `.btn .btn--danger` | `.btn .btn-danger` |
| `.btn--block` | `.w-100` |
| `.field` | `.mb-3` |
| `.field-label` | `.form-label` |
| `.field-input` | `.form-control` |
| `.form-stack` | `.mb-3` repetido o `<form>` directo |
| `.bento` | `.row .row-cols-1 .row-cols-md-2 .row-cols-xl-3 .g-4` |
| `.section-heading` (flex) | `.d-flex .justify-content-between .align-items-baseline` |
| `.section-heading h2` | `.section-title` (clase propia, semántica) |
| `.demo-chips` + `.chip` | `.btn .btn-sm .btn-outline-secondary .rounded-pill` |
| Reset propio (`*, body, button...`) | Reboot de Bootstrap |
| `.visually-hidden` (custom) | `.visually-hidden` (idéntica en Bootstrap, ya integrada) |

### Lo que NO se migró (decisión consciente)

- **Landing (`landing.html`)**: el body completo se queda custom. La landing es la **identidad visual de marca** — plexus canvas, aurora, glass-info-card, pillar dots. Forzar clases de Bootstrap encima diluiría la marca. Bootstrap está cargado por si se añaden secciones nuevas.
- **`.app-header`** (navbar del dashboard): efecto glass con `backdrop-filter` específico de marca. No usamos `.navbar` de Bootstrap aquí.
- **`.card`** y derivados (`.card-eyebrow`, `.card-meta`, `.card-title`): tienen tipografía propia y JS las inyecta. Coexisten con la `.card` de Bootstrap (las nuestras pisan por orden de carga).
- **`.pill[data-profile]` / `.pill[data-risk]`**: el color depende del estado cognitivo (calibrated, overconfident, underconfident, high/medium/low). Bootstrap no modela este eje.
- **`.metric-value`, `.dual-bar`, `.calibration-ring`, `.skeleton`**: visualizaciones de feature, no genéricas.
- **`.cogni-toast`**: renombrado desde `.toast` para no chocar con la clase de Bootstrap (que está oculta por defecto hasta `.show`).

### Buenas prácticas aplicadas

- **HTML semántico**: `<header>`, `<main>`, `<section>`, `<article>`, `<nav>`, `<footer>`. Las clases de Bootstrap se aplican sobre etiquetas semánticas, no convierten todo en `<div>`.
- **Atributos de accesibilidad**: `aria-label`, `aria-hidden`, `lang="es"`, `alt` en imágenes, `<title>` y `<meta name="description">` en cada template.
- **Mobile-first con un solo breakpoint a `768px`** (`--bp-md` en `tokens.css`). Estilos base = móvil; `@media (min-width: 768px)` = desktop. Nada de breakpoints intermedios en CSS propio.
- **Solo Flexbox** en CSS propio. `display: grid` está prohibido — cuando se necesite un layout multicolumna se combina `display: flex` + `flex: <n>` o se usa el grid de Bootstrap (que internamente es flex).
- **Tokens, no magic numbers**: `var(--color-primary)`, `var(--s-4)`, `var(--r-lg)` — nunca hex hard-coded en componentes. El sistema de color es **cerrado**: 2 marca (`primary`, `secondary`) + 4 estado (`success`, `warning`, `danger`, `info`) + neutros. Estados cognitivos y riesgo son alias semánticos sobre esos 6.
- **BEM ligero** para componentes propios: `.landing-hero`, `.landing-hero__title`, `.landing-btn-primary`. Bloque, elemento, modificador.
- **JS en módulos ES**: `import { api } from './api.js'`. Sin globals, sin jQuery — Bootstrap 5 ya no la necesita.
- **Bundle JS de Bootstrap** cargado al final del `<body>` para Popper + componentes interactivos (dropdown, modal, offcanvas, tooltip).
- **`preconnect`** a `rsms.me` y `cdn.jsdelivr.net` para mitigar el waterfall de recursos externos.
- **Showcase navegable** en `/app/design-system/` para validar visualmente cada token y componente.

---

## Endpoints — vistas HTML y API REST

### Vistas HTML (Template Views)

| Ruta | Template | Acceso |
|---|---|---|
| `GET /` | `app/landing.html` | público |
| `GET /app/` | `app/index.html` | público (auth en cliente) |
| `GET /app/dashboard/` | `app/dashboard.html` | requiere JWT en cliente |
| `GET /app/design-system/` | `app/design-system.html` | público |

### API REST

Todas las rutas viven bajo `/api/` y devuelven JSON. Autenticación: **`Authorization: Bearer <access_token>`**.

#### Auth (`/api/auth/`)
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/register/` | Crea usuario (role: teacher / student) |
| POST | `/login/` | Devuelve `access` + `refresh` JWT |
| POST | `/refresh/` | Renueva el access token |
| GET | `/me/` | Datos del usuario autenticado |

#### Rooms (`/api/rooms/`)
| Método | Ruta | Permiso |
|---|---|---|
| POST | `/` | `IsTeacher` |
| GET | `/` | autenticado |
| POST | `/join/` | `IsStudent` |
| GET | `/{id}/members/` | `IsRoomMember` |

#### Questions (`/api/rooms/{room_id}/...`)
| Método | Ruta | Notas |
|---|---|---|
| POST | `/nodes/` | crear nodo de conocimiento |
| GET | `/nodes/` | listar nodos |
| POST | `/questions/manual/` | aprobada automáticamente |
| POST | `/questions/generate/` | usa `pdf_id` + Claude. En sala `group` queda pendiente de aprobación |
| POST | `/questions/approve/` | batch approve por el docente |
| GET | `/questions/` | listar preguntas aprobadas |

#### PDFs (`/api/rooms/{room_id}/pdfs/`)
| Método | Ruta | Notas |
|---|---|---|
| POST | `/` | multipart, campo `file`. Solo owner |
| GET | `/` | members |
| GET | `/{pdf_id}/` | members — incluye `extracted_text` |
| DELETE | `/{pdf_id}/` | solo owner — borra archivo físico |

#### Sessions (`/api/sessions/`)
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/` | crear sesión de evaluación |
| GET | `/{id}/next-question/` | selección adaptativa por `p_mastery` |
| POST | `/{id}/answer/` | flujo crítico: BKT → ICC → snapshot → IA condicional → IPC |
| POST | `/{id}/complete/` | cierra sesión |

#### Cognitive (`/api/cognitive/`)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/my-profile/` | snapshot del estudiante |
| GET | `/my-nodes/` | mastery por nodo |
| GET | `/rooms/{room_id}/blind-spots/` | IPC por nodo de la sala |
| GET | `/rooms/{room_id}/at-risk/` | estudiantes en riesgo |

> El catálogo vivo se sirve en `GET /api/` y refleja siempre la versión actual.

### Cómo el front-end consume la API

`static/app/js/api.js` es la **única puerta** hacia `/api/`:

- Wrapper sobre `fetch` que inyecta `Content-Type: application/json` y `Authorization: Bearer ...`.
- Maneja refresh automático en `401` con el refresh token.
- Lanza `ApiError` tipado con `status` y `body` para que la UI muestre mensajes coherentes (`toast.js`).
- Tokens persistidos en `localStorage` con keys `cogniroom.access` / `cogniroom.refresh`.

Ningún módulo UI llama a `fetch` directamente — todos importan `api.js`. Así el cambio de cliente HTTP, el manejo de errores y el refresh viven en un solo lugar.

---

## Seguridad y buenas prácticas

### Autenticación y autorización
- **JWT** con access (8h) + refresh (7d) — configurable en `settings.SIMPLE_JWT`.
- **`AUTH_USER_MODEL = 'users.User'`** desde el día uno (no se cambia user model a posteriori sin dolor).
- **Permisos custom** en `apps/users/permissions.py`: `IsTeacher`, `IsStudent`, `IsRoomOwner`, `IsRoomMember`. Aplicados a nivel `APIView`, no en serializers.
- **`DEFAULT_PERMISSION_CLASSES = [IsAuthenticated]`** — endpoints son privados por defecto, abrimos explícitamente lo público.

### Configuración
- Secretos vía **`python-decouple`** (`.env` fuera de git).
- `DEBUG=False` y `ALLOWED_HOSTS` cerrado en producción (cambiar `['*']` en `settings.py`).
- `CORS_ALLOWED_ORIGINS` con whitelist explícita (no `CORS_ALLOW_ALL_ORIGINS=True`).
- Validadores de password: `MinimumLengthValidator` + `UserAttributeSimilarityValidator`.

### Capa de datos
- ORM en todas las consultas — sin SQL crudo → no hay vector de SQL injection.
- FK por **string reference** entre apps (`'evaluation_sessions.EvaluationSession'`) para evitar imports circulares.
- Reglas universales en `Model.save()` (auto-aprobación de preguntas), no duplicadas en cada vista.

### IA
- Claude se llama **solo cuando `icc < 0.6`** → costo controlado.
- Si `ANTHROPIC_API_KEY` falta, el servicio devuelve defaults vacíos. **El flujo del estudiante nunca se rompe por fallos de IA.**

### Front-end
- Tokens en `localStorage` (no en cookies sin `HttpOnly`) → el riesgo XSS se mitiga con CSP y sanitización del HTML inyectado por JS (no usar `innerHTML` con datos del usuario).
- Ningún secreto del lado servidor sale al cliente.
- `<meta name="viewport">` y `lang="es"` en todos los templates.

### Convenciones de código
- **Sin comentarios redundantes**. Solo el *por qué* no obvio.
- Lógica de negocio en `Model.save()` cuando es regla universal.
- Vistas como `APIView` (no `ViewSet`) — endpoints explícitos, fáciles de leer.
- Serializers separados por intención: `RoomSerializer` (lectura), `RoomCreateSerializer` (escritura), `JoinRoomSerializer` (acción).
- Servicios en `services/` reciben primitivos y devuelven primitivos — desacoplados del ORM y testables sin Django.

---

## Documentación adicional

- [docs/architecture.md](docs/architecture.md) — decisión arquitectónica y comparación con microservicios.
- [docs/database.md](docs/database.md) — esquema completo con diagrama Mermaid.
- [CLAUDE.md](CLAUDE.md) — guía de contexto para asistentes IA que trabajen sobre el repo.

---

## Ramas git

- `main` — rama oficial, código estable.
- `test` — desarrollo activo.

Remoto: <https://github.com/Eneritzch/Cogniroom>
