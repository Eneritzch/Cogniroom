from rest_framework import serializers

from .models import KnowledgeNode, PDFDocument, Question


class KnowledgeNodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = KnowledgeNode
        fields = ['id', 'room', 'name', 'created_at']
        read_only_fields = ['id', 'room', 'created_at']


class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = [
            'id', 'node', 'text', 'difficulty', 'options',
            'correct_index', 'source', 'is_approved', 'created_at',
        ]
        read_only_fields = ['id', 'source', 'is_approved', 'created_at']


class QuestionPublicSerializer(serializers.ModelSerializer):
    """Excludes correct_index — used for the student-facing endpoint."""

    class Meta:
        model = Question
        fields = ['id', 'node', 'text', 'difficulty', 'options']


class GenerateQuestionsSerializer(serializers.Serializer):
    node_id = serializers.IntegerField()
    difficulty = serializers.ChoiceField(choices=['easy', 'medium', 'hard'])
    count = serializers.IntegerField(default=5, min_value=1, max_value=20)
    content = serializers.CharField()


class ManualQuestionSerializer(serializers.Serializer):
    node_id = serializers.IntegerField()
    text = serializers.CharField()
    options = serializers.ListField(
        child=serializers.CharField(), min_length=4, max_length=4
    )
    correct_index = serializers.IntegerField(min_value=0, max_value=3)
    difficulty = serializers.ChoiceField(choices=['easy', 'medium', 'hard'])


class ApproveQuestionsSerializer(serializers.Serializer):
    question_ids = serializers.ListField(child=serializers.IntegerField(), min_length=1)


class PDFDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = PDFDocument
        fields = ['id', 'room', 'uploaded_by', 'file_path', 'processed', 'created_at']
        read_only_fields = ['id', 'uploaded_by', 'processed', 'created_at']
