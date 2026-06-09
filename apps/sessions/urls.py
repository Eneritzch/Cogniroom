from django.urls import path

from .views import (
    CompleteSessionView,
    NextQuestionView,
    SessionListCreateView,
    SessionReviewView,
    SubmitAnswerView,
)

urlpatterns = [
    path('',                                SessionListCreateView.as_view(), name='session-list-create'),
    path('<int:session_id>/next-question/', NextQuestionView.as_view(),    name='session-next-question'),
    path('<int:session_id>/answers/',       SubmitAnswerView.as_view(),    name='session-answers'),
    path('<int:session_id>/review/',        SessionReviewView.as_view(),   name='session-review'),
    path('<int:session_id>/complete/',      CompleteSessionView.as_view(), name='session-complete'),
]
