import random

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.notifications.models import Notification
from apps.notifications.services import notify
from apps.rooms.models import Room, RoomMembership
from services.claude_service import CognitiveAnalysisService

from .models import KnowledgeNode, PDFDocument, Question
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


def shuffle_options(options, correct_indices, qtype):
    """Randomiza el orden de las opciones y reubica las correctas. Los modelos de
    lenguaje tienden a poner la respuesta correcta primero (en nuestras pruebas,
    el 100% en la opción A), lo que el estudiante detecta y juega. Randomizar la
    posición fuerza a evaluar conocimiento real. Verdadero/Falso conserva su orden
    natural (Verdadero, Falso)."""
    if qtype == Question.TYPE_TRUE_FALSE or len(options) < 2:
        return options, sorted(correct_indices)
    order = list(range(len(options)))
    random.shuffle(order)
    new_options = [options[i] for i in order]
    correct_set = set(correct_indices)
    new_correct = sorted(j for j, old in enumerate(order) if old in correct_set)
    return new_options, new_correct


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
        name = (request.data.get('name') or '').strip()
        if not name:
            return Response({'detail': 'name is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if KnowledgeNode.objects.filter(room_id=node.room_id, name=name).exclude(id=node.id).exists():
            return Response(
                {'detail': 'Ya existe un nodo con ese nombre en la sala.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        node.name = name
        node.save(update_fields=['name'])
        return Response(KnowledgeNodeSerializer(node).data)

    def delete(self, request, room_id, node_id):
        node, error = self._owned_node(request, room_id, node_id)
        if error:
            return error
        # Solo nodos vacíos: con preguntas asociadas se perderían en cascada las
        # respuestas, el BKT y los índices de los estudiantes. Para nodos con datos
        # la vía es archivar (a definir), no borrar.
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

        serializer = GenerateQuestionsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        node = get_object_or_404(KnowledgeNode, id=data['node_id'], room=room)

        content = data.get('content') or ''
        source_pdf = None
        file_id = ''
        if not content and data.get('pdf_id'):
            source_pdf = get_object_or_404(PDFDocument, id=data['pdf_id'], room=room)
            # PDF nativo si está subido a la Files API; si no, texto plano.
            file_id = source_pdf.file_id or ''
            if not file_id:
                content = source_pdf.extracted_text
                if not content:
                    return Response(
                        {'detail': 'PDF has no extracted text yet.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        claude = CognitiveAnalysisService()
        generated = claude.generate_questions(
            node_name=node.name,
            difficulty=data['difficulty'],
            count=data['count'],
            content=content,
            file_id=file_id,
            question_type=data.get('question_type') or '',
        )

        created = []
        for item in generated:
            try:
                options = item.get('options', [])
                qtype = item.get('question_type', Question.TYPE_SINGLE)
                indices = item.get('correct_indices') or []
                if not isinstance(options, list) or not (2 <= len(options) <= 6):
                    continue
                if qtype not in (Question.TYPE_SINGLE, Question.TYPE_TRUE_FALSE, Question.TYPE_MULTIPLE):
                    continue
                if not isinstance(indices, list) or not indices:
                    continue
                indices = [int(i) for i in indices]
                if len(set(indices)) != len(indices):
                    continue
                if any(i < 0 or i >= len(options) for i in indices):
                    continue
                if qtype in Question.SINGLE_ANSWER_TYPES and len(indices) != 1:
                    continue
                if qtype == Question.TYPE_TRUE_FALSE and len(options) != 2:
                    continue
                # Randomiza la posición de la correcta (el modelo la pone siempre
                # primera); imprescindible para que el estudiante no la adivine.
                options, indices = shuffle_options(options, indices, qtype)
                level = item.get('cognitive_level', '')
                if level not in dict(Question.COGNITIVE_LEVEL_CHOICES):
                    level = ''
                q = Question.objects.create(
                    node=node,
                    statement=item.get('text', ''),
                    difficulty=item.get('difficulty', data['difficulty']),
                    question_type=qtype,
                    cognitive_level=level,
                    options=options,
                    correct_indices=indices,
                    correct_index=indices[0],
                    rationale=item.get('rationale', ''),
                    source=Question.SOURCE_AI,
                    source_pdf=source_pdf,
                )
                created.append(q)
            except (ValueError, TypeError):
                continue

        # En salas grupales las preguntas IA quedan pendientes: avisamos al docente
        # que hay banco por revisar.
        if created and room.mode == Room.MODE_GROUP:
            notify(
                room.teacher,
                kind=Notification.KIND_QUESTION_PENDING,
                title=f'{len(created)} preguntas IA por revisar',
                body=f'Se generaron {len(created)} preguntas en "{node.name}" ({room.name}). '
                     'Revisalas y aprobá las que correspondan.',
                link='/app/questions/',
            )

        return Response(
            {
                'created_count': len(created),
                'questions': QuestionSerializer(created, many=True).data,
            },
            status=status.HTTP_201_CREATED,
        )


class EstimateGenerationView(APIView):
    """Estima el costo de una generación con IA antes de ejecutarla: tokens de
    entrada reales (vía count_tokens) + salida aproximada. Sirve para que el
    docente vea el gasto en el panel antes de darle "Generar"."""
    permission_classes = [IsAuthenticated]

    INPUT_PER_M = 5.0      # Opus 4.8: USD por millón de tokens de entrada
    OUTPUT_PER_M = 25.0    # USD por millón de tokens de salida
    APPROX_OUTPUT_PER_Q = 500  # salida aprox. por pregunta (enunciado+opciones+racional+thinking)

    def post(self, request, room_id):
        room = get_object_or_404(Room, id=room_id)
        if room.teacher_id != request.user.id:
            return Response(
                {'detail': 'Only the room owner can estimate generation.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        content = (request.data.get('content') or '').strip()
        pdf_id = request.data.get('pdf_id')
        difficulty = request.data.get('difficulty') or 'medium'
        try:
            count = int(request.data.get('count') or 1)
        except (TypeError, ValueError):
            count = 1
        count = max(1, min(count, 20))

        node_name = ''
        node_id = request.data.get('node_id')
        if node_id:
            node = KnowledgeNode.objects.filter(id=node_id, room=room).first()
            node_name = node.name if node else ''

        # Si no se pegó texto pero se eligió un PDF, estimamos sobre su texto
        # extraído (la Files API no soporta count_tokens; el PDF nativo se
        # aproxima por su texto y puede tokenizar algo distinto).
        source = 'text'
        if not content and pdf_id:
            pdf = PDFDocument.objects.filter(id=pdf_id, room=room).first()
            if pdf and pdf.extracted_text:
                content = pdf.extracted_text
                source = 'pdf'

        # Sin contenido aprovechable o sin API key: no hay estimación.
        if not content:
            return Response({'available': False, 'input_tokens': 0, 'approx_cost_usd': 0.0})

        input_tokens = CognitiveAnalysisService().estimate_generation_tokens(
            content=content, node_name=node_name, difficulty=difficulty, count=count,
        )
        if not input_tokens:
            return Response({'available': False, 'input_tokens': 0, 'approx_cost_usd': 0.0})

        est_output = count * self.APPROX_OUTPUT_PER_Q
        cost = (input_tokens / 1_000_000) * self.INPUT_PER_M + (est_output / 1_000_000) * self.OUTPUT_PER_M
        return Response({
            'available': True,
            'source': source,
            'input_tokens': input_tokens,
            'approx_output_tokens': est_output,
            'approx_cost_usd': round(cost, 4),
        })


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
        if room.mode != 'group':
            return Response(
                {'detail': 'Approval applies only to group rooms.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
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


def _extract_pdf_text(file_obj) -> str:
    import pdfplumber

    parts = []
    with pdfplumber.open(file_obj) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ''
            if text:
                parts.append(text)
    return '\n\n'.join(parts).strip()


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

        if not uploaded.name.lower().endswith('.pdf'):
            return Response(
                {'detail': 'File must be a .pdf'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        pdf = PDFDocument.objects.create(
            room=room,
            uploaded_by=request.user,
            file_path=uploaded,
        )

        try:
            pdf.file_path.open('rb')
            pdf.extracted_text = _extract_pdf_text(pdf.file_path)
            pdf.status = PDFDocument.STATUS_PROCESSED
            pdf.save(update_fields=['extracted_text', 'status'])

            # Subida a la Files API para generación con PDF nativo (tablas,
            # fórmulas, figuras). Best-effort: si falla, queda el texto plano.
            try:
                pdf.file_path.open('rb')
                file_id = CognitiveAnalysisService().upload_pdf(pdf.file_path, uploaded.name)
                if file_id:
                    pdf.file_id = file_id
                    pdf.save(update_fields=['file_id'])
            except Exception:
                pass
        except Exception:
            pdf.status = PDFDocument.STATUS_FAILED
            pdf.save(update_fields=['status'])
            return Response(
                {
                    'detail': 'El PDF se subió pero no se pudo extraer su contenido.',
                    'pdf': PDFDocumentSerializer(pdf).data,
                },
                status=status.HTTP_201_CREATED,
            )
        finally:
            try:
                pdf.file_path.close()
            except Exception:
                pass

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
