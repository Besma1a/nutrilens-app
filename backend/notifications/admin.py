# notifications/admin.py
from django.contrib import admin
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display  = ("recipient", "notification_type", "title", "is_read", "created_at")
    list_filter   = ("notification_type", "is_read", "created_at")
    search_fields = ("recipient__username", "recipient__email", "title", "message")
    ordering      = ("-created_at",)
    readonly_fields = ("created_at", "updated_at")
    raw_id_fields   = ("recipient", "actor")