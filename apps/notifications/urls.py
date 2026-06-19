from django.urls import path

from .views import MarkNotificationsReadView, NotificationListView

urlpatterns = [
    path('', NotificationListView.as_view(), name='notifications-list'),
    path('mark-read/', MarkNotificationsReadView.as_view(), name='notifications-mark-read'),
]
