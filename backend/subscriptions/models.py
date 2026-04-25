from django.db import models
from django.utils import timezone
from datetime import timedelta
from users.models import CustomUser


class Subscription(models.Model):
    """User subscription model for premium plan management."""
    
    PLAN_CHOICES = [
        ('Monthly', 'Monthly Plan - 30 days'),
        ('Quarterly', 'Quarterly Plan - 90 days'),
        ('Annual', 'Annual Plan - 365 days'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('cancelled', 'Cancelled'),
    ]
    
    user = models.OneToOneField(
        CustomUser, 
        on_delete=models.CASCADE,
        related_name='subscription'
    )
    plan = models.CharField(
        max_length=20,
        choices=PLAN_CHOICES,
        help_text="Subscription plan type"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active',
        help_text="Current subscription status"
    )
    start_date = models.DateTimeField(
        auto_now_add=True,
        help_text="When subscription was created or renewed"
    )
    end_date = models.DateTimeField(
        help_text="When subscription expires"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Subscription'
        verbose_name_plural = 'Subscriptions'
    
    def __str__(self):
        return f"{self.user.username} - {self.plan} ({self.status})"
    
    def save(self, *args, **kwargs):
        """Auto-calculate end_date based on plan when creating."""
        if not self.pk:  # Only on creation
            duration_map = {
                'Monthly': 30,
                'Quarterly': 90,
                'Annual': 365,
            }
            days = duration_map.get(self.plan, 30)
            self.end_date = timezone.now() + timedelta(days=days)
        
        super().save(*args, **kwargs)
    
    @property
    def is_active(self):
        """Check if subscription is currently active and not expired."""
        return (
            self.status == 'active' and 
            self.end_date > timezone.now()
        )
    
    @property
    def days_remaining(self):
        """Days until subscription expires."""
        if not self.is_active:
            return 0
        return (self.end_date - timezone.now()).days
