"""Cuadrante cognitivo: cruza lo que el estudiante REALMENTE sabe (BKT) con lo
que CREE saber (confianza declarada) en una matriz 2x2. Es el corazón del
diagnóstico de sobreconfianza: el perfil de 3 vías basado solo en la brecha no
distingue "no sabe pero lo sabe" de "no sabe y está confiado" (ambos con brecha
pequeña), y esa diferencia es justamente la alerta que le importa al docente.

Recibe primitivos, devuelve primitivos (sin ORM).
"""

MASTERY_TH = 0.6   # umbral para considerar que el estudiante "sabe" el tema
CONF_TH = 0.6      # umbral para considerar que el estudiante "está confiado"

# Los cuatro cuadrantes. `critical` marca el caso peligroso (no sabe y confía).
QUADRANTS = {
    'calibrated':     {'label': 'Sabe y confía',            'critical': False},
    'underconfident': {'label': 'Sabe pero no confía',      'critical': False},
    'overconfident':  {'label': 'No sabe y está confiado',  'critical': True},
    'aware_gap':      {'label': 'No sabe y lo reconoce',    'critical': False},
}


def classify_quadrant(mastery: float, confidence: float) -> str:
    """Devuelve la clave del cuadrante para un par (dominio real, confianza)."""
    knows = mastery >= MASTERY_TH
    confident = confidence >= CONF_TH
    if knows and confident:
        return 'calibrated'
    if knows and not confident:
        return 'underconfident'
    if not knows and confident:
        return 'overconfident'
    return 'aware_gap'


def is_critical(quadrant: str) -> bool:
    """El cuadrante peligroso: no sabe pero está confiado."""
    return QUADRANTS.get(quadrant, {}).get('critical', False)
