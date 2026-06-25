from django.urls import path

from .views import (
    AtRiskView,
    BlindSpotsView,
    MyDiagnosesView,
    MyNodeDetailView,
    MyNodesView,
    MyProfileView,
    RoomHeatmapView,
    StudentDetailView,
)


urlpatterns = [
    path('profile/',             MyProfileView.as_view(),    name='profile'),
    path('nodes/',               MyNodesView.as_view(),      name='nodes'),
    path('nodes/<int:node_id>/', MyNodeDetailView.as_view(), name='node-detail'),
    path('diagnoses/',           MyDiagnosesView.as_view(),  name='diagnoses'),
]


room_urlpatterns = [
    path('<int:room_id>/metrics/blind-spots/', BlindSpotsView.as_view(),  name='room-metrics-blind-spots'),
    path('<int:room_id>/metrics/at-risk/',     AtRiskView.as_view(),      name='room-metrics-at-risk'),
    path('<int:room_id>/metrics/heatmap/',     RoomHeatmapView.as_view(), name='room-metrics-heatmap'),
    path('<int:room_id>/students/<int:student_id>/', StudentDetailView.as_view(), name='room-student-detail'),
]
