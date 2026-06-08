from django.conf import settings
from django.db import models


class BKTState(models.Model):
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='bkt_states',
    )
    node = models.ForeignKey(
        'questions.KnowledgeNode',
        on_delete=models.CASCADE,
        related_name='bkt_states',
    )
    p_mastery = models.FloatField(default=0.3)
    p_transit = models.FloatField(default=0.09)
    p_slip = models.FloatField(default=0.1)
    p_guess = models.FloatField(default=0.2)
    attempts = models.IntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('student', 'node')


class CognitiveIndex(models.Model):
    PROFILE_CHOICES = [
        ('overconfident', 'Overconfident'),
        ('underconfident', 'Underconfident'),
        ('calibrated', 'Calibrated'),
    ]

    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='cognitive_indices',
    )
    node = models.ForeignKey(
        'questions.KnowledgeNode',
        on_delete=models.CASCADE,
        related_name='cognitive_indices',
    )
    session = models.ForeignKey(
        'evaluation_sessions.EvaluationSession',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='cognitive_indices',
    )
    avg_confidence = models.FloatField()
    bkt_mastery = models.FloatField()
    icc_value = models.FloatField()
    metacognitive_gap = models.FloatField()
    profile = models.CharField(max_length=20, choices=PROFILE_CHOICES)
    calculated_at = models.DateTimeField(auto_now_add=True)


class BlindSpotIndex(models.Model):
    node = models.ForeignKey(
        'questions.KnowledgeNode',
        on_delete=models.CASCADE,
        related_name='blind_spots',
    )
    room = models.ForeignKey(
        'rooms.Room',
        on_delete=models.CASCADE,
        related_name='blind_spots',
    )
    ipc_value = models.FloatField()
    total_student = models.IntegerField()
    calculated_at = models.DateTimeField(auto_now=True)


class AIDiagnosis(models.Model):
    RISK_HIGH = 'high'
    RISK_MEDIUM = 'medium'
    RISK_LOW = 'low'
    RISK_CHOICES = [
        (RISK_HIGH, 'High'),
        (RISK_MEDIUM, 'Medium'),
        (RISK_LOW, 'Low'),
    ]

    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='ai_diagnoses',
    )
    session = models.ForeignKey(
        'evaluation_sessions.EvaluationSession',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='ai_diagnoses',
    )
    node = models.ForeignKey(
        'questions.KnowledgeNode',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='ai_diagnoses',
    )
    classification = models.CharField(max_length=20)
    risk_level = models.CharField(max_length=10, choices=RISK_CHOICES)
    risk_node = models.JSONField(default=list)
    failure_probability = models.FloatField()
    reasoning = models.TextField()
    recommendation = models.TextField()
    generated_at = models.DateTimeField(auto_now_add=True)


class StudentProgressSnapshot(models.Model):

    PROFILE_CHOICES = [
        ('overconfident', 'Overconfident'),
        ('underconfident', 'Underconfident'),
        ('calibrated', 'Calibrated'),
    ]

    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='progress_snapshots',
    )
    room = models.ForeignKey(
        'rooms.Room',
        on_delete=models.CASCADE,
        related_name='progress_snapshots',
    )
    session = models.ForeignKey(
        'evaluation_sessions.EvaluationSession',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='progress_snapshots',
    )
    avg_icc = models.FloatField()
    avg_bkt_mastery = models.FloatField()
    avg_gap = models.FloatField()
    dominant_profile = models.CharField(max_length=20, choices=PROFILE_CHOICES)
    questions_answered = models.IntegerField()
    correct_count = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['student', 'room', 'created_at']),
        ]
