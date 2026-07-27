import random

from django.conf import settings
from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cognitive.models import BKTState, CognitiveIndex, StudentProgressSnapshot
from apps.questions.models import KnowledgeNode, Question
from apps.questions.serializers import QuestionPublicSerializer
from apps.rooms.models import Room, RoomMembership
from apps.users.permissions import IsStudent
from services.bkt_engine import BKTEngine
from services.icc_calculator import ICCCalculator

from .analysis import (
    maybe_alert_teacher_critical,
    recalc_blind_spot,
    schedule_ai_analysis,
    write_progress_snapshot,
)
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


class SessionListCreateView(APIView):
    permission_classes = [IsStudent]

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

        # Sala cerrada por el docente: no se admiten nuevas evaluaciones (el
        # historial se conserva; el docente puede reabrirla cuando quiera).
        if not room.is_active:
            return Response(
                {'detail': 'Esta sala está cerrada. No se pueden iniciar nuevas evaluaciones.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Reanudar en vez de reiniciar: si hay una sesión activa sin cerrar se
        # devuelve esa misma; la selección adaptativa ya excluye lo respondido.
        pending = (
            EvaluationSession.objects
            .filter(student=request.user, room=room, status=EvaluationSession.STATUS_ACTIVE)
            .order_by('-started_at')
            .first()
        )
        if pending:
            return Response(
                EvaluationSessionSerializer(pending).data, status=status.HTTP_200_OK
            )

        # Nodos elegidos por el estudiante; deben pertenecer a la sala. Vacío =
        # todos (la selección adaptativa abarca toda la sala, como antes).
        node_ids = serializer.validated_data.get('node_ids') or []
        if node_ids:
            valid_ids = list(
                KnowledgeNode.objects.filter(room=room, id__in=node_ids)
                .values_list('id', flat=True)
            )
            if len(valid_ids) != len(set(node_ids)):
                return Response(
                    {'detail': 'Algunos nodos no pertenecen a esta sala.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            node_ids = valid_ids

        # Congela el cupo por tema de esta sesión (0 = todas las aprobadas), acotado al pool
        # real y omitiendo temas sin preguntas aprobadas.
        effective_nodes = KnowledgeNode.objects.filter(room=room)
        if node_ids:
            effective_nodes = effective_nodes.filter(id__in=node_ids)
        effective_nodes = effective_nodes.annotate(
            approved=Count('questions', filter=Q(questions__status=Question.STATUS_APPROVED))
        )
        node_quotas = {}
        for node in effective_nodes:
            if node.approved == 0:
                continue
            quota = node.questions_per_session or node.approved
            node_quotas[str(node.id)] = min(quota, node.approved)

        session = EvaluationSession.objects.create(
            student=request.user, room=room, selected_node_ids=node_ids,
            node_quotas=node_quotas,
        )
        return Response(
            EvaluationSessionSerializer(session).data, status=status.HTTP_201_CREATED
        )


class NextQuestionView(APIView):
    permission_classes = [IsStudent]

    def get(self, request, session_id):
        session = get_object_or_404(EvaluationSession, id=session_id)
        if session.student_id != request.user.id:
            return Response(
                {'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN
            )
        if session.status != EvaluationSession.STATUS_ACTIVE:
            return Response({'completed': True})

        answered_ids = list(
            Answer.objects.filter(session=session).values_list('question_id', flat=True)
        )

        # Conjunto total: aprobadas de la sala, dentro de los nodos elegidos.
        base = Question.objects.filter(
            node__room=session.room,
            status=Question.STATUS_APPROVED,
        )
        selected_node_ids = session.selected_node_ids or []
        if selected_node_ids:
            base = base.filter(node_id__in=selected_node_ids)

        # Cupo congelado por nodo. Sesiones antiguas sin snapshot caen al
        # comportamiento previo (drenar todo el pool).
        quotas = session.node_quotas or {}
        if quotas:
            total = sum(int(v) for v in quotas.values())
        else:
            total = base.count()
        answered = min(len(answered_ids), total)

        # Respondidas por nodo dentro de esta sesión (para respetar el cupo).
        answered_by_node = {}
        for node_id in Answer.objects.filter(session=session).values_list(
            'question__node_id', flat=True
        ):
            answered_by_node[node_id] = answered_by_node.get(node_id, 0) + 1

        candidates = base.exclude(id__in=answered_ids)

        def has_quota(node_id):
            if not quotas:
                return True
            quota = int(quotas.get(str(node_id), 0))
            return answered_by_node.get(node_id, 0) < quota

        # Nodos con preguntas sin responder Y cupo disponible.
        open_node_ids = [
            nid for nid in candidates.values_list('node_id', flat=True).distinct()
            if has_quota(nid)
        ]
        if not open_node_ids:
            return Response({'completed': True})

        bkt_states = BKTState.objects.filter(
            student=request.user, node_id__in=open_node_ids
        )
        mastery_by_node = {b.node_id: b.p_mastery for b in bkt_states}

        def node_priority(node_id):
            return mastery_by_node.get(node_id, 0.3)

        target_node_id = sorted(open_node_ids, key=node_priority)[0]

        node_questions = list(candidates.filter(node_id=target_node_id))
        question = random.choice(node_questions)

        data = QuestionPublicSerializer(question).data
        data['completed'] = False
        data['total'] = total
        data['answered'] = answered
        return Response(data)


class SubmitAnswerView(APIView):
    permission_classes = [IsStudent]

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

        selected_indices = data['selected_indices']
        if any(i >= len(question.options) for i in selected_indices):
            return Response(
                {'detail': 'selected_indices fuera del rango de opciones.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # score en [0,1]: crédito parcial para opción múltiple. is_correct queda
        # como "acierto total" (compat con agregados/aciertos del histórico).
        score = question.score_answer(selected_indices)
        is_correct = score >= 1.0

        # BKT, CognitiveIndex y Answer son una unidad atómica: evita mastery avanzado sin
        # respuesta registrada, que volvería a servir la misma pregunta.
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
                score,
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
                selected_index=selected_indices[0] if selected_indices else 0,
                selected_indices=selected_indices,
                is_correct=is_correct,
                score=score,
                confidence_declared=data['confidence_declared'],
                bkt_mastery_snapshot=new_mastery,
                response_time_sec=data.get('response_time_sec', 0),
                ai_feedback='',
            )

        # El recálculo del punto ciego grupal va fuera de la transacción.
        if session.room.mode == 'group':
            recalc_blind_spot(question.node, session.room)
            # Alerta in-app al docente si el estudiante quedó en el cuadrante crítico.
            maybe_alert_teacher_critical(session)

        # Diagnóstico IA fuera del request y solo en respuestas FALLADAS con desalineación:
        # en aciertos descalibrados basta la nota determinista del repaso.
        ai_pending = (not is_correct) and icc_result['icc'] < settings.AI_ICC_THRESHOLD
        if ai_pending:
            schedule_ai_analysis(answer.id, new_mastery)

        return Response({
            'is_correct': is_correct,
            'score': score,
            'icc_value': icc_result['icc'],
            'metacognitive_gap': icc_result['gap'],
            'profile': icc_result['profile'],
            'bkt_mastery': new_mastery,
            'ai_feedback': '',
            'ai_pending': ai_pending,
            'risk_level': None,
        })


class SessionReviewView(APIView):
    permission_classes = [IsStudent]

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
            'question_type': a.question.question_type,
            'correct_index': a.question.correct_index,
            'correct_indices': a.question.correct_indices,
            'selected_index': a.selected_index,
            'selected_indices': a.selected_indices,
            'is_correct': a.is_correct,
            'score': a.score,
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
    permission_classes = [IsStudent]

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
        write_progress_snapshot(session)
        return Response(EvaluationSessionSerializer(session).data)
