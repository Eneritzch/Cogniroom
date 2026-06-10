# CogniRoom — Contexto del proyecto

> **Reglas operativas obligatorias en [.claude/CLAUDE.md](.claude/CLAUDE.md)** — diseño mobile-first, sin emojis (solo SVG inline), colores y gradientes desde `tokens.css`, tipografía Inter + JetBrains Mono, MVT y buenas prácticas backend. Léelas antes de escribir código.

Sistema de evaluación cognitiva adaptativa para detectar **sobreconfianza académica** en estudiantes universitarios. Mide la brecha entre lo que el estudiante **cree saber** (confianza declarada) y lo que **realmente sabe** (BKT), usando IA para diagnóstico y predicción de riesgo.

## Stack

- **Python 3.11** · **Django 5.1** · **Django REST Framework 3.15**
- **PostgreSQL 14+** vía `psycopg[binary]`
- **JWT** vía `djangorestframework-simplejwt`
- **Claude Sonnet 4.5** vía SDK oficial `anthropic`
- **pdfplumber** para extracción de texto de PDFs
- **python-decouple** para variables de entorno
- **django-cors-headers** para CORS
- **Front**: HTML semántico + Bootstrap 5.3 (vía CDN) + design tokens propios + JS módulos ES (vanilla, sin framework)

Sin Docker, sin Redis, sin Celery — todo síncrono, una sola instancia.

## Arquitectura

**Monolito modular Django con MVT + REST API**. Cinco apps independientes + capa de servicios transversales. NO microservicios — la justificación está en [docs/architecture.md](docs/architecture.md).

```
config/           → settings, urls raíz, /api/v1/ root view
apps/
  users/          → User (AbstractUser + role), JWT auth          → /api/v1/auth/
  rooms/          → Room (group/individual), RoomMembership       → /api/v1/rooms/
  questions/      → KnowledgeNode, Question, PDFDocument          → montado bajo rooms
  sessions/       → EvaluationSession, Answer (label='evaluation_sessions') → /api/v1/sessions/
  cognitive/      → BKTState, CognitiveIndex, BlindSpotIndex,
                    AIDiagnosis                                   → /api/v1/ (profile/nodes/diagnoses) + rooms/{id}/metrics/
services/         → lógica de cálculo sin ORM (primitivos → primitivos)
  bkt_engine.py        → Fórmula Corbett & Anderson 1994
  icc_calculator.py
  claude_service.py    → CognitiveAnalysisService (Claude SDK)
templates/app/    → landing.html, index.html (login), dashboard.html,
                    diagnoses.html, room.html, session.html, design-system.html
static/app/       → css/ (tokens + page-specific), js/ (módulos ES)
docs/             → database.md, architecture.md
```

## URL map (versión final)

**Dos espacios separados**: `/` para HTML (TemplateView), `/api/v1/` para JSON (DRF).

### HTML (renderizado por Django)

| Ruta | Vista | Audiencia |
|---|---|---|
| `/` | landing | público |
| `/app/` | login | público (auth en cliente) |
| `/app/dashboard/` | dashboard (detecta rol vía JWT) | teacher / student |
| `/app/diagnoses/` | historial de diagnósticos IA | teacher / student |
| `/app/room/<id>/` | sala real (fetch backend) | teacher (dueño) |
| `/app/session/<id>/` | sesión real (BKT/ICC/Claude) | student inscripto |
| `/app/design-system/` | showcase de componentes | público |

### API REST `/api/v1/`

**Cuatro familias de recursos.** Plural, sin verbos (excepción `/auth/` y acciones especiales).

```
/api/v1/auth/             ← identidad
  POST   /register
  POST   /login
  POST   /refresh
  GET    /me

/api/v1/                  ← datos cognitivos del usuario actual (lectura propia, scope por JWT)
  GET    /profile         ← ICC promedio, BKT states, perfil predominante, agregados, último diagnóstico
  GET    /nodes           ← BKT por nodo + ICC + tendencia
  GET    /nodes/{id}      ← detalle de nodo (BKT params, ICC, diagnóstico, respuestas recientes)
  GET    /diagnoses       ← historial de AIDiagnosis ordenado por -generated_at

/api/v1/rooms/            ← aulas y todo lo room-scoped
  GET    /
  POST   /
  POST   /join
  GET    /{id}/members

  GET    /{id}/nodes
  POST   /{id}/nodes

  GET    /{id}/questions
  POST   /{id}/questions/manual
  POST   /{id}/questions/generate       ← acción Claude
  POST   /{id}/questions/approve        ← acción batch

  GET    /{id}/pdfs
  POST   /{id}/pdfs                     ← multipart, field "file"
  GET    /{id}/pdfs/{pdf_id}
  DELETE /{id}/pdfs/{pdf_id}

  GET    /{id}/metrics/blind-spots      ← solo teacher dueño
  GET    /{id}/metrics/at-risk          ← solo teacher dueño

/api/v1/sessions/         ← ciclo de vida + historial de evaluación
  GET    /                              ← historial de sesiones del usuario (aciertos + ICC del snapshot)
  POST   /                              ← crear, body {room_id}
  GET    /{id}/next-question            ← selección adaptativa por p_mastery
  POST   /{id}/answers                  ← submit answer (flujo BKT→ICC→Claude)
  GET    /{id}/review                   ← sesión + respuestas con detalle (solo dueño)
  POST   /{id}/complete                 ← cerrar sesión
```

