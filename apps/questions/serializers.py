from rest_framework import serializers

from .models import KnowledgeNode, PDFDocument, Question


class KnowledgeNodeSerializer(serializers.ModelSerializer):
    # Preguntas aprobadas (= contestables) del nodo. El estudiante usa esto para
    # elegir nodos con material y el docente para ver qué nodos ya tienen banco.
    approved_count = serializers.SerializerMethodField()

    class Meta:
        model = KnowledgeNode
        fields = ['id', 'room', 'name', 'created_at', 'approved_count']
        read_only_fields = ['id', 'room', 'created_at']

    def get_approved_count(self, obj):
        return obj.questions.filter(status=Question.STATUS_APPROVED).count()


class QuestionSerializer(serializers.ModelSerializer):
    is_approved = serializers.BooleanField(read_only=True)
    node_name = serializers.CharField(source='node.name', read_only=True)
    source_pdf = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = [
            'id', 'node', 'node_name', 'statement', 'difficulty', 'question_type',
            'cognitive_level', 'options', 'correct_index', 'correct_indices',
            'source', 'source_pdf', 'status', 'is_approved', 'created_at',
        ]
        read_only_fields = ['id', 'source', 'status', 'is_approved', 'created_at']

    def get_source_pdf(self, obj):
        if not obj.source_pdf_id:
            return None
        import os
        name = obj.source_pdf.file_path.name if obj.source_pdf.file_path else ''
        return {'id': obj.source_pdf_id, 'original_name': os.path.basename(name)}


class QuestionPublicSerializer(serializers.ModelSerializer):
    """Serializer para el estudiante: nunca expone las respuestas correctas.
    Incluye question_type para que el front sepa si renderizar radio, checkbox
    o verdadero/falso."""
    node_name = serializers.CharField(source='node.name', read_only=True)

    class Meta:
        model = Question
        fields = ['id', 'node', 'node_name', 'statement', 'difficulty', 'question_type', 'options']


class GenerateQuestionsSerializer(serializers.Serializer):
    node_id = serializers.IntegerField()
    difficulty = serializers.ChoiceField(choices=['easy', 'medium', 'hard'])
    count = serializers.IntegerField(default=5, min_value=1, max_value=20)
    # Vacío = la IA mezcla tipos; o forzar single/true_false/multiple.
    question_type = serializers.ChoiceField(
        choices=[t[0] for t in Question.TYPE_CHOICES], required=False, allow_blank=True,
    )
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
    question_type = serializers.ChoiceField(
        choices=[t[0] for t in Question.TYPE_CHOICES], default=Question.TYPE_SINGLE
    )
    options = serializers.ListField(
        child=serializers.CharField(), min_length=2, max_length=6
    )
    # Acepta correct_indices (lista) o el legacy correct_index (único).
    correct_indices = serializers.ListField(
        child=serializers.IntegerField(min_value=0), required=False, min_length=1
    )
    correct_index = serializers.IntegerField(required=False, min_value=0)
    difficulty = serializers.ChoiceField(choices=['easy', 'medium', 'hard'])

    def validate(self, attrs):
        options = attrs['options']
        qtype = attrs['question_type']
        indices = attrs.get('correct_indices')
        if indices is None:
            if 'correct_index' not in attrs:
                raise serializers.ValidationError(
                    'Proporcioná "correct_indices" o "correct_index".'
                )
            indices = [attrs['correct_index']]

        if len(set(indices)) != len(indices):
            raise serializers.ValidationError('correct_indices no puede repetir índices.')
        if any(i >= len(options) for i in indices):
            raise serializers.ValidationError('correct_indices fuera del rango de opciones.')
        if qtype == Question.TYPE_TRUE_FALSE and len(options) != 2:
            raise serializers.ValidationError('Verdadero/Falso debe tener exactamente 2 opciones.')
        if qtype in Question.SINGLE_ANSWER_TYPES and len(indices) != 1:
            raise serializers.ValidationError(
                'Opción única y verdadero/falso deben tener exactamente una correcta.'
            )
        if qtype == Question.TYPE_MULTIPLE and len(indices) < 2:
            raise serializers.ValidationError(
                'Opción múltiple debe tener al menos dos respuestas correctas.'
            )

        attrs['correct_indices'] = indices
        return attrs


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
    MAX_BYTES = 10 * 1024 * 1024  # 10 MB

    file = serializers.FileField()

    def validate_file(self, value):
        if value.size > self.MAX_BYTES:
            raise serializers.ValidationError(
                'El PDF supera el tamaño máximo permitido (10 MB).'
            )
        if not (value.name or '').lower().endswith('.pdf'):
            raise serializers.ValidationError('El archivo debe tener extensión .pdf.')
        # Magic bytes: un .pdf renombrado o un binario arbitrario no pasa.
        head = value.read(5)
        value.seek(0)
        if head[:5] != b'%PDF-':
            raise serializers.ValidationError('El archivo no es un PDF válido.')
        return value
