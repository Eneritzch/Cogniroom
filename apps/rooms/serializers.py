from rest_framework import serializers

from apps.users.serializers import UserSerializer

from .models import Room, RoomMembership, Section


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


class SectionSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Section
        fields = [
            'id', 'code', 'name', 'schedule', 'capacity',
            'is_active', 'member_count', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_member_count(self, obj):
        return obj.memberships.count()


class SectionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Section
        fields = ['code', 'name', 'schedule', 'capacity', 'is_active']
        extra_kwargs = {
            'schedule': {'required': False},
            'capacity': {'required': False},
            'is_active': {'required': False},
        }


class JoinRoomSerializer(serializers.Serializer):
    access_code = serializers.CharField(max_length=8)
    section_id = serializers.IntegerField(required=False, allow_null=True)


class RoomMembershipSerializer(serializers.ModelSerializer):
    student = UserSerializer(read_only=True)

    class Meta:
        model = RoomMembership
        fields = ['id', 'student', 'joined_at']
