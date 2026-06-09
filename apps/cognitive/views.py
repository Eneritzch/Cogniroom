from collections import Counter

from django.db.models import Avg
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.rooms.models import Room
from apps.sessions.models import Answer, EvaluationSession

from .models import (
    AIDiagnosis,
    BKTState,
    BlindSpotIndex,
    CognitiveIndex,
)
from .serializers import (
    AIDiagnosisSerializer,
    BKTStateSerializer,
    BlindSpotIndexSerializer,
)


class MyProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        last_diag = (
            AIDiagnosis.objects.filter(student=user).order_by('-generated_at').first()
        )
        icc_avg = (
            CognitiveIndex.objects.filter(student=user)
            .aggregate(avg=Avg('icc_value'))['avg']
            or 0.0
        )
        bkt_states = BKTState.objects.filter(student=user).select_related('node')
        avg_mastery = bkt_states.aggregate(avg=Avg('p_mastery'))['avg'] or 0.0

        profiles = list(
            CognitiveIndex.objects.filter(student=user).values_list('profile', flat=True)
        )
        predominant = None
        if profiles:
            predominant = Counter(profiles).most_common(1)[0][0]

        total_sessions = EvaluationSession.objects.filter(student=user).count()
        total_answers = Answer.objects.filter(session__student=user).count()
        ai_diagnoses_count = AIDiagnosis.objects.filter(student=user).count()

        return Response({
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.email,
            'institution': user.institution,
            'role': user.role,
            'date_joined': user.date_joined,
            'icc_avg': round(float(icc_avg), 4),
            'avg_mastery': round(float(avg_mastery), 4),
            'predominant_profile': predominant,
            'total_sessions': total_sessions,
            'total_answers': total_answers,
            'nodes_tracked': bkt_states.count(),
            'ai_diagnoses_count': ai_diagnoses_count,
            'last_diagnosis': AIDiagnosisSerializer(last_diag).data if last_diag else None,
            'bkt_states': BKTStateSerializer(bkt_states, many=True).data,
        })


class MyDiagnosesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        diagnoses = (
            AIDiagnosis.objects.filter(student=request.user)
            .order_by('-generated_at')
        )
        return Response(AIDiagnosisSerializer(diagnoses, many=True).data)


class MyNodesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        bkt_states = BKTState.objects.filter(student=user).select_related('node')

        result = []
        for state in bkt_states:
            indices = list(
                CognitiveIndex.objects.filter(student=user, node=state.node)
                .order_by('-calculated_at')[:3]
            )
            latest = indices[0] if indices else None
            trend = 'estable'
            if len(indices) >= 2:
                diff = indices[0].icc_value - indices[-1].icc_value
                if diff > 0.05:
                    trend = 'mejorando'
                elif diff < -0.05:
                    trend = 'empeorando'

            result.append({
                'node_id': state.node_id,
                'node_name': state.node.name,
                'name': state.node.name,
                'description': '',
                'p_mastery': round(state.p_mastery, 4),
                'avg_confidence': round(latest.avg_confidence, 4) if latest else None,
                'icc_value': round(latest.icc_value, 4) if latest else None,
                'profile': latest.profile if latest else None,
                'attempts': state.attempts,
                'trend': trend,
            })

        return Response(result)


DIAGNOSIS_TITLES = {
    'overconfident': 'Brecha de sobreconfianza detectada',
    'underconfident': 'Subestimación del propio dominio',
    'calibrated': 'Calibración alineada',
}


class MyNodeDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, node_id):
        user = request.user
        bkt = get_object_or_404(
            BKTState.objects.select_related('node__room'),
            student=user, node_id=node_id,
        )
        node = bkt.node

        latest_ci = (
            CognitiveIndex.objects.filter(student=user, node_id=node_id)
            .order_by('-calculated_at')
            .first()
        )

        diag = (
            AIDiagnosis.objects.filter(student=user, node_id=node_id)
            .order_by('-generated_at')
            .first()
        )
        diagnosis = None
        if diag:
            diagnosis = {
                'title': DIAGNOSIS_TITLES.get(diag.classification, 'Diagnóstico cognitivo'),
                'reasoning': diag.reasoning,
                'recommendation': diag.recommendation,
                'generated_at': diag.generated_at,
            }

        answers = (
            Answer.objects.filter(session__student=user, question__node_id=node_id)
            .select_related('question')
            .order_by('-answered_at')[:10]
        )
        recent = [{
            'statement': a.question.statement,
            'confidence_declared': a.confidence_declared,
            'bkt_mastery': a.bkt_mastery_snapshot,
            'is_correct': a.is_correct,
            'answered_at': a.answered_at,
            'id_session': a.session_id,
        } for a in answers]

        return Response({
            'node_id': node.id,
            'name': node.name,
            'description': '',
            'room': {'id_room': node.room_id, 'name': node.room.name},
            'updated_at': bkt.updated_at,
            'profile': latest_ci.profile if latest_ci else 'calibrated',
            'avg_confidence': latest_ci.avg_confidence if latest_ci else 0.0,
            'bkt_mastery': latest_ci.bkt_mastery if latest_ci else round(bkt.p_mastery, 4),
            'icc_value': latest_ci.icc_value if latest_ci else 0.0,
            'attempts': bkt.attempts,
            'p_mastery': round(bkt.p_mastery, 4),
            'p_transit': round(bkt.p_transit, 4),
            'p_guess': round(bkt.p_guess, 4),
            'p_slip': round(bkt.p_slip, 4),
            'diagnosis': diagnosis,
            'recentResponses': recent,
        })


class BlindSpotsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, room_id):
        room = get_object_or_404(Room, id=room_id)
        if room.teacher_id != request.user.id:
            return Response(
                {'detail': 'Only the room owner can view blind spots.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        spots = BlindSpotIndex.objects.filter(room=room).order_by('ipc_value')
        return Response(BlindSpotIndexSerializer(spots, many=True).data)


class AtRiskView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, room_id):
        room = get_object_or_404(Room, id=room_id)
        if room.teacher_id != request.user.id:
            return Response(
                {'detail': 'Only the room owner can view at-risk students.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        latest_per_student = {}
        diagnoses = (
            AIDiagnosis.objects.filter(session__room=room)
            .select_related('student')
            .order_by('-generated_at')
        )
        for diag in diagnoses:
            if diag.student_id not in latest_per_student:
                latest_per_student[diag.student_id] = diag

        at_risk = [d for d in latest_per_student.values() if d.risk_level == 'high']
        return Response(AIDiagnosisSerializer(at_risk, many=True).data)
