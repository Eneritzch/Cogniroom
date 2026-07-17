from django.db.models import Avg

from .models import RoomMembership
from .serializers import RoomSerializer


def teacher_room_data(room):
    """Datos de sala enriquecidos para el panel docente (conteos + calibración)."""
    from apps.cognitive.models import AIDiagnosis, CognitiveIndex
    from apps.questions.models import PDFDocument, Question
    from apps.sessions.models import EvaluationSession

    data = RoomSerializer(room).data
    ci = CognitiveIndex.objects.filter(node__room=room)
    data.update({
        'member_count': RoomMembership.objects.filter(room=room).count(),
        'question_count': Question.objects.filter(node__room=room, status='approved').count(),
        'pending_ai_count': Question.objects.filter(node__room=room, status='pending', source='ai').count(),
        'pdf_count': PDFDocument.objects.filter(room=room).count(),
        'section_count': room.sections.count(),
        # Cuestionarios respondidos = sesiones de evaluación completadas (no preguntas sueltas).
        'session_count': EvaluationSession.objects.filter(room=room, status=EvaluationSession.STATUS_COMPLETED).count(),
        'diagnosis_count': AIDiagnosis.objects.filter(session__room=room).count(),
        'icc': round(float(ci.aggregate(avg=Avg('icc_value'))['avg'] or 0.0), 4),
        'at_risk_count': ci.filter(metacognitive_gap__gt=0.2).values('student').distinct().count(),
    })
    return data


def student_room_data(room, user, request):
    """Sala enriquecida para la vista del estudiante: los conteos que la tarjeta
    de "Mis salas" muestra (nodos, sesiones y —en salas de estudio— pdfs y
    preguntas). Sin esto la tarjeta los lee como 0."""
    from apps.questions.models import KnowledgeNode, PDFDocument, Question
    from apps.sessions.models import EvaluationSession

    data = RoomSerializer(room, context={'request': request}).data
    data['activeNodes'] = KnowledgeNode.objects.filter(room=room).count()
    data['totalSessions'] = EvaluationSession.objects.filter(
        room=room, student=user, status=EvaluationSession.STATUS_COMPLETED
    ).count()
    # Evaluación a medias: si existe, la tarjeta ofrece "Continuar" en vez de
    # "Empezar" y entra directo a esa sesión (sin volver a elegir temas).
    data['active_session_id'] = (
        EvaluationSession.objects
        .filter(room=room, student=user, status=EvaluationSession.STATUS_ACTIVE)
        .order_by('-started_at')
        .values_list('id', flat=True)
        .first()
    )
    if room.mode == 'individual':
        data['pdfs'] = PDFDocument.objects.filter(room=room).count()
        data['questions'] = Question.objects.filter(
            node__room=room, status=Question.STATUS_APPROVED
        ).count()
    return data


def join_request_data(req):
    s = req.student
    name = f'{s.first_name} {s.last_name}'.strip() or s.username
    initials = ''.join(p[0] for p in name.split()[:2]).upper()
    sec = req.section
    return {
        'id': req.id,
        'room': {'id': req.room_id, 'name': req.room.name},
        'student': {'name': name, 'email': s.email, 'initials': initials},
        # Paralelo declarado por el alumno + los paralelos de la sala para que el
        # docente pueda corregirlo antes de aprobar.
        'section': {'id': sec.id, 'code': sec.code, 'name': sec.name} if sec else None,
        'room_sections': [
            {'id': x.id, 'code': x.code, 'name': x.name, 'schedule': x.schedule}
            for x in req.room.sections.all()
        ],
        'created_at': req.created_at,
    }
