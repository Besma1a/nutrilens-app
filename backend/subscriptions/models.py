from datetime import timedelta

from django.db import models
from django.utils import timezone

from users.models import CustomUser


class SubscriptionPlan(models.Model):
    """Admin-managed plans displayed publicly and used for onboarding."""

    name = models.CharField(max_length=100, unique=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    features = models.JSONField(default=list, blank=True)
    duration_days = models.PositiveIntegerField(default=30)
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "price", "name"]
        verbose_name = "Subscription Plan"
        verbose_name_plural = "Subscription Plans"

    def __str__(self):
        return self.name


class Subscription(models.Model):
    """User subscription model for premium plan management."""

    STATUS_CHOICES = [
        ("active", "Active"),
        ("cancelled", "Cancelled"),
    ]

    user = models.OneToOneField(
        CustomUser,
        on_delete=models.CASCADE,
        related_name="subscription",
    )
    subscription_plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="subscriptions",
    )
    plan = models.CharField(
        max_length=100,
        help_text="Snapshot of the selected plan name",
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="active",
        help_text="Current subscription status",
    )
    start_date = models.DateTimeField(
        auto_now_add=True,
        help_text="When subscription was created or renewed",
    )
    end_date = models.DateTimeField(
        help_text="When subscription expires"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Subscription"
        verbose_name_plural = "Subscriptions"

    def __str__(self):
        return f"{self.user.username} - {self.plan} ({self.status})"

    def save(self, *args, **kwargs):
        """Auto-calculate end_date based on plan when creating."""
        if not self.pk and not self.end_date:  # Only on creation
            duration_map = {
                "Monthly": 30,
                "Quarterly": 90,
                "Annual": 365,
            }
            days = self.subscription_plan.duration_days if self.subscription_plan else duration_map.get(self.plan, 30)
            self.end_date = timezone.now() + timedelta(days=days)

        super().save(*args, **kwargs)

    @property
    def is_active(self):
        """Check if subscription is currently active and not expired."""
        return self.status == "active" and self.end_date > timezone.now()

    @property
    def days_remaining(self):
        """Days until subscription expires."""
        if not self.is_active:
            return 0
        return (self.end_date - timezone.now()).days
