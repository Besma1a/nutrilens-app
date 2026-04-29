# notifications/urls.py
from django.urls import path
from .views import (
    NotificationListView,
    NotificationMarkAllReadView,
    NotificationDetailView,
)

urlpatterns = [
    # GET  /api/v1/notifications/               → list (supports ?unread_only=true)
    # (no POST — notifications are system-created only)
    path("", NotificationListView.as_view(), name="notification-list"),

    # POST /api/v1/notifications/mark-all-read/ → bulk mark read
    path("mark-all-read/", NotificationMarkAllReadView.as_view(), name="notification-mark-all-read"),

    # PATCH  /api/v1/notifications/<pk>/read/   → mark one read
    # DELETE /api/v1/notifications/<pk>/        → delete one
    path("<int:pk>/read/",   NotificationDetailView.as_view(), name="notification-read"),
    path("<int:pk>/delete/", NotificationDetailView.as_view(), name="notification-delete"),
]