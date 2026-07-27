# CogniRoom — Contexto del proyecto

> **Reglas operativas obligatorias en [.claude/rules/CLAUDE.md](.claude/rules/CLAUDE.md)** — diseño mobile-first, sin emojis (solo SVG inline), colores y gradientes desde `tokens.css`, tipografía Inter + JetBrains Mono, MVT y buenas prácticas backend. Léelas antes de escribir código.

Sistema de evaluación cognitiva adaptativa para detectar **sobreconfianza académica** en estudiantes universitarios. Mide la brecha entre lo que el estudiante **cree saber** (confianza declarada) y lo que **realmente sabe** (BKT), usando IA para diagnóstico y predicción de riesgo.

## Stack

- **Python 3.11** · **Django 5.1** · **Django REST Framework 3.15**
- **PostgreSQL 14+** vía `psycopg[binary]`
- **JWT** vía `djangorestframework-simplejwt`
- **Claude Sonnet 4.6** (`claude-sonnet-4-6`) vía SDK oficial `anthropic`
- **pdfplumber** para extracción de texto de PDFs
- **python-decouple** para variables de entorno
- **django-cors-headers** para CORS
- **Front**: HTML semántico + Bootstrap 5.3 (vía CDN) + design tokens propios + JS módulos ES (vanilla, sin framework)

Sin Docker, sin Redis, sin Celery — todo síncrono, una sola instancia.

## Arquitectura

**Monolito modular Django con MVT + REST API**. Seis apps independientes + capa de servicios transversales. NO microservicios — la justificación está en [docs/architecture.md](docs/architecture.md).

```
config/           → settings, urls raíz, /api/v1/ root view, context_processors
apps/
  users/          → User (AbstractUser + role), Institution, JWT auth   → /api/v1/auth/
  rooms/          → Room (group/individual), RoomMembership, Section,
                    JoinRequest                                          → /api/v1/rooms/
  questions/      → KnowledgeNode, Question, PDFDocument,
                    AIGenerationLog (cupo mensual de generación)         → montado bajo rooms
  sessions/       → EvaluationSession, Answer (label='evaluation_sessions') → /api/v1/sessions/
  cognitive/      → BKTState, CognitiveIndex, BlindSpotIndex, AIDiagnosis,
                    StudentProgressSnapshot   → /api/v1/ (profile/nodes/diagnoses)
                                                 + /api/v1/rooms/{id}/metrics/
  notifications/  → Notification (in-app + email)                        → /api/v1/notifications/
services/         → lógica de cálculo sin ORM (primitivos → primitivos)
  bkt_engine.py        → Fórmula Corbett & Anderson 1994
  icc_calculator.py
  cognitive_quadrant.py → clasificación en 4 cuadrantes dominio×confianza
  claude_service.py    → CognitiveAnalysisService (Claude SDK)
templates/
  landing.html
  app/partials/   → _styles, _app-sidebar, _app-topbar, _bootstrap-bundle, …
  app/public/     → login, register, forgot-password, reset-password
  app/shared/     → dashboard, diagnoses
  app/teacher/    → rooms, students, questions, pdfs, metrics, requests, profile
  app/student/    → my-rooms, nodes, node-detail, history, session, session-review, profile
  email/          → notification.html (HTML de correo; inline styles por exigencia
                    de los clientes de correo — única excepción a la regla de estilos)
static/
  css/app/        → tokens.css, base.css, components/, y una carpeta por rol
  js/app/         → api.js, toast.js, nav-auth.js, custom-select.js + carpeta por rol
docs/             → database.md, architecture.md, modelo-cognitivo.md,
                    modelo-entidad-relacion.md, planificacion-scrum.md, …
```

**La ubicación de un archivo declara su audiencia** (`public/`, `teacher/`, `student/`, `shared/`). Ver [.claude/rules/components.md](.claude/rules/components.md).

## URL map (versión final)

**Dos espacios separados**: `/` para HTML (TemplateView), `/api/v1/` para JSON (DRF).

### HTML (renderizado por Django)

Todas son `TemplateView`: el HTML es estático y los datos los trae el JS con el JWT.
El nav se filtra por rol en `nav-auth.js` (`data-show-for`).

