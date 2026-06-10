from django.db.models import Avg, Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Room, RoomMembership
from .serializers import (
    JoinRoomSerializer,
    RoomCreateSerializer,
    RoomSerializer,
)


def _teacher_room_data(room):
    """Datos de sala enriquecidos para el panel docente (conteos + calibración)."""
    from apps.cognitive.models import AIDiagnosis, CognitiveIndex
    from apps.questions.models import PDFDocument, Question
    from apps.sessions.models import Answer

    data = RoomSerializer(room).data
    ci = CognitiveIndex.objects.filter(node__room=room)
    data.update({
        'member_count': RoomMembership.objects.filter(room=room).count(),
        'question_count': Question.objects.filter(node__room=room, status='approved').count(),
        'pending_ai_count': Question.objects.filter(node__room=room, status='pending', source='ai').count(),
        'pdf_count': PDFDocument.objects.filter(room=room).count(),
        'section_count': room.sections.count(),
        'answer_count': Answer.objects.filter(session__room=room).count(),
        'diagnosis_count': AIDiagnosis.objects.filter(session__room=room).count(),
        'icc': round(float(ci.aggregate(avg=Avg('icc_value'))['avg'] or 0.0), 4),
        'at_risk_count': ci.filter(metacognitive_gap__gt=0.2).values('student').distinct().count(),
    })
    return data


class RoomListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role == 'teacher':
            qs = Room.objects.filter(teacher=user).order_by('-created_at')
            return Response([_teacher_room_data(r) for r in qs])

        membership_room_ids = RoomMembership.objects.filter(
            student=user
        ).values_list('room_id', flat=True)
        qs = Room.objects.filter(
            Q(id__in=membership_room_ids) | Q(teacher=user, mode='individual')
        ).order_by('-created_at').distinct()
        return Response(RoomSerializer(qs, many=True).data)

    def post(self, request):
        serializer = RoomCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        mode = serializer.validated_data.get('mode', 'group')

        if mode == 'group' and request.user.role != 'teacher':
            return Response(
                {'detail': 'Only teachers can create group rooms.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        room = Room.objects.create(
            teacher=request.user,
            name=serializer.validated_data['name'],
            subject=serializer.validated_data['subject'],
            mode=mode,
        )
        return Response(RoomSerializer(room).data, status=status.HTTP_201_CREATED)


class JoinRoomView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = JoinRoomSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        code = serializer.validated_data['access_code'].strip().upper()

        try:
            room = Room.objects.get(access_code=code)
        except Room.DoesNotExist:
            return Response(
                {'detail': 'Room not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if room.mode != 'group':
            return Response(
                {'detail': 'Cannot join an individual room.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if RoomMembership.objects.filter(room=room, student=request.user).exists():
            return Response(
                {'detail': 'Already a member of this room.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        RoomMembership.objects.create(room=room, student=request.user)
        return Response(RoomSerializer(room).data, status=status.HTTP_201_CREATED)


class RoomMembersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, room_id):
        from apps.cognitive.models import CognitiveIndex
        from apps.users.serializers import UserSerializer

        room = get_object_or_404(Room, id=room_id)
        if room.teacher_id != request.user.id:
            return Response(
                {'detail': 'Only the owner can list members.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        memberships = (
            RoomMembership.objects.filter(room=room)
            .select_related('student', 'section')
            .order_by('student__first_name', 'student__last_name')
        )

        roster = []
        for m in memberships:
            aggs = (
                CognitiveIndex.objects.filter(node__room=room, student=m.student)
                .aggregate(conf=Avg('avg_confidence'), mast=Avg('bkt_mastery'), gap=Avg('metacognitive_gap'))
            )
            gap = aggs['gap'] or 0.0
            if gap > 0.2:
                profile = 'overconfident'
            elif gap < -0.2:
                profile = 'underconfident'
            else:
                profile = 'calibrated'

            section = None
            if m.section_id:
                section = {'id_section': m.section_id, 'code': m.section.code, 'schedule': m.section.schedule}

            roster.append({
                'user': UserSerializer(m.student).data,
                'profile': profile,
                'avg_confidence': round(float(aggs['conf'] or 0.0), 4),
                'bkt_mastery': round(float(aggs['mast'] or 0.0), 4),
                'metacognitive_gap': round(float(gap), 4),
                'membership': {'section': section},
            })

        sections = [{
            'id_section': s.id,
            'code': s.code,
            'schedule': s.schedule,
            'total_student': RoomMembership.objects.filter(section=s).count(),
        } for s in room.sections.all()]

        return Response({
            'name': room.name,
            'students': memberships.count(),
            'sections': sections,
            'roster': roster,
        })
