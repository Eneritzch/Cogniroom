import random
import threading

from django.db import connection, transaction
from django.db.models import Avg, Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cognitive.models import (
    AIDiagnosis,
    BKTState,
    BlindSpotIndex,
    CognitiveIndex,
    StudentProgressSnapshot,
)
from apps.notifications.models import Notification
from apps.notifications.services import notify
from apps.questions.models import Question
from apps.questions.serializers import QuestionPublicSerializer
from apps.rooms.models import Room, RoomMembership
from services.bkt_engine import BKTEngine
from services.claude_service import CognitiveAnalysisService
from services.icc_calculator import ICCCalculator

from .models import Answer, EvaluationSession
from .serializers import (
    CreateSessionSerializer,
    EvaluationSessionSerializer,
    SubmitAnswerSerializer,
)


def _is_member(user, room):
    if room.teacher_id == user.id:
        return True
    if room.mode == 'individual':
        return room.teacher_id == user.id
    return RoomMembership.objects.filter(room=room, student=user).exists()


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

    return {
        'icc_avg': round(float(icc_avg), 4),
        'bkt_nodes': bkt_nodes,
        'confidence_avg': round(float(confidence_avg), 4),
        'overconfident_nodes': overconfident_nodes,
        'error_patterns': error_patterns,
    }


def _recalc_blind_spot(node, room):
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


def _write_progress_snapshot(session):
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
            correct_answer = question.options[question.correct_index]
            selected_answer = question.options[answer.selected_index]
        except (IndexError, TypeError):
            correct_answer = selected_answer = ''

        feedback = claude.explain_error(
            question.statement,
            selected_answer,
            correct_answer,
            {'p_mastery': new_mastery, 'node': question.node.name},
        )
        if feedback:
            answer.ai_feedback = feedback
            answer.save(update_fields=['ai_feedback'])

        student_data = _gather_student_data(user, session.room)
        diagnosis = claude.analyze_student(student_data)
        try:
            failure_probability = float(diagnosis.get('prediction', 0.5) or 0.5)
        except (TypeError, ValueError):
            failure_probability = 0.5

        risk_level = diagnosis.get('risk_level', 'low')
        AIDiagnosis.objects.create(
            student=user,
            session=session,
            node=question.node,
            classification=diagnosis.get('profile', 'calibrated'),
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
                link='/app/students/',
            )
    except Exception:
        # La IA es best-effort: ningún fallo aquí debe propagarse.
        pass
    finally:
        connection.close()


def _schedule_ai_analysis(answer_id, new_mastery):
    threading.Thread(
        target=_run_ai_analysis,
        args=(answer_id, new_mastery),
        daemon=True,
    ).start()


class SessionListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Historial de sesiones del estudiante con aciertos y métricas del snapshot."""
        user = request.user
        sessions = (
            EvaluationSession.objects.filter(student=user)
            .select_related('room')
            .annotate(
                answered=Count('answers'),
                correct=Count('answers', filter=Q(answers__is_correct=True)),
            )
            .order_by('-started_at')
        )
        snap_by_session = {
            s.session_id: s
            for s in StudentProgressSnapshot.objects.filter(student=user)
            if s.session_id is not None
        }

        result = []
        for s in sessions:
            snap = snap_by_session.get(s.id)
            result.append({
                'id': s.id,
                'room': {'id': s.room_id, 'name': s.room.name, 'mode': s.room.mode},
                'status': s.status,
                'started_at': s.started_at,
                'finished_at': s.finished_at,
                'answered': s.answered,
                'correct': s.correct,
                'avg_icc': snap.avg_icc if snap else None,
                'avg_gap': snap.avg_gap if snap else None,
            })
        return Response(result)

    def post(self, request):
        serializer = CreateSessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        room = get_object_or_404(Room, id=serializer.validated_data['room_id'])

        if not _is_member(request.user, room):
            return Response(
                {'detail': 'Not a member of this room.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        session = EvaluationSession.objects.create(student=request.user, room=room)
        return Response(
            EvaluationSessionSerializer(session).data, status=status.HTTP_201_CREATED
        )


class NextQuestionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, session_id):
        session = get_object_or_404(EvaluationSession, id=session_id)
        if session.student_id != request.user.id:
            return Response(
                {'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN
            )
        if session.status != EvaluationSession.STATUS_ACTIVE:
            return Response({'completed': True})

        answered_ids = Answer.objects.filter(session=session).values_list(
            'question_id', flat=True
        )

        candidates = Question.objects.filter(
            node__room=session.room,
            status=Question.STATUS_APPROVED,
        ).exclude(id__in=answered_ids)

        if not candidates.exists():
            return Response({'completed': True})

        node_ids = candidates.values_list('node_id', flat=True).distinct()
        bkt_states = BKTState.objects.filter(
            student=request.user, node_id__in=node_ids
        )
        mastery_by_node = {b.node_id: b.p_mastery for b in bkt_states}

        def node_priority(node_id):
            return mastery_by_node.get(node_id, 0.3)

        sorted_node_ids = sorted(node_ids, key=node_priority)
        target_node_id = sorted_node_ids[0]

        node_questions = list(candidates.filter(node_id=target_node_id))
        question = random.choice(node_questions)

        data = QuestionPublicSerializer(question).data
        data['completed'] = False
        return Response(data)


class SubmitAnswerView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id):
        session = get_object_or_404(EvaluationSession, id=session_id)
        if session.student_id != request.user.id:
            return Response(
                {'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN
            )
        if session.status != EvaluationSession.STATUS_ACTIVE:
            return Response(
                {'detail': 'Session is not active.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = SubmitAnswerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        question = get_object_or_404(Question, id=data['question_id'])
        if question.node.room_id != session.room_id:
            return Response(
                {'detail': 'Question does not belong to this room.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if Answer.objects.filter(session=session, question=question).exists():
            return Response(
                {'detail': 'Question already answered in this session.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        is_correct = data['selected_index'] == question.correct_index

        # El avance de BKT, el snapshot de CognitiveIndex y el Answer son una
        # unidad atómica: o se escriben los tres o ninguno (evita mastery
        # avanzado sin respuesta registrada, que re-serviría la pregunta).
        with transaction.atomic():
            bkt_state, _ = BKTState.objects.select_for_update().get_or_create(
                student=request.user, node=question.node
            )
            engine = BKTEngine()
            new_mastery = engine.update(
                bkt_state.p_mastery,
                bkt_state.p_transit,
                bkt_state.p_slip,
                bkt_state.p_guess,
                is_correct,
            )
            bkt_state.p_mastery = new_mastery
            bkt_state.attempts += 1
            bkt_state.save()

            calc = ICCCalculator()
            icc_result = calc.calculate(data['confidence_declared'], new_mastery)

            CognitiveIndex.objects.create(
                student=request.user,
                node=question.node,
                session=session,
                avg_confidence=data['confidence_declared'],
                bkt_mastery=new_mastery,
                icc_value=icc_result['icc'],
                metacognitive_gap=icc_result['gap'],
                profile=icc_result['profile'],
            )

            answer = Answer.objects.create(
                session=session,
                question=question,
                selected_index=data['selected_index'],
                is_correct=is_correct,
                confidence_declared=data['confidence_declared'],
                bkt_mastery_snapshot=new_mastery,
                response_time_sec=data.get('response_time_sec', 0),
                ai_feedback='',
            )

        # El recálculo del punto ciego grupal va fuera de la transacción.
        if session.room.mode == 'group':
            _recalc_blind_spot(question.node, session.room)

        # Diagnóstico con IA fuera del request: no bloquea al estudiante. Se
        # dispara solo en desalineación grave (icc < 0.5); el feedback y el
        # AIDiagnosis se persisten en background y aparecen en el repaso e
        # historial de diagnósticos.
        ai_pending = icc_result['icc'] < 0.5
        if ai_pending:
            _schedule_ai_analysis(answer.id, new_mastery)

        return Response({
            'is_correct': is_correct,
            'icc_value': icc_result['icc'],
            'metacognitive_gap': icc_result['gap'],
            'profile': icc_result['profile'],
            'bkt_mastery': new_mastery,
            'ai_feedback': '',
            'ai_pending': ai_pending,
            'risk_level': None,
        })


class SessionReviewView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, session_id):
        session = get_object_or_404(
            EvaluationSession.objects.select_related('room'), id=session_id
        )
        if session.student_id != request.user.id:
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        answers = (
            Answer.objects.filter(session=session)
            .select_related('question__node')
            .order_by('answered_at')
        )
        answers_data = [{
            'statement': a.question.statement,
            'options': a.question.options,
            'correct_index': a.question.correct_index,
            'selected_index': a.selected_index,
            'is_correct': a.is_correct,
            'confidence_declared': a.confidence_declared,
            'bkt_mastery': a.bkt_mastery_snapshot,
            'response_time_sec': a.response_time_sec,
            'ai_feedback': a.ai_feedback,
            'node': {'name': a.question.node.name, 'description': ''},
            'answered_at': a.answered_at,
        } for a in answers]

        return Response({
            'session': {
                'id_session': session.id,
                'room': {'name': session.room.name, 'mode': session.room.mode},
                'status': session.status,
                'started_at': session.started_at,
                'finished_at': session.finished_at,
            },
            'answers': answers_data,
        })


class CompleteSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id):
        session = get_object_or_404(EvaluationSession, id=session_id)
        if session.student_id != request.user.id:
            return Response(
                {'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN
            )
        # Idempotente: una sesión ya cerrada no se re-escribe ni duplica snapshot.
        if session.status != EvaluationSession.STATUS_ACTIVE:
            return Response(EvaluationSessionSerializer(session).data)

        session.status = EvaluationSession.STATUS_COMPLETED
        session.finished_at = timezone.now()
        session.save(update_fields=['status', 'finished_at'])
        _write_progress_snapshot(session)
        return Response(EvaluationSessionSerializer(session).data)