| Ruta | Vista | Audiencia |
|---|---|---|
| `/` | landing (incluye el showcase del design system) | público |
| `/app/` | login | público |
| `/app/register/` | alta de cuenta (estudiante o docente con código) | público |
| `/app/forgot-password/` · `/app/reset-password/` | recuperación de contraseña | público |
| `/app/dashboard/` | panel (detecta rol vía JWT) | teacher / student |
| `/app/diagnoses/` | historial de diagnósticos IA | student |
| `/app/rooms/` | mis salas + secciones | teacher |
| `/app/students/` | cohorte y detalle por estudiante | teacher |
| `/app/questions/` | banco de preguntas + generación IA | teacher |
| `/app/pdfs/` | material de referencia | teacher |
| `/app/metrics/` | cuadrantes, puntos ciegos, heatmap | teacher |
| `/app/requests/` | solicitudes de ingreso | teacher |
| `/app/teacher-profile/` | perfil del docente | teacher |
| `/app/my-rooms/` | salas del estudiante + descubrir | student |
| `/app/nodes/` · `/app/node/<id>/` | temas y detalle de un tema | student |
| `/app/history/` | historial de sesiones | student |
| `/app/session/<id>/` | sesión de evaluación (BKT/ICC/Claude) | student inscripto |
| `/app/session/<id>/review/` | repaso de la sesión con feedback | student dueño |
| `/app/profile/` | perfil del estudiante | student |
| `/app/room/<id>/` | redirige a `/app/metrics/` (compatibilidad) | teacher |

### API REST `/api/v1/`

**Cinco familias de recursos.** Plural, sin verbos (excepción `/auth/` y acciones especiales).
El catálogo vivo está en `GET /api/v1/` ([config/urls.py](config/urls.py)) y se mantiene
sincronizado con las rutas reales.

```
/api/v1/auth/             ← identidad
  POST   /register  /login  /logout  /refresh
  GET    /me                            ← PATCH para editar perfil
  POST   /change-password
  POST   /password-reset  /password-reset/confirm
  GET    /institutions                  ← catálogo público (sin códigos)
  POST   /teacher-code/resolve          ← valida el código de docente

/api/v1/                  ← datos cognitivos del usuario actual (scope por JWT)
  GET    /profile         ← ICC promedio, BKT states, perfil predominante, agregados, último diagnóstico
  GET    /nodes           ← BKT por tema + ICC + tendencia
  GET    /nodes/{id}      ← detalle (BKT params, ICC, diagnóstico, respuestas recientes)
  GET    /diagnoses       ← historial de AIDiagnosis ordenado por -generated_at

/api/v1/notifications/    ← campana del topbar
  GET    /                              ← lista + no leídas
  POST   /mark-read

/api/v1/rooms/            ← aulas y todo lo room-scoped
  GET/POST   /                          ← listar / crear
  GET/PATCH/DELETE /{id}
  POST   /join                          ← por código
  GET    /discover                      ← salas visibles para el estudiante
  POST   /{id}/request-join             ← solicitud de ingreso
  GET    /join-requests  ·  POST /join-requests/{id}/approve | /reject
  GET    /{id}/members  ·  DELETE /{id}/members/{student_id}
  PATCH  /{id}/members/{student_id}/section
  POST   /{id}/enroll
  GET/POST /{id}/sections  ·  PATCH/DELETE /{id}/sections/{section_id}

  GET/POST /{id}/nodes  ·  PATCH/DELETE /{id}/nodes/{node_id}

  GET    /{id}/questions  ·  GET/PATCH/DELETE /{id}/questions/{question_id}
  POST   /{id}/questions/manual
  POST   /{id}/questions/generate       ← acción Claude (202, corre en hilo)
  POST   /{id}/questions/approve | /reject   ← acciones batch

  GET/POST /{id}/pdfs  ·  GET/DELETE /{id}/pdfs/{pdf_id}    ← multipart, field "file"

  GET    /metrics/summary               ← todas las salas del docente
  GET    /{id}/metrics/overview | /blind-spots | /at-risk | /heatmap
  GET    /{id}/students/{student_id}    ← detalle de un estudiante
        (las seis anteriores: solo el docente dueño, 403 en otro caso)

/api/v1/sessions/         ← ciclo de vida + historial de evaluación
  GET    /                              ← historial de sesiones del usuario
  POST   /                              ← crear, body {room_id}
  GET    /{id}/next-question            ← selección adaptativa por p_mastery
  POST   /{id}/answers                  ← submit answer (flujo BKT→ICC→IA)
  GET    /{id}/review                   ← sesión + respuestas con detalle (solo dueño)
  POST   /{id}/complete                 ← cerrar sesión
```

