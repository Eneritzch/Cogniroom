from rest_framework import serializers

from apps.users.serializers import UserSerializer

from .models import Room, RoomMembership


class RoomSerializer(serializers.ModelSerializer):
    teacher = UserSerializer(read_only=True)

    class Meta:
        model = Room
        fields = [
            'id', 'name', 'subject', 'teacher', 'mode',
            'access_code', 'is_active', 'created_at',
        ]
        read_only_fields = ['id', 'teacher', 'access_code', 'created_at']


class RoomCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = ['name', 'subject', 'mode']


class JoinRoomSerializer(serializers.Serializer):
    access_code = serializers.CharField(max_length=8)


class RoomMembershipSerializer(serializers.ModelSerializer):
    student = UserSerializer(read_only=True)

    class Meta:
        model = RoomMembership
        fields = ['id', 'student', 'joined_at']
