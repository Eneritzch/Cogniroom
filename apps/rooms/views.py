from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Room, RoomMembership
from .serializers import (
    JoinRoomSerializer,
    RoomCreateSerializer,
    RoomMembershipSerializer,
    RoomSerializer,
)


class RoomListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role == 'teacher':
            qs = Room.objects.filter(teacher=user)
        else:
            membership_room_ids = RoomMembership.objects.filter(
                student=user
            ).values_list('room_id', flat=True)
            qs = Room.objects.filter(
                Q(id__in=membership_room_ids) | Q(teacher=user, mode='individual')
            )
        qs = qs.order_by('-created_at').distinct()
        return Response(RoomSerializer(qs, many=True).data)

    def post(self, request):
        serializer = RoomCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        mode = serializer.validated_data.get('mode', 'group')

        if mode == 'group' and request.user.role != 'teacher':
            return Response(
                {'detail': 'Only teachers can create group rooms.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        room = Room.objects.create(
            teacher=request.user,
            name=serializer.validated_data['name'],
            subject=serializer.validated_data['subject'],
            mode=mode,
        )
        return Response(RoomSerializer(room).data, status=status.HTTP_201_CREATED)


class JoinRoomView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = JoinRoomSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        code = serializer.validated_data['access_code'].strip().upper()

        try:
            room = Room.objects.get(access_code=code)
        except Room.DoesNotExist:
            return Response(
                {'detail': 'Room not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if room.mode != 'group':
            return Response(
                {'detail': 'Cannot join an individual room.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if RoomMembership.objects.filter(room=room, student=request.user).exists():
            return Response(
                {'detail': 'Already a member of this room.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        RoomMembership.objects.create(room=room, student=request.user)
        return Response(RoomSerializer(room).data, status=status.HTTP_201_CREATED)


class RoomMembersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, room_id):
        room = get_object_or_404(Room, id=room_id)
        if room.teacher_id != request.user.id:
            return Response(
                {'detail': 'Only the owner can list members.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        memberships = RoomMembership.objects.filter(room=room).select_related('student')
        return Response(RoomMembershipSerializer(memberships, many=True).data)
