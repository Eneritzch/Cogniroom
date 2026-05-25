# Arquitectura — CogniRoom

## Decisión: monolito modular

CogniRoom implementa una **arquitectura de monolito modular** sobre Django: una sola aplicación desplegable, con dominios de negocio separados en apps independientes que se comunican por llamadas Python directas.

---

## ¿Por qué no microservicios?

Los microservicios son la respuesta correcta cuando se cumplen **al menos dos** de estas condiciones:

1. Equipos grandes e independientes (>20 devs) que necesitan desplegar por separado.
2. Módulos con requisitos de escala radicalmente distintos (uno necesita 10 réplicas, otro 1).
3. Tecnologías heterogéneas justificadas por dominio (ML en Python, edge en Go, realtime en Elixir).
4. Aislamiento de fallos crítico: una caída en un módulo no puede tumbar el sistema.
5. Regulación o tenencia multi-cliente que exige aislamiento de datos por servicio.

**CogniRoom no cumple ninguna.** Es un proyecto académico con:
- 1 equipo pequeño (≤5 devs).
- Volumen acotado (~100 usuarios concurrentes).
- Un solo stack (Django + Postgres).
- Sin SLA estricto ni multi-tenancy.

Adoptar microservicios añadiría: orquestación (Docker/K8s), red interna, observabilidad distribuida, consistencia eventual, contratos API entre servicios, duplicación de autenticación — todo sin beneficio real.

---

## Modelo actual: monolito modular

```
┌────────────────────────────────────────────────────────────────────┐
│  Navegador                                                         │
│  ┌─────────────────────────┐    ┌─────────────────────────────┐    │
│  │ Templates Django (HTML) │◀──▶│ JS módulos ES (fetch + JWT) │    │
│  │ tokens.css · Bootstrap  │    │ api.js · auth.js · ...      │    │
│  └─────────────┬───────────┘    └─────────────┬───────────────┘    │
└────────────────┼──────────────────────────────┼───────────────────-┘
                 │ render TemplateView          │ JSON sobre /api/v1/
┌────────────────▼──────────────────────────────▼────────────────────┐
│                       Django 5 + DRF (backend)                     │
│   ┌──────────┬──────────┬───────────┬──────────┬───────────────┐   │
│   │  users   │  rooms   │ questions │ sessions │   cognitive   │   │
│   │   app    │   app    │    app    │   app    │     app       │   │
│   └──────────┴──────────┴───────────┴──────────┴───────────────┘   │
│        │          │           │           │            │           │
│   ┌────▼──────────▼───────────▼───────────▼────────────▼────────┐  │
│   │              services/ (lógica transversal sin ORM)         │  │
│   │   bkt_engine.py    icc_calculator.py    claude_service.py   │  │
│   └─────────────────────────────────────────────────────────────┘  │
└────────────────────────────┬───────────────────────────────────────┘
                             │
        ┌────────────────────┴────────────────────┐
        │                                         │
 ┌──────▼──────┐                          ┌───────▼──────────┐
 │ PostgreSQL  │                          │   Claude API     │
 └─────────────┘                          │   (Anthropic)    │
                                          └──────────────────┘
```

### URL map definitivo (versión 1)

| Familia | Mountpoint | Owner |
|---|---|---|
| `/api/v1/auth/` | `apps.users.urls` | identidad (register, login, refresh, me) |
| `/api/v1/me/` | `apps.cognitive.me_urls` | datos del usuario actual (profile, nodes, diagnoses) |
| `/api/v1/rooms/` | `apps.rooms.urls` (incluye questions y cognitive room) | aulas + sub-recursos (nodes, questions, pdfs, metrics) |
| `/api/v1/sessions/` | `apps.sessions.urls` | ciclo de vida de evaluación |

