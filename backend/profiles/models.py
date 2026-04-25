# profiles/models.py
from django.db import models
from django.contrib.auth import get_user_model
from datetime import date

User = get_user_model()


class UserProfile(models.Model):
    """Extended user profile with health and fitness data."""
    
    GOAL_SETTING_CHOICES = [
        ('auto', 'Automatic'),
        ('manual', 'Manual'),
    ]
    
    SUBSCRIPTION_PLAN_CHOICES = [
        ('free', 'Free'),
        ('premium', 'Premium'),
        ('pro', 'Pro'),
    ]
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='profile',
        primary_key=True
    )
    
    # Physical metrics
    height_cm = models.FloatField(null=True, blank=True)
    current_weight_kg = models.FloatField(null=True, blank=True)
    start_weight_kg = models.FloatField(null=True, blank=True)
    goal_weight_kg = models.FloatField(null=True, blank=True)
    
    # Nutrition targets
    daily_calorie_goal = models.IntegerField(null=True, blank=True, default=2000)
    protein_goal_g = models.FloatField(null=True, blank=True, default=120)
    carbs_goal_g = models.FloatField(null=True, blank=True, default=200)
    fat_goal_g = models.FloatField(null=True, blank=True, default=65)
    
    # Goal management
    goal_setting_mode = models.CharField(
        max_length=10,
        choices=GOAL_SETTING_CHOICES,
        default='auto'
    )
    
    # Subscription
    is_subscribed = models.BooleanField(default=False)
    subscription_plan = models.CharField(
        max_length=20,
        choices=SUBSCRIPTION_PLAN_CHOICES,
        default='free'
    )
    subscription_end_date = models.DateTimeField(null=True, blank=True)
    
    # Nutritionist relationship
    managed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='managing_patients'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "User Profile"
        verbose_name_plural = "User Profiles"
    
    def __str__(self):
        return f"Profile of {self.user.username}"
    
    @property
    def bmi(self):
        """Calculate BMI from current weight and height."""
        if self.current_weight_kg and self.height_cm:
            return self.current_weight_kg / ((self.height_cm / 100) ** 2)
        return None
    
    @property
    def subscription_is_active(self):
        """Check if subscription is currently active."""
        if not self.is_subscribed or not self.subscription_end_date:
            return False
        from django.utils import timezone
        return timezone.now() <= self.subscription_end_date
    
    def scans_used_today(self):
        """Count meal scans used today."""
        from django.utils import timezone
        today = timezone.now().date()
        return self.user.meals.filter(logged_at__date=today).count()


class WeightEntry(models.Model):
    """Weight tracking entries."""
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='weight_entries'
    )
    date = models.DateField()
    weight_kg = models.FloatField()
    notes = models.TextField(blank=True)
    logged_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-date', '-logged_at']
        unique_together = ['user', 'date']
        indexes = [
            models.Index(fields=['user', '-date']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.date}: {self.weight_kg}kg"


class BodyMeasurement(models.Model):
    """Body measurement tracking."""
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='body_measurements'
    )
    date = models.DateField()
    waist_cm = models.FloatField(null=True, blank=True)
    hips_cm = models.FloatField(null=True, blank=True)
    chest_cm = models.FloatField(null=True, blank=True)
    arms_cm = models.FloatField(null=True, blank=True)
    neck_cm = models.FloatField(null=True, blank=True)
    notes = models.TextField(blank=True)
    logged_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-date', '-logged_at']
        verbose_name_plural = "Body Measurements"
        indexes = [
            models.Index(fields=['user', '-date']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.date}"


class NutritionistFeedback(models.Model):
    """Feedback notes sent by nutritionists to users about their progress."""
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="feedback_received",
        help_text="User receiving the feedback"
    )
    nutritionist = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="feedback_sent",
        help_text="Nutritionist sending the feedback"
    )
    title = models.CharField(
        max_length=200,
        help_text="Brief title for the feedback"
    )
    message = models.TextField(
        help_text="Detailed feedback message"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_read = models.BooleanField(
        default=False,
        help_text="Whether the user has read this feedback"
    )
    
    class Meta:
        verbose_name = "Nutritionist Feedback"
        verbose_name_plural = "Nutritionist Feedback"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["nutritionist", "-created_at"]),
        ]
    
    def __str__(self):
        return f"Feedback from {self.nutritionist.username} to {self.user.username} - {self.title}"


class DietPlan(models.Model):
    """
    A diet plan assigned to a patient by a nutritionist.
    Tracks the specific meal/nutrition plan given to each user.
    """
    
    PLAN_TYPES = [
        ('standard', 'Standard Plan'),
        ('seasonal', 'Seasonal Plan'),
        ('ramadan', 'Ramadan Plan'),
        ('medical', 'Medical Plan'),
        ('custom', 'Custom Plan'),
    ]
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='diet_plans',
        help_text="Patient the plan is assigned to"
    )
    assigned_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_diet_plans',
        help_text="Nutritionist who assigned the plan"
    )
    
    title = models.CharField(
        max_length=200,
        help_text="Name of the diet plan (e.g., 'Standard Plan', 'Keto Plan')"
    )
    description = models.TextField(
        blank=True,
        help_text="Detailed description of the plan"
    )
    plan_type = models.CharField(
        max_length=20,
        choices=PLAN_TYPES,
        default='standard',
        help_text="Type/category of the plan"
    )
    
    # Nutrition targets for this plan
    daily_calorie_target = models.IntegerField(
        null=True,
        blank=True,
        help_text="Target daily calories for this plan"
    )
    protein_target_g = models.FloatField(
        null=True,
        blank=True,
        help_text="Target protein in grams"
    )
    carbs_target_g = models.FloatField(
        null=True,
        blank=True,
        help_text="Target carbs in grams"
    )
    fat_target_g = models.FloatField(
        null=True,
        blank=True,
        help_text="Target fat in grams"
    )
    meals_data = models.JSONField(
        default=dict,
        blank=True,
        help_text="Structured daily meal plan data"
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this is the currently active plan"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Diet Plan"
        verbose_name_plural = "Diet Plans"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["user", "is_active"]),
        ]
    
    def __str__(self):
        return f"{self.title} for {self.user.username}"


class PlanAssignment(models.Model):
    """
    One row per meal slot on a given day of a diet plan (P3 adjustments).
    Materialized from meals_data when the active plan is fetched; PATCH updates fields only.
    """

    diet_plan = models.ForeignKey(
        DietPlan,
        on_delete=models.CASCADE,
        related_name="plan_assignments",
    )
    day_index = models.PositiveIntegerField(default=0)
    slot_key = models.CharField(
        max_length=32,
        default="breakfast",
        help_text="Meal slot within the day (breakfast, lunch, dinner, snacks).",
    )
    meal_ids = models.JSONField(default=list, blank=True)
    portion_size = models.FloatField(null=True, blank=True)
    scheduled_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["diet_plan_id", "day_index", "slot_key"]
        constraints = [
            models.UniqueConstraint(
                fields=["diet_plan", "day_index", "slot_key"],
                name="profiles_planassignment_plan_day_slot_uniq",
            ),
        ]

    def __str__(self):
        return f"PlanAssignment {self.diet_plan_id} day{self.day_index} {self.slot_key}"