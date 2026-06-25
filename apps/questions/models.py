from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class KnowledgeNode(models.Model):
    room = models.ForeignKey('rooms.Room', on_delete=models.CASCADE, related_name='nodes')
    name = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.name} ({self.room.name})'


def _pdf_upload_path(instance, filename):
    return f'pdfs/room_{instance.room_id}/{filename}'


class PDFDocument(models.Model):
    STATUS_UPLOADED = 'uploaded'
    STATUS_PROCESSING = 'processing'
    STATUS_PROCESSED = 'processed'
    STATUS_FAILED = 'failed'
    STATUS_CHOICES = [
        (STATUS_UPLOADED, 'Uploaded'),
        (STATUS_PROCESSING, 'Processing'),
        (STATUS_PROCESSED, 'Processed'),
        (STATUS_FAILED, 'Failed'),
    ]

    room = models.ForeignKey('rooms.Room', on_delete=models.CASCADE, related_name='pdfs')
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='pdfs'
    )
    file_path = models.FileField(upload_to=_pdf_upload_path, max_length=500)
    extracted_text = models.TextField(blank=True)
    # ID del archivo en la Files API de Anthropic. Si está presente, la
    # generación usa el PDF nativo (tablas/fórmulas/figuras); si no, cae al
    # texto plano de extracted_text (pdfplumber).
    file_id = models.CharField(max_length=128, blank=True)
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default=STATUS_UPLOADED)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def processed(self):
        return self.status == self.STATUS_PROCESSED

    def __str__(self):
        return f'PDF#{self.pk} ({self.room.name})'


class Question(models.Model):
    DIFFICULTY_EASY = 'easy'
    DIFFICULTY_MEDIUM = 'medium'
    DIFFICULTY_HARD = 'hard'
    DIFFICULTY_CHOICES = [
        (DIFFICULTY_EASY, 'Easy'),
        (DIFFICULTY_MEDIUM, 'Medium'),
        (DIFFICULTY_HARD, 'Hard'),
    ]

    SOURCE_AI = 'ai'
    SOURCE_MANUAL = 'manual'
    SOURCE_CHOICES = [
        (SOURCE_AI, 'AI'),
        (SOURCE_MANUAL, 'Manual'),
    ]

    TYPE_SINGLE = 'single'
    TYPE_TRUE_FALSE = 'true_false'
    TYPE_MULTIPLE = 'multiple'
    TYPE_CHOICES = [
        (TYPE_SINGLE, 'Opción única'),
        (TYPE_TRUE_FALSE, 'Verdadero/Falso'),
        (TYPE_MULTIPLE, 'Opción múltiple'),
    ]
    SINGLE_ANSWER_TYPES = (TYPE_SINGLE, TYPE_TRUE_FALSE)

    STATUS_PENDING = 'pending'
    STATUS_APPROVED = 'approved'
    STATUS_REJECTED = 'rejected'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_APPROVED, 'Approved'),
        (STATUS_REJECTED, 'Rejected'),
    ]

    node = models.ForeignKey(KnowledgeNode, on_delete=models.CASCADE, related_name='questions')
    statement = models.TextField()
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES)
    question_type = models.CharField(max_length=12, choices=TYPE_CHOICES, default=TYPE_SINGLE)
    options = models.JSONField()
    # correct_indices es la fuente de verdad (lista de índices correctos).
    # correct_index queda sincronizado con la primera correcta para compat.
    correct_indices = models.JSONField(default=list)
    correct_index = models.IntegerField()
    rationale = models.TextField(blank=True)
    source = models.CharField(max_length=10, choices=SOURCE_CHOICES, default=SOURCE_AI)
    source_pdf = models.ForeignKey(
        PDFDocument, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='questions',
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def is_approved(self):
        return self.status == self.STATUS_APPROVED

    def _resolved_correct_indices(self):
        if self.correct_indices:
            return list(self.correct_indices)
        if self.correct_index is not None:
            return [self.correct_index]
        return []

    def clean(self):
        if not isinstance(self.options, list) or not (2 <= len(self.options) <= 6):
            raise ValidationError('options debe ser una lista de 2 a 6 opciones.')
        if self.question_type == self.TYPE_TRUE_FALSE and len(self.options) != 2:
            raise ValidationError('Las preguntas de verdadero/falso deben tener exactamente 2 opciones.')

        indices = self._resolved_correct_indices()
        if not indices:
            raise ValidationError('Debe haber al menos una opción correcta.')
        if len(set(indices)) != len(indices):
            raise ValidationError('correct_indices no puede repetir índices.')
        if any(not isinstance(i, int) or i < 0 or i >= len(self.options) for i in indices):
            raise ValidationError('correct_indices contiene índices fuera de rango.')
        if self.question_type in self.SINGLE_ANSWER_TYPES and len(indices) != 1:
            raise ValidationError('Opción única y verdadero/falso deben tener exactamente una correcta.')
        if self.question_type == self.TYPE_MULTIPLE and len(indices) < 2:
            raise ValidationError('Opción múltiple debe tener al menos dos respuestas correctas.')

    def score_answer(self, selected_indices) -> float:
        """Devuelve un score en [0,1]. Única/V-F: 1.0 si el conjunto marcado
        coincide exactamente, 0.0 si no. Múltiple: proporción de opciones bien
        clasificadas (marcar correcta o dejar incorrecta sin marcar = acierto)."""
        chosen = set(selected_indices or [])
        correct = set(self._resolved_correct_indices())
        if self.question_type == self.TYPE_MULTIPLE:
            total = len(self.options)
            if total == 0:
                return 0.0
            agree = sum(1 for i in range(total) if (i in chosen) == (i in correct))
            return round(agree / total, 4)
        return 1.0 if chosen == correct else 0.0

    def save(self, *args, **kwargs):
        # correct_indices es la fuente; correct_index queda sincronizado con la
        # primera correcta para el código y serializers legacy.
        indices = self._resolved_correct_indices()
        self.correct_indices = indices
        if indices:
            self.correct_index = indices[0]
        if self._state.adding:
            if self.source == self.SOURCE_MANUAL:
                self.status = self.STATUS_APPROVED
            elif self.source == self.SOURCE_AI:
                room_mode = self.node.room.mode
                self.status = self.STATUS_APPROVED if room_mode == 'individual' else self.STATUS_PENDING
        super().save(*args, **kwargs)

    def __str__(self):
        return f'Q#{self.pk} [{self.difficulty}]'
