# CogniRoom — Planificación del proyecto (Metodología Scrum + Jira)

> Documento maestro para la **metodología del proyecto**: visión del sistema, alcance funcional (hecho y pendiente), historias de usuario, requisitos funcionales y no funcionales, y la organización en **Sprints con Scrum** lista para volcar en **Jira** (épicas → historias → subtareas).
>
> Última actualización: **2026-06-14**. Estado del código: backend y frontend mayoritariamente cableados; quedan pendientes acotados (ver §4).
>
> Inicio del proyecto: **2026-04-23** · Último avance registrado: **2026-06-11** · Duración a la fecha: ~7.5 semanas.

---

## 0. Génesis del proyecto y cronología real

> Esta sección narra el proyecto **desde su inicio** para sustentar el capítulo de metodología de la tesis. Las fases y fechas están **ancladas al historial real del repositorio** (Git), no son ilustrativas.

### 0.1 Origen e idea

CogniRoom nace como **proyecto de tesis** para abordar un problema concreto de la educación universitaria: la **sobreconfianza académica**. La hipótesis de partida es que el fracaso académico no se predice solo midiendo conocimiento, sino midiendo la **brecha entre la confianza declarada del estudiante y su dominio real**. A partir de esa hipótesis se definió:

1. Un **modelo de medición** basado en BKT (dominio real) + ICC (calibración).
2. Una **capa de IA** (Claude) para diagnóstico y explicación, invocada de forma costo-controlada.
3. Una **doble audiencia**: estudiante (autoconocimiento) y docente (analítica grupal).

### 0.2 Decisiones fundacionales (tomadas al arranque)

| Decisión | Elección | Justificación |
|---|---|---|
| Arquitectura | Monolito modular Django MVT + REST | Una sola instancia, alcance de tesis; sin sobre-ingeniería de microservicios (ver `docs/architecture.md`). |
| Base de datos | PostgreSQL | Integridad relacional para BKT/ICC/histórico. |
| Autenticación | JWT (`simplejwt`) | Stateless, separa front (cliente) de API. |
| IA | Claude Sonnet 4.5, llamada condicional | Control de costos (~$5–10/semestre). |
| Frontend | HTML semántico + Bootstrap + tokens propios + JS módulos ES | Sin framework pesado; design system cerrado y mobile-first. |
| Sin Docker/Redis/Celery | Todo síncrono | Simplicidad operativa acorde al alcance. |

### 0.3 Adopción de Scrum

Desde el inicio el desarrollo se organizó de forma **iterativa e incremental**, lo que se formaliza aquí como **Scrum** con sprints de 2 semanas. El proyecto siguió una estrategia deliberada de **diseño primero (UI/mocks) → cierre de modelo → cableado real**, visible en la cronología de commits. Cada incremento dejó software demostrable.

### 0.4 Cronología real de desarrollo (extraída de Git)

| Periodo | Fase | Hitos reales (commits) |
|---|---|---|
| **2026-04-23** | **Concepción y andamiaje** | Initial commit (Django 5.1 API), documentación de arquitectura y base de datos. |
| **2026-04-27 → 05-03** | **Diseño UI/UX y design system** | Pruebas de diseño, design system, landing page, rediseño, reglas CSS. |
| **2026-05-17 → 06-03** | **Prototipo de pantallas con datos mock** | Plantilla base UI, menú lateral, módulos del docente, dashboard, pantallas de estudiante con mocks, perfil docente, alineación UI↔diagrama BD, modo demo en login. |
| **2026-06-07 → 06-08** | **Cierre del modelo de datos + endurecimiento de auth** | Estados (enums) + tabla histórica, hardening de auth, rediseño de login/registro, fixes de seguridad. |
| **2026-06-09 → 06-11** | **Cableado del backend real** | Flujo docente real (rooms/students/questions/pdfs/metrics), eliminación del modo demo, fase 2 docentes, username auto-generado, fixes de login. |
| **2026-06-14 → en adelante** | **Pendiente** | Secciones, normalización de confianza, calidad/tests, pulido y despliegue (ver §4.2 y Sprints 6–7). |

> **Lectura clave para la tesis**: el proyecto adoptó un enfoque *design-first*. Las pantallas se construyeron primero con datos simulados (mocks) para validar UX y alinear con el diagrama de BD; recién al cerrar el modelo de datos se reemplazó el mock por las llamadas reales a la API. Esto explica por qué a la fecha el frontend ya está completo y el backend mayormente cableado.

---

## 1. Visión del sistema

**CogniRoom** es un sistema de **evaluación cognitiva adaptativa** que detecta **sobreconfianza académica** en estudiantes universitarios. Su tesis central:

> No basta con medir lo que un estudiante **sabe**; hay que medir la **brecha** entre lo que **cree saber** (confianza declarada) y lo que **realmente sabe** (dominio estimado por modelo bayesiano). Esa brecha —la *desalineación metacognitiva*— es el predictor temprano del fracaso académico.

### 1.1 Problema que resuelve

- Los exámenes tradicionales miden conocimiento, no **calibración**. Un estudiante que falla *sabiendo que no sabe* es muy distinto de uno que falla *creyendo que sabía*: el segundo es el de riesgo real.
- El docente no tiene visibilidad temprana de **puntos ciegos colectivos** (temas donde toda la clase está sobreconfiada).
- La retroalimentación llega tarde (tras el parcial), cuando ya no hay margen de corrección.

