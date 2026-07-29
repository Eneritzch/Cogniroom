"""Cruza lo que el estudiante REALMENTE sabe (BKT) con lo que CREE saber en una
matriz 2x2. El perfil de 3 vías (solo brecha) no distingue "no sabe y lo
reconoce" de "no sabe y está confiado", que es justo la alerta para el docente.
Recibe primitivos, devuelve primitivos (sin ORM).
"""

from services.thresholds import CONF_TH, MASTERY_TH

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
