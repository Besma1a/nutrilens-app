import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models

from consultations.models import Nutritionist
from subscriptions.models import Subscription


class AdminAccount(models.Model):
    name = models.CharField(max_length=120)
    email = models.EmailField(unique=True)
    password_hash = models.CharField(max_length=255)
    phone = models.CharField(max_length=30, blank=True)
    role = models.CharField(max_length=120, default="Platform Administrator")
    timezone = models.CharField(max_length=64, default="UTC")
    bio = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def is_authenticated(self):
        return True

    def __str__(self):
        return self.email


class SupportTicket(models.Model):
    PRIORITY_CHOICES = [("Low", "Low"), ("Medium", "Medium"), ("High", "High")]
    STATUS_CHOICES = [
        ("Open", "Open"),
        ("In Progress", "In Progress"),
        ("Waiting for User", "Waiting for User"),
        ("Resolved", "Resolved"),
        ("Closed", "Closed"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    subject = models.CharField(max_length=255)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default="Medium")
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default="Open")
    assigned = models.CharField(max_length=120, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]


class SupportTicketMessage(models.Model):
    ticket = models.ForeignKey(
        SupportTicket, on_delete=models.CASCADE, related_name="messages"
    )
    from_name = models.CharField(max_length=120)
    role = models.CharField(max_length=20, default="user")
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]


class Transaction(models.Model):
    STATUS_CHOICES = [
        ("Paid", "Paid"),
        ("Pending", "Pending"),
        ("Failed", "Failed"),
        ("Refunded", "Refunded"),
    ]
    REFUND_STATUS_CHOICES = [
        ("None", "None"),
        ("Processed", "Processed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    subscription = models.ForeignKey(
        Subscription, on_delete=models.SET_NULL, null=True, blank=True
    )
    plan = models.CharField(max_length=40)
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    method = models.CharField(max_length=50, default="Stripe")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Paid")
    refund_status = models.CharField(
        max_length=20, choices=REFUND_STATUS_CHOICES, default="None"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class Testimonial(models.Model):
    STATUS_CHOICES = [
        ("Pending", "Pending"),
        ("Approved", "Approved"),
        ("Rejected", "Rejected"),
    ]
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    name = models.CharField(max_length=120)
    plan = models.CharField(max_length=40, default="Basic")
    rating = models.PositiveSmallIntegerField(default=5)
    text = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Pending")
    featured = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class NutritionistAdminProfile(models.Model):
    STATUS_CHOICES = [
        ("Pending", "Pending"),
        ("Approved", "Approved"),
        ("Suspended", "Suspended"),
        ("Rejected", "Rejected"),
    ]

    nutritionist = models.OneToOneField(
        Nutritionist, on_delete=models.CASCADE, related_name="admin_profile"
    )
    linked_user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="nutritionist_admin_profile",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Pending")

    class Meta:
        ordering = ["-id"]