### 1.2 Propuesta de valor

1. **Para el estudiante**: cada respuesta declara una confianza; el sistema le devuelve su **calibración real** y un diagnóstico de IA cuando detecta desalineación grave.
2. **Para el docente**: tablero con **puntos ciegos colectivos**, **estudiantes en riesgo** y **mapa de calor de dominio** por nodo de conocimiento.
3. **Para la institución**: detección temprana de riesgo de fracaso, accionable durante el semestre.

### 1.3 Conceptos / métricas canónicas

| Métrica | Definición | Fuente |
|---|---|---|
| **BKT** (`p_mastery`) | Dominio estimado por *Bayesian Knowledge Tracing* (Corbett & Anderson 1994). Clamp [0,1]. | `services/bkt_engine.py` |
| **Confianza declarada** | Cuánto cree saber el estudiante antes de responder (0–1). | `Answer.confidence_declared` |
| **Gap metacognitivo** | `avg_confidence − bkt_mastery`. | `services/icc_calculator.py` |
| **ICC** (Índice de Calibración Cognitiva) | `1 − |gap|`. Más alto = mejor calibrado. | `icc_calculator.py` |
| **Perfil** | `gap > 0.2` → **sobreconfiado** · `< −0.2` → **subconfiado** · resto → **calibrado**. | `icc_calculator.py` |
| **IPC** (Índice de Punto Ciego) | Promedio de ICC de todos los estudiantes en un nodo. `< 0.5` → punto ciego colectivo. | `BlindSpotIndex` |

### 1.4 Stack tecnológico

- **Backend**: Python 3.11 · Django 5.1 · Django REST Framework 3.15 · PostgreSQL 14+ · JWT (`simplejwt`).
- **IA**: Claude Sonnet 4.5 (SDK `anthropic`) — generación de preguntas, explicación de errores, diagnóstico cognitivo. Llamada **condicional** (solo si `ICC < 0.5`) para controlar costos.
- **Extracción**: `pdfplumber` para texto de PDFs.
- **Frontend**: HTML semántico + Bootstrap 5.3 + design tokens propios + JS módulos ES (vanilla).
- **Arquitectura**: monolito modular Django MVT + REST API. Sin Docker, Redis ni Celery (todo síncrono, una instancia).

---

## 2. Actores del sistema

| Actor | Descripción | Capacidades |
|---|---|---|
| **Visitante** | Usuario no autenticado. | Ver landing, registrarse, iniciar sesión. |
| **Estudiante** | Usuario inscrito en salas. | Unirse a salas, rendir sesiones de evaluación, ver su perfil cognitivo, diagnósticos, historial y detalle por nodo. |
| **Docente** | Dueño de salas. | Crear salas, gestionar nodos de conocimiento, subir PDFs, generar/aprobar preguntas, ver métricas grupales (puntos ciegos, en riesgo, heatmap). |
| **Coordinador** | Rol institucional (alta por admin/seed). | Reservado para futuro multi-institución. |
| **Sistema / IA** | Servicios automáticos. | BKT, ICC, IPC, generación y diagnóstico con Claude. |

---

## 3. Arquitectura funcional (apps Django)

```
config/           → settings, urls raíz, /api/v1/ root
apps/
  users/          → User (rol), JWT auth                  → /api/v1/auth/
  rooms/          → Room, Section, RoomMembership         → /api/v1/rooms/
  questions/      → KnowledgeNode, Question, PDFDocument  → bajo rooms
  sessions/       → EvaluationSession, Answer             → /api/v1/sessions/
  cognitive/      → BKTState, CognitiveIndex, BlindSpotIndex,
                    AIDiagnosis, StudentProgressSnapshot  → /api/v1/ + rooms/{id}/metrics/
services/         → bkt_engine, icc_calculator, claude_service (sin ORM)
templates/ static/ → MVT (HTML semántico + tokens + JS módulos ES)
```

---

## 4. Estado del alcance — Hecho vs. Pendiente

> Esta tabla es la base para distinguir el **trabajo ya completado** (mapeable a sprints pasados) del **backlog restante** (sprints futuros).

### 4.1 COMPLETADO ✅

| Módulo | Detalle |
|---|---|
| **Autenticación** | Registro endurecido (código docente, validadores de password, email único), login, logout con blacklist de refresh, refresh, `/me`. Throttling 10/min. |
| **Salas (Rooms)** | Crear (group/individual), unirse por código de acceso, listar miembros con métricas. |
| **Nodos de conocimiento** | Crear/listar nodos por sala. |
| **PDFs** | Subir (multipart), extracción automática de texto con `pdfplumber`, listar, detalle, borrar. |
| **Preguntas** | Creación manual, generación con IA (Claude), aprobación/rechazo en lote, reglas de auto-aprobación por modo de sala, listado (docente ve todo; estudiante solo aprobadas). |
| **Sesiones de evaluación** | Crear, selección adaptativa de siguiente pregunta (por `p_mastery` ascendente), envío de respuesta (flujo BKT→ICC→Claude), revisión, cierre con snapshot histórico. |
| **Motor BKT** | Implementado y cableado en el flujo de respuesta. |
| **Calculadora ICC** | Implementada y cableada (icc, gap, perfil). |
| **Diagnóstico IA** | `AIDiagnosis` generado por Claude cuando `ICC < 0.5`; con fallback seguro si falta API key. |
| **Perfil estudiante** | Profile (ICC promedio, perfil predominante, agregados), nodos con tendencia, diagnósticos, detalle de nodo, historial de sesiones. |
| **Métricas docente** | Puntos ciegos (blind-spots), estudiantes en riesgo (at-risk), mapa de calor (heatmap). |
| **Frontend** | 16 pantallas diseñadas y **cableadas al backend real** (ya no usan mocks). Design system propio (calibration ring, dual-bar, heatmap, pills de perfil). |
| **Histórico** | `StudentProgressSnapshot` escrito al completar sesión. |

### 4.2 PENDIENTE / MEJORAS 🚧

| # | Pendiente | Prioridad | Notas |
|---|---|---|---|
| P1 | **Endpoints de Sections** | Alta | El modelo `Section` ya está migrado, faltan vistas/serializers (CRUD + `section_id` en join + sección en members). |
| P2 | **Normalización de escala de confianza** | Alta | Backend persiste 0–1, algunos mocks/UI usaban 0–100. Unificar en serializer. |
| P3 | **Limpieza de mocks huérfanos** | Baja | `student-mock.js`, `teacher-mock.js`, `room-mock.js` ya no se importan; eliminar. |
| P4 | **Tabs de `room.html`** | Media | Layout listo; algunos tabs (students/questions/pdfs) muestran placeholder, faltan conectar del todo. |
| P5 | **Feed de actividad reciente (docente)** | Baja | Agregar por queries puntuales o tabla `ActivityLog`. |
| P6 | **Procesamiento async de PDFs** | Baja | Hoy síncrono. Aceptable para una instancia; diferible. |
| P7 | **Limpieza de tokens en blacklist** | Baja | Job de limpieza periódica de tokens expirados. |
| P8 | **Nodos relacionados / prerrequisitos** | Baja | M2M self en `KnowledgeNode` para grafo. Diferible. |
| P9 | **Tests automatizados + cobertura** | Alta | Formalizar suite de tests (unit de servicios + integración de flujo). |
| P10 | **Documentación de despliegue** | Media | Guía de deploy productivo (settings prod ya env-gated). |
| P11 | **Validación / pulido UX final** | Media | Checklist responsive (375/768/1280), accesibilidad, estados vacíos y de error. |

---

## 5. Requisitos funcionales (RF)

> Formato `RF-XX`. Cada uno mapea a una o más historias de usuario (§7).

### Autenticación e identidad
- **RF-01** El sistema permite registrar usuarios con rol `student` o `teacher`; el rol docente exige un **código de invitación** válido.
- **RF-02** El sistema valida unicidad de email y username y aplica validadores de contraseña (mínimo 8, no común, no numérica, no similar a datos del usuario).
- **RF-03** El sistema autentica vía JWT (access 8h, refresh 7d) y permite refrescar el token.
- **RF-04** El logout revoca el refresh token (blacklist).
- **RF-05** El sistema expone el perfil del usuario autenticado (`/me`).
- **RF-06** El sistema limita la tasa de intentos de login/registro (throttling).

### Salas y membresías
- **RF-07** Un docente puede crear salas en modo `group` o `individual`.
- **RF-08** Las salas `group` generan un **código de acceso**.
- **RF-09** Un estudiante puede unirse a una sala con su código de acceso.
- **RF-10** El docente puede listar los miembros de su sala con sus métricas (perfil, confianza media, BKT, gap).
- **RF-11** *(Pendiente)* El docente puede crear, editar y borrar **secciones** dentro de una sala y asignar estudiantes a una sección.

### Nodos, PDFs y preguntas
- **RF-12** El docente puede crear y listar **nodos de conocimiento** por sala.
- **RF-13** El docente puede subir PDFs; el sistema extrae el texto automáticamente.
- **RF-14** El docente puede listar, ver detalle y borrar PDFs.
- **RF-15** El docente puede crear preguntas **manuales** (4 opciones, una correcta).
- **RF-16** El docente puede **generar preguntas con IA** a partir de texto o de un PDF.
- **RF-17** Las preguntas manuales se auto-aprueban; las de IA se auto-aprueban en salas `individual` y quedan **pendientes** en salas `group`.
- **RF-18** El docente puede **aprobar o rechazar** preguntas en lote.
- **RF-19** El estudiante solo ve preguntas **aprobadas**.

### Sesiones de evaluación
- **RF-20** El estudiante puede iniciar una sesión de evaluación en una sala donde está inscrito.
- **RF-21** El sistema selecciona la **siguiente pregunta** adaptativamente, priorizando el nodo con menor `p_mastery` y excluyendo las ya respondidas.
- **RF-22** Al responder, el estudiante **declara su confianza**; el sistema calcula `is_correct`, actualiza BKT, calcula ICC/gap/perfil y persiste un snapshot (`CognitiveIndex`).
- **RF-23** Si `ICC < 0.5`, el sistema solicita a Claude una **explicación del error** y un **diagnóstico cognitivo** (`AIDiagnosis`).
- **RF-24** En salas `group`, al responder se recalcula el **IPC** (punto ciego) del nodo.
- **RF-25** El estudiante puede **revisar** una sesión (respuestas, opción correcta, confianza, feedback).
- **RF-26** El estudiante puede **cerrar** una sesión, generándose un `StudentProgressSnapshot`.
- **RF-27** El estudiante puede ver su **historial** de sesiones.

### Métricas cognitivas (estudiante)
- **RF-28** El estudiante ve su **perfil cognitivo**: ICC promedio, BKT por nodo, perfil predominante, último diagnóstico.
- **RF-29** El estudiante ve sus **nodos** con BKT, ICC y **tendencia** (mejorando/empeorando/estable).
- **RF-30** El estudiante ve el **detalle de un nodo**: parámetros BKT, ICC, diagnóstico, respuestas recientes.
- **RF-31** El estudiante ve su **historial de diagnósticos** de IA.

### Métricas grupales (docente)
- **RF-32** El docente ve los **puntos ciegos** de su sala (nodos con IPC bajo).
- **RF-33** El docente ve los **estudiantes en riesgo** (|gap| > 0.2, con nivel de riesgo).
- **RF-34** El docente ve un **mapa de calor** de dominio (estudiantes × nodos).

### Robustez de IA
- **RF-35** Si falta `ANTHROPIC_API_KEY` o la IA falla, los servicios devuelven defaults vacíos: **el flujo del estudiante nunca se rompe**.

---

## 6. Requisitos no funcionales (RNF)

### Rendimiento y costo
- **RNF-01** Claude se invoca **solo** cuando `ICC < 0.5`, manteniendo el costo total estimado en ~$5–10 USD/semestre.
- **RNF-02** `p_mastery` se redondea a 4 decimales y se clampa a [0,1]; cálculos BKT/ICC son O(1) por respuesta.
- **RNF-03** Toda query usa el ORM (sin SQL crudo salvo medición justificada).

### Seguridad
- **RNF-04** Autenticación JWT con rotación de refresh y blacklist tras rotación.
- **RNF-05** CORS con whitelist explícita; nunca `CORS_ALLOW_ALL_ORIGINS=True`.
- **RNF-06** Permisos a nivel `APIView` (`IsTeacher`, `IsStudent`, `IsRoomOwner`, `IsRoomMember`); nunca en serializers.
- **RNF-07** Hardening de producción env-gated (cookies seguras, HSTS, SSL redirect, nosniff) bajo `if not DEBUG`.
- **RNF-08** Validadores de contraseña y throttling de auth.

### Usabilidad / diseño
- **RNF-09** Diseño **mobile-first** con un **único breakpoint** (`768px`).
- **RNF-10** Layout solo con **Flexbox** (prohibido `display: grid` propio).
- **RNF-11** **Sin emojis**: solo iconos SVG inline con `currentColor`.
- **RNF-12** Color y gradientes **solo desde `tokens.css`** (sistema cerrado de 6 colores + neutros).
- **RNF-13** Tipografía Inter (UI) + JetBrains Mono (métricas/números).
- **RNF-14** Accesibilidad: `lang="es"`, `<title>`/`meta description`, labels asociados, `aria-*`, foco visible, tap targets ≥ 44px.
- **RNF-15** HTML semántico; clases propias en BEM ligero; sin estilos inline (salvo CSS vars dinámicas); sin `!important`.

### Mantenibilidad / arquitectura
- **RNF-16** Separación MVT estricta; servicios externos sin ORM (primitivos → primitivos).
- **RNF-17** DRY: HTML repetido se extrae a partials; lógica de nav/sidebar/logout centralizada en `nav-auth.js`.
- **RNF-18** App `sessions` con label `evaluation_sessions` para no chocar con `django.contrib.sessions`.
- **RNF-19** FK entre apps por string reference (evita imports circulares).
- **RNF-20** Sin comentarios redundantes; nombres claros; sin TODO/FIXME sin issue asociado.

### Portabilidad / operación
- **RNF-21** Una sola instancia, todo síncrono (sin Docker/Redis/Celery).
- **RNF-22** Variables sensibles vía `python-decouple` (`.env`), nunca hardcodeadas.
- **RNF-23** `ALLOWED_HOSTS` y secretos configurables por entorno.

---

## 7. Épicas e Historias de Usuario

> Formato Jira: cada **Épica** agrupa historias `HU-XX`. Cada historia lleva rol-acción-beneficio, criterios de aceptación (CA) y estimación en **story points** (escala Fibonacci: 1, 2, 3, 5, 8, 13). El estado refleja §4.
>
> Plantilla: *Como `<rol>`, quiero `<acción>` para `<beneficio>`.*

---

### ÉPICA E1 — Autenticación y gestión de identidad
*Objetivo: que cualquier usuario pueda registrarse, autenticarse y gestionar su sesión de forma segura.*

| ID | Historia | SP | Estado |
|---|---|---|---|
| HU-01 | Como visitante, quiero registrarme como estudiante o docente para acceder al sistema. | 5 | ✅ Hecho |
| HU-02 | Como docente, quiero registrarme con un código de invitación para validar mi rol. | 3 | ✅ Hecho |
| HU-03 | Como usuario, quiero iniciar sesión con email y contraseña para acceder a mi cuenta. | 3 | ✅ Hecho |
| HU-04 | Como usuario, quiero cerrar sesión de forma segura para revocar mi token. | 2 | ✅ Hecho |
| HU-05 | Como usuario, quiero que mi sesión se renueve automáticamente (refresh) para no re-loguearme constantemente. | 2 | ✅ Hecho |
| HU-06 | Como sistema, quiero limitar intentos de login/registro para mitigar fuerza bruta. | 2 | ✅ Hecho |

**CA ejemplo (HU-01)**: registro válido → 201 + tokens; email duplicado → 400; password débil → 400; rol distinto a student/teacher → 400.

---

### ÉPICA E2 — Salas y membresías
*Objetivo: que el docente gestione espacios de evaluación y los estudiantes se inscriban.*

| ID | Historia | SP | Estado |
|---|---|---|---|
| HU-07 | Como docente, quiero crear salas en modo grupal o individual para organizar mis evaluaciones. | 5 | ✅ Hecho |
| HU-08 | Como estudiante, quiero unirme a una sala con su código de acceso para participar. | 3 | ✅ Hecho |
| HU-09 | Como docente, quiero listar los miembros de mi sala con sus métricas para hacer seguimiento. | 5 | ✅ Hecho |
| HU-10 | Como docente, quiero crear y administrar **secciones** dentro de una sala para agrupar estudiantes. | 5 | 🚧 Pendiente (P1) |
| HU-11 | Como estudiante, quiero unirme indicando mi sección para quedar bien clasificado. | 3 | 🚧 Pendiente (P1) |

**CA (HU-10)**: CRUD de sección; `unique (room, code)`; borrar sección no expulsa alumnos (`SET_NULL`); salas sin secciones siguen funcionando.

---

### ÉPICA E3 — Contenido: nodos, PDFs y banco de preguntas
*Objetivo: que el docente construya el material y el banco de preguntas (manual o con IA).*

| ID | Historia | SP | Estado |
|---|---|---|---|
| HU-12 | Como docente, quiero crear nodos de conocimiento por sala para estructurar los temas. | 3 | ✅ Hecho |
| HU-13 | Como docente, quiero subir PDFs y que se extraiga su texto para usarlo como fuente. | 5 | ✅ Hecho |
| HU-14 | Como docente, quiero listar, ver y borrar PDFs para gestionar el material. | 3 | ✅ Hecho |
| HU-15 | Como docente, quiero crear preguntas manuales para controlar el contenido. | 3 | ✅ Hecho |
| HU-16 | Como docente, quiero generar preguntas con IA desde texto o PDF para ahorrar tiempo. | 8 | ✅ Hecho |
| HU-17 | Como docente, quiero aprobar/rechazar preguntas en lote para curar el banco. | 5 | ✅ Hecho |
| HU-18 | Como estudiante, quiero ver solo preguntas aprobadas para una evaluación válida. | 1 | ✅ Hecho |

**CA (HU-16)**: genera N preguntas de 4 opciones con `correct_index` válido; en sala group quedan `pending`; si IA falla → respuesta segura sin romper.

---

### ÉPICA E4 — Motor de evaluación adaptativa (BKT + ICC)
*Objetivo: medir conocimiento y calibración en cada respuesta.*

| ID | Historia | SP | Estado |
|---|---|---|---|
| HU-19 | Como estudiante, quiero iniciar una sesión de evaluación para ser evaluado. | 3 | ✅ Hecho |
| HU-20 | Como estudiante, quiero recibir la siguiente pregunta adaptada a mi nivel para enfocar mis debilidades. | 8 | ✅ Hecho |
| HU-21 | Como estudiante, quiero declarar mi confianza al responder para medir mi calibración. | 5 | ✅ Hecho |
| HU-22 | Como sistema, quiero actualizar BKT y calcular ICC/gap/perfil en cada respuesta para diagnosticar en tiempo real. | 8 | ✅ Hecho |
| HU-23 | Como estudiante, quiero revisar mis respuestas tras la sesión para aprender de mis errores. | 5 | ✅ Hecho |
| HU-24 | Como estudiante, quiero cerrar la sesión y guardar mi progreso (snapshot) para ver mi evolución. | 3 | ✅ Hecho |

**CA (HU-22)**: orden estricto BKT→ICC→snapshot→Answer; `p_mastery` clamp [0,1]; perfil según umbrales ±0.2.

---

### ÉPICA E5 — Inteligencia: diagnóstico y retroalimentación con Claude
*Objetivo: explicar errores y diagnosticar riesgo cognitivo con IA, de forma costo-controlada y robusta.*

| ID | Historia | SP | Estado |
|---|---|---|---|
| HU-25 | Como estudiante, quiero una explicación del error cuando me desalineo gravemente para entender mi fallo. | 5 | ✅ Hecho |
| HU-26 | Como estudiante, quiero un diagnóstico cognitivo (riesgo, recomendación) cuando ICC<0.5 para corregir a tiempo. | 8 | ✅ Hecho |
| HU-27 | Como institución, quiero que la IA se invoque solo cuando aporta (ICC<0.5) para controlar costos. | 2 | ✅ Hecho |
| HU-28 | Como estudiante, quiero que un fallo de IA no rompa mi evaluación para no perder mi avance. | 3 | ✅ Hecho |

---

### ÉPICA E6 — Panel del estudiante (autoconocimiento cognitivo)
*Objetivo: que el estudiante entienda su perfil, evolución y diagnósticos.*

| ID | Historia | SP | Estado |
|---|---|---|---|
| HU-29 | Como estudiante, quiero ver mi perfil cognitivo (ICC, perfil predominante, último diagnóstico) en un dashboard. | 5 | ✅ Hecho |
| HU-30 | Como estudiante, quiero ver mis nodos con BKT, ICC y tendencia para saber dónde mejoro o empeoro. | 5 | ✅ Hecho |
| HU-31 | Como estudiante, quiero el detalle de un nodo (BKT, diagnóstico, respuestas recientes) para profundizar. | 5 | ✅ Hecho |
| HU-32 | Como estudiante, quiero mi historial de diagnósticos y de sesiones para ver mi progreso. | 3 | ✅ Hecho |

---

### ÉPICA E7 — Panel del docente (analítica grupal)
*Objetivo: dar al docente visibilidad accionable del grupo.*

| ID | Historia | SP | Estado |
|---|---|---|---|
| HU-33 | Como docente, quiero ver los puntos ciegos de mi sala para reforzar temas críticos. | 5 | ✅ Hecho |
| HU-34 | Como docente, quiero ver los estudiantes en riesgo con su nivel para intervenir. | 5 | ✅ Hecho |
| HU-35 | Como docente, quiero un mapa de calor de dominio (estudiantes × nodos) para una vista global. | 8 | ✅ Hecho |
| HU-36 | Como docente, quiero un feed de actividad reciente de mi sala para estar al día. | 3 | 🚧 Pendiente (P5) |
| HU-37 | Como docente, quiero filtrar las métricas por sección para análisis por curso. | 5 | 🚧 Pendiente (P1) |

---

### ÉPICA E8 — Calidad, pulido y despliegue
*Objetivo: cerrar deuda técnica, asegurar calidad y dejar el sistema listo para entrega/defensa.*

| ID | Historia | SP | Estado |
|---|---|---|---|
| HU-38 | Como dev, quiero normalizar la escala de confianza (0–1) en todo el sistema para evitar inconsistencias. | 3 | 🚧 Pendiente (P2) |
| HU-39 | Como dev, quiero eliminar los mocks huérfanos y conectar tabs faltantes de `room.html` para limpiar el front. | 3 | 🚧 Pendiente (P3, P4) |
| HU-40 | Como dev, quiero una suite de tests (servicios + flujo) con cobertura razonable para asegurar la calidad. | 8 | 🚧 Pendiente (P9) |
| HU-41 | Como dev, quiero validar responsive (375/768/1280) y accesibilidad de todas las vistas para cumplir RNF de diseño. | 5 | 🚧 Pendiente (P11) |
| HU-42 | Como dev, quiero documentar el despliegue productivo para poder publicar el sistema. | 3 | 🚧 Pendiente (P10) |
| HU-43 | Como dev, quiero un job de limpieza de tokens en blacklist para mantener la BD sana. | 2 | 🚧 Pendiente (P7) |

---

## 8. Estimación y backlog priorizado

### 8.1 Resumen de puntos

| Épica | SP totales | SP hechos | SP pendientes |
|---|---|---|---|
| E1 Autenticación | 17 | 17 | 0 |
| E2 Salas y membresías | 21 | 13 | 8 |
| E3 Contenido y preguntas | 28 | 28 | 0 |
| E4 Motor de evaluación | 32 | 32 | 0 |
| E5 IA / diagnóstico | 18 | 18 | 0 |
| E6 Panel estudiante | 18 | 18 | 0 |
| E7 Panel docente | 26 | 18 | 8 |
| E8 Calidad y despliegue | 24 | 0 | 24 |
| **TOTAL** | **184** | **144** | **40** |

> ~78% del esfuerzo (en SP) ya está completado. Lo pendiente (~40 SP) se concentra en **secciones** (E2/E7), **filtros por sección**, **calidad y despliegue** (E8).

### 8.2 Backlog priorizado (próximos a desarrollar)

1. **HU-38** Normalizar confianza (P2) — bloquea correctitud de varias UI.
2. **HU-10 / HU-11** Endpoints de secciones (P1).
3. **HU-37** Filtros por sección en métricas (P1, depende de HU-10).
4. **HU-39** Limpieza de mocks + tabs `room.html` (P3, P4).
5. **HU-40** Suite de tests (P9).
6. **HU-41** Pulido responsive/accesibilidad (P11).
7. **HU-36** Feed de actividad docente (P5).
8. **HU-42** Documentación de despliegue (P10).
9. **HU-43** Limpieza de tokens (P7).

---

## 9. Organización en Sprints (Scrum)

> Marco: **Scrum** con sprints de **2 semanas**, capacidad estimada ~30–40 SP/sprint (proyecto de tesis, equipo reducido). Los Sprints 0–5 documentan lo **ya construido** (con fechas reales tomadas de Git, §0.4) y sirven para narrar la metodología en la memoria de tesis; los Sprints 6–7 son el **trabajo restante**. Cada sprint indica las **historias** (§7) que lo componen.

### Sprint 0 — Concepción y andamiaje · `2026-04-23 → 05-03` ✅
**Meta**: entorno listo, arquitectura decidida y design system base.
- Configuración Django 5.1 + DRF + PostgreSQL + JWT (initial commit).
- Decisión arquitectónica (monolito modular MVT — `docs/architecture.md`, `docs/database.md`).
- Design system base: `tokens.css`, partials, landing page, reglas CSS.
- Comando `seed_demo`.
- **Entregable**: esqueleto del proyecto + landing + sistema de diseño.

### Sprint 1 — Prototipo de pantallas con mocks · `2026-05-17 → 05-28` ✅
**Meta**: validar la experiencia completa con datos simulados antes de cablear el backend.
- Plantilla base UI, menú lateral (`nav-auth.js`), dashboard por rol.
- Módulos del docente (rooms/students/questions/pdfs/metrics) con mocks.
- Pantallas del estudiante (sesión, perfil, historial, detalle de nodo) con mocks.
- **Entregable**: las 16 pantallas navegables con datos simulados (design-first).

### Sprint 2 — Alineación de modelo y cierre de datos · `2026-06-01 → 06-08` ✅
**Meta**: cerrar el modelo de datos real y endurecer la autenticación.
- Alineación UI ↔ diagrama de BD; modo demo en login.
- HU-01..HU-06 (auth completo: registro con código docente, login, logout+blacklist, refresh, throttling).
- Cierre del modelo: estados (enums) + tabla histórica (`StudentProgressSnapshot`), rediseño de login/registro, fixes de seguridad.
- **Entregable**: capa de identidad real + modelo de datos cerrado.

### Sprint 3 — Cableado del flujo docente · `2026-06-09 → 06-11` ✅
**Meta**: reemplazar los mocks del docente por la API real.
- HU-07, HU-08, HU-09 (crear sala, unirse, listar miembros).
- HU-12 (nodos), HU-13/HU-14 (PDFs + extracción), HU-15/HU-16/HU-17/HU-18 (preguntas manual/IA, aprobación, visibilidad).
- HU-33, HU-34, HU-35 (puntos ciegos, en riesgo, heatmap); eliminación del modo demo.
- **Entregable**: flujo docente end-to-end contra backend real.

### Sprint 4 — Motor de evaluación adaptativa (E4) · `en curso/consolidado` ✅
**Meta**: el estudiante rinde una sesión y se mide su calibración.
- HU-19 (iniciar sesión), HU-20 (selección adaptativa por `p_mastery`).
- HU-21 (declarar confianza), HU-22 (BKT+ICC+snapshot).
- HU-23 (revisión), HU-24 (cierre + snapshot histórico).
- **Entregable**: ciclo de evaluación completo con BKT/ICC.

### Sprint 5 — Inteligencia y panel del estudiante (E5 + E6) ✅
**Meta**: diagnóstico de IA y autoconocimiento del estudiante.
- HU-25..HU-28 (explicación de error, diagnóstico, gate de costo, robustez).
- HU-29..HU-32 (perfil, nodos+tendencia, detalle de nodo, historial).
- **Entregable**: diagnóstico IA condicional + dashboard cognitivo del estudiante.

> **Hasta aquí: estado actual del proyecto (✅).** Lo siguiente es el backlog restante.

### Sprint 6 — Secciones, filtros y normalización · `2026-06-16 → 06-27` (planificado) 🚧
**Meta**: cerrar el modelo de secciones y unificar datos.
- HU-38 (normalizar confianza 0–1) — *primero, desbloquea UI*.
- HU-10 / HU-11 (endpoints de secciones + join con sección).
- HU-37 (filtros por sección en métricas).
- HU-39 (limpiar mocks huérfanos + tabs `room.html`).
- **Entregable**: secciones funcionales end-to-end + datos consistentes.

### Sprint 7 — Calidad, pulido y entrega · `2026-06-30 → 07-11` (planificado) 🚧
**Meta**: sistema verificado, documentado y listo para defensa.
- HU-40 (suite de tests: servicios BKT/ICC + flujo de respuesta).
- HU-41 (responsive 375/768/1280 + accesibilidad).
- HU-36 (feed de actividad docente).
- HU-42 (documentación de despliegue), HU-43 (limpieza de tokens).
- **Entregable**: release candidate + documentación de tesis.

### Roadmap visual (con fechas reales)

```
Sprint 0  2026-04-23→05-03  Concepción + arquitectura + design system        [✅]
Sprint 1  2026-05-17→05-28  Prototipo de 16 pantallas con mocks              [✅]
Sprint 2  2026-06-01→06-08  Alineación de modelo + auth + cierre de datos    [✅]
Sprint 3  2026-06-09→06-11  Cableado del flujo docente (API real)            [✅]
Sprint 4  consolidado       Motor adaptativo (BKT + ICC + sesiones)          [✅]
Sprint 5  consolidado       IA + panel del estudiante                        [✅]
Sprint 6  2026-06-16→06-27  Secciones + filtros + normalización              [🚧]
Sprint 7  2026-06-30→07-11  Calidad + pulido + despliegue + tesis            [🚧]
```

