from django.urls import path

from .views import JoinRoomView, RoomListCreateView, RoomMembersView

urlpatterns = [
    path('', RoomListCreateView.as_view(), name='room-list-create'),
    path('join/', JoinRoomView.as_view(), name='room-join'),
    path('<int:room_id>/members/', RoomMembersView.as_view(), name='room-members'),
]
