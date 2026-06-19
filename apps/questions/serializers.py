from rest_framework import serializers

from .models import KnowledgeNode, PDFDocument, Question


class KnowledgeNodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = KnowledgeNode
        fields = ['id', 'room', 'name', 'created_at']
        read_only_fields = ['id', 'room', 'created_at']


class QuestionSerializer(serializers.ModelSerializer):
    is_approved = serializers.BooleanField(read_only=True)
    node_name = serializers.CharField(source='node.name', read_only=True)
    source_pdf = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = [
            'id', 'node', 'node_name', 'statement', 'difficulty', 'options',
            'correct_index', 'source', 'source_pdf', 'status', 'is_approved', 'created_at',
        ]
        read_only_fields = ['id', 'source', 'status', 'is_approved', 'created_at']

    def get_source_pdf(self, obj):
        if not obj.source_pdf_id:
            return None
        import os
        name = obj.source_pdf.file_path.name if obj.source_pdf.file_path else ''
        return {'id': obj.source_pdf_id, 'original_name': os.path.basename(name)}


class QuestionPublicSerializer(serializers.ModelSerializer):
    node_name = serializers.CharField(source='node.name', read_only=True)

    class Meta:
        model = Question
        fields = ['id', 'node', 'node_name', 'statement', 'difficulty', 'options']


class GenerateQuestionsSerializer(serializers.Serializer):
    node_id = serializers.IntegerField()
    difficulty = serializers.ChoiceField(choices=['easy', 'medium', 'hard'])
    count = serializers.IntegerField(default=5, min_value=1, max_value=20)
    content = serializers.CharField(required=False, allow_blank=True)
    pdf_id = serializers.IntegerField(required=False)

    def validate(self, attrs):
        if not attrs.get('content') and not attrs.get('pdf_id'):
            raise serializers.ValidationError(
                'Provide either "content" (raw text) or "pdf_id" (existing PDFDocument).'
            )
        return attrs


class ManualQuestionSerializer(serializers.Serializer):
    node_id = serializers.IntegerField()
    statement = serializers.CharField()
    options = serializers.ListField(
        child=serializers.CharField(), min_length=4, max_length=4
    )
    correct_index = serializers.IntegerField(min_value=0, max_value=3)
    difficulty = serializers.ChoiceField(choices=['easy', 'medium', 'hard'])


class ApproveQuestionsSerializer(serializers.Serializer):
    question_ids = serializers.ListField(child=serializers.IntegerField(), min_length=1)


class PDFDocumentSerializer(serializers.ModelSerializer):
    """List/detail serializer (without extracted text — keeps payload light)."""

    processed = serializers.BooleanField(read_only=True)
    original_name = serializers.SerializerMethodField()
    size_bytes = serializers.SerializerMethodField()

    class Meta:
        model = PDFDocument
        fields = [
            'id', 'room', 'uploaded_by', 'file_path',
            'original_name', 'size_bytes', 'status', 'processed', 'created_at',
        ]
        read_only_fields = fields

    def get_original_name(self, obj):
        import os
        return os.path.basename(obj.file_path.name) if obj.file_path else ''

    def get_size_bytes(self, obj):
        try:
            return obj.file_path.size
        except Exception:
            return None


class PDFDocumentDetailSerializer(serializers.ModelSerializer):
    """Detail serializer — includes the full extracted text."""

    processed = serializers.BooleanField(read_only=True)

    class Meta:
        model = PDFDocument
        fields = [
            'id', 'room', 'uploaded_by', 'file_path',
            'extracted_text', 'status', 'processed', 'created_at',
        ]
        read_only_fields = fields


class PDFUploadSerializer(serializers.Serializer):
    file = serializers.FileField()
