from rest_framework.permissions import BasePermission


class IsTeacher(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == 'teacher'
        )


class IsStudent(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == 'student'
        )


class IsRoomOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        room = obj if hasattr(obj, 'teacher') else getattr(obj, 'room', None)
        if room is None:
            return False
        return room.teacher_id == request.user.id


class IsRoomMember(BasePermission):
    def has_object_permission(self, request, view, obj):
        from apps.rooms.models import RoomMembership

        room = obj if hasattr(obj, 'mode') else getattr(obj, 'room', None)
        if room is None:
            return False
        if room.mode == 'individual':
            return room.teacher_id == request.user.id
        if room.teacher_id == request.user.id:
            return True
        return RoomMembership.objects.filter(room=room, student=request.user).exists()
