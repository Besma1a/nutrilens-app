# consultations/models.py
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


class Nutritionist(models.Model):

    SPECIALIZATION_CHOICES = [
        ('weight_loss',        'Weight Loss'),
        ('muscle_gain',        'Muscle Gain'),
        ('disease_management', 'Disease Management'),
        ('sports_nutrition',   'Sports Nutrition'),
        ('general',            'General Nutrition'),
    ]

    name             = models.CharField(max_length=255)
    email            = models.EmailField(unique=True)
    phone            = models.CharField(max_length=20, blank=True, null=True)
    specialization   = models.CharField(max_length=50, choices=SPECIALIZATION_CHOICES, default='general')
    bio              = models.TextField(blank=True, null=True)
    credentials      = models.TextField(blank=True, null=True, help_text="Qualifications and certifications")
    profile_picture  = models.ImageField(upload_to='nutritionists/', null=True, blank=True)
    availability_url = models.URLField(blank=True, null=True, help_text="Calendly link etc.")
    zoom_meeting_link= models.URLField(blank=True, null=True)
    is_active        = models.BooleanField(default=True)
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} – {self.get_specialization_display()}"

    class Meta:
        verbose_name        = 'Nutritionist'
        verbose_name_plural = 'Nutritionists'
        ordering            = ['name']


class Consultation(models.Model):

    STATUS_CHOICES = [
        ('pending',   'Pending'),
        ('confirmed', 'Confirmed'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('no_show',   'No Show'),
    ]

    SESSION_TYPE_CHOICES = [
        ('monthly_checkin',    'Monthly Check-In'),
        ('diet_plan_review',   'Diet Plan Review'),
        ('initial_assessment', 'Initial Assessment'),
        ('progress_review',    'Progress Review'),
        ('other',              'Other'),
    ]

    user             = models.ForeignKey(User, on_delete=models.CASCADE, related_name='consultations')
    nutritionist     = models.ForeignKey(
        Nutritionist, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='consultations'
    )
    status           = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    session_type     = models.CharField(
        max_length=50, choices=SESSION_TYPE_CHOICES,
        default='other', blank=True
    )
    scheduled_at     = models.DateTimeField(help_text="When the consultation is scheduled")
    duration_minutes = models.IntegerField(
        default=30, choices=[(15, '15 min'), (30, '30 min'), (60, '60 min')]
    )
    zoom_link        = models.URLField(blank=True, null=True)
    topic            = models.TextField(blank=True, null=True, help_text="Main topic for the session")
    notes            = models.TextField(blank=True, null=True, help_text="User notes before the session")
    is_premium       = models.BooleanField(default=False)

    # Filled by nutritionist after session
    post_notes       = models.TextField(blank=True, null=True, help_text="Nutritionist notes after session")
    recommendations  = models.TextField(blank=True, null=True)
    completed_at     = models.DateTimeField(null=True, blank=True)
    requested_at     = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        n = self.nutritionist.name if self.nutritionist else "Unassigned"
        return f"{self.user.username} – {n} ({self.scheduled_at.date()})"

    class Meta:
        verbose_name        = 'Consultation'
        verbose_name_plural = 'Consultations'
        ordering            = ['-scheduled_at']
        indexes             = [
            models.Index(fields=['user', 'scheduled_at']),
            models.Index(fields=['status']),
        ]


class NutritionistFeedback(models.Model):
    """
    Feedback written BY the nutritionist FOR a patient
    (shown on the patient's Progress page).
    Different from ConsultationFeedback which is written by the user.
    """
    consultation     = models.OneToOneField(
        Consultation, on_delete=models.CASCADE,
        related_name='nutritionist_feedback'
    )
    text             = models.TextField(help_text="Nutritionist's notes/feedback visible to the patient")
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Feedback by {self.consultation.nutritionist} for {self.consultation.user}"

    class Meta:
        verbose_name        = 'Nutritionist Feedback'
        verbose_name_plural = 'Nutritionist Feedbacks'
        ordering            = ['-created_at']


class ConsultationFeedback(models.Model):
    """
    Rating/review written BY the user ABOUT a consultation
    (used for quality tracking, not shown on Progress).
    """
    RATING_CHOICES = [
        (1, '1 – Poor'),
        (2, '2 – Fair'),
        (3, '3 – Good'),
        (4, '4 – Very Good'),
        (5, '5 – Excellent'),
    ]

    consultation    = models.OneToOneField(
        Consultation, on_delete=models.CASCADE,
        related_name='feedback'
    )
    rating          = models.IntegerField(choices=RATING_CHOICES)
    comment         = models.TextField(blank=True, null=True)
    would_recommend = models.BooleanField(default=True)
    created_at      = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"User feedback for {self.consultation} – {self.rating}★"

    class Meta:
        verbose_name        = 'Consultation Feedback'
        verbose_name_plural = 'Consultation Feedbacks'