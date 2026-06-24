# Plan de pendientes — CogniRoom

> Estado al 2026-06-24: en `main` ya están las features de **generación de preguntas con IA** (Fases 0-5 de `plan-generacion-ia.md`) y **tipos de pregunta (única / V-F / múltiple) con crédito parcial** + el select custom y el banco agrupado por nodo/tipo. Esto es lo que queda por cablear, ordenado por prioridad. Para mañana (2026-06-25).

---

## 1. Detalle de estudiante para el docente (PRINCIPAL)

**Problema:** el botón "Detalle" en la vista de Estudiantes ([static/js/app/teacher/students.js:190](../static/js/app/teacher/students.js#L190)) es un `<button>` **sin handler ni destino** — no hace nada. No existe ni endpoint ni vista de detalle por estudiante para el docente; el endpoint de la lista ([apps/rooms/views.py:244](../apps/rooms/views.py#L244)) solo trae agregados (perfil, cree/sabe, gap).

**Solución acordada — modal + endpoint** (no página nueva; encaja con el patrón de modales de esa pantalla):

### Backend
- Endpoint nuevo: `GET /api/v1/rooms/{room_id}/students/{student_id}/` (permiso `IsRoomOwner`, solo el docente dueño).
- Devuelve:
  - Resumen: `profile`, `avg_confidence`, `bkt_mastery`, `metacognitive_gap`.
  - **Desglose por nodo**: lista de `{ node, bkt_mastery, icc, profile }` (de `BKTState` + último `CognitiveIndex` por nodo del estudiante en esa sala).
  - **Diagnósticos de Claude** del estudiante en esa sala (`AIDiagnosis`, ordenados por `-generated_at`).
- Montarlo en `apps.cognitive.urls.room_urlpatterns` (ya agrupa métricas room-scoped) o en `apps.rooms.urls`.

### Frontend
- Modal "Detalle de {estudiante}" en [templates/app/teacher/students.html](../templates/app/teacher/students.html).
- Cablear el click de `.student-card__action` para abrir el modal y hacer fetch del endpoint (pasar `student_id` con `data-student-id` en el botón).
- Render: resumen arriba, tabla por nodo (nodo · cree % · sabe % · ICC · perfil) usando las pills/microbars existentes, y las notas de Claude abajo.

**Gate:** abrir el detalle de Jaione (estudiante con datos) y ver su desglose por nodo. Si no tiene diagnósticos (ICC nunca < 0.5), mostrar estado vacío.

---

## 2. Cabos sueltos (menores)

- **Estimación de costo en el panel de generación** (Fase 2): el método `CognitiveAnalysisService.estimate_generation_tokens()` ya existe y funciona, pero **no está cableado a la UI**. Mostrar en el modal "Generar con IA" un "≈ X tokens de entrada" antes de generar (no aplica a PDF nativo: la Files API no soporta token counting).
- **Umbral de diagnósticos `icc < 0.5`** ([apps/sessions/views.py:409](../apps/sessions/views.py#L409)): decisión pendiente. Hoy los diagnósticos de Claude solo se generan en desalineación grave (gap > 0.5). Para que aparezcan más seguido en la demo/tesis, evaluar subirlo a `< 0.6`. Es decisión de producto (afecta costo IA).
- **`explain_error` en opción múltiple**: la nota de error de Claude usa solo la *primera* opción marcada (`answer.selected_index`) en [apps/sessions/views.py](../apps/sessions/views.py). Para múltiple convendría pasar todas las marcadas (`selected_indices`). El `score` ya es correcto; esto es cosmético.
- **Mínimo 2 correctas en opción múltiple**: hoy se valida en el cliente ([static/js/app/teacher/questions.js](../static/js/app/teacher/questions.js)) pero no en el serializer/modelo. Agregar la validación server-side en `ManualQuestionSerializer` y en `Question.clean()`.
- **Select custom en otras páginas** (opcional): hoy `custom-select.js` solo se carga en `questions.html`. Si se quiere el mismo diseño en otras pantallas con selects (pdfs, métricas, perfil), agregar el `<script>` en esos templates (el CSS ya es global vía `_styles.html`).

---

## 3. Documentación / cierre (prometido)

- **Guía de repaso** para entender cada parte de la generación con IA (qué leer y en qué orden): `services/claude_service.py` (prompt + schema + generación + juez + errores), `apps/questions/views.py` (mapeo dict→Question), `apps/questions/models.py` (reglas de aprobación, tipos, scoring), `apps/questions/management/commands/test_generation.py` (la métrica de calidad).
- **Ejercicio completo end-to-end** para validar todo el flujo (crear manual de cada tipo, generar con IA mezclando tipos, responder como estudiante una múltiple parcial, ver el feedback "X%", y forzar un diagnóstico de Claude con sobreconfianza).

---

## Notas de referencia

- Crédito parcial en opción múltiple: `score = (opciones bien clasificadas) / total`; BKT con evidencia blanda mezcla las posteriores por el score (binario 1.0/0.0 idéntico al clásico). Ver `services/bkt_engine.py` y `Question.score_answer()`.
- Para disparar un diagnóstico de Claude al probar: en una evaluación, poner confianza ~95% y responder mal (o confianza ~5% y acertar) hasta que `ICC < 0.5`.
