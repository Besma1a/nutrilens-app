# notifications/signals.py
"""
Auto-generate Notification rows when key domain events happen.

KEY FIX: Django's pre_save does NOT work with lazy string sender labels like
"app.Model" — only post_save supports them. Status-change deduplication is
done inside post_save using a 60-second idempotency window (avoids an extra
DB query per save while still catching real transitions).

Self-notification guard
───────────────────────
_create() silently drops any notification where actor.pk == recipient.pk.

Covered events
──────────────
1. DietPlan created           → notify patient
2. NutritionistFeedback       → notify patient
3. WeightEntry created        → notify patient's nutritionist
4. Consultation created       → notify nutritionist
5. Consultation status change → notify patient (approved / rejected / cancelled)
"""

import logging
from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)


# ── Helper ─────────────────────────────────────────────────────────────────────

def _create(recipient, title, message="", notification_type=None, actor=None, link=""):
    """
    Import-safe notification factory.
    Silently drops self-notifications (actor == recipient).
    """
    if (
        actor is not None
        and recipient is not None
        and getattr(actor, "pk", None) is not None
        and actor.pk == getattr(recipient, "pk", None)
    ):
        logger.debug("Skipping self-notification for user %s: %s", recipient, title)
        return

    try:
        from .models import Notification
        Notification.objects.create(
            recipient=recipient,
            actor=actor,
            notification_type=notification_type or Notification.TYPE_SYSTEM,
            title=title,
            message=message,
            link=link,
        )
    except Exception as exc:
        logger.error("Failed to create notification: %s", exc, exc_info=True)


# ── 1. Diet plan assigned ──────────────────────────────────────────────────────

@receiver(post_save, sender="profiles.DietPlan")
def notify_plan_assigned(sender, instance, created, **kwargs):
    if not created:
        return
    from .models import Notification
    actor = getattr(instance, "assigned_by", None)
    actor_name = (
        f"{actor.first_name} {actor.last_name}".strip() or actor.username
        if actor else "Your nutritionist"
    )
    _create(
        recipient=instance.user,
        title="New diet plan assigned",
        message=f"{actor_name} assigned you the \"{instance.title}\" plan.",
        notification_type=Notification.TYPE_PLAN,
        actor=actor,
        link="/plans/",
    )


# ── 2. Nutritionist feedback created ──────────────────────────────────────────

@receiver(post_save, sender="profiles.NutritionistFeedback")
def notify_feedback_received(sender, instance, created, **kwargs):
    if not created:
        return
    from .models import Notification
    actor = getattr(instance, "nutritionist", None)
    actor_name = (
        f"{actor.first_name} {actor.last_name}".strip() or actor.username
        if actor else "Your nutritionist"
    )
    _create(
        recipient=instance.user,
        title=f"New feedback: {instance.title}",
        message=f"Message from {actor_name}.",
        notification_type=Notification.TYPE_MESSAGE,
        actor=actor,
        link="/progress/",
    )


# ── 3. Patient weigh-in → notify nutritionist ─────────────────────────────────

@receiver(post_save, sender="profiles.WeightEntry")
def notify_nutritionist_weigh_in(sender, instance, created, **kwargs):
    if not created:
        return
    from .models import Notification
    try:
        profile = instance.user.profile
        nutritionist = profile.managed_by
    except Exception:
        return
    if not nutritionist:
        return
    patient_name = (
        f"{instance.user.first_name} {instance.user.last_name}".strip()
        or instance.user.username
    )
    _create(
        recipient=nutritionist,
        title=f"{patient_name} logged a weigh-in",
        message=f"New weight: {instance.weight_kg} kg on {instance.date}.",
        notification_type=Notification.TYPE_WEIGHT,
        actor=instance.user,
        link="/nutritionist/clients/",
    )


# ── 4 & 5. Consultation lifecycle ─────────────────────────────────────────────
#
# pre_save does NOT support lazy string sender labels — only post_save does.
# Deduplication uses a 60-second idempotency window instead.

@receiver(post_save, sender="consultations.Consultation")
def notify_consultation_events(sender, instance, created, **kwargs):
    from .models import Notification
    from django.utils import timezone
    from datetime import timedelta

    nutritionist = getattr(instance, "nutritionist", None)
    patient = getattr(instance, "patient", None) or getattr(instance, "user", None)

    # ── 4. New booking → notify nutritionist ──────────────────────────────────
    if created:
        if not nutritionist:
            return
        patient_name = (
            f"{patient.first_name} {patient.last_name}".strip() or patient.username
            if patient else "A patient"
        )
        _create(
            recipient=nutritionist,
            title="New appointment request",
            message=f"{patient_name} booked a consultation.",
            notification_type=Notification.TYPE_APPOINTMENT,
            actor=patient,
            link="/nutritionist/calendar/",
        )
        return

    # ── 5. Status change → notify patient ─────────────────────────────────────
    if not patient:
        return

    STATUS_MAP = {
        "approved":  ("Appointment approved",  "Your consultation has been confirmed."),
        "rejected":  ("Appointment declined",  "Your consultation request was declined."),
        "cancelled": ("Appointment cancelled", "Your consultation has been cancelled."),
    }

    current_status = getattr(instance, "status", "")
    if current_status not in STATUS_MAP:
        return

    # Only fire when the status field is explicitly being saved
    update_fields = kwargs.get("update_fields")
    if update_fields is not None and "status" not in update_fields:
        return

    title, message = STATUS_MAP[current_status]

    # 60-second idempotency window — prevents duplicate pings on repeated saves
    already_sent = Notification.objects.filter(
        recipient=patient,
        notification_type=Notification.TYPE_APPOINTMENT,
        title=title,
        created_at__gte=timezone.now() - timedelta(seconds=60),
    ).exists()

    if already_sent:
        return

    _create(
        recipient=patient,
        title=title,
        message=message,
        notification_type=Notification.TYPE_APPOINTMENT,
        actor=nutritionist,
        link="/appointments/",
    )