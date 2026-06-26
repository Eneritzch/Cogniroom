from django.urls import include, path

from apps.cognitive.urls import room_urlpatterns as cognitive_room_urls
from .views import (
    JoinRoomView,
    RoomDetailView,
    RoomListCreateView,
    RoomMembersView,
    SectionDetailView,
    SectionListCreateView,
)

urlpatterns = [
    path('',                              RoomListCreateView.as_view(), name='room-list-create'),
    path('join/',                         JoinRoomView.as_view(),       name='room-join'),
    path('<int:room_id>/',                RoomDetailView.as_view(),     name='room-detail'),
    path('<int:room_id>/members/',        RoomMembersView.as_view(),    name='room-members'),

    path('<int:room_id>/sections/',                    SectionListCreateView.as_view(), name='room-sections'),
    path('<int:room_id>/sections/<int:section_id>/',   SectionDetailView.as_view(),     name='room-section-detail'),

    path('', include('apps.questions.urls')),
    path('', include(cognitive_room_urls)),
]
