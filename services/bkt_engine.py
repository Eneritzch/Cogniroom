class BKTEngine:
    """Bayesian Knowledge Tracing — Corbett & Anderson (1994). `correctness`
    acepta bool o float en [0,1]: con 1.0/0.0 equivale al BKT binario clásico y
    los intermedios mezclan ambas posteriores (crédito parcial en multi-opción).
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
