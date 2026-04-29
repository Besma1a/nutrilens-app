# notifications/models.py
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Notification(models.Model):
    """
    In-app notification for any user (patient or nutritionist).

    Notifications are created programmatically (via signals or service calls)
    and consumed by both sides of the app through the same REST endpoint —
    differentiated by the authenticated user.
    """

    # ── Types ─────────────────────────────────────────────────────────────────
    TYPE_APPOINTMENT  = "appointment"
    TYPE_PLAN         = "plan"
    TYPE_MESSAGE      = "message"
    TYPE_PROGRESS     = "progress"
    TYPE_ALERT        = "alert"
    TYPE_REPORT       = "report"
    TYPE_SCAN         = "scan"
    TYPE_WEIGHT       = "weight"
    TYPE_SYSTEM       = "system"

    TYPE_CHOICES = [
        (TYPE_APPOINTMENT, "Appointment"),
        (TYPE_PLAN,        "Plan"),
        (TYPE_MESSAGE,     "Message"),
        (TYPE_PROGRESS,    "Progress"),
        (TYPE_ALERT,       "Alert"),
        (TYPE_REPORT,      "Report"),
        (TYPE_SCAN,        "Scan"),
        (TYPE_WEIGHT,      "Weight"),
        (TYPE_SYSTEM,      "System"),
    ]

    # ── Fields ────────────────────────────────────────────────────────────────
    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="notifications",
        help_text="User who receives this notification",
    )
    actor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sent_notifications",
        help_text="User who triggered the notification (optional)",
    )

    notification_type = models.CharField(
        max_length=30,
        choices=TYPE_CHOICES,
        default=TYPE_SYSTEM,
    )

    title   = models.CharField(max_length=255)
    message = models.TextField(blank=True)

    # Optional deep-link data so the frontend can navigate on tap
    link = models.CharField(max_length=500, blank=True)

    is_read = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "-created_at"]),
            models.Index(fields=["recipient", "is_read"]),
        ]
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"

    def __str__(self):
        return f"[{self.notification_type}] → {self.recipient_id}: {self.title}"

    # ── Helpers ───────────────────────────────────────────────────────────────

    @classmethod
    def create(
        cls,
        recipient,
        title,
        message="",
        notification_type=TYPE_SYSTEM,
        actor=None,
        link="",
    ):
        """
        Convenience factory used by signals and service calls.

        Usage:
            Notification.create(
                recipient=patient_user,
                title="New plan assigned",
                message="Your nutritionist assigned a Mediterranean plan.",
                notification_type=Notification.TYPE_PLAN,
                actor=nutritionist_user,
                link="/plans/",
            )
        """
        return cls.objects.create(
            recipient=recipient,
            actor=actor,
            notification_type=notification_type,
            title=title,
            message=message,
            link=link,
        )