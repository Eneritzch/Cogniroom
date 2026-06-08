from django.conf import settings
from django.db import models


class EvaluationSession(models.Model):
    STATUS_ACTIVE = 'active'
    STATUS_COMPLETED = 'completed'
    STATUS_ABANDONED = 'abandoned'
    STATUS_EXPIRED = 'expired'
    STATUS_CHOICES = [
        (STATUS_ACTIVE, 'Active'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_ABANDONED, 'Abandoned'),
        (STATUS_EXPIRED, 'Expired'),
    ]

    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='evaluation_sessions',
    )
    room = models.ForeignKey(
        'rooms.Room',
        on_delete=models.CASCADE,
        related_name='evaluation_sessions',
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f'Session#{self.pk} {self.student.username} @ {self.room.name}'


class Answer(models.Model):
    session = models.ForeignKey(
        EvaluationSession,
        on_delete=models.CASCADE,
        related_name='answers',
    )
    question = models.ForeignKey(
        'questions.Question',
        on_delete=models.CASCADE,
        related_name='answers',
    )
    selected_index = models.IntegerField()
    is_correct = models.BooleanField()
    confidence_declared = models.FloatField()
    bkt_mastery_snapshot = models.FloatField(default=0.0)
    response_time_sec = models.IntegerField(default=0)
    ai_feedback = models.TextField(blank=True)
    answered_at = models.DateTimeField(auto_now_add=True)
