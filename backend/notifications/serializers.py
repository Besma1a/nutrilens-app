# notifications/serializers.py
from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    """
    Full notification payload sent to the client.

    `actor_name` is derived from the actor FK so the frontend
    can show "From: Dr. Sarah" without a second request.
    """

    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id",
            "notification_type",
            "title",
            "message",
            "link",
            "is_read",
            "actor_name",
            "created_at",
        ]
        read_only_fields = [
            "id", "notification_type", "title",
            "message", "link", "actor_name", "created_at",
        ]

    def get_actor_name(self, obj):
        if obj.actor is None:
            return None
        name = f"{obj.actor.first_name} {obj.actor.last_name}".strip()
        return name or obj.actor.username