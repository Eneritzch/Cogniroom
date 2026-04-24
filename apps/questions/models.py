from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class KnowledgeNode(models.Model):
    room = models.ForeignKey('rooms.Room', on_delete=models.CASCADE, related_name='nodes')
    name = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.name} ({self.room.name})'


class PDFDocument(models.Model):
    room = models.ForeignKey('rooms.Room', on_delete=models.CASCADE, related_name='pdfs')
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='pdfs'
    )
    file_path = models.CharField(max_length=500)
    processed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)


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

    node = models.ForeignKey(KnowledgeNode, on_delete=models.CASCADE, related_name='questions')
    text = models.TextField()
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES)
    options = models.JSONField()
    correct_index = models.IntegerField()
    source = models.CharField(max_length=10, choices=SOURCE_CHOICES, default=SOURCE_AI)
    is_approved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        if not isinstance(self.options, list) or len(self.options) != 4:
            raise ValidationError('options must be an array of exactly 4 strings.')
        if self.correct_index not in (0, 1, 2, 3):
            raise ValidationError('correct_index must be 0, 1, 2 or 3.')

    def save(self, *args, **kwargs):
        if self.source == self.SOURCE_MANUAL:
            self.is_approved = True
        elif self.source == self.SOURCE_AI:
            room_mode = self.node.room.mode
            if room_mode == 'individual':
                self.is_approved = True
            else:
                self.is_approved = False
        super().save(*args, **kwargs)

    def __str__(self):
        return f'Q#{self.pk} [{self.difficulty}]'
