from django.db.models import Avg, Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.notifications.models import Notification
from apps.notifications.services import notify

from .models import Room, RoomJoinRequest, RoomMembership, Section
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

        # Archivar / reactivar: is_active=False saca la sala del descubrimiento
        # del alumno y bloquea nuevas inscripciones, conservando el historial.
        archived = request.data.get('archived')
        if archived is not None:
            room.is_active = not bool(archived)
            fields.append('is_active')

        if fields:
            room.save(update_fields=fields)
        return Response(_teacher_room_data(room))

    def delete(self, request, room_id):
        room = get_object_or_404(Room, id=room_id)
        if room.teacher_id != request.user.id:
            return Response(
                {'detail': 'Solo el dueño puede eliminar esta sala.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        from apps.sessions.models import EvaluationSession

        member_count = RoomMembership.objects.filter(room=room).count()
        session_count = EvaluationSession.objects.filter(room=room).count()

        # Salas de estudio (individual) solo contienen datos del propio dueño; las
        # grupales vacías no arrastran historial ajeno → borrado directo.
        if room.mode == Room.MODE_INDIVIDUAL or (member_count == 0 and session_count == 0):
            room.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        # Sala grupal con datos de estudiantes: el CASCADE arrastraría el historial
        # cognitivo (BKT/ICC/diagnósticos) de cada alumno. Se exige confirmar con el
        # nombre exacto; sin eso, se sugiere archivar.
        confirm = (request.data.get('confirm') or request.query_params.get('confirm') or '').strip()
        if confirm != room.name:
            return Response(
                {
                    'detail': 'Esta sala tiene datos de estudiantes. Confírma con el '
                              'nombre exacto para eliminarla, o archívala para conservar el historial.',
                    'requires_confirmation': True,
                    'member_count': member_count,
                    'session_count': session_count,
                    'room_name': room.name,
                },
                status=status.HTTP_409_CONFLICT,
            )

        room.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


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

        # Sección opcional: al agregar, el docente puede agrupar al alumno en un
        # paralelo (si la sala tiene secciones).
        section = None
        section_id = request.data.get('section_id')
        if section_id not in (None, '', 'null'):
            try:
                section = Section.objects.get(id=section_id, room=room)
            except (Section.DoesNotExist, ValueError, TypeError):
                return Response(
                    {'detail': 'El paralelo no pertenece a esta sala.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        membership, created = RoomMembership.objects.get_or_create(
            room=room, student=student, defaults={'section': section}
        )
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


def _join_request_data(req):
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


class RoomDiscoverView(APIView):
    """Salas grupales de la institucion del alumno para autoinscribirse."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role != 'student' or user.institution_id is None:
            return Response([])

        member_ids = set(
            RoomMembership.objects.filter(student=user).values_list('room_id', flat=True)
        )
        requested = {
            rjr.room_id: rjr.section_id
            for rjr in RoomJoinRequest.objects.filter(student=user)
        }
        rooms = (
            Room.objects.filter(
                mode=Room.MODE_GROUP,
                is_active=True,
                teacher__institution_id=user.institution_id,
            )
            .exclude(id__in=member_ids)
            .select_related('teacher')
            .prefetch_related('sections')
        )
        # Búsqueda por sala o docente: en instituciones grandes (muchos docentes
        # con muchas salas) la lista se vuelve enorme; se filtra en servidor y se
        # limita el resultado en vez de traerlo todo.
        q = (request.query_params.get('q') or '').strip()
        if q:
            rooms = rooms.filter(
                Q(name__icontains=q)
                | Q(subject__icontains=q)
                | Q(teacher__first_name__icontains=q)
                | Q(teacher__last_name__icontains=q)
            )
        rooms = rooms.order_by('name')[:40]
        data = [{
            'id': r.id,
            'name': r.name,
            'subject': r.subject,
            'teacher_name': f'{r.teacher.first_name} {r.teacher.last_name}'.strip() or r.teacher.username,
            'requested': r.id in requested,
            'requested_section_id': requested.get(r.id),
            'sections': [
                {'id': s.id, 'code': s.code, 'name': s.name, 'schedule': s.schedule}
                for s in r.sections.all()
            ],
        } for r in rooms]
        return Response(data)


class RoomJoinRequestView(APIView):
    """El alumno solicita (POST) o cancela (DELETE) su ingreso a una sala."""
    permission_classes = [IsAuthenticated]

    def post(self, request, room_id):
        user = request.user
        room = get_object_or_404(Room.objects.select_related('teacher'), id=room_id)
        if user.role != 'student':
            return Response({'detail': 'Solo los estudiantes pueden solicitar ingreso.'}, status=status.HTTP_403_FORBIDDEN)
        if room.mode != Room.MODE_GROUP:
            return Response({'detail': 'Solo las salas grupales aceptan solicitudes.'}, status=status.HTTP_400_BAD_REQUEST)
        if user.institution_id is None or room.teacher.institution_id != user.institution_id:
            return Response({'detail': 'La sala no pertenece a tu institucion.'}, status=status.HTTP_403_FORBIDDEN)
        if RoomMembership.objects.filter(room=room, student=user).exists():
            return Response({'detail': 'Ya eres miembro de esta sala.'}, status=status.HTTP_400_BAD_REQUEST)

        # Paralelo declarado por el alumno (opcional; el docente lo confirma/corrige).
        section = None
        section_id = request.data.get('section_id')
        if section_id not in (None, '', 'null'):
            try:
                section = Section.objects.get(id=section_id, room=room)
            except (Section.DoesNotExist, ValueError, TypeError):
                return Response({'detail': 'El paralelo no pertenece a esta sala.'}, status=status.HTTP_400_BAD_REQUEST)

        _, created = RoomJoinRequest.objects.get_or_create(
            room=room, student=user, defaults={'section': section}
        )
        if not created:
            return Response({'detail': 'Ya enviaste una solicitud a esta sala.'}, status=status.HTTP_400_BAD_REQUEST)

        sname = f'{user.first_name} {user.last_name}'.strip() or user.username
        notify(
            room.teacher,
            kind=Notification.KIND_JOIN_REQUEST,
            title=f'{sname} quiere unirse a "{room.name}"',
            body='Revisa la solicitud y apruebala o rechazala en Estudiantes.',
            link='/app/students/',
        )
        return Response({'detail': 'Solicitud enviada.'}, status=status.HTTP_201_CREATED)

    def delete(self, request, room_id):
        RoomJoinRequest.objects.filter(room_id=room_id, student=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class JoinRequestListView(APIView):
    """Bandeja del docente: solicitudes pendientes de todas sus salas."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        reqs = (
            RoomJoinRequest.objects.filter(room__teacher=request.user)
            .select_related('room', 'student')
            .order_by('created_at')
        )
        return Response([_join_request_data(r) for r in reqs])


class JoinRequestApproveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, req_id):
        req = get_object_or_404(
            RoomJoinRequest.objects.select_related('room', 'student'), id=req_id
        )
        if req.room.teacher_id != request.user.id:
            return Response({'detail': 'Solo el dueno de la sala puede aprobar.'}, status=status.HTTP_403_FORBIDDEN)

        room, student = req.room, req.student

        # El docente puede corregir el paralelo al aprobar; si no, se usa el que
        # el alumno declaro.
        section = req.section
        override_id = request.data.get('section_id')
        if override_id not in (None, '', 'null'):
            try:
                section = Section.objects.get(id=override_id, room=room)
            except (Section.DoesNotExist, ValueError, TypeError):
                return Response({'detail': 'El paralelo no pertenece a esta sala.'}, status=status.HTTP_400_BAD_REQUEST)

        membership, _ = RoomMembership.objects.get_or_create(room=room, student=student)
        if section is not None and membership.section_id != section.id:
            membership.section = section
            membership.save(update_fields=['section'])
        req.delete()

        notify(
            student,
            kind=Notification.KIND_ROOM_JOINED,
            title=f'Fuiste aceptado en "{room.name}"',
            body='Ya puedes ver las preguntas y evaluarte en esta sala.',
            link='/app/my-rooms/',
        )
        return Response({'detail': 'Solicitud aprobada.'})


class JoinRequestRejectView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, req_id):
        req = get_object_or_404(
            RoomJoinRequest.objects.select_related('room', 'student'), id=req_id
        )
        if req.room.teacher_id != request.user.id:
            return Response({'detail': 'Solo el dueno de la sala puede rechazar.'}, status=status.HTTP_403_FORBIDDEN)

        room, student = req.room, req.student
        req.delete()

        notify(
            student,
            kind=Notification.KIND_JOIN_REJECTED,
            title=f'Tu solicitud a "{room.name}" no fue aprobada',
            body='Puedes consultar con tu docente o intentar con otra sala.',
            link='/app/my-rooms/',
        )
        return Response({'detail': 'Solicitud rechazada.'})
