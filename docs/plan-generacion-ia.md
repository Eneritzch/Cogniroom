# Plan — Generación de preguntas con IA (CogniRoom)

> Plan por fases para montar la generación de preguntas con Claude de la mejor forma: calidad psicométrica (no ambiguas, impresionantes), costo controlado y métricas para la tesis. Cada fase es incremental y verificable; no se avanza sin probar la anterior.
>
> Estado de partida (2026-06-17): existe `services/claude_service.py` con `generate_questions()` básico (modelo `claude-sonnet-4-5`, `max_tokens=1024`, prompt mínimo, sin structured outputs). La API key en `.env` es un placeholder (17 caracteres) — no funcional.

---

## Valores de referencia de la API

| Modelo | ID | Contexto | Salida | $/1M in | $/1M out |
|---|---|---|---|---|---|
| Claude Fable 5 | `claude-fable-5` | 1M | 128K | 10 | 50 |
| **Claude Opus 4.8** | `claude-opus-4-8` | 1M | 128K | 5 | 25 |
| Claude Sonnet 4.6 | `claude-sonnet-4-6` | 1M | 64K | 3 | 15 |
| Claude Haiku 4.5 | `claude-haiku-4-5` | 200K | 64K | 1 | 5 |

**Decisión de modelos por uso (costo-calidad):**
- **Generar preguntas** (docente, poco frecuente, calidad crítica) → `claude-opus-4-8`.
- **Diagnóstico/explicación por respuesta** (ICC<0.5, frecuente) → `claude-sonnet-4-6`.

Capacidades que se aprovechan: structured outputs, adaptive thinking + effort, prompt caching, Files API (PDF nativo), token counting, Batches (opcional).

---

## Fase 0 — Prerrequisitos

**Meta:** entorno listo para llamar a la API de verdad.

- [ ] **API key real** en `.env`: `ANTHROPIC_API_KEY=sk-ant-...` (la actual es placeholder).
- [ ] Separar el modelo por método en `CognitiveAnalysisService` (no un único `MODEL`):
  - `MODEL_GENERATION = "claude-opus-4-8"`
  - `MODEL_ANALYSIS = "claude-sonnet-4-6"`
- [ ] Subir `max_tokens` de generación a ~8000 (1024 trunca varias preguntas).
- **Gate:** `python manage.py shell` → instanciar el servicio y confirmar que `self.client` no es `None`.

> Si la key falta, todos los métodos siguen devolviendo defaults vacíos (regla intocable: el flujo del estudiante nunca se rompe por IA).

---

## Fase 1 — Generación robusta (núcleo)

**Meta:** preguntas no ambiguas y bien formadas, con JSON garantizado.

- [ ] **Structured outputs**: pasar `output_config={"format": {"type": "json_schema", "schema": QUESTION_SCHEMA}}`. Esquema con `text`, `options[4]`, `correct_index ∈ {0..3}`, `difficulty`, y dos campos nuevos:
  - `rationale` — por qué la correcta es correcta.
  - `misconception_targeted` — el error conceptual que captura cada distractor.
- [ ] **Adaptive thinking**: `thinking={"type": "adaptive"}` + `output_config={"effort": "high"}` → el modelo razona antes de redactar (menos ambigüedad).
- [ ] **Prompt de calidad** (system): reglas de construcción de ítems (estilo Haladyna):
  1. Exactamente una opción inequívocamente correcta.
  2. Distractores plausibles que atacan errores conceptuales reales y distintos (sin "todas/ninguna de las anteriores").
  3. El enunciado se responde sin ver las opciones.
  4. Opciones homogéneas (longitud, gramática, detalle).
  5. Una sola idea por pregunta; sin dobles negaciones.
  6. Anclado solo en el material; si no alcanza para una pregunta limpia, generar menos.
- [ ] Mapear `rationale`/`misconception_targeted` al modelo. Decisión: persistirlos (campos nuevos en `Question`) o usarlos solo en revisión. **Recomendado persistir `rationale`** (alimenta la explicación de error del estudiante sin otra llamada IA).
- **Gate E2E:** `POST /rooms/{id}/questions/generate/` con un material real → devuelve N preguntas, todas con 4 opciones, `correct_index` válido, y rationale/misconception presentes. En sala `group` quedan `pending`.

**Por qué es lo primero:** es la palanca que vuelve las preguntas "impresionantes y no ambiguas". Todo lo demás es eficiencia o medición alrededor de esto.

---

## Fase 2 — Eficiencia de costo

**Meta:** generar muchas preguntas del mismo material sin pagar el material cada vez.

