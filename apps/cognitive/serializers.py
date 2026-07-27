from rest_framework import serializers

from .models import (
    AIDiagnosis,
    BKTState,
    BlindSpotIndex,
)


class BKTStateSerializer(serializers.ModelSerializer):
    node_name = serializers.CharField(source='node.name', read_only=True)

    class Meta:
        model = BKTState
        fields = [
            'id', 'student', 'node', 'node_name',
            'p_mastery', 'p_transit', 'p_slip', 'p_guess',
            'attempts', 'updated_at',
        ]


class BlindSpotIndexSerializer(serializers.ModelSerializer):
    node_name = serializers.CharField(source='node.name', read_only=True)
    alert = serializers.SerializerMethodField()

    class Meta:
        model = BlindSpotIndex
        fields = [
            'id', 'node', 'node_name', 'room',
            'ipc_value', 'total_student', 'calculated_at', 'alert',
        ]

    def get_alert(self, obj):
        return obj.ipc_value < 0.5


class AIDiagnosisSerializer(serializers.ModelSerializer):
    # node es nullable (SET_NULL): traverse directo a node.name rompería si el
    # nodo fue borrado. SerializerMethodField devuelve None en ese caso.
    node_name = serializers.SerializerMethodField()
    room = serializers.SerializerMethodField()

    class Meta:
        model = AIDiagnosis
        fields = [
            'id', 'student', 'session', 'room', 'node', 'node_name', 'classification',
            'problem_type', 'risk_level', 'risk_node', 'failure_probability', 'reasoning',
            'recommendation', 'student_reasoning', 'student_recommendation', 'generated_at',
        ]

    def get_node_name(self, obj):
        return obj.node.name if obj.node_id else None

    def get_room(self, obj):
        if obj.session_id and obj.session.room_id:
            return {'id': obj.session.room_id, 'name': obj.session.room.name}
        return None