Mountpoints en [config/urls.py](config/urls.py):
- `apps.users.urls` → `/api/v1/auth/`
- `apps.rooms.urls` → `/api/v1/rooms/` (incluye internamente `apps.questions.urls` y `apps.cognitive.urls.room_urlpatterns`)
- `apps.sessions.urls` → `/api/v1/sessions/`
- `apps.cognitive.urls` → `/api/v1/` (rutas `profile/`, `nodes/`, `diagnoses/` a la raíz; sin prefijo `/me/`)

> El app `apps.cognitive` expone **dos** grupos de rutas desde un único `urls.py`: `urlpatterns` (datos cognitivos del usuario actual, montados a la raíz `/api/v1/` → `profile/`, `nodes/`, `diagnoses/`) y `room_urlpatterns` (métricas grupales, montados como sub-rutas de `/rooms/<id>/` desde `apps.rooms.urls`).

## Detalles críticos a recordar

### El app `apps.sessions` usa label custom
Para evitar choque con `django.contrib.sessions`, su `AppConfig` define `label = 'evaluation_sessions'`. Esto significa:
- Migraciones: `python manage.py makemigrations evaluation_sessions`
- FK string references desde otras apps: `'evaluation_sessions.EvaluationSession'`
- Tablas en BD: prefijo `evaluation_sessions_*`

### Reglas de aprobación de preguntas (en `Question.save()`)
| `source` | Modo sala | `is_approved` |
|---|---|---|
| `manual` | cualquiera | True (auto) |
| `ai` | `individual` | True (auto) |
| `ai` | `group` | False (requiere batch del docente) |

### Flujo del endpoint `POST /api/v1/sessions/{id}/answers/`
Está en [apps/sessions/views.py:148](apps/sessions/views.py). Orden estricto:
1. Valida sesión y pertenencia.
2. Calcula `is_correct`.
3. `BKTEngine.update()` → nuevo mastery.
4. `BKTState` actualizado, `attempts++`.
5. `ICCCalculator.calculate()` → icc, gap, profile.
6. Crea `CognitiveIndex` (snapshot histórico).
7. Crea `Answer`.
8. **Si `icc < 0.5`:** llama Claude para `explain_error()` + `analyze_student()` → guarda `AIDiagnosis`.
9. **Si sala es `group`:** recalcula `BlindSpotIndex` (promedio de ICC en ese nodo).
10. Retorna JSON: `is_correct, icc, gap, profile, bkt_mastery, ai_feedback, risk_level`.

### Claude se llama condicionalmente
Solo cuando `icc < 0.5` (desalineación grave). Esto mantiene costos controlados (~$5–10 USD total estimado para semestre completo).

Si `ANTHROPIC_API_KEY` no está configurada, los métodos del servicio devuelven defaults vacíos — **el flujo del estudiante nunca se rompe por fallos de IA**.

### Selección adaptativa de preguntas
`NextQuestionView` en [apps/sessions/views.py:116](apps/sessions/views.py):
1. Filtra preguntas aprobadas de la sala.
2. Excluye las ya respondidas en esa sesión.
3. Ordena nodos por `p_mastery` ascendente (ataca el más débil primero).
4. Elige pregunta aleatoria del nodo ganador.

### Métricas (definiciones canónicas)
- **BKT**: Bayes manual, fórmula Corbett & Anderson 1994. `p_mastery` clamped [0,1], redondeado a 4 decimales.
- **ICC** (`icc_value`) = `1 − |metacognitive_gap|`.
- **Metacognitive gap** = `avg_confidence − bkt_mastery`.
- **Perfil**: `metacognitive_gap > 0.2` → overconfident · `< −0.2` → underconfident · resto → calibrated.
- **IPC** (`ipc_value`) = promedio de ICC de todos los estudiantes en un nodo. Si `< 0.5` → punto ciego colectivo.

### Cliente JS (cache-busting de módulos)
Todos los módulos ES bajo `static/app/js/` propagan el cache-buster del template (`?v={% now "U" %}`) a sus imports vía:
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
python manage.py makemigrations users rooms questions evaluation_sessions cognitive
python manage.py migrate

# Seed demo (1 teacher + 3 students + sala "Algoritmos I" + 5 preguntas aprobadas)
python manage.py seed_demo

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
- **Permisos**: clases en [apps/users/permissions.py](apps/users/permissions.py) (`IsTeacher`, `IsStudent`, `IsRoomOwner`, `IsRoomMember`).
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
