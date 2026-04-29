# users/models.py
import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from datetime import timedelta


class CustomUser(AbstractUser):
    """Extended user model with health profile information"""

    GOAL_CHOICES = [
        ('lose', 'Lose Weight'),
        ('maintain', 'Maintain Weight'),
        ('gain', 'Gain Weight'),
    ]
    PLAN_CHOICES = [
        ("free", "Free"),
        ("pro", "Pro"),
        ("premium", "Premium"),
    ]

    # ── Health profile ────────────────────────────────────────────────
    weight = models.FloatField(
        null=True, blank=True,
        validators=[MinValueValidator(20), MaxValueValidator(500)],
        help_text="Current weight in kilograms",
    )
    # FIX: dedicated start_weight field — set once at health setup and never changed.
    # Used in progress charts to calculate total weight change from baseline.
    start_weight = models.FloatField(
        null=True, blank=True,
        validators=[MinValueValidator(20), MaxValueValidator(500)],
        help_text="Weight at the time of onboarding (never updated after that)",
    )
    height = models.FloatField(
        null=True, blank=True,
        validators=[MinValueValidator(50), MaxValueValidator(300)],
        help_text="Height in centimeters",
    )
    goal = models.CharField(max_length=10, choices=GOAL_CHOICES, default='maintain')
    daily_calorie_goal = models.IntegerField(
        default=2000,
        validators=[MinValueValidator(800), MaxValueValidator(5000)],
    )
    profile_picture = models.ImageField(upload_to='profile_pictures/', null=True, blank=True)
    bio = models.TextField(blank=True, null=True)

    # ── Extended health fields (from HealthSetupPage) ─────────────────
    gender = models.CharField(max_length=20, blank=True, null=True)
    date_of_birth = models.DateField(null=True, blank=True)
    location = models.CharField(max_length=255, blank=True, null=True)
    goal_weight = models.FloatField(null=True, blank=True, help_text="Target weight in kg")
    body_fat = models.FloatField(null=True, blank=True, help_text="Body fat percentage")
    diet_style = models.CharField(max_length=50, blank=True, null=True)
    goal_type = models.CharField(max_length=50, blank=True, null=True)
    goal_desc = models.CharField(max_length=255, blank=True, null=True)
    activity_level = models.CharField(max_length=50, blank=True, null=True)
    sleep_target_hours = models.FloatField(null=True, blank=True)

    # Medical info stored as JSON
    medical_conditions = models.JSONField(default=list, blank=True)
    medications = models.JSONField(default=list, blank=True)
    allergies = models.JSONField(default=list, blank=True)

    # ── Account status ────────────────────────────────────────────────
    email_verified = models.BooleanField(default=False)
    onboarding_complete = models.BooleanField(default=False)
    is_nutritionist = models.BooleanField(default=False, help_text="Can access nutritionist panel")
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default="free")
    plan_started_at = models.DateTimeField(null=True, blank=True)

    # ── Timestamps ────────────────────────────────────────────────────
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.username} - {self.email}"

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-created_at']


class UserPreferences(models.Model):
    """User preferences for notifications and features"""

    user = models.OneToOneField(
        CustomUser, on_delete=models.CASCADE, related_name='preferences'
    )
    notifications_enabled = models.BooleanField(default=True)
    email_notifications = models.BooleanField(default=True)
    is_premium = models.BooleanField(default=False)
    preferred_nutritionist = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} - Preferences"

    class Meta:
        verbose_name = 'User Preference'
        verbose_name_plural = 'User Preferences'


class EmailVerificationToken(models.Model):
    """
    One-time token sent to the user's email to verify their address.
    Expires after 24 hours.
    """
    user = models.ForeignKey(
        CustomUser, on_delete=models.CASCADE, related_name='verification_tokens'
    )
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    def is_expired(self):
        return timezone.now() > self.created_at + timedelta(hours=24)

    def __str__(self):
        return f"Verification token for {self.user.email}"

    class Meta:
        verbose_name = 'Email Verification Token'
        ordering = ['-created_at']


class PasswordResetToken(models.Model):
    """
    One-time token sent to the user's email to reset their password.
    Expires after 1 hour.
    """
    user = models.ForeignKey(
        CustomUser, on_delete=models.CASCADE, related_name='password_reset_tokens'
    )
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    def is_expired(self):
        return timezone.now() > self.created_at + timedelta(hours=1)

    def __str__(self):
        return f"Password reset token for {self.user.email}"

    class Meta:
        verbose_name = 'Password Reset Token'
        ordering = ['-created_at']