from rest_framework import serializers

from apps.users.serializers import UserSerializer

from .models import Room, RoomMembership, Section


class RoomSerializer(serializers.ModelSerializer):
    teacher = UserSerializer(read_only=True)
    membership = serializers.SerializerMethodField()

    class Meta:
        model = Room
        fields = [
            'id', 'name', 'subject', 'teacher', 'mode',
            'access_code', 'is_active', 'created_at', 'membership',
        ]
        read_only_fields = ['id', 'teacher', 'access_code', 'created_at']

    def get_membership(self, obj):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return None
        m = (
            RoomMembership.objects
            .filter(room=obj, student=user)
            .select_related('section')
            .first()
        )
        if not m:
            return None
        section = None
        if m.section_id:
            section = {
                'id_section': m.section.id,
                'code': m.section.code,
                'name': m.section.name,
                'schedule': m.section.schedule,
            }
        return {'section': section, 'joined_at': m.joined_at}


class RoomCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = ['name', 'subject', 'mode']


class SectionSerializer(serializers.ModelSerializer):
    id_section = serializers.IntegerField(source='id', read_only=True)
    total_student = serializers.SerializerMethodField()

    class Meta:
        model = Section
        fields = [
            'id_section', 'code', 'name', 'schedule',
            'capacity', 'is_active', 'total_student', 'created_at',
        ]

    def get_total_student(self, obj):
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


class AssignSectionSerializer(serializers.Serializer):
    # null = quitar la sección (dejar al estudiante sin sección).
    section_id = serializers.IntegerField(required=False, allow_null=True)


class RoomMembershipSerializer(serializers.ModelSerializer):
    student = UserSerializer(read_only=True)

    class Meta:
        model = RoomMembership
        fields = ['id', 'student', 'joined_at']
