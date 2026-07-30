from django.db.models import Avg, Count, Q

from apps.rooms.models import RoomMembership
from services.cognitive_quadrant import classify_quadrant
from services.thresholds import BLIND_SPOT_TH, WEAK_ACCURACY_TH, WEAK_MIN_SAMPLE

from .models import CognitiveIndex


def category_breakdown(answers):
    """Aciertos por categoría cognitiva (Bloom) de un queryset de Answer, ordenado
    por accuracy asc. Marca weak si total>=2 y acc<0.6. Ignora las sin clasificar."""
    rows = (
        answers.exclude(question__cognitive_level='')
        .values('question__cognitive_level')
        .annotate(total=Count('id'), correct=Count('id', filter=Q(is_correct=True)))
        .order_by()
    )
    result = []
    for r in rows:
        total = r['total']
        acc = round(r['correct'] / total, 4) if total else 0.0
        result.append({
            'level': r['question__cognitive_level'],
            'total': total,
            'correct': r['correct'],
            'accuracy': acc,
            'weak': total >= WEAK_MIN_SAMPLE and acc < WEAK_ACCURACY_TH,
        })
    result.sort(key=lambda c: c['accuracy'])
    return result


def student_cognitive_rows(room, section_id=None):
    """Por estudiante de la sala (opcional filtrado por sección): dominio real y
    confianza promedio + cuadrante. Omite a quienes aún no tienen datos
    cognitivos. Base compartida por el panel de métricas del docente."""
    memberships = RoomMembership.objects.filter(room=room).select_related('student')
    if section_id is not None:
        memberships = memberships.filter(section_id=section_id)
        
    all_cis = CognitiveIndex.objects.filter(
        node__room=room
    ).select_related('student').order_by('-calculated_at')
    
    cis_by_student = {}
    for ci in all_cis:
        if ci.student_id not in cis_by_student:
            cis_by_student[ci.student_id] = {}
        if ci.node_id not in cis_by_student[ci.student_id]:
            cis_by_student[ci.student_id][ci.node_id] = ci

    rows = []
    for m in memberships:
        student_cis = cis_by_student.get(m.student_id, {})
        if not student_cis:
            continue
            
        def _avg(attr):
            vals = [getattr(ci, attr) for ci in student_cis.values() if getattr(ci, attr) is not None]
            return sum(vals) / len(vals) if vals else 0.0

        mastery = _avg('bkt_mastery')
        conf = _avg('avg_confidence')
        
        rows.append({
            'student': m.student,
            'mastery': round(float(mastery), 4),
            'confidence': round(float(conf), 4),
            'gap': round(float(_avg('metacognitive_gap')), 4),
            'icc': round(float(_avg('icc_value')), 4),
            'quadrant': classify_quadrant(mastery, conf),
        })
    return rows


def quadrant_counts(rows):
    counts = {'calibrated': 0, 'underconfident': 0, 'overconfident': 0, 'aware_gap': 0}
    for r in rows:
        if r['quadrant'] in counts:
            counts[r['quadrant']] += 1
    return counts


def weak_category(answers):
    """Categoría cognitiva más floja de un queryset de Answer (o None)."""
    cats = category_breakdown(answers)
    if not cats:
        return None
    weak = [c for c in cats if c['weak']]
    return (weak[0] if weak else cats[0])['level']


def room_blind_spots(room, section_id=None):
    spots = []
    for node in room.nodes.order_by('id'):
        ci = CognitiveIndex.objects.filter(node=node)
        if section_id is not None:
            ci = ci.filter(
                student__room_memberships__room=room,
                student__room_memberships__section_id=section_id,
            )
        total = ci.values('student').distinct().count()
        if total == 0:
            continue
        ipc = round(float(ci.aggregate(v=Avg('icc_value'))['v'] or 0.0), 4)
        spots.append({
            'node': node.id,
            'node_name': node.name,
            'ipc_value': ipc,
            'total_student': total,
            'alert': ipc < BLIND_SPOT_TH,
        })
    spots.sort(key=lambda s: s['ipc_value'])
    return spots


def room_avg_icc(room):
    return round(float(
        CognitiveIndex.objects.filter(node__room=room).aggregate(v=Avg('icc_value'))['v'] or 0.0
    ), 4)
