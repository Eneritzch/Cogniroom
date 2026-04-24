from django.urls import path

from .views import AtRiskView, BlindSpotsView

urlpatterns = [
    path('<int:room_id>/blind-spots/', BlindSpotsView.as_view(), name='room-blind-spots'),
    path('<int:room_id>/at-risk/', AtRiskView.as_view(), name='room-at-risk'),
]
