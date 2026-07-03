from django.db.models import Avg, Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.notifications.models import Notification
from apps.notifications.services import notify

from .models import Room, RoomMembership, Section
from .serializers import (
    AssignSectionSerializer,
    JoinRoomSerializer,
    RoomCreateSerializer,
    RoomSerializer,
    SectionCreateSerializer,
    SectionSerializer,
)


def _teacher_room_data(room):
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


def _student_room_data(room, user, request):
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
    if room.mode == 'individual':
        data['pdfs'] = PDFDocument.objects.filter(room=room).count()
        data['questions'] = Question.objects.filter(
            node__room=room, status=Question.STATUS_APPROVED
        ).count()
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
        return Response([_student_room_data(r, user, request) for r in qs])

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


class RoomDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, room_id):
        room = get_object_or_404(Room, id=room_id)
        if room.teacher_id != request.user.id:
            return Response(
                {'detail': 'Only the owner can edit this room.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        fields = []
        name = request.data.get('name')
        if name is not None:
            name = name.strip()
            if not name:
                return Response(
                    {'detail': 'El nombre no puede estar vacío.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            room.name = name
            fields.append('name')

        subject = request.data.get('subject')
        if subject is not None and subject.strip():
            room.subject = subject.strip()
            fields.append('subject')

        if fields:
            room.save(update_fields=fields)
        return Response(_teacher_room_data(room))


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

        section = None
        section_id = serializer.validated_data.get('section_id')
        if section_id is not None:
            try:
                section = Section.objects.get(id=section_id, room=room)
            except Section.DoesNotExist:
                return Response(
                    {'detail': 'Section not found in this room.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        RoomMembership.objects.create(room=room, student=request.user, section=section)

        notify(
            request.user,
            kind=Notification.KIND_ROOM_JOINED,
            title=f'Te uniste a {room.name}',
            body=f'Ya formás parte de "{room.name}". Cuando el docente active una '
                 'evaluación, vas a poder rendirla desde tus salas.',
            link='/app/my-rooms/',
        )
        return Response(
            RoomSerializer(room, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class SectionListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, room_id):
        room = get_object_or_404(Room, id=room_id)
        if room.teacher_id != request.user.id:
            return Response(
                {'detail': 'Only the owner can list sections.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return Response(SectionSerializer(room.sections.all(), many=True).data)

    def post(self, request, room_id):
        room = get_object_or_404(Room, id=room_id)
        if room.teacher_id != request.user.id:
            return Response(
                {'detail': 'Only the owner can create sections.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = SectionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        code = serializer.validated_data['code']
        if room.sections.filter(code=code).exists():
            return Response(
                {'detail': 'A section with this code already exists in this room.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        section = Section.objects.create(room=room, **serializer.validated_data)
        return Response(SectionSerializer(section).data, status=status.HTTP_201_CREATED)


class SectionDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _resolve(self, request, room_id, section_id):
        room = get_object_or_404(Room, id=room_id)
        if room.teacher_id != request.user.id:
            return None, Response(
                {'detail': 'Only the owner can modify sections.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return get_object_or_404(Section, id=section_id, room=room), None

    def patch(self, request, room_id, section_id):
        section, error = self._resolve(request, room_id, section_id)
        if error:
            return error

        serializer = SectionCreateSerializer(section, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        new_code = serializer.validated_data.get('code', section.code)
        if new_code != section.code and section.room.sections.filter(code=new_code).exists():
            return Response(
                {'detail': 'A section with this code already exists in this room.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer.save()
        return Response(SectionSerializer(section).data)

    def delete(self, request, room_id, section_id):
        section, error = self._resolve(request, room_id, section_id)
        if error:
            return error
        # on_delete=SET_NULL: las membresías quedan sin sección, el alumno no es expulsado.
        section.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class RoomMembersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, room_id):
        from apps.cognitive.models import CognitiveIndex
        from apps.users.serializers import UserSerializer
        from services.cognitive_quadrant import classify_quadrant

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
            # Cuadrante 2x2; None si el estudiante aún no tiene datos cognitivos.
            if aggs['mast'] is None or aggs['conf'] is None:
                quadrant = None
            else:
                quadrant = classify_quadrant(aggs['mast'], aggs['conf'])

            section = None
            if m.section_id:
                section = {'id_section': m.section_id, 'code': m.section.code, 'schedule': m.section.schedule}

            roster.append({
                'user': UserSerializer(m.student).data,
                'profile': profile,
                'quadrant': quadrant,
                'avg_confidence': round(float(aggs['conf'] or 0.0), 4),
                'bkt_mastery': round(float(aggs['mast'] or 0.0), 4),
                'metacognitive_gap': round(float(gap), 4),
                'membership': {'section': section},
            })

        sections = [{
            'id_section': s.id,
            'code': s.code,
            'name': s.name,
            'schedule': s.schedule,
            'capacity': s.capacity,
            'total_student': RoomMembership.objects.filter(section=s).count(),
        } for s in room.sections.all()]

        return Response({
            'name': room.name,
            'students': memberships.count(),
            'sections': sections,
            'roster': roster,
        })


class MemberSectionView(APIView):
    """El docente asigna (o quita) la sección de un estudiante de su sala."""
    permission_classes = [IsAuthenticated]

    def patch(self, request, room_id, student_id):
        room = get_object_or_404(Room, id=room_id)
        if room.teacher_id != request.user.id:
            return Response(
                {'detail': 'Only the owner can assign sections.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        membership = get_object_or_404(
            RoomMembership, room=room, student_id=student_id
        )

        serializer = AssignSectionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        section_id = serializer.validated_data.get('section_id')

        if section_id is None:
            membership.section = None
            membership.save(update_fields=['section'])
            return Response({'section': None})

        try:
            section = Section.objects.get(id=section_id, room=room)
        except Section.DoesNotExist:
            return Response(
                {'detail': 'Section not found in this room.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Cupo: si está lleno y el estudiante no está ya en esa sección, rechazar.
        if section.capacity is not None and membership.section_id != section.id:
            current = RoomMembership.objects.filter(section=section).count()
            if current >= section.capacity:
                return Response(
                    {'detail': f'La sección {section.code} alcanzó su cupo ({section.capacity}).'},
                    status=status.HTTP_409_CONFLICT,
                )

        membership.section = section
        membership.save(update_fields=['section'])
        return Response({'section': {
            'id_section': section.id,
            'code': section.code,
            'name': section.name,
            'schedule': section.schedule,
        }})


class RoomEnrollView(APIView):
    """El docente busca (GET) y agrega (POST) estudiantes de su institución."""
    permission_classes = [IsAuthenticated]

    def _owner_room(self, request, room_id):
        room = get_object_or_404(Room, id=room_id)
        if room.teacher_id != request.user.id:
            return None, Response(
                {'detail': 'Only the owner can enroll students.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return room, None

    def get(self, request, room_id):
        from django.contrib.auth import get_user_model
        from apps.users.serializers import UserSerializer

        room, err = self._owner_room(request, room_id)
        if err:
            return err
        if request.user.institution_id is None:
            return Response([])

        User = get_user_model()
        existing = RoomMembership.objects.filter(room=room).values_list('student_id', flat=True)
        qs = (
            User.objects.filter(role=User.ROLE_STUDENT, institution_id=request.user.institution_id)
            .exclude(id__in=existing)
        )
        q = (request.query_params.get('q') or '').strip()
        if q:
            qs = qs.filter(
                Q(first_name__icontains=q) | Q(last_name__icontains=q) | Q(email__icontains=q)
            )
        qs = qs.order_by('first_name', 'last_name')[:20]
        return Response(UserSerializer(qs, many=True).data)

    def post(self, request, room_id):
        from django.contrib.auth import get_user_model
        from apps.users.serializers import UserSerializer

        room, err = self._owner_room(request, room_id)
        if err:
            return err
        if room.mode != 'group':
            return Response(
                {'detail': 'Solo las salas grupales aceptan estudiantes.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if request.user.institution_id is None:
            return Response(
                {'detail': 'Su cuenta no tiene una institución asignada.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        User = get_user_model()
        try:
            student = User.objects.get(
                id=request.data.get('student_id'),
                role=User.ROLE_STUDENT,
                institution_id=request.user.institution_id,
            )
        except (User.DoesNotExist, ValueError, TypeError):
            return Response(
                {'detail': 'Estudiante no encontrado en su institución.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        _, created = RoomMembership.objects.get_or_create(room=room, student=student)
        if not created:
            return Response(
                {'detail': 'El estudiante ya está en la sala.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        notify(
            student,
            kind=Notification.KIND_ROOM_JOINED,
            title=f'Te agregaron a {room.name}',
            body=f'El docente te agregó a "{room.name}". Cuando active una '
                 'evaluación, podrá rendirla desde sus salas.',
            link='/app/my-rooms/',
        )
        return Response(
            {'detail': 'Estudiante agregado.', 'student': UserSerializer(student).data},
            status=status.HTTP_201_CREATED,
        )


class RoomMemberView(APIView):
    """El docente quita a un estudiante de la sala (no borra sus datos históricos)."""
    permission_classes = [IsAuthenticated]

    def delete(self, request, room_id, student_id):
        room = get_object_or_404(Room, id=room_id)
        if room.teacher_id != request.user.id:
            return Response(
                {'detail': 'Only the owner can remove members.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        membership = get_object_or_404(
            RoomMembership, room=room, student_id=student_id
        )
        membership.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
