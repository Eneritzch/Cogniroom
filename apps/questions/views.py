from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

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
        if not content and data.get('pdf_id'):
            pdf = get_object_or_404(PDFDocument, id=data['pdf_id'], room=room)
            content = pdf.extracted_text
            if not content:
                return Response(
                    {'detail': 'PDF has no extracted text yet.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        claude = CognitiveAnalysisService()
        generated = claude.generate_questions(
            content=content,
            node_name=node.name,
            difficulty=data['difficulty'],
            count=data['count'],
        )

        created = []
        for item in generated:
            try:
                options = item.get('options', [])
                correct_index = int(item.get('correct_index', 0))
                if not isinstance(options, list) or len(options) != 4:
                    continue
                if correct_index not in (0, 1, 2, 3):
                    continue
                q = Question.objects.create(
                    node=node,
                    statement=item.get('text', ''),
                    difficulty=item.get('difficulty', data['difficulty']),
                    options=options,
                    correct_index=correct_index,
                    source=Question.SOURCE_AI,
                )
                created.append(q)
            except (ValueError, TypeError):
                continue

        return Response(
            {
                'created_count': len(created),
                'questions': QuestionSerializer(created, many=True).data,
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
            options=data['options'],
            correct_index=data['correct_index'],
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

        updated = Question.objects.filter(
            id__in=ids, node__room=room
        ).update(status=Question.STATUS_APPROVED)

        return Response({'approved_count': updated})


class QuestionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, room_id):
        room = get_object_or_404(Room, id=room_id)
        if not _is_member(request.user, room):
            return Response(
                {'detail': 'Not a member of this room.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        qs = Question.objects.filter(
            node__room=room, status=Question.STATUS_APPROVED
        ).order_by('id')

        if request.user.id == room.teacher_id:
            return Response(QuestionSerializer(qs, many=True).data)
        return Response(QuestionPublicSerializer(qs, many=True).data)


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
        except Exception as e:
            pdf.status = PDFDocument.STATUS_FAILED
            pdf.save(update_fields=['status'])
            return Response(
                {
                    'detail': f'PDF uploaded but extraction failed: {e}',
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
