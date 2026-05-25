from django.urls import include, path

from apps.cognitive.urls import room_urlpatterns as cognitive_room_urls
from .views import JoinRoomView, RoomListCreateView, RoomMembersView

urlpatterns = [
    path('',                              RoomListCreateView.as_view(), name='room-list-create'),
    path('join/',                         JoinRoomView.as_view(),       name='room-join'),
    path('<int:room_id>/members/',        RoomMembersView.as_view(),    name='room-members'),

    path('', include('apps.questions.urls')),
    path('', include(cognitive_room_urls)),
]
