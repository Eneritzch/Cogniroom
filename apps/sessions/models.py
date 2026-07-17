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
    # Nodos elegidos al iniciar; vacío = todos (adaptativo completo).
    selected_node_ids = models.JSONField(default=list, blank=True)
    # Cupo de preguntas por nodo, congelado al crear: {node_id: n}. Snapshot para
    # que cambiar la config del tema a mitad de curso no altere sesiones activas.
    node_quotas = models.JSONField(default=dict, blank=True)
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
    # selected_indices es la fuente de verdad de lo que marcó el estudiante;
    # selected_index queda sincronizado con la primera marcada (compat legacy).
    selected_indices = models.JSONField(default=list)
    selected_index = models.IntegerField()
    is_correct = models.BooleanField()
    # score en [0,1]: crédito parcial para opción múltiple (1.0 = acierto total).
    score = models.FloatField(default=0.0)
    confidence_declared = models.FloatField()
    bkt_mastery_snapshot = models.FloatField(default=0.0)
    response_time_sec = models.IntegerField(default=0)
    ai_feedback = models.TextField(blank=True)
    answered_at = models.DateTimeField(auto_now_add=True)
