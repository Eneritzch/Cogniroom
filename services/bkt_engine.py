class BKTEngine:
    """Bayesian Knowledge Tracing engine — Corbett & Anderson (1994).

    Soporta evidencia blanda (crédito parcial): `correctness` puede ser un bool
    o un float en [0,1]. Con 1.0/0.0 el resultado es idéntico al BKT binario
    clásico; los valores intermedios mezclan ambas posteriores en proporción al
    score, para puntuar preguntas de opción múltiple sin perder granularidad.
    """

    def update(self, p_mastery, p_transit, p_slip, p_guess, correctness):
        if correctness is True:
            c = 1.0
        elif correctness is False:
            c = 0.0
        else:
            c = max(0.0, min(1.0, float(correctness)))

        p_correct = p_mastery * (1 - p_slip) + (1 - p_mastery) * p_guess
        post_correct = p_mastery if p_correct == 0 else (p_mastery * (1 - p_slip)) / p_correct

        p_incorrect = p_mastery * p_slip + (1 - p_mastery) * (1 - p_guess)
        post_incorrect = p_mastery if p_incorrect == 0 else (p_mastery * p_slip) / p_incorrect

        post = c * post_correct + (1 - c) * post_incorrect
        new_mastery = post + (1 - post) * p_transit
        new_mastery = max(0.0, min(1.0, new_mastery))
        return round(new_mastery, 4)
