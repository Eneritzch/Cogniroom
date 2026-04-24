from rest_framework import serializers

from .models import AIDiagnosis, BKTState, BlindSpotIndex, CognitiveIndex


class BKTStateSerializer(serializers.ModelSerializer):
    node_name = serializers.CharField(source='node.name', read_only=True)

    class Meta:
        model = BKTState
        fields = [
            'id', 'student', 'node', 'node_name',
            'p_mastery', 'p_transit', 'p_slip', 'p_guess',
            'attempts', 'updated_at',
        ]


class CognitiveIndexSerializer(serializers.ModelSerializer):
    node_name = serializers.CharField(source='node.name', read_only=True)

    class Meta:
        model = CognitiveIndex
        fields = [
            'id', 'student', 'node', 'node_name', 'session',
            'declared_confidence', 'bkt_mastery', 'icc', 'gap',
            'profile', 'created_at',
        ]


class BlindSpotIndexSerializer(serializers.ModelSerializer):
    node_name = serializers.CharField(source='node.name', read_only=True)
    alert = serializers.SerializerMethodField()

    class Meta:
        model = BlindSpotIndex
        fields = [
            'id', 'node', 'node_name', 'room',
            'ipc', 'students_count', 'calculated_at', 'alert',
        ]

    def get_alert(self, obj):
        return obj.ipc < 0.5


class AIDiagnosisSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIDiagnosis
        fields = [
            'id', 'student', 'session', 'profile', 'risk_level',
            'risk_nodes', 'prediction', 'reasoning', 'recommendation', 'created_at',
        ]
