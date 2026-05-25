from django.urls import path

from .views import (
    CompleteSessionView,
    CreateSessionView,
    NextQuestionView,
    SubmitAnswerView,
)

urlpatterns = [
    path('',                                CreateSessionView.as_view(),   name='session-create'),
    path('<int:session_id>/next-question/', NextQuestionView.as_view(),    name='session-next-question'),
    path('<int:session_id>/answers/',       SubmitAnswerView.as_view(),    name='session-answers'),
    path('<int:session_id>/complete/',      CompleteSessionView.as_view(), name='session-complete'),
]
