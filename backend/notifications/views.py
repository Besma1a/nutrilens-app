# notifications/views.py
import logging
from rest_framework import status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.generics import get_object_or_404

from .models import Notification
from .serializers import NotificationSerializer

logger = logging.getLogger(__name__)


class NotificationListView(APIView):
    """
    GET  /api/v1/notifications/
        Returns ALL notifications for the authenticated user, newest first.
        Supports ?unread_only=true to filter to unread ones.

    POST /api/v1/notifications/mark-all-read/
        Bulk-marks every unread notification as read.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Notification.objects.filter(recipient=request.user)

        if request.query_params.get("unread_only", "").lower() in ("1", "true", "yes"):
            qs = qs.filter(is_read=False)

        serializer = NotificationSerializer(qs, many=True)
        return Response(serializer.data)


class NotificationMarkAllReadView(APIView):
    """
    POST /api/v1/notifications/mark-all-read/
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        updated = Notification.objects.filter(
            recipient=request.user, is_read=False
        ).update(is_read=True)
        return Response({"marked_read": updated})


class NotificationDetailView(APIView):
    """
    PATCH /api/v1/notifications/<id>/read/
        Mark a single notification as read.

    DELETE /api/v1/notifications/<id>/
        Delete a notification.
    """

    permission_classes = [IsAuthenticated]

    def _get_notification(self, request, pk):
        return get_object_or_404(
            Notification, pk=pk, recipient=request.user
        )

    def patch(self, request, pk):
        notif = self._get_notification(request, pk)
        notif.is_read = True
        notif.save(update_fields=["is_read", "updated_at"])
        return Response(NotificationSerializer(notif).data)

    def delete(self, request, pk):
        notif = self._get_notification(request, pk)
        notif.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)