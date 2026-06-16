# Plan de ejecución — CogniRoom

> Plan operativo para **dejar subido hoy** el estado actual y **arrancar mañana** el trabajo pendiente, ejecutando cada paso con **pruebas end-to-end (E2E)** y verificando que todo quede correcto antes de avanzar.
>
> Estado verificado el **2026-06-15**: backend + frontend cableados y respondiendo (flujo estudiante y endpoints docente probados en vivo, todos 200). Base lista para la siguiente fase.

---

## Parte 0 — HOY: dejar subido (cierre del día)

Objetivo: que el repositorio quede con la planificación y la documentación del modelo guardadas, sin tocar código.

1. **Commit de documentación** (rama `main`, son artefactos estables, no código inestable):
   - `docs/planificacion-scrum.md` — metodología, HU, RF/RNF, sprints.
   - `docs/modelo-entidad-relacion.md` — apartado MER para la tesis.
   - `docs/plan-ejecucion.md` — este plan.
   - `3.M.docx` — capítulo de metodología (artefacto de tesis).
2. **Push a `origin/main`.**
3. **Confirmación**: `git status` limpio y `git log origin/main..HEAD` vacío (todo subido).

> Nota: si prefieres no versionar el binario `3.M.docx` en el repo de código, se excluye del commit y se deja solo local. Decidir antes de commitear.

---

## Parte 1 — MAÑANA: ejecución con gates E2E

**Regla de oro de cada paso**: *no se avanza al siguiente hasta que su prueba E2E pase en verde y el cambio quede commiteado.* Trabajo en rama `test` (desarrollo activo); merge a `main` al cerrar cada bloque estable.

### Preparación (10 min)
- [ ] `git checkout test` (o crear `feature/<tarea>` desde `test`).
- [ ] `venv\Scripts\activate`
- [ ] `python manage.py migrate` y `python manage.py runserver` → confirmar `GET /api/v1/` = 200.
- [ ] **Smoke test base** (debe pasar tal como hoy): login estudiante → sala → sesión → next-question → answer (BKT/ICC) → complete → profile. Si esto falla, parar y diagnosticar antes de tocar nada.

---

### Bloque A — Normalización de la escala de confianza (P2 · prioridad 1)
*Por qué primero: desbloquea la correctitud de las barras "cree saber %" en varias pantallas.*

- [ ] Decidir fuente única: backend persiste `confidence_declared` en **0.0–1.0**; la UI muestra **0–100%**. Normalizar en el serializer/cliente, no duplicar lógica.
- [ ] Ajustar `session.js` (envío) y las vistas que muestran confianza (`session-review`, `node-detail`, `profile`).
- **Gate E2E**:
  - [ ] Enviar respuesta con confianza 80% desde la UI → `Answer.confidence_declared == 0.8` en BD.
  - [ ] `session-review` muestra "80%" (no "0.8" ni "8000%").
  - [ ] `icc_value` calculado sigue coherente (sin saltos por la escala).
- [ ] Commit: `fix: normalizar escala de confianza 0-1 vs 0-100`.

---

### Bloque B — Endpoints de Secciones (P1 · HU10/HU11)
*El modelo `Section` ya está migrado; faltan vistas/serializers.*

- [ ] Serializers: `SectionSerializer`, `SectionCreateSerializer`.
- [ ] Endpoints bajo `apps.rooms.urls`:
  - `GET/POST /api/v1/rooms/{id}/sections/`
  - `PATCH/DELETE /api/v1/rooms/{id}/sections/{sid}/`
- [ ] Extender `POST /rooms/join/` con `section_id` opcional.
- [ ] Extender `GET /rooms/{id}/members/` con `section: {id, code, name}` por membresía.
- [ ] Añadir métodos a `api.js` (`sections.list/create/update/delete`).
- **Gate E2E**:
  - [ ] Docente crea sección "A" → 201; código duplicado en la misma sala → 400.
  - [ ] Estudiante hace join con `section_id` → membresía con sección asignada.
  - [ ] `members/` devuelve la sección por alumno.
  - [ ] Borrar la sección → alumno permanece en la sala con `section = null` (no expulsado).
- [ ] Commit: `feat: endpoints CRUD de secciones + join con seccion`.

---

### Bloque C — Filtros por sección en métricas (HU37)
*Depende de B.*

- [ ] Añadir `?section_id=` a `blind-spots`, `at-risk` y `heatmap` (filtra `student__room_memberships__section`).
- [ ] UI: selector de sección en el panel docente que repinta las métricas.
- **Gate E2E**:
  - [ ] `heatmap?section_id=X` solo incluye alumnos de esa sección.
  - [ ] Sin `section_id` → comportamiento actual intacto (toda la sala).
- [ ] Commit: `feat: filtrado de metricas docentes por seccion`.

---

### Bloque D — Limpieza de mocks + tabs de `room.html` (P3 · P4)
- [ ] Eliminar mocks huérfanos: `student-mock.js`, `teacher-mock.js`, `room-mock.js` (ya no se importan).
- [ ] Conectar al backend real los tabs pendientes de `room.html` (students/questions/pdfs) que aún muestran placeholder.
- **Gate E2E**:
  - [ ] Cada tab de `room.html` carga datos reales (no placeholder).
  - [ ] `grep -r "mock" static/js/app` → sin referencias vivas.
- [ ] Commit: `chore: eliminar mocks huerfanos y cablear tabs de room`.

---

### Bloque E — Suite de tests automatizados (P9)
*Formalizar lo que hoy probamos a mano.*

- [ ] Unit: `services/bkt_engine.py` (curva correcto/incorrecto, clamp [0,1]) y `services/icc_calculator.py` (gap, umbrales ±0.2).
- [ ] Integración: flujo `answers` (BKT→ICC→snapshot), reglas de aprobación de `Question.save()`, gate `ICC < 0.5`.
- [ ] Permisos: at-risk/heatmap solo dueño; estudiante solo ve preguntas aprobadas.
- **Gate E2E**:
  - [ ] `python manage.py test` → todo verde.
- [ ] Commit: `test: suite de servicios y flujo de evaluacion`.

---

### Bloque F — Pulido responsive y accesibilidad (P11)
- [ ] Revisar cada vista a **375 / 768 / 1280 px**.
- [ ] Checklist `.claude/rules`: tokens (sin hex), Flexbox (sin grid), sin emojis, `<label>` asociados, `aria-*`, foco visible, tap ≥ 44px, métricas en `font-mono`.
- **Gate E2E (manual)**:
  - [ ] Recorrido visual de las 16 pantallas en los 3 anchos sin roturas.
- [ ] Commit: `style: pulido responsive y accesibilidad final`.

---

## Decisión pendiente antes de empezar
- [ ] **HU13 (historial de progreso / `StudentProgressSnapshot`)**: definir si se quita solo de la documentación, también del código, o se marca como descartada. Afecta a `student_progress_snapshot`, su escritura en `/complete`, la pantalla de historial y el MER. **Resolver antes del Bloque E** (los tests dependen de si la feature sigue o no).

## Orden recomendado y criterio de cierre
`A → B → C → D → E → F`. Cada bloque cierra con su gate E2E en verde + commit. Al terminar B–C–D (lo funcional pendiente), merge `test → main`. E y F pueden ir en una segunda tanda.

## Backlog diferible (no bloquea la entrega)
- Feed de actividad docente (HU36 / P5).
- Procesamiento async de PDFs (P6).
- Limpieza periódica de tokens en blacklist (P7).
- Documentación de despliegue productivo (P10).
