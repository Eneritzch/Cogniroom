# CogniRoom

Sistema de evaluación cognitiva adaptativa basado en IA. Detecta la brecha entre lo que un estudiante **cree saber** y lo que **realmente sabe**, usando BKT (Bayesian Knowledge Tracing), ICC (Índice de Calibración Cognitiva) y análisis con Claude.

## Stack

- Python 3.11
- Django 5.1
- Django REST Framework 3.15
- djangorestframework-simplejwt
- PostgreSQL (vía `psycopg[binary]`)
- anthropic (Claude Sonnet 4.5)
- pdfplumber
- python-decouple
- django-cors-headers

Sin Docker, sin Redis, sin Celery.

## Requisitos previos

- Python 3.11 instalado
- PostgreSQL corriendo localmente (por defecto en `localhost:5432`)
- API key de Anthropic (opcional — sin ella el análisis IA devuelve defaults)

## Setup

```powershell
# 1. Clonar
git clone <repo_url>
cd Cogniroom

# 2. Virtualenv
python -m venv venv
venv\Scripts\activate

# 3. Dependencias
pip install -r requirements.txt

# 4. Variables de entorno
copy .env.example .env
# Edita .env con tu SECRET_KEY, ANTHROPIC_API_KEY y credenciales de Postgres

# 5. Crear BD en Postgres
psql -U postgres -c "CREATE DATABASE cogniroom;"

# 6. Migraciones
python manage.py makemigrations users rooms questions evaluation_sessions cognitive
python manage.py migrate

# 7. Datos de demo
python manage.py seed_demo

# 8. Servidor
python manage.py runserver
```

## Variables de entorno (`.env`)

```
SECRET_KEY=django-insecure-change-this
DEBUG=True
ANTHROPIC_API_KEY=sk-ant-...

DB_NAME=cogniroom
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
```

## Acceso

- API root: http://127.0.0.1:8000/api/
- Demo UI: http://127.0.0.1:8000/

### Credenciales seed

| Rol | Email | Password |
|-----|-------|----------|
| teacher | teacher@cogniroom.com | password123 |
| student | student1@cogniroom.com | password123 |
| student | student2@cogniroom.com | password123 |
| student | student3@cogniroom.com | password123 |

Sala demo: **Algoritmos I** (modo group) con 3 nodos (`Recursividad`, `Complejidad algorítmica`, `Ordenamiento`) y 5 preguntas aprobadas en `Recursividad`.

## Estructura

```
cogniroom/
├── config/              # Settings, URLs raíz
├── apps/
│   ├── users/           # User (AbstractUser extendido), auth JWT
│   ├── rooms/           # Room (group/individual), RoomMembership
│   ├── questions/       # KnowledgeNode, Question, PDFDocument
│   ├── sessions/        # EvaluationSession, Answer (label: evaluation_sessions)
│   └── cognitive/       # BKTState, CognitiveIndex, BlindSpotIndex, AIDiagnosis
├── services/
│   ├── bkt_engine.py    # Fórmula Corbett & Anderson 1994
│   ├── icc_calculator.py
│   └── claude_service.py
├── templates/
│   └── demo.html        # UI de prueba single-file
├── manage.py
├── requirements.txt
└── .env.example
```

## Endpoints principales

### Auth
- `POST /api/auth/register/`
- `POST /api/auth/login/`
- `POST /api/auth/refresh/`
- `GET  /api/auth/me/`

### Rooms
- `POST /api/rooms/` — crear sala
- `GET  /api/rooms/` — mis salas
- `POST /api/rooms/join/` — unirse con `access_code`
- `GET  /api/rooms/{id}/members/` — solo owner

### Questions
- `POST /api/rooms/{room_id}/nodes/`
- `GET  /api/rooms/{room_id}/nodes/`
- `POST /api/rooms/{room_id}/questions/generate/` — genera con Claude
- `POST /api/rooms/{room_id}/questions/manual/`
- `POST /api/rooms/{room_id}/questions/approve/` — batch, solo group
- `GET  /api/rooms/{room_id}/questions/`

### Sessions
- `POST /api/sessions/`
- `GET  /api/sessions/{id}/next-question/` — adaptativa (menor mastery primero)
- `POST /api/sessions/{id}/answer/` — dispara BKT + ICC + IA condicional
- `POST /api/sessions/{id}/complete/`

### Cognitive
- `GET /api/cognitive/my-profile/`
- `GET /api/cognitive/my-nodes/`
- `GET /api/rooms/{room_id}/blind-spots/` — solo teacher
- `GET /api/rooms/{room_id}/at-risk/` — solo teacher

## Flujo de evaluación

1. Estudiante inicia sesión en una sala.
2. Sistema entrega pregunta del nodo con menor `p_mastery`.
3. Estudiante responde + declara confianza (0.0–1.0).
4. Backend actualiza `BKTState` (Bayes) → calcula ICC y gap.
5. Si `ICC < 0.5`, Claude genera feedback personalizado y diagnóstico de riesgo.
6. Si la sala es `group`, se recalcula el `BlindSpotIndex` del nodo.

## Ramas

- `main` — rama oficial, código estable.
- `test` — rama de pruebas y desarrollo activo.

## Comandos útiles

```powershell
# Crear superuser
python manage.py createsuperuser

# Shell Django
python manage.py shell

# Re-generar migraciones de todas las apps custom
python manage.py makemigrations users rooms questions evaluation_sessions cognitive
```
