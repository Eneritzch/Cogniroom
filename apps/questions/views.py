from django.conf import settings
from django.db.models import Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.notifications.models import Notification
from apps.notifications.services import notify
from apps.rooms.models import Room, RoomMembership
from services.claude_service import CognitiveAnalysisService

from .extractors import ALLOWED_UPLOAD_EXTENSIONS, extract_document_text
from .generation import run_generation
from .models import AIGenerationLog, KnowledgeNode, PDFDocument, Question


def _question_quota_status(teacher):
    """Preguntas IA generadas este mes por el docente. Devuelve (limit, used,
    remaining); limit=0 = sin límite (remaining None)."""
    limit = getattr(settings, 'AI_MONTHLY_QUESTION_QUOTA', 0) or 0
    if limit <= 0:
        return 0, 0, None
    month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    used = AIGenerationLog.objects.filter(
        teacher=teacher, created_at__gte=month_start
    ).aggregate(n=Sum('created_count'))['n'] or 0
    return limit, used, max(0, limit - used)
from .serializers import (
    ApproveQuestionsSerializer,
    GenerateQuestionsSerializer,
    KnowledgeNodeSerializer,
    ManualQuestionSerializer,
    PDFDocumentDetailSerializer,
    PDFDocumentSerializer,
    PDFUploadSerializer,
    QuestionPublicSerializer,
    QuestionSerializer,
)


def _is_member(user, room):
    if room.teacher_id == user.id:
        return True
    if room.mode == 'individual':
        return room.teacher_id == user.id
    return RoomMembership.objects.filter(room=room, student=user).exists()


class NodeListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, room_id):
        room = get_object_or_404(Room, id=room_id)
        if not _is_member(request.user, room):
            return Response(
                {'detail': 'Not a member of this room.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        nodes = KnowledgeNode.objects.filter(room=room).order_by('created_at')
        return Response(KnowledgeNodeSerializer(nodes, many=True).data)

    def post(self, request, room_id):
        room = get_object_or_404(Room, id=room_id)
        if room.teacher_id != request.user.id:
            return Response(
                {'detail': 'Only the room owner can create nodes.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        name = request.data.get('name')
        if not name:
            return Response(
                {'detail': 'name is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        node = KnowledgeNode.objects.create(room=room, name=name)
        return Response(KnowledgeNodeSerializer(node).data, status=status.HTTP_201_CREATED)


class NodeDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _owned_node(self, request, room_id, node_id):
        room = get_object_or_404(Room, id=room_id)
        if room.teacher_id != request.user.id:
            return None, Response(
                {'detail': 'Only the room owner can manage nodes.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return get_object_or_404(KnowledgeNode, id=node_id, room=room), None

    def patch(self, request, room_id, node_id):
        node, error = self._owned_node(request, room_id, node_id)
        if error:
            return error

        update_fields = []

        if 'name' in request.data:
            name = (request.data.get('name') or '').strip()
            if not name:
                return Response({'detail': 'name is required.'}, status=status.HTTP_400_BAD_REQUEST)
            if KnowledgeNode.objects.filter(room_id=node.room_id, name=name).exclude(id=node.id).exists():
                return Response(
                    {'detail': 'Ya existe un nodo con ese nombre en la sala.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            node.name = name
            update_fields.append('name')

        if 'questions_per_session' in request.data:
            try:
                qps = int(request.data.get('questions_per_session'))
            except (TypeError, ValueError):
                return Response(
                    {'detail': 'questions_per_session debe ser un entero.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if qps < 0:
                return Response(
                    {'detail': 'questions_per_session no puede ser negativo.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            node.questions_per_session = qps
            update_fields.append('questions_per_session')

        if not update_fields:
            return Response(
                {'detail': 'Nada que actualizar.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        node.save(update_fields=update_fields)
        return Response(KnowledgeNodeSerializer(node).data)

    def delete(self, request, room_id, node_id):
        node, error = self._owned_node(request, room_id, node_id)
        if error:
            return error
        # Solo nodos vacíos: con preguntas asociadas se perderían en cascada las respuestas,
        # el BKT y los índices de los estudiantes.
        if node.questions.exists():
            return Response(
                {'detail': 'No se puede borrar un nodo con preguntas. Solo se borran nodos vacíos.'},
                status=status.HTTP_409_CONFLICT,
            )
        node.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class GenerateQuestionsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, room_id):
        room = get_object_or_404(Room, id=room_id)
        if room.teacher_id != request.user.id:
            return Response(
                {'detail': 'Only the room owner can generate questions.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        limit, used, remaining = _question_quota_status(request.user)
        if limit > 0 and remaining <= 0:
            return Response(
                {
                    'detail': f'Alcanzaste el límite de {limit} preguntas con IA este mes. '
                              'Se renueva el primer día del próximo mes.',
                    'quota': {'limit': limit, 'used': used, 'remaining': 0},
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        serializer = GenerateQuestionsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        node = get_object_or_404(KnowledgeNode, id=data['node_id'], room=room)

        # Con documento: la fuente es el PDF y el texto del docente es el enfoque
        # (qué temas sacar; vacío = todo). Sin documento: el texto es la fuente.
        text = (data.get('content') or '').strip()
        source_pdf = None
        file_id = ''
        content = ''
        focus = ''
        if data.get('pdf_id'):
            source_pdf = get_object_or_404(PDFDocument, id=data['pdf_id'], room=room)
            # PDF nativo si está subido a la Files API; si no, texto plano.
            file_id = source_pdf.file_id or ''
            if not file_id:
                content = source_pdf.extracted_text
                if not content:
                    return Response(
                        {'detail': 'El PDF aún no tiene texto extraído.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            focus = text
        else:
            content = text

        created = run_generation(
            request.user, room, node, source_pdf,
            data['difficulty'], data['count'], content, file_id,
            data.get('question_type') or '', focus,
        )

        # En salas grupales las preguntas IA quedan por revisar: avisamos al docente.
        if created and room.mode == Room.MODE_GROUP:
            notify(
                room.teacher,
                kind=Notification.KIND_QUESTION_PENDING,
                title=f'{len(created)} preguntas IA por revisar',
                body=f'Se generaron {len(created)} preguntas en "{node.name}" ({room.name}). '
                     'Revísalas y aprueba las que correspondan.',
                link='/app/questions/',
            )

        limit, used, remaining = _question_quota_status(request.user)
        return Response(
            {
                'created_count': len(created),
                'questions': QuestionSerializer(created, many=True).data,
                'quota': {'limit': limit, 'used': used, 'remaining': remaining},
            },
            status=status.HTTP_201_CREATED,
        )


class ManualQuestionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, room_id):
        room = get_object_or_404(Room, id=room_id)
        if room.teacher_id != request.user.id:
            return Response(
                {'detail': 'Only the room owner can create manual questions.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        if room.mode == 'group' and request.user.role != 'teacher':
            return Response(
                {'detail': 'Group rooms require a teacher owner.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = ManualQuestionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        node = get_object_or_404(KnowledgeNode, id=data['node_id'], room=room)

        question = Question.objects.create(
            node=node,
            statement=data['statement'],
            difficulty=data['difficulty'],
            question_type=data['question_type'],
            options=data['options'],
            correct_indices=data['correct_indices'],
            correct_index=data['correct_indices'][0],
            source=Question.SOURCE_MANUAL,
        )
        return Response(QuestionSerializer(question).data, status=status.HTTP_201_CREATED)


class ApproveQuestionsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, room_id):
        room = get_object_or_404(Room, id=room_id)
        if room.teacher_id != request.user.id:
            return Response(
                {'detail': 'Only the room owner can approve questions.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = ApproveQuestionsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ids = serializer.validated_data['question_ids']

        scoped = Question.objects.filter(id__in=ids, node__room=room)
        # Solo cuentan las que pasan de no-aprobada a aprobada (evita avisar de más).
        new_count = scoped.exclude(status=Question.STATUS_APPROVED).count()
        updated = scoped.update(status=Question.STATUS_APPROVED)

        if new_count > 0:
            from apps.rooms.models import RoomMembership
            plural = 'preguntas nuevas' if new_count != 1 else 'pregunta nueva'
            for m in RoomMembership.objects.filter(room=room).select_related('student'):
                notify(
                    m.student,
                    kind=Notification.KIND_QUESTIONS_ADDED,
                    title=f'{new_count} {plural} en {room.name}',
                    body=f'Tu docente agregó {new_count} {plural} en "{room.name}". '
                         'Practícalas cuando quieras desde tus salas.',
                    link='/app/my-rooms/',
                )

        return Response({'approved_count': updated})


class RejectQuestionsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, room_id):
        room = get_object_or_404(Room, id=room_id)
        if room.teacher_id != request.user.id:
            return Response(
                {'detail': 'Only the room owner can reject questions.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = ApproveQuestionsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ids = serializer.validated_data['question_ids']

        updated = Question.objects.filter(
            id__in=ids, node__room=room
        ).update(status=Question.STATUS_REJECTED)

        return Response({'rejected_count': updated})


class QuestionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, room_id):
        room = get_object_or_404(Room, id=room_id)
        if not _is_member(request.user, room):
            return Response(
                {'detail': 'Not a member of this room.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        # El docente dueño ve todo el banco (incluye pendientes/rechazadas);
        # los estudiantes solo ven las aprobadas.
        if request.user.id == room.teacher_id:
            qs = Question.objects.filter(node__room=room).order_by('-created_at')
            return Response(QuestionSerializer(qs, many=True).data)

        qs = Question.objects.filter(
            node__room=room, status=Question.STATUS_APPROVED
        ).order_by('id')
        return Response(QuestionPublicSerializer(qs, many=True).data)


class QuestionDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, room_id, question_id):
        room = get_object_or_404(Room, id=room_id)
        if room.teacher_id != request.user.id:
            return Response(
                {'detail': 'Only the room owner can edit questions.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        question = get_object_or_404(Question, id=question_id, node__room=room)

        serializer = ManualQuestionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        node = get_object_or_404(KnowledgeNode, id=data['node_id'], room=room)
        question.node = node
        question.statement = data['statement']
        question.difficulty = data['difficulty']
        question.question_type = data['question_type']
        question.options = data['options']
        question.correct_indices = data['correct_indices']

        level = request.data.get('cognitive_level')
        if level is not None:
            question.cognitive_level = level if level in dict(Question.COGNITIVE_LEVEL_CHOICES) else ''

        # save() sincroniza correct_index y NO toca el status (solo auto-aprueba al crear).
        question.save()
        return Response(QuestionSerializer(question).data)


class PDFUploadListView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request, room_id):
        room = get_object_or_404(Room, id=room_id)
        if not _is_member(request.user, room):
            return Response(
                {'detail': 'Not a member of this room.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        pdfs = PDFDocument.objects.filter(room=room).order_by('-created_at')
        return Response(PDFDocumentSerializer(pdfs, many=True).data)

    def post(self, request, room_id):
        room = get_object_or_404(Room, id=room_id)
        if room.teacher_id != request.user.id:
            return Response(
                {'detail': 'Only the room owner can upload PDFs.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = PDFUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        uploaded = serializer.validated_data['file']
        name = uploaded.name.lower()

        if not name.endswith(ALLOWED_UPLOAD_EXTENSIONS):
            return Response(
                {'detail': 'El documento debe ser PDF, PPTX o DOCX.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        pdf = PDFDocument.objects.create(
            room=room,
            uploaded_by=request.user,
            file_path=uploaded,
        )

        try:
            pdf.extracted_text = extract_document_text(pdf.file_path.path, uploaded.name)
            pdf.status = PDFDocument.STATUS_PROCESSED
            pdf.save(update_fields=['extracted_text', 'status'])

            # Análisis nativo por Claude solo para PDF (preserva tablas y fórmulas); PPTX/DOCX
            # quedan con su texto extraído. Best-effort: si falla, queda el texto plano.
            if name.endswith('.pdf'):
                try:
                    pdf.file_path.open('rb')
                    file_id = CognitiveAnalysisService().upload_pdf(pdf.file_path, uploaded.name)
                    if file_id:
                        pdf.file_id = file_id
                        pdf.save(update_fields=['file_id'])
                except Exception:
                    pass
                finally:
                    try:
                        pdf.file_path.close()
                    except Exception:
                        pass
        except Exception:
            pdf.status = PDFDocument.STATUS_FAILED
            pdf.save(update_fields=['status'])
            return Response(
                {
                    'detail': 'El documento se subió pero no se pudo extraer su contenido.',
                    'pdf': PDFDocumentSerializer(pdf).data,
                },
                status=status.HTTP_201_CREATED,
            )

        return Response(
            PDFDocumentDetailSerializer(pdf).data,
            status=status.HTTP_201_CREATED,
        )


class PDFDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, room_id, pdf_id):
        room = get_object_or_404(Room, id=room_id)
        if not _is_member(request.user, room):
            return Response(
                {'detail': 'Not a member of this room.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        pdf = get_object_or_404(PDFDocument, id=pdf_id, room=room)
        return Response(PDFDocumentDetailSerializer(pdf).data)

    def delete(self, request, room_id, pdf_id):
        room = get_object_or_404(Room, id=room_id)
        if room.teacher_id != request.user.id:
            return Response(
                {'detail': 'Only the room owner can delete PDFs.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        pdf = get_object_or_404(PDFDocument, id=pdf_id, room=room)
        try:
            pdf.file_path.delete(save=False)
        except Exception:
            pass
        pdf.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
