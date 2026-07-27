from rest_framework import serializers

from .models import EvaluationSession


class EvaluationSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = EvaluationSession
        fields = ['id', 'student', 'room', 'status', 'started_at', 'finished_at']
        read_only_fields = ['id', 'student', 'status', 'started_at', 'finished_at']


class CreateSessionSerializer(serializers.Serializer):
    room_id = serializers.IntegerField()
    # Nodos en los que el estudiante quiere evaluarse; ausente/vacío = todos.
    node_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1), required=False, allow_empty=True,
    )


class SubmitAnswerSerializer(serializers.Serializer):
    question_id = serializers.IntegerField()
    # selected_indices es la forma canónica (soporta opción múltiple);
    # selected_index se mantiene por compatibilidad con clientes de opción única.
    selected_index = serializers.IntegerField(required=False, min_value=0)
    selected_indices = serializers.ListField(
        child=serializers.IntegerField(min_value=0), required=False, allow_empty=True,
    )
    confidence_declared = serializers.FloatField(min_value=0.0, max_value=1.0)
    response_time_sec = serializers.IntegerField(required=False, default=0, min_value=0)

    def validate(self, attrs):
        if attrs.get('selected_indices') is None:
            if 'selected_index' not in attrs:
                raise serializers.ValidationError(
                    'Proporciona "selected_index" o "selected_indices".'
                )
            attrs['selected_indices'] = [attrs['selected_index']]
        # Sin duplicados.
        idx = attrs['selected_indices']
        if len(set(idx)) != len(idx):
            raise serializers.ValidationError('selected_indices no puede repetir índices.')
        return attrs
