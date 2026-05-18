from collections import Counter

from django.db.models import Avg
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.questions.models import KnowledgeNode
from apps.rooms.models import Room

from .models import AIDiagnosis, BKTState, BlindSpotIndex, CognitiveIndex
from .serializers import (
    AIDiagnosisSerializer,
    BKTStateSerializer,
    BlindSpotIndexSerializer,
    CognitiveIndexSerializer,
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

        profiles = list(
            CognitiveIndex.objects.filter(student=user).values_list('profile', flat=True)
        )
        predominant = None
        if profiles:
            predominant = Counter(profiles).most_common(1)[0][0]

        return Response({
            'last_diagnosis': AIDiagnosisSerializer(last_diag).data if last_diag else None,
            'icc_avg': round(float(icc_avg), 4),
            'bkt_states': BKTStateSerializer(bkt_states, many=True).data,
            'predominant_profile': predominant,
        })


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
                'p_mastery': round(state.p_mastery, 4),
                'icc_value': round(latest.icc_value, 4) if latest else None,
                'profile': latest.profile if latest else None,
                'trend': trend,
            })

        return Response(result)


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
