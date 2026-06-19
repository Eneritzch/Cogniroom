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
    options = models.JSONField()
    correct_index = models.IntegerField()
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

    def clean(self):
        if not isinstance(self.options, list) or len(self.options) != 4:
            raise ValidationError('options must be an array of exactly 4 strings.')
        if self.correct_index not in (0, 1, 2, 3):
            raise ValidationError('correct_index must be 0, 1, 2 or 3.')

    def save(self, *args, **kwargs):
        if self._state.adding:
            if self.source == self.SOURCE_MANUAL:
                self.status = self.STATUS_APPROVED
            elif self.source == self.SOURCE_AI:
                room_mode = self.node.room.mode
                self.status = self.STATUS_APPROVED if room_mode == 'individual' else self.STATUS_PENDING
        super().save(*args, **kwargs)

    def __str__(self):
        return f'Q#{self.pk} [{self.difficulty}]'
