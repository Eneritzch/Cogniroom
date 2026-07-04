from django.urls import include, path

from apps.cognitive.urls import room_urlpatterns as cognitive_room_urls
from .views import (
    JoinRequestApproveView,
    JoinRequestListView,
    JoinRequestRejectView,
    JoinRoomView,
    MemberSectionView,
    RoomDetailView,
    RoomDiscoverView,
    RoomEnrollView,
    RoomJoinRequestView,
    RoomListCreateView,
    RoomMembersView,
    RoomMemberView,
    SectionDetailView,
    SectionListCreateView,
)

urlpatterns = [
    path('',                              RoomListCreateView.as_view(), name='room-list-create'),
    path('join/',                         JoinRoomView.as_view(),       name='room-join'),

    path('discover/',                     RoomDiscoverView.as_view(),       name='room-discover'),
    path('join-requests/',                JoinRequestListView.as_view(),    name='room-join-requests'),
    path('join-requests/<int:req_id>/approve/', JoinRequestApproveView.as_view(), name='room-join-request-approve'),
    path('join-requests/<int:req_id>/reject/',  JoinRequestRejectView.as_view(),  name='room-join-request-reject'),
    path('<int:room_id>/request-join/',   RoomJoinRequestView.as_view(),    name='room-request-join'),

    path('<int:room_id>/',                RoomDetailView.as_view(),     name='room-detail'),
    path('<int:room_id>/members/',        RoomMembersView.as_view(),    name='room-members'),
    path('<int:room_id>/members/<int:student_id>/section/', MemberSectionView.as_view(), name='room-member-section'),
    path('<int:room_id>/members/<int:student_id>/', RoomMemberView.as_view(), name='room-member'),
    path('<int:room_id>/enroll/',         RoomEnrollView.as_view(),     name='room-enroll'),

    path('<int:room_id>/sections/',                    SectionListCreateView.as_view(), name='room-sections'),
    path('<int:room_id>/sections/<int:section_id>/',   SectionDetailView.as_view(),     name='room-section-detail'),

    path('', include('apps.questions.urls')),
    path('', include(cognitive_room_urls)),
]
