from django.urls import path

from .views import (
    CompleteSessionView,
    CreateSessionView,
    NextQuestionView,
    SubmitAnswerView,
)

urlpatterns = [
    path('', CreateSessionView.as_view(), name='session-create'),
    path('<int:session_id>/next-question/', NextQuestionView.as_view(), name='session-next'),
    path('<int:session_id>/answer/', SubmitAnswerView.as_view(), name='session-answer'),
    path('<int:session_id>/complete/', CompleteSessionView.as_view(), name='session-complete'),
]
