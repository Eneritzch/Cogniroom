from django.urls import path

from .views import (
    ApproveQuestionsView,
    GenerateQuestionsView,
    ManualQuestionView,
    NodeListCreateView,
    PDFDetailView,
    PDFUploadListView,
    QuestionListView,
)

urlpatterns = [
    path('<int:room_id>/nodes/', NodeListCreateView.as_view(), name='node-list-create'),
    path(
        '<int:room_id>/questions/generate/',
        GenerateQuestionsView.as_view(),
        name='question-generate',
    ),
    path(
        '<int:room_id>/questions/manual/',
        ManualQuestionView.as_view(),
        name='question-manual',
    ),
    path(
        '<int:room_id>/questions/approve/',
        ApproveQuestionsView.as_view(),
        name='question-approve',
    ),
    path(
        '<int:room_id>/questions/',
        QuestionListView.as_view(),
        name='question-list',
    ),
    path(
        '<int:room_id>/pdfs/',
        PDFUploadListView.as_view(),
        name='pdf-upload-list',
    ),
    path(
        '<int:room_id>/pdfs/<int:pdf_id>/',
        PDFDetailView.as_view(),
        name='pdf-detail',
    ),
]
