from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.rooms.models import Room, RoomMembership
from services.claude_service import CognitiveAnalysisService

from .models import KnowledgeNode, Question
from .serializers import (
    ApproveQuestionsSerializer,
    GenerateQuestionsSerializer,
    KnowledgeNodeSerializer,
    ManualQuestionSerializer,
    QuestionPublicSerializer,
    QuestionSerializer,
)


def _is_member(user, room):
    if room.owner_id == user.id:
        return True
    if room.mode == 'individual':
        return room.owner_id == user.id
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
        if room.owner_id != request.user.id:
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
        if room.owner_id != request.user.id:
            return Response(
                {'detail': 'Only the room owner can generate questions.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = GenerateQuestionsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        node = get_object_or_404(KnowledgeNode, id=data['node_id'], room=room)

        claude = CognitiveAnalysisService()
        generated = claude.generate_questions(
            content=data['content'],
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
                    text=item.get('text', ''),
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
        if room.owner_id != request.user.id or request.user.role != 'teacher':
            return Response(
                {'detail': 'Only the teacher owner can create manual questions.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = ManualQuestionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        node = get_object_or_404(KnowledgeNode, id=data['node_id'], room=room)

        question = Question.objects.create(
            node=node,
            text=data['text'],
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
        if room.owner_id != request.user.id:
            return Response(
                {'detail': 'Only the room owner can approve questions.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = ApproveQuestionsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ids = serializer.validated_data['question_ids']

        updated = Question.objects.filter(
            id__in=ids, node__room=room
        ).update(is_approved=True)

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
        qs = Question.objects.filter(node__room=room, is_approved=True).order_by('id')

        if request.user.id == room.owner_id:
            return Response(QuestionSerializer(qs, many=True).data)
        return Response(QuestionPublicSerializer(qs, many=True).data)
