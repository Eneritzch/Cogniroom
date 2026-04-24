from django.urls import path

from .views import MyNodesView, MyProfileView

urlpatterns = [
    path('my-profile/', MyProfileView.as_view(), name='cognitive-my-profile'),
    path('my-nodes/', MyNodesView.as_view(), name='cognitive-my-nodes'),
]
