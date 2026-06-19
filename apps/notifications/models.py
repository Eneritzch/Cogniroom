from django.conf import settings
from django.db import models


class Notification(models.Model):
    KIND_QUESTION_PENDING = 'question_pending'
    KIND_STUDENT_AT_RISK = 'student_at_risk'
    KIND_DIAGNOSIS_READY = 'diagnosis_ready'
    KIND_ROOM_JOINED = 'room_joined'
    KIND_CHOICES = [
        (KIND_QUESTION_PENDING, 'Preguntas por aprobar'),
        (KIND_STUDENT_AT_RISK, 'Estudiante en riesgo'),
        (KIND_DIAGNOSIS_READY, 'Diagnóstico listo'),
        (KIND_ROOM_JOINED, 'Te uniste a una sala'),
    ]

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    kind = models.CharField(max_length=40, choices=KIND_CHOICES)
    title = models.CharField(max_length=255)
    body = models.TextField(blank=True, default='')
    # URL relativa a la que navega la notificación al hacer click (ej. /app/diagnoses/).
    link = models.CharField(max_length=500, blank=True, default='')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read', '-created_at']),
        ]

    def __str__(self):
        return f'{self.kind} -> {self.recipient_id}'
