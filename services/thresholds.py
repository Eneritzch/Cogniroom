"""Umbrales del modelo cognitivo — fuente única de verdad.

Cada valor de aquí es una afirmación sobre el dominio, no un detalle de
implementación: define desde qué punto se considera que un estudiante "sabe",
"confía" o está "descalibrado". Viven juntos para que un cambio de criterio sea
una sola edición y para que las métricas históricas sigan siendo comparables.

El umbral que decide si se llama a la IA NO está aquí: es una decisión de costo
operativo, no de dominio, y se configura por entorno en
`settings.AI_ICC_THRESHOLD`.
"""

# Dominio real (BKT): desde aquí se considera que el estudiante sabe el tema.
MASTERY_TH = 0.6

# Confianza declarada: desde aquí se considera que el estudiante está confiado.
CONF_TH = 0.6

# Banda de tolerancia de la brecha metacognitiva. Dentro de ±banda el perfil es
# 'calibrated'; por encima 'overconfident', por debajo 'underconfident'.
CALIBRATION_BAND = 0.2

# IPC (promedio de ICC de la sala en un tema) por debajo de este valor marca
# punto ciego colectivo y dispara la alerta al docente.
BLIND_SPOT_TH = 0.5

# Accuracy por nivel cognitivo (Bloom) por debajo de la cual la categoría se
# marca como floja. Solo se evalúa con muestra suficiente (ver WEAK_MIN_SAMPLE).
WEAK_ACCURACY_TH = 0.6
WEAK_MIN_SAMPLE = 2