- [ ] **Prompt caching del material**: marcar el bloque del PDF con `cache_control: {"type": "ephemeral"}`. La 1ª generación paga el material; las siguientes (otros nodos, más preguntas) lo leen a ~10% del costo. (Mínimo cacheable en Opus 4.8: 4096 tokens — un PDF típico lo supera.)
- [ ] **Token counting** antes de generar: `client.messages.count_tokens(...)` para estimar y mostrar el costo aproximado en el panel docente.
- [ ] *(Opcional)* **Batches API** si se generan lotes grandes no urgentes (50% de descuento). Diferible hasta que el volumen lo justifique.
- **Gate:** generar 2 lotes del mismo PDF y verificar en `response.usage.cache_read_input_tokens > 0` en el segundo.

---

## Fase 3 — Calidad de la fuente (PDF nativo)

**Meta:** que Claude lea el PDF completo (tablas, fórmulas, figuras), no solo el texto plano de `pdfplumber`.

- [ ] **Files API**: subir el PDF una vez (`client.beta.files.upload`, beta `files-api-2025-04-14`), guardar el `file_id` en `PDFDocument`.
- [ ] Generar pasando un bloque `document` con ese `file_id` en vez del `extracted_text`.
- [ ] Mantener `pdfplumber` como respaldo (búsqueda, previsualización, y fuente si la key falta).
- **Gate:** generar desde un PDF con una tabla y verificar que alguna pregunta usa datos de la tabla (que el texto plano perdía).

> Mejora la calidad real de las preguntas en materiales técnicos — argumento fuerte para la tesis.

---

## Fase 4 — Evaluación para la tesis (medición)

**Meta:** métricas objetivas de "eficiencia / no-ambigüedad", no solo impresión.

- [ ] **Comando** `python manage.py test_generation` que: toma un material de ejemplo → genera un lote → imprime las preguntas con su rationale.
- [ ] **Juez automático (LLM-as-judge)**: una 2ª llamada que puntúa cada pregunta (1–5) contra una rúbrica con structured outputs:
  - ¿Una sola respuesta correcta? · ¿Distractores plausibles? · ¿Enunciado claro sin ver opciones? · ¿Anclado al material? · ¿Opciones homogéneas?
- [ ] **Reporte**: % de preguntas sin ambigüedad, score medio por criterio, distribución de dificultad, nº de errores conceptuales cubiertos. → tablas directas para el capítulo de resultados.
- **Gate:** correr la evaluación sobre ≥20 preguntas y obtener el reporte agregado.

---

## Fase 5 — Robustez y operación

**Meta:** que nada se rompa y los costos no se disparen.

- [ ] **Errores tipados**: capturar `RateLimitError`, `APIStatusError`, `AuthenticationError` y degradar a defaults vacíos (nunca romper el flujo).
- [ ] **Reintentos**: el SDK ya reintenta 429/5xx con backoff (`max_retries`, default 2) — confirmar, no reimplementar.
- [ ] **Límites**: `count` de generación acotado (1–20) — ya existe; mantener.
- [ ] **Gate de costo de IA por respuesta** (`ICC < 0.5`) intacto, en `claude-sonnet-4-6`.
- **Gate:** simular key inválida → generación devuelve `[]` y el resto de la app sigue 200.

---

## Orden recomendado y criterio de cierre

`Fase 0 → 1 → 4 → 2 → 3 → 5`

- **0 y 1** desbloquean lo esencial (preguntas de calidad).
- **4** (evaluación) va temprano: con métricas iteras el prompt con evidencia, no a ojo.
- **2 y 3** optimizan costo y fuente.
- **5** endurece para entrega.

Cada fase cierra con su gate verde + commit en `test`; merge a `main` al terminar 0-1-4 (lo demostrable para la tesis).

---

## Snippet de referencia (Fase 1)

```python
QUESTION_SCHEMA = {
    "type": "object",
    "properties": {
        "questions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "text": {"type": "string"},
                    "options": {"type": "array", "items": {"type": "string"}},
                    "correct_index": {"type": "integer", "enum": [0, 1, 2, 3]},
                    "difficulty": {"type": "string", "enum": ["easy", "medium", "hard"]},
                    "rationale": {"type": "string"},
                    "misconception_targeted": {"type": "string"},
                },
                "required": ["text", "options", "correct_index", "difficulty",
                             "rationale", "misconception_targeted"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["questions"],
    "additionalProperties": False,
}

response = self.client.messages.create(
    model="claude-opus-4-8",
    max_tokens=8000,
    thinking={"type": "adaptive"},
    output_config={"format": {"type": "json_schema", "schema": QUESTION_SCHEMA}},
    system=SYSTEM_RULES,          # las 6 reglas de construcción de ítems
    messages=[{"role": "user", "content": user_prompt}],
)
```
