from services.thresholds import CALIBRATION_BAND


class ICCCalculator:
    """Index of Cognitive Calibration — measures gap between declared confidence and BKT mastery."""

    def calculate(self, declared_confidence: float, bkt_mastery: float) -> dict:
        gap = declared_confidence - bkt_mastery
        icc = 1.0 - abs(gap)

        if gap > CALIBRATION_BAND:
            profile = 'overconfident'
        elif gap < -CALIBRATION_BAND:
            profile = 'underconfident'
        else:
            profile = 'calibrated'

        return {
            'icc': round(icc, 4),
            'gap': round(gap, 4),
            'profile': profile,
        }
