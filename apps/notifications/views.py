from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification
from .serializers import NotificationSerializer

RECENT_LIMIT = 50


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Notification.objects.filter(recipient=request.user)
        unread = qs.filter(is_read=False).count()
        return Response({
            'results': NotificationSerializer(qs[:RECENT_LIMIT], many=True).data,
            'unread_count': unread,
        })


class MarkNotificationsReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Marca como leídas las notificaciones del usuario. Con `ids` marca solo
        esas; sin `ids`, marca todas."""
        ids = request.data.get('ids')
        qs = Notification.objects.filter(recipient=request.user, is_read=False)
        if ids:
            if not isinstance(ids, list) or not all(isinstance(i, int) for i in ids):
                return Response(
                    {'detail': 'El campo "ids" debe ser una lista de enteros.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            qs = qs.filter(id__in=ids)
        qs.update(is_read=True)
        unread = Notification.objects.filter(
            recipient=request.user, is_read=False
        ).count()
        return Response({'unread_count': unread})