Mountpoints en [config/urls.py](config/urls.py):
- `apps.users.urls` → `/api/v1/auth/`
- `apps.rooms.urls` → `/api/v1/rooms/` (incluye internamente `apps.questions.urls` y `apps.cognitive.urls.room_urlpatterns`)
- `apps.sessions.urls` → `/api/v1/sessions/`
- `apps.notifications.urls` → `/api/v1/notifications/`
- `apps.cognitive.urls` → `/api/v1/` (rutas `profile/`, `nodes/`, `diagnoses/` a la raíz; sin prefijo `/me/`)

> El app `apps.cognitive` expone **dos** grupos de rutas desde un único `urls.py`: `urlpatterns` (datos cognitivos del usuario actual, montados a la raíz `/api/v1/` → `profile/`, `nodes/`, `diagnoses/`) y `room_urlpatterns` (métricas grupales, montados como sub-rutas de `/rooms/<id>/` desde `apps.rooms.urls`).

## Detalles críticos a recordar

### El app `apps.sessions` usa label custom
Para evitar choque con `django.contrib.sessions`, su `AppConfig` define `label = 'evaluation_sessions'`. Esto significa:
- Migraciones: `python manage.py makemigrations evaluation_sessions`
- FK string references desde otras apps: `'evaluation_sessions.EvaluationSession'`
- Tablas en BD: prefijo `evaluation_sessions_*`

### Reglas de aprobación de preguntas (en `Question.save()`)
El campo es `status` (`pending` / `approved` / `rejected`); `is_approved` es una
propiedad de solo lectura.

| `source` | Modo sala | `status` inicial |
|---|---|---|
| `manual` | cualquiera | `approved` (auto) |
| `ai` | `individual` | `approved` (auto) |
| `ai` | `group` | `pending` (requiere revisión del docente) |

### Flujo del endpoint `POST /api/v1/sessions/{id}/answers/`
`SubmitAnswerView` en [apps/sessions/views.py:228](apps/sessions/views.py). Orden estricto,
dentro de una transacción y con guarda anti-replay (una respuesta por pregunta y sesión):
1. Valida sesión, pertenencia y que la sesión siga abierta.
2. Calcula `is_correct` (soporta opción única, V/F y opción múltiple).
3. `BKTEngine.update()` → nuevo mastery.
4. `BKTState` actualizado, `attempts++`.
5. `ICCCalculator.calculate()` → icc, gap, profile.
6. Crea `CognitiveIndex` (snapshot histórico).
7. Crea `Answer`.
8. **Si falló Y `icc < AI_ICC_THRESHOLD`:** agenda el análisis de IA en un hilo
   (`schedule_ai_analysis`) — no bloquea la respuesta. Ese hilo escribe
   `Answer.ai_feedback` y crea el `AIDiagnosis`.
9. **Si la sala es `group`:** recalcula `BlindSpotIndex` (promedio de ICC en ese tema).
10. Retorna JSON: `is_correct, icc_value, gap, profile, bkt_mastery, ai_pending, …`.
    El feedback de IA se lee después, en el repaso de la sesión.

### La IA se llama condicionalmente
Solo cuando el estudiante **falla** y además `icc < AI_ICC_THRESHOLD` (default 0.6). Un
acierto descalibrado se resuelve con una nota determinista en el frontend, sin IA.

Si `ANTHROPIC_API_KEY` no está configurada, los métodos del servicio devuelven defaults
vacíos — **el flujo del estudiante nunca se rompe por fallos de IA** — y en ese caso
**no se persiste un `AIDiagnosis` en blanco**. En tests la key se fuerza a vacío
(ver [config/settings.py](config/settings.py)): las pruebas nunca llaman a la API real.

### El diagnóstico tiene dos audiencias
La misma llamada a `analyze_student()` devuelve cuatro textos: `reasoning` /
`recommendation` para el **docente** (tercera persona) y `student_reasoning` /
`student_recommendation` para el **estudiante** (segunda persona, imperativo dirigido a
él). Las pantallas del estudiante consumen solo los `student_*`; la vista de cohorte del
docente, solo los otros. No mezclar: un texto de docente en la pantalla del estudiante se
lee como "pide al estudiante que…" dirigido a sí mismo.

### Selección adaptativa de preguntas
`NextQuestionView` en [apps/sessions/views.py:151](apps/sessions/views.py):
1. Filtra preguntas aprobadas de la sala.
2. Respeta el cupo por tema de la sesión (`node_quotas`, fijado al crearla).
3. Excluye las ya respondidas en esa sesión.
4. Ordena temas por `p_mastery` ascendente (ataca el más débil primero).
5. Elige pregunta aleatoria del tema ganador.

