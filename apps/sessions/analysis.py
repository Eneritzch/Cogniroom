import threading
from datetime import timedelta

from django.conf import settings
from django.db import connection
from django.db.models import Avg, Count
from django.utils import timezone

from apps.cognitive.models import (
    AIDiagnosis,
    BKTState,
    BlindSpotIndex,
    CognitiveIndex,
    StudentProgressSnapshot,
)
from apps.notifications.models import Notification
from apps.notifications.services import notify
from apps.questions.models import KnowledgeNode
from services.claude_service import CognitiveAnalysisService
from services.cognitive_quadrant import classify_quadrant, is_critical

from .models import Answer


def _gather_student_data(user, room):
    bkt_states = BKTState.objects.filter(
        student=user, node__room=room
    ).select_related('node')

    bkt_nodes = {b.node.name: round(b.p_mastery, 4) for b in bkt_states}

    cog_indices = CognitiveIndex.objects.filter(
        student=user, node__room=room
    ).select_related('node').order_by('-calculated_at')

    icc_avg = cog_indices.aggregate(avg=Avg('icc_value'))['avg'] or 0.0
    confidence_avg = cog_indices.aggregate(
        avg=Avg('avg_confidence')
    )['avg'] or 0.0

    overconfident_nodes = list(
        cog_indices.filter(profile='overconfident')
        .values_list('node__name', flat=True)
        .distinct()
    )

    error_patterns = []
    by_node = {}
    answers = (
        Answer.objects.filter(session__student=user, session__room=room)
        .select_related('question__node')
        .order_by('-answered_at')[:50]
    )
    for ans in answers:
        node_name = ans.question.node.name
        by_node.setdefault(node_name, []).append(ans.is_correct)
    for node_name, results in by_node.items():
        if len(results) >= 2 and not results[0] and not results[1]:
            error_patterns.append(node_name)

    # Whitelist de temas reales para que la IA no invente risk_nodes.
    known_nodes = list(
        KnowledgeNode.objects.filter(room=room).values_list('name', flat=True)
    )

    return {
        'icc_avg': round(float(icc_avg), 4),
        'bkt_nodes': bkt_nodes,
        'confidence_avg': round(float(confidence_avg), 4),
        'overconfident_nodes': overconfident_nodes,
        'error_patterns': error_patterns,
        'known_nodes': known_nodes,
    }


def recalc_blind_spot(node, room):
    agg = CognitiveIndex.objects.filter(node=node).aggregate(
        avg=Avg('icc_value'),
        n=Count('student', distinct=True),
    )
    bsi, _ = BlindSpotIndex.objects.get_or_create(
        node=node, room=room,
        defaults={'ipc_value': 0.0, 'total_student': 0},
    )
    bsi.ipc_value = round(float(agg['avg'] or 0.0), 4)
    bsi.total_student = agg['n'] or 0
    bsi.save()
    return bsi


def write_progress_snapshot(session):
    """Una foto histórica por sesión cerrada. Sin respuestas → no se escribe."""
    cog = CognitiveIndex.objects.filter(session=session)
    answers = Answer.objects.filter(session=session)
    questions_answered = answers.count()
    if questions_answered == 0:
        return None

    aggs = cog.aggregate(
        avg_icc=Avg('icc_value'),
        avg_bkt=Avg('bkt_mastery'),
        avg_gap=Avg('metacognitive_gap'),
    )

    profile_counts = (
        cog.values('profile')
        .annotate(n=Count('profile'))
        .order_by('-n', 'profile')  # 'profile' como desempate determinista
    )
    dominant_profile = profile_counts[0]['profile'] if profile_counts else 'calibrated'

    return StudentProgressSnapshot.objects.create(
        student=session.student,
        room=session.room,
        session=session,
        avg_icc=round(float(aggs['avg_icc'] or 0.0), 4),
        avg_bkt_mastery=round(float(aggs['avg_bkt'] or 0.0), 4),
        avg_gap=round(float(aggs['avg_gap'] or 0.0), 4),
        dominant_profile=dominant_profile,
        questions_answered=questions_answered,
        correct_count=answers.filter(is_correct=True).count(),
    )


