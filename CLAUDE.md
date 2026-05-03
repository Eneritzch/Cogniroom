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

Sin Docker, sin Redis, sin Celery — todo síncrono, una sola instancia.

## Arquitectura

**Monolito modular** sobre Django. Cinco apps independientes + capa de servicios transversales. NO microservicios — la justificación está en [docs/architecture.md](docs/architecture.md).

```
config/           → settings, urls raíz, /api/ root view
apps/
  users/          → User (AbstractUser + role/institution), JWT auth
  rooms/          → Room (group/individual), RoomMembership
  questions/      → KnowledgeNode, Question, PDFDocument
  sessions/       → EvaluationSession, Answer  (label='evaluation_sessions')
  cognitive/      → BKTState, CognitiveIndex, BlindSpotIndex, AIDiagnosis
services/
  bkt_engine.py   → Fórmula Corbett & Anderson 1994 (sin libs externas)
  icc_calculator.py
  claude_service.py → CognitiveAnalysisService (Claude SDK)
templates/
  demo.html       → UI de prueba single-file servida en /demo/
docs/             → database.md, architecture.md
```

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

### Flujo del endpoint `POST /api/sessions/{id}/answer/`
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
- **ICC** = `1 − |declared_confidence − bkt_mastery|`.
- **Gap** = `declared_confidence − bkt_mastery`.
- **Perfil**: `gap > 0.2` → overconfident · `gap < −0.2` → underconfident · resto → calibrated.
- **IPC** = promedio de ICC de todos los estudiantes en un nodo. Si `< 0.5` → punto ciego colectivo.

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
# - http://127.0.0.1:8000/        → demo UI
# - http://127.0.0.1:8000/api/    → catálogo de endpoints
# - http://127.0.0.1:8000/admin/  → admin Django
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

## Ramas git

- `main` — rama oficial, código estable.
- `test` — desarrollo activo.

Remoto: https://github.com/Eneritzch/Cogniroom

## Documentación adicional

- [docs/database.md](docs/database.md) — esquema completo de BD con diagrama Mermaid.
- [docs/architecture.md](docs/architecture.md) — decisión arquitectónica + stack.

## Lo que falta por construir

1. Frontend real (React + Vite recomendado, alternativa Django + HTMX).
2. Dashboards con visualización (Chart.js o Recharts) de ICC histórico, IPC por nodo, predicción de riesgo.
3. Análisis estadístico avanzado con `pandas`/`NumPy` (opcional — el ORM cubre el caso base).

## Endpoints de PDF (recientes)

- `POST /api/rooms/{room_id}/pdfs/` — multipart con campo `file`. Sube + extrae texto con `pdfplumber` + marca `processed=True`. Solo owner.
- `GET /api/rooms/{room_id}/pdfs/` — lista PDFs de la sala (sin `extracted_text`). Members.
- `GET /api/rooms/{room_id}/pdfs/{pdf_id}/` — detalle con `extracted_text` completo. Members.
- `DELETE /api/rooms/{room_id}/pdfs/{pdf_id}/` — elimina PDF y archivo físico. Solo owner.

`POST /api/rooms/{room_id}/questions/generate/` ahora acepta `pdf_id` en lugar de `content` raw — usa el `extracted_text` ya guardado.