### Métricas (definiciones canónicas)
- **BKT**: Bayes manual, fórmula Corbett & Anderson 1994. `p_mastery` clamped [0,1], redondeado a 4 decimales.
- **ICC** (`icc_value`) = `1 − |metacognitive_gap|`.
- **Metacognitive gap** = `avg_confidence − bkt_mastery`.
- **Perfil**: `metacognitive_gap > 0.2` → overconfident · `< −0.2` → underconfident · resto → calibrated.
- **IPC** (`ipc_value`) = promedio de ICC de todos los estudiantes en un nodo. Si `< 0.5` → punto ciego colectivo.
- **Cuadrantes** ([services/cognitive_quadrant.py](services/cognitive_quadrant.py)): cruce dominio×confianza. El crítico es "no sabe y está confiado".

### Cliente JS (cache-busting de módulos)
Todos los módulos ES bajo `static/js/app/` propagan el cache-buster del template (`?v={% now "U" %}`) a sus imports vía:
```js
const _v = new URL(import.meta.url).searchParams.get('v') || '';
const { auth, tokens } = await import(`./api.js?v=${_v}`);
```
Sin esto el browser cachea `api.js` aunque el wrapper (`auth.js`) tenga query string fresca.

## Comandos comunes

```powershell
# Setup inicial
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env

# Crear BD en Postgres
psql -U postgres -c "CREATE DATABASE cogniroom;"

# Migraciones (apps custom requieren labels explícitos)
python manage.py makemigrations users rooms questions evaluation_sessions cognitive notifications
python manage.py migrate

# Seed demo (1 teacher + 3 students + sala "Algoritmos I" + 5 preguntas aprobadas)
python manage.py seed_demo

# Pruebas (42 casos; nunca llaman a la API de Anthropic)
python manage.py test apps

# Servidor
python manage.py runserver

# Acceso
# - http://127.0.0.1:8000/             → landing
# - http://127.0.0.1:8000/api/v1/      → catálogo de endpoints
# - http://127.0.0.1:8000/admin/       → admin Django
```

## Credenciales seed

| Rol | Email | Password |
|---|---|---|
| teacher | teacher@cogniroom.com | password123 |
| student | student1@cogniroom.com | password123 |
| student | student2@cogniroom.com | password123 |
| student | student3@cogniroom.com | password123 |

Sala demo: **Algoritmos I** (group), nodos: `Recursividad`, `Complejidad algorítmica`, `Ordenamiento`. 5 preguntas aprobadas en `Recursividad`.

## Convenciones de código

- **Sin comentarios redundantes**. Solo comentar el *por qué* no obvio (constraints, workarounds, decisiones contraintuitivas).
- **Modelos**: lógica de negocio en `save()` cuando aplica una regla universal (ej. auto-aprobación de preguntas manuales).
- **Vistas**: usar `APIView` clases, no `ViewSet`s. Endpoints explícitos.
- **Permisos**: clases en [apps/users/permissions.py](apps/users/permissions.py) (`IsTeacher`, `IsStudent`, `IsRoomOwner`, `IsRoomMember`). Las métricas de sala en `apps/cognitive/views.py` validan la propiedad dentro del `get()` (403) en vez de usar `IsRoomOwner`, porque resuelven la sala por `room_id` de la URL.
- **Serializers**: separar lectura, creación, y acciones (ej. `RoomSerializer`, `RoomCreateSerializer`, `JoinRoomSerializer`).
- **Servicios externos**: en `services/`, sin dependencia de Django ORM. Reciben primitivos, devuelven primitivos.
- **URLs**: REST plural (`/rooms/`, `/answers/`), sin verbos salvo acciones explícitas (`/questions/approve/`, `/sessions/{id}/complete/`) y `/auth/`.

## Ramas git

- `main` — rama oficial, código estable.
- `test` — desarrollo activo.

Remoto: https://github.com/Eneritzch/Cogniroom

## Documentación adicional

- [docs/database.md](docs/database.md) — esquema completo de BD con diagrama Mermaid.
- [docs/architecture.md](docs/architecture.md) — decisión arquitectónica + stack.
- [docs/modelo-cognitivo.md](docs/modelo-cognitivo.md) — BKT, ICC, cuadrantes y perfiles.
- [docs/modelo-entidad-relacion.md](docs/modelo-entidad-relacion.md) — MER narrado.
- [.claude/rules/CLAUDE.md](.claude/rules/CLAUDE.md) · [.claude/rules/components.md](.claude/rules/components.md) — reglas de diseño y componentes.
