from django.urls import path

from .views import (
    AtRiskView,
    BlindSpotsView,
    MyDiagnosesView,
    MyNodesView,
    MyProfileView,
)


urlpatterns = [
    path('profile/',    MyProfileView.as_view(),   name='me-profile'),
    path('nodes/',      MyNodesView.as_view(),     name='me-nodes'),
    path('diagnoses/',  MyDiagnosesView.as_view(), name='me-diagnoses'),
]


room_urlpatterns = [
    path('<int:room_id>/metrics/blind-spots/', BlindSpotsView.as_view(), name='room-metrics-blind-spots'),
    path('<int:room_id>/metrics/at-risk/',     AtRiskView.as_view(),     name='room-metrics-at-risk'),
]