> Nota: los Sprints 0–3 se reconstruyen a partir de fechas de Git (§0.4); los Sprints 4–5 consolidan trabajo de motor/IA realizado de forma transversal. Las fechas de los Sprints 6–7 son **propuestas** a partir de hoy (2026-06-14).

---

## 10. Cómo organizarlo en Jira

### 10.1 Jerarquía recomendada

```
Proyecto Jira: COGNI (tipo: Scrum, software)
└── Epics (8)               → E1 … E8 de la §7
    └── Stories (HU-01 … HU-43)  → con story points, criterios de aceptación
        └── Sub-tasks       → descomposición técnica (modelo, serializer, vista, JS, test)
```

### 10.2 Mapeo directo

- **Crea 8 Épicas** en el backlog: una por cada `E1…E8` (usa el nombre de la épica como resumen).
- **Crea las Historias** `HU-01…HU-43`. En cada una:
  - **Summary**: el título de la historia.
  - **Description**: el enunciado *Como… quiero… para…* + los **criterios de aceptación**.
  - **Story points**: el valor de la columna SP.
  - **Epic Link**: la épica correspondiente.
  - **Labels**: `backend` / `frontend` / `ia` / `infra` / `qa` según aplique.
- **Sub-tareas** sugeridas por historia backend: `modelo+migración`, `serializer`, `vista/endpoint`, `permisos`, `JS/UI`, `test`.

### 10.3 Estados del tablero (workflow)

`To Do → In Progress → In Review → Done`
- Marca como **Done** todas las historias ✅ (Sprints 1–5) si documentas el histórico.
- Deja en **To Do** las 🚧 (Sprints 6–7) en el Backlog, asignadas a sus sprints.

### 10.4 Configuración de Sprints en Jira

1. Activa el **tablero Scrum** y el **Backlog**.
2. Crea los Sprints **Sprint 6** y **Sprint 7** (los 0–5 puedes crearlos cerrados/históricos si quieres trazabilidad completa).
3. Arrastra las historias a su sprint según §9.
4. Fija la **meta del sprint** (Sprint Goal) con el texto de "Meta" de cada sprint.
5. Define la **capacidad** (~30–40 SP) y verifica que el sprint no la exceda.

### 10.5 Ceremonias Scrum (mapeadas a Jira)

| Ceremonia | Frecuencia | Artefacto en Jira |
|---|---|---|
| **Sprint Planning** | Inicio de sprint | Selección de historias al Sprint + Sprint Goal. |
| **Daily Standup** | Diario | Movimiento de tarjetas en el tablero (To Do→In Progress→Done). |
| **Sprint Review** | Fin de sprint | Demo del incremento; cerrar historias **Done**. |
| **Sprint Retrospective** | Fin de sprint | Notas/issues de mejora (tipo *Task* con label `retro`). |
| **Backlog Refinement** | Mitad de sprint | Estimar y priorizar historias del backlog. |

### 10.6 Artefactos Scrum

- **Product Backlog**: las 43 historias priorizadas (§8.2).
- **Sprint Backlog**: subconjunto comprometido por sprint (§9).
- **Incremento**: el software entregable al final de cada sprint (columna "Entregable").

### 10.7 Métricas ágiles a seguir en Jira

- **Burndown chart** por sprint (SP restantes vs. días).
- **Velocity chart** (SP completados por sprint) — útil para estimar Sprints 6–7.
- **Cumulative Flow** (detectar cuellos en *In Review*).

---

## 11. Definición de Hecho (DoD)

Una historia está **Done** cuando:
1. Cumple todos sus criterios de aceptación.
2. El código respeta las reglas de `.claude/rules/` (mobile-first, Flexbox, tokens, sin emojis, MVT, permisos en `APIView`).
3. Endpoints documentados en el mapa de URLs (`CLAUDE.md`) y probados (curl/HTTPie o test).
4. UI verificada a 375/768/1280 px y con accesibilidad básica (labels, aria, foco).
5. Sin regresiones en el flujo del estudiante (la IA degradada no rompe nada).
6. Mergeada a `main` (vía `test`) sin TODO/FIXME sueltos.

---

## 12. Riesgos y supuestos

| Riesgo | Mitigación |
|---|---|
| Costo/latencia de Claude | Gate `ICC < 0.5` + fallbacks seguros (RNF-01, RF-35). |
| Dependencia de calidad de PDFs | Extracción con `pdfplumber`; validar texto vacío antes de generar. |
| Escala (una instancia, síncrono) | Suficiente para alcance de tesis; async/Celery diferido (P6). |
| Deriva de escala de confianza (0–1 vs 0–100) | Priorizar HU-38 en Sprint 6. |
| Modelo `Section` sin endpoints | Cerrar en Sprint 6 (HU-10/11/37). |

---

### Anexos
- `CLAUDE.md` — contexto y mapa de URLs completo.
- `docs/architecture.md` — decisión arquitectónica + stack.
- `docs/database.md` — esquema de BD + diagrama Mermaid.
- `.claude/rules/` — reglas de diseño y desarrollo obligatorias.