def _run_ai_analysis(answer_id, new_mastery):
    """Trabajo de IA fuera del request: explica el error (lo guarda en el Answer)
    y genera el AIDiagnosis. Corre en un thread daemon; nunca afecta la respuesta
    al estudiante. Cierra su propia conexión a la BD al terminar."""
    try:
        answer = (
            Answer.objects.select_related(
                'question__node', 'session__room', 'session__student'
            ).get(id=answer_id)
        )
        question = answer.question
        session = answer.session
        user = session.student
        claude = CognitiveAnalysisService()

        try:
            # Todas las correctas y todas las marcadas (no solo la primera): en
            # opción múltiple el feedback debe contemplar el conjunto completo.
            correct_idx = question.correct_indices or [question.correct_index]
            selected_idx = answer.selected_indices or [answer.selected_index]
            correct_answer = ' / '.join(question.options[i] for i in correct_idx)
            selected_answer = ' / '.join(question.options[i] for i in selected_idx)
        except (IndexError, TypeError):
            correct_answer = selected_answer = ''

        feedback = claude.explain_error(
            question.statement,
            selected_answer,
            correct_answer,
            {'p_mastery': new_mastery, 'node': question.node.name},
            is_correct=answer.is_correct,
        )
        if feedback:
            answer.ai_feedback = feedback
            answer.save(update_fields=['ai_feedback'])

        student_data = _gather_student_data(user, session.room)
        # Solo cuando falló hay un error concreto que anclar; si acertó, agregados.
        error_context = None
        if not answer.is_correct and correct_answer:
            error_context = {
                'node': question.node.name,
                'question': question.statement,
                'selected': selected_answer,
                'correct': correct_answer,
                'rationale': question.rationale or '',
            }
        diagnosis = claude.analyze_student(student_data, error_context=error_context)
        try:
            failure_probability = float(diagnosis.get('prediction', 0.5) or 0.5)
        except (TypeError, ValueError):
            failure_probability = 0.5

        risk_level = diagnosis.get('risk_level', 'low')
        problem_type = diagnosis.get('problem_type', '') or ''
        if problem_type not in dict(AIDiagnosis.PROBLEM_TYPE_CHOICES):
            problem_type = ''
        AIDiagnosis.objects.create(
            student=user,
            session=session,
            node=question.node,
            classification=diagnosis.get('profile', 'calibrated'),
            problem_type=problem_type,
            risk_level=risk_level,
            risk_node=diagnosis.get('risk_nodes', []) or [],
            failure_probability=failure_probability,
            reasoning=diagnosis.get('reasoning', '') or '',
            recommendation=diagnosis.get('recommendation', '') or '',
        )

        # Estudiante: su diagnóstico/feedback ya está disponible.
        notify(
            user,
            kind=Notification.KIND_DIAGNOSIS_READY,
            title='Tu diagnóstico está listo',
            body=f'Generamos tu análisis en "{question.node.name}". '
                 'Revisá tu feedback y recomendaciones.',
            link='/app/diagnoses/',
        )

        # Docente dueño: aviso si el diagnóstico marca riesgo alto.
        if risk_level == 'high':
            student_name = user.get_full_name() or user.username
            notify(
                session.room.teacher,
                kind=Notification.KIND_STUDENT_AT_RISK,
                title=f'Estudiante en riesgo: {student_name}',
                body=f'{student_name} muestra riesgo alto en "{question.node.name}" '
                     f'({session.room.name}).',
                link='/app/metrics/',
            )
    except Exception:
        # La IA es best-effort: ningún fallo aquí debe propagarse.
        pass


def schedule_ai_analysis(answer_id, new_mastery):
    """En tests (TASKS_ALWAYS_EAGER) corre síncrono; en producción, en un hilo
    daemon que cierra su propia conexión a la BD."""
    if getattr(settings, 'TASKS_ALWAYS_EAGER', False):
        _run_ai_analysis(answer_id, new_mastery)
        return

    def worker():
        try:
            _run_ai_analysis(answer_id, new_mastery)
        finally:
            connection.close()

    threading.Thread(target=worker, daemon=True).start()


def maybe_alert_teacher_critical(session):
    """Aviso in-app al docente si el estudiante cae en el cuadrante crítico (no
    sabe y está confiado), con cooldown para no repetir. Solo in-app, no email."""
    try:
        room = session.room
        student = session.student
        agg = (
            CognitiveIndex.objects.filter(node__room=room, student=student)
            .aggregate(conf=Avg('avg_confidence'), mastery=Avg('bkt_mastery'))
        )
        if agg['mastery'] is None or agg['conf'] is None:
            return
        if not is_critical(classify_quadrant(agg['mastery'], agg['conf'])):
            return

        student_name = student.get_full_name() or student.username
        cooldown = timezone.now() - timedelta(hours=12)
        already = Notification.objects.filter(
            recipient=room.teacher,
            kind=Notification.KIND_STUDENT_AT_RISK,
            created_at__gte=cooldown,
            body__icontains=student_name,
        ).exists()
        if already:
            return

        notify(
            room.teacher,
            kind=Notification.KIND_STUDENT_AT_RISK,
            title=f'Alerta cognitiva: {student_name}',
            body=f'{student_name} está en el cuadrante crítico (no sabe y está confiado) '
                 f'en "{room.name}". Revisa sus métricas para intervenir a tiempo.',
            link='/app/metrics/',
            email=False,
        )
    except Exception:
        # Alerta best-effort: nunca debe romper el flujo del estudiante.
        pass
