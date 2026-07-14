# Modelo cognitivo de CogniRoom

> Cómo funciona el modelo de negocio, sus cálculos internos y en qué se fundamenta cada pieza.
> Documento conceptual — el detalle de implementación vive en [`services/`](../services/) y [`apps/cognitive/`](../apps/cognitive/).

---

## Índice

1. [La idea central](#1-la-idea-central)
2. [Las dos señales que medimos](#2-las-dos-señales-que-medimos)
3. [BKT — lo que realmente sabe](#3-bkt--lo-que-realmente-sabe)
4. [ICC — lo que cree saber vs. lo real](#4-icc--lo-que-cree-saber-vs-lo-real)
5. [Cuadrante cognitivo](#5-cuadrante-cognitivo)
6. [IPC — el punto ciego colectivo](#6-ipc--el-punto-ciego-colectivo)
7. [El flujo completo, paso a paso](#7-el-flujo-completo-paso-a-paso)
8. [Fundamentos científicos](#8-fundamentos-científicos)
9. [Glosario rápido](#9-glosario-rápido)

---

## 1. La idea central

CogniRoom **no mide cuánto sabe** un estudiante. Mide la **brecha entre lo que cree saber y lo que realmente sabe** — la *sobreconfianza académica*.

La intuición pedagógica es simple:

- Un alumno que saca 6/10 y **cree** que sacó 6/10 está bien: sabe dónde está parado.
- El peligroso es el que saca 4/10 y **cree** que domina el tema, porque **no va a estudiar aquello que no sabe que no sabe**.

Todo el producto gira alrededor de detectar y cuantificar esa desalineación, tema por tema, para cada estudiante y para el grupo completo.

---

## 2. Las dos señales que medimos

Por cada **tema** (llamado *nodo de conocimiento*) el sistema estima dos cosas **independientes**:

| Señal | Cómo se obtiene | Dónde vive |
|---|---|---|
| **Lo que realmente sabe** | Se **infiere** de sus respuestas con el motor BKT | `p_mastery` en `BKTState` |
| **Lo que cree saber** | Se le **pregunta directamente** *antes* de responder cada pregunta | `confidence_declared` en `Answer` |

El truco de diseño está en el orden: se pide la confianza **antes** de responder, para que sea una declaración honesta y no una racionalización posterior.

Todo lo demás (ICC, cuadrante, punto ciego, alerta al docente, diagnóstico con IA) sale de **cruzar estas dos señales**.

---

## 3. BKT — lo que *realmente* sabe

### Qué es

**BKT** (Bayesian Knowledge Tracing, *rastreo bayesiano del conocimiento*) modela el dominio de un tema como una **probabilidad oculta** `p_mastery` entre 0 y 1, que se **actualiza con el teorema de Bayes** cada vez que el estudiante responde.

Formalmente es un modelo oculto de Markov con dos estados: *sabe* / *no sabe*. Nunca observamos el estado directamente (no podemos abrir la cabeza del alumno); solo vemos aciertos y fallos, y desde ahí inferimos la probabilidad de que sepa.

### Los 4 parámetros

| Parámetro | Valor inicial | Qué significa |
|---|---|---|
| `p_mastery` | **0.30** | Probabilidad de que ya domine el tema. *Es lo que se actualiza.* |
| `p_transit` | **0.09** | Probabilidad de **aprender** en cada intento (pasar de no-sabe a sabe). |
| `p_slip` | **0.10** | Probabilidad de **fallar aun sabiendo** (un desliz, una distracción). |
| `p_guess` | **0.20** | Probabilidad de **acertar sin saber** (adivinar). 0.20 = 1 de 5 opciones. |

`slip` y `guess` son la clave de por qué BKT es robusto: le permiten distinguir un **desliz** de un **no-saber**, y un **acierto real** de uno **adivinado**. Sin ellos, un solo error borraría todo el historial.

### El cálculo, en dos pasos

**Paso 1 — Corrección bayesiana.** *Dada esta respuesta, ¿qué tan probable es que supiera?*

Si **acertó**:

```
P(acertar)  = p_mastery·(1 − slip) + (1 − p_mastery)·guess
posterior   = p_mastery·(1 − slip) / P(acertar)
```

Si **falló**:

```
P(fallar)   = p_mastery·slip + (1 − p_mastery)·(1 − guess)
posterior   = p_mastery·slip / P(fallar)
```

**Paso 2 — Aprendizaje.** *Además, pudo haber aprendido al resolver la pregunta:*

```
new_mastery = posterior + (1 − posterior)·p_transit
```

El resultado se recorta a [0, 1] y se redondea a 4 decimales.

### Ejemplo numérico

Un estudiante empieza en `p_mastery = 0.30`.

**Caso A — falla:**
```
P(fallar)   = 0.30·0.10 + 0.70·0.80 = 0.03 + 0.56 = 0.59
posterior   = 0.03 / 0.59 = 0.0508          ← fallar es fuerte evidencia de que no sabía
new_mastery = 0.0508 + 0.9492·0.09 = 0.136  ← cae de 0.30 a 0.14
```

**Caso B — acierta:**
```
P(acertar)  = 0.30·0.90 + 0.70·0.20 = 0.27 + 0.14 = 0.41
posterior   = 0.27 / 0.41 = 0.659           ← acertar sube el dominio
new_mastery = 0.659 + 0.341·0.09 = 0.689    ← sube de 0.30 a 0.69
```

Sube fuerte al acertar porque **adivinar es poco probable** (0.20): si acertó, lo más probable es que supiera.

### Crédito parcial (extensión propia de CogniRoom)

El BKT clásico es binario (acertó / falló). CogniRoom lo extiende para preguntas de **opción múltiple con varias respuestas correctas**:

- `score_answer()` devuelve la **proporción de opciones bien clasificadas** (marcar una correcta o dejar una incorrecta sin marcar cuenta como acierto), un valor en [0, 1].
- BKT **mezcla las dos posteriores** según ese score:

  ```
  posterior = score·posterior_acierto + (1 − score)·posterior_fallo
  ```

Con score 1.0 o 0.0 el resultado es **idéntico** al BKT binario clásico; los valores intermedios dan granularidad sin romper la matemática.

**Código:** [`services/bkt_engine.py`](../services/bkt_engine.py)

---

## 4. ICC — lo que *cree* saber vs. lo real

### Qué es

**ICC** (Index of Cognitive Calibration, *índice de calibración cognitiva*) compara la **confianza declarada** (antes de responder) contra el **dominio real** que estimó BKT (después):

```
brecha_metacognitiva = confianza_declarada − bkt_mastery
ICC = 1 − |brecha_metacognitiva|
```

- **ICC = 1** → calibración perfecta: cree saber exactamente lo que sabe.
- **ICC baja** → desalineado, sin importar en qué dirección.

### El perfil de 3 vías

Según el **signo y tamaño** de la brecha (umbral de ±0.2):

| Brecha | Perfil | Lectura |
|---|---|---|
| **> 0.2** | `overconfident` | Cree saber **más** de lo que sabe. **← el objetivo del producto.** |
| **< −0.2** | `underconfident` | Sabe **más** de lo que cree. Le falta seguridad. |
| entre −0.2 y 0.2 | `calibrated` | Bien ajustado. |

> El umbral es estricto: una brecha de **exactamente 0.2** todavía es `calibrated` (no supera el `> 0.2`).

### Ejemplo

Retomando el estudiante que **falló** (mastery quedó en 0.136) pero había declarado **mucha confianza** (0.9):

```
brecha = 0.9 − 0.136 = 0.764
ICC    = 1 − 0.764 = 0.236
perfil = overconfident   (0.764 > 0.2)
```

Un ICC de 0.236 es una desalineación severa. Este es exactamente el caso que:
- dispara el **diagnóstico con IA** (gate `icc < 0.6`), y
- genera la **alerta al docente** si cae en cuadrante crítico.

**Código:** [`services/icc_calculator.py`](../services/icc_calculator.py)

---

## 5. Cuadrante cognitivo

### El problema del perfil de 3 vías

Una brecha **pequeña** puede esconder dos situaciones opuestas:

- "sabe (0.8) y confía (0.8)" → **todo bien**
- "no sabe (0.2) y no confía (0.2)" → **honesto, pero necesita estudiar**

Ambos tienen brecha ≈ 0 y salen `calibrated`, pero pedagógicamente **no son lo mismo**. El perfil de 3 vías los confunde.

### La solución: una matriz 2×2

El cuadrante cruza las **dos dimensiones por separado** (umbral 0.6 en cada eje):

|                       | **Confía** (≥ 0.6)                       | **No confía** (< 0.6)                |
|-----------------------|------------------------------------------|--------------------------------------|
| **Sabe** (≥ 0.6)      | `calibrated` — *Sabe y confía*           | `underconfident` — *Sabe pero no confía* |
| **No sabe** (< 0.6)   | `overconfident` — *No sabe y está confiado* **← CRÍTICO** | `aware_gap` — *No sabe y lo reconoce* |

- El **único cuadrante crítico** es `overconfident`: no sabe **y** está confiado. Es el estudiante en riesgo real, porque su propia confianza le impide detectar el vacío.
- `aware_gap` **no es alerta**: no sabe, pero lo reconoce, así que va a estudiar por su cuenta.

> El umbral 0.6 es **inclusivo**: exactamente 0.6 cuenta como "sabe" y como "confía".

**Código:** [`services/cognitive_quadrant.py`](../services/cognitive_quadrant.py)

---

## 6. IPC — el punto ciego colectivo

### Qué es

**IPC** (Index of Pedagogical Calibration) lleva la señal individual al **nivel del aula**. Es el **promedio de ICC de todos los estudiantes en un mismo tema**:

```
IPC(tema) = promedio( ICC de cada estudiante en ese tema )

si IPC < 0.5  →  punto ciego colectivo
```

### Para qué sirve

Detecta temas donde **toda la clase** está desalineada — típicamente un concepto que el docente cree haber explicado bien, pero que genera **sobreconfianza masiva** (un error conceptual compartido).

Es la señal que le dice al profesor *"vuelve a explicar esto"* — no a un alumno, sino **al grupo entero**. Un promedio de notas no lo mostraría; el patrón confianza-vs-acierto sí.

**Código:** [`_recalc_blind_spot`](../apps/sessions/views.py) · modelo `BlindSpotIndex`.

---

## 7. El flujo completo, paso a paso

Cuando el estudiante envía una respuesta, esto ocurre en orden estricto y transaccional
(endpoint `POST /api/v1/sessions/{id}/answers/`):

```
1. SCORE
   score_answer() → acierto (1.0/0.0) o crédito parcial [0,1]

2. BKT
   BKTEngine.update() → nuevo p_mastery
   se guarda BKTState, attempts++

3. ICC
   ICCCalculator.calculate(confianza, mastery) → icc, brecha, perfil

4. SNAPSHOT HISTÓRICO
   se crea un CognitiveIndex (foto inmutable para graficar la evolución)

5. SIGUIENTE PREGUNTA (selección adaptativa)
   next-question ordena los nodos por p_mastery ascendente
   → ataca el TEMA MÁS DÉBIL primero

6. SI ES SALA GRUPAL
   → recalcula el IPC del tema
   → si el alumno cayó en cuadrante CRÍTICO: alerta in-app al docente
     (con cooldown de 12 h para no repetir)

7. SI icc < 0.6  (desalineación)
   → dispara, en un hilo aparte, el diagnóstico con IA (Claude):
       · feedback empático para el estudiante
       · diagnóstico en lenguaje llano para el docente
   → nunca bloquea la respuesta; si no hay IA, devuelve defaults vacíos
```

Dos decisiones de diseño importantes:

- **La IA es opcional y no bloqueante.** Corre fuera del request, en background. Si falla o no hay API key, el flujo del estudiante **nunca se rompe**. Además solo se llama cuando `icc < 0.6`, para controlar costos.
- **La selección ataca el nodo más débil** porque es *mastery learning*: no tiene sentido avanzar mientras haya un vacío sin consolidar.

**Código:** [`apps/sessions/views.py`](../apps/sessions/views.py)

---

## 8. Fundamentos científicos

Cada métrica se apoya en literatura establecida, no en heurísticas inventadas:

| Pieza | Sustento |
|---|---|
| **BKT** (dominio real) | Corbett & Anderson (1994), *"Knowledge Tracing: Modeling the Acquisition of Procedural Knowledge"* — el estándar en tutores inteligentes (Cognitive Tutor, ASSISTments). |
| **slip / guess** | Teoría de detección de señal aplicada a ítems: separar el ruido (desliz/adivinanza) de la señal (saber/no saber). |
| **ICC / brecha** | Calibración de la confianza (Lichtenstein, Fischhoff & Phillips, 1982) y **metacognición** (Flavell, 1979: "pensar sobre el propio pensar"). |
| **Cuadrante crítico** | Efecto **Dunning-Kruger** (1999): los menos competentes son los que más sobreestiman su competencia, porque les falta la habilidad para reconocer sus errores. |
| **IPC / punto ciego** | Investigación sobre *misconceptions* y *concept inventories* (p. ej. el Force Concept Inventory de Hestenes): errores sistemáticos compartidos, invisibles en una nota promedio. |
| **Nivel cognitivo de las preguntas** | Taxonomía de **Bloom** revisada (Anderson & Krathwohl, 2001): recordar → comprender → aplicar → analizar → evaluar → crear. |
| **Generación de preguntas (Claude)** | Reglas de redacción de ítems de **Haladyna**: una sola respuesta inequívoca, distractores plausibles, enunciado autónomo, opciones homogéneas. |
| **Selección adaptativa** | *Mastery learning* (Bloom, 1968): no avanzar hasta consolidar; práctica dirigida a los puntos flacos. |

---

## 9. Glosario rápido

| Término | En una frase |
|---|---|
| **Nodo de conocimiento** | Un tema evaluable dentro de una sala (ej. "Recursividad"). |
| **`p_mastery` (BKT)** | Probabilidad estimada de que el alumno domine el tema. Lo que *realmente* sabe. |
| **Confianza declarada** | Qué tan seguro dice estar el alumno **antes** de responder. Lo que *cree* saber. |
| **Brecha metacognitiva** | `confianza − dominio`. Positiva = sobreconfianza; negativa = subconfianza. |
| **ICC** | `1 − |brecha|`. Qué tan bien se conoce a sí mismo (1 = perfecto). |
| **Perfil** | `overconfident` / `underconfident` / `calibrated` según el signo de la brecha. |
| **Cuadrante** | Cruce 2×2 de sabe×confía. El crítico es *no sabe y está confiado*. |
| **IPC** | Promedio de ICC del aula en un tema. < 0.5 = punto ciego colectivo. |

---

**En una frase:** *BKT infiere lo que sabes, te preguntamos lo que crees saber, y todo el valor del producto está en el signo y el tamaño de esa diferencia* — a nivel individuo (ICC / cuadrante), a nivel aula (IPC) y traducido a acción (selección adaptativa + alerta al docente + diagnóstico con IA).
