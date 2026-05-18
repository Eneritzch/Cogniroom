from rest_framework import serializers

from .models import Answer, EvaluationSession


class EvaluationSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = EvaluationSession
        fields = ['id', 'student', 'room', 'status', 'started_at', 'finished_at']
        read_only_fields = ['id', 'student', 'status', 'started_at', 'finished_at']


class CreateSessionSerializer(serializers.Serializer):
    room_id = serializers.IntegerField()


class AnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Answer
        fields = [
            'id', 'session', 'question', 'selected_index', 'is_correct',
            'confidence_declared', 'response_time_sec', 'ai_feedback', 'answered_at',
        ]
        read_only_fields = ['id', 'session', 'is_correct', 'ai_feedback', 'answered_at']


class SubmitAnswerSerializer(serializers.Serializer):
    question_id = serializers.IntegerField()
    selected_index = serializers.IntegerField(min_value=0, max_value=3)
    confidence_declared = serializers.FloatField(min_value=0.0, max_value=1.0)
    response_time_sec = serializers.IntegerField(required=False, default=0, min_value=0)