Reglas REST:
- Plural y sin verbos en URLs (`/rooms/`, `/sessions/{id}/answers/`).
- Excepciones tipo "acción": `/auth/login/`, `/questions/generate/`, `/questions/approve/`, `/sessions/{id}/complete/`.
- Datos del usuario actual viven bajo `/me/`, no en un namespace técnico (`/cognitive/`).
- Métricas grupales bajo `/rooms/{id}/metrics/` para crecer limpio (`metrics/blind-spots`, `metrics/at-risk`, futuras).

### Apps y responsabilidades

| App | Dominio | Modelos principales |
|---|---|---|
| `users` | Identidad y autenticación | `User` (AbstractUser + role) |
| `rooms` | Aulas y membresías | `Room`, `RoomMembership` |
| `questions` | Banco de preguntas y nodos | `KnowledgeNode`, `Question`, `PDFDocument` |
| `sessions` | Evaluaciones activas | `EvaluationSession`, `Answer` |
| `cognitive` | Métricas BKT/ICC/IPC y diagnóstico IA | `BKTState`, `CognitiveIndex`, `BlindSpotIndex`, `AIDiagnosis` |

### Servicios transversales (`services/`)

Lógica pura sin dependencia de Django ORM, reutilizable entre apps:

- **`bkt_engine.py`** — fórmula Corbett & Anderson 1994.
- **`icc_calculator.py`** — cálculo de ICC, gap, perfil.
- **`claude_service.py`** — integración con Anthropic SDK (generar preguntas, explicar errores, analizar estudiante).

---

## Principios arquitectónicos aplicados

### 1. Separación por dominio
Cada app encapsula un bounded context. Las apps no importan modelos de otras apps dentro de sus propios modelos — usan string references (`'rooms.Room'`) para evitar ciclos de importación.

### 2. Servicios como capa hexagonal
Los cálculos numéricos (BKT, ICC) viven en `services/` como clases puras. Reciben primitivos, devuelven primitivos. Esto las hace:
- Testeables sin base de datos.
- Reutilizables fuera de Django (ej. notebooks de análisis).
- Independientes del framework.

### 3. Claude como dependencia externa inyectable
`CognitiveAnalysisService` encapsula el cliente de Anthropic. Si la API key no está configurada, devuelve defaults — **el sistema nunca rompe el flujo del estudiante por un fallo de IA**.

### 4. Lógica de aprobación en `Question.save()`
La regla de negocio (sala grupal requiere aprobación, individual no) vive en el modelo. Cualquier ruta de creación (API, admin, seeds) respeta automáticamente la política.

### 5. Adaptatividad en la capa de vista
`NextQuestionView` implementa el algoritmo adaptativo (priorizar nodo con menor `p_mastery`) en una sola función, sin necesidad de un servicio separado. La consulta es barata y no requiere precomputación.

---

## Escalabilidad futura (si se justifica)

Si alguna vez se necesita escalar, la ruta natural es:

1. **Agregar réplicas del monolito detrás de un load balancer.** Postgres queda como fuente única de verdad; stateless el resto.
2. **Mover la extracción de PDF y llamadas a Claude a workers asíncronos** (Celery + Redis) si la latencia molesta. El spec original los excluyó por simplicidad, pero es el primer upgrade natural.
3. **Separar solo el módulo `cognitive` como servicio** si el análisis colectivo (IPC en aulas de miles de alumnos) se vuelve costoso. Incluso en ese caso sería un único microservicio, no una constelación.

Nada de esto es necesario hoy y tratar de prevenirlo con arquitectura anticipada sería **over-engineering**.

---

## Resumen para la tesis

> CogniRoom implementa una arquitectura de **monolito modular** sobre Django 5, con separación por dominios de negocio en aplicaciones Django independientes y una capa de servicios transversales para la lógica cognitiva (BKT, ICC, integración con LLM). Esta decisión arquitectónica prioriza la **simplicidad operativa, la velocidad de iteración académica y la mantenibilidad por equipos pequeños**, evitando el sobrecoste de sistemas distribuidos cuya justificación requiere escalas y complejidades fuera del alcance del presente trabajo.
