# Roadmap de desarrollo — CogniRoom

> Plan de implementación para cerrar el modelo de datos y cablear el backend real
> al frontend (hoy "quemado" con mocks). Decisiones tomadas con el autor:
> histórico = **snapshot por sesión**, estados = **enums donde aporta**,
> orden de cableado = **flujo estudiante primero**.
>
> Principio rector: **primero cerrar el modelo de datos** (no migrar a mitad del
> cableado), **luego el flujo estudiante end-to-end**, **después docente**.

---

## Estado actual (verificado en código, no en docs)

- **Modelos:** los 5 apps están migrados. `Section` ya existe. Hay snapshots
  históricos parciales: `CognitiveIndex` guarda ICC por respuesta.
- **Backend:** vistas + serializers en las 5 apps (~1130 líneas). El esqueleto
  REST existe; no se parte de cero.
- **Frontend:** casi todas las páginas importan **a la vez** su `*-mock.js` y
  `api.js`. Están "quemadas": pintan datos mock aunque el cliente HTTP exista.
  El trabajo es *reemplazar la fuente mock por fetch real*, no construir vistas
  de cero.

### Gaps reales detectados (justifican Fase 0)
- No hay estado `rejected` para preguntas: `is_approved` es booleano, no
  distingue *pendiente* de *rechazada*.
- `EvaluationSession.status` solo tiene `active/completed` — falta
  `abandoned`/`expired`.
- `PDFDocument.processed` es booleano, no captura `processing`/`failed`.
- `Answer` no persiste el `bkt_mastery` al momento de cada respuesta → no se
  puede reconstruir la curva de aprendizaje real.
- `AIDiagnosis.risk_node` es JSONField frágil, sin relación clara con `KnowledgeNode`.

---

## Fase 0 — Cerrar el modelo de datos (fundamento, 1ª prioridad)

> Por qué primero: cambiar modelos *después* de cablear obliga a tocar
> serializers, JS y seed dos veces. Se hace una sola vez, ahora.

### 0.1 — Estados como enums (reemplazar booleanos pobres)

| Modelo | Hoy | Cambio | Nota de migración |
|---|---|---|---|
| `Question` | `is_approved` (bool) | `status`: `pending`/`approved`/`rejected` | Mantener `is_approved` como `@property` derivada (`status == 'approved'`) para no romper queries |
| `EvaluationSession` | `status` active/completed | añadir `abandoned`, `expired` | Solo amplía choices, no rompe nada |
| `PDFDocument` | `processed` (bool) | `status`: `uploaded`/`processing`/`processed`/`failed` | `processed` como `@property` |

Regla de oro: la lógica de auto-aprobación en `Question.save()`
([apps/questions/models.py:65](../../apps/questions/models.py#L65)) pasa a
escribir `status` en vez de `is_approved`. El estado `rejected` desbloquea el
botón "rechazar" del banco docente que hoy no tiene backend.

### 0.2 — Tabla histórica: `StudentProgressSnapshot`

App `cognitive`. Se escribe **una fila al cerrar cada sesión** (en
`POST /sessions/{id}/complete`):

```python
class StudentProgressSnapshot(models.Model):
    student   = FK(User)
    room      = FK(Room)
    session   = FK(EvaluationSession)        # 1:1 lógico
    avg_icc            = FloatField()         # ICC promedio de la sesión
    avg_bkt_mastery    = FloatField()
    avg_gap            = FloatField()
    dominant_profile   = CharField(choices=PROFILE)  # over/under/calibrated
    questions_answered = IntegerField()
    correct_count      = IntegerField()
    created_at         = DateTimeField(auto_now_add=True)
    class Meta:
        ordering = ['created_at']
        indexes  = [Index(fields=['student', 'room', 'created_at'])]
```

Alimenta la **curva de evolución cognitiva** (history.js, profile.js,
node-detail.js) — el aporte visible de la tesis. Hoy esas gráficas son mock puro.

### 0.3 — Snapshot por respuesta (gap crítico)

Añadir `bkt_mastery_snapshot = FloatField()` a `Answer`. Sin esto, session-review
no puede mostrar el mastery al momento de cada respuesta (solo el actual, ya
sobreescrito). Una línea, gran retorno.

### 0.4 — `AIDiagnosis → KnowledgeNode`

Añadir `node = FK(KnowledgeNode, null=True)` para que node-detail y diagnoses
unan diagnóstico↔nodo sin parsear JSON.

**Entregable Fase 0:** un solo paquete de migraciones + `seed_demo` actualizado
que genere 2-3 sesiones históricas por estudiante (para que las gráficas tengan
datos al cablear). Comando:
`python manage.py makemigrations cognitive questions evaluation_sessions`.

---

## Fase 1 — Flujo estudiante end-to-end (el corazón)

> Cablear cada pantalla = reemplazar su `import './*-mock.js'` por fetch real vía
> `api.js`. El cliente HTTP ya existe.

Orden de cableado (sigue el viaje real del estudiante):

1. **Auth real** — `auth.js` → `POST /auth/login` + guardar JWT (verificar refresh).
2. **`my-rooms.js`** → `GET /rooms/` (salas del estudiante). Quitar `MOCK_ROOMS`.
3. **`session.js`** → ciclo completo, backend en
   [apps/sessions/views.py:148](../../apps/sessions/views.py#L148):
   `POST /sessions` → `GET /sessions/{id}/next-question` →
   `POST /sessions/{id}/answers` → `POST /sessions/{id}/complete`.
   Verificar que el flujo BKT→ICC→Claude devuelve el JSON que el front espera.
4. **`session-review.js`** → leer `Answer` con el nuevo `bkt_mastery_snapshot`.
5. **`history.js` + `node-detail.js`** → `GET /me/nodes` + `StudentProgressSnapshot`.
6. **`profile.js` + `diagnoses.js`** → `GET /me/profile`, `GET /me/diagnoses`.

**Hito de tesis:** estudiante hace login → responde sesión → ve ICC/gap real →
recibe diagnóstico IA. Demostrable end-to-end. El "momento wow".

---

## Fase 2 — Flujo docente

7. **`rooms.js`** → `GET/POST /rooms/`, secciones.
8. **`students.js`** → `GET /rooms/{id}/members` con sección.
9. **`questions.js`** → banco + generar IA (`/questions/generate`) +
   **aprobar/rechazar** (ahora con estado `rejected` real).
10. **`pdfs.js`** → subida multipart + estados de procesamiento.
11. **`metrics.js`** → `GET /rooms/{id}/metrics/blind-spots` + `at-risk`
    (puntos ciegos colectivos, IPC).

---

## Fase 3 — Pulido e impacto

- Endpoint de **evolución temporal** (`GET /me/progress?room=`) sirviendo los
  snapshots → gráfica de calibración a lo largo del tiempo.
- Predicción de riesgo basada en tendencia de snapshots (no solo última foto).
- Validar el gate de Claude (`icc < 0.5`) y los defaults vacíos sin API key.

---

## Cómo trabajamos cada paso

Para cada pantalla cableada:
1. Verificar que el endpoint devuelve lo que el front espera.
2. Ajustar serializer si hay mismatch (ej. escala de `confidence` 0–1 vs 0–100).
3. Reemplazar la fuente mock por fetch real.
4. Probar a 375 / 768 / 1280 px. Sin tocar diseño ni tokens.

---

## Arranque recomendado

Empezar por **Fase 0.1 + 0.2** (estados + tabla histórica en una sola tanda de
migraciones): desbloquea todo lo demás y es exactamente lo que pidió el asesor.