class BKTEngine:
    """Bayesian Knowledge Tracing engine — Corbett & Anderson (1994)."""

    def update(self, p_mastery, p_transit, p_slip, p_guess, is_correct):
        if is_correct:
            p_correct = p_mastery * (1 - p_slip) + (1 - p_mastery) * p_guess
            if p_correct == 0:
                p_mastery_updated = p_mastery
            else:
                p_mastery_updated = (p_mastery * (1 - p_slip)) / p_correct
        else:
            p_incorrect = p_mastery * p_slip + (1 - p_mastery) * (1 - p_guess)
            if p_incorrect == 0:
                p_mastery_updated = p_mastery
            else:
                p_mastery_updated = (p_mastery * p_slip) / p_incorrect

        new_mastery = p_mastery_updated + (1 - p_mastery_updated) * p_transit
        new_mastery = max(0.0, min(1.0, new_mastery))
        return round(new_mastery, 4)
