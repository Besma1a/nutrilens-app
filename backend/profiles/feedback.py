# profiles/feedback.py - Nutritionist feedback model (separate file due to edit restrictions)
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class NutritionistFeedback(models.Model):
    """
    Feedback notes sent by nutritionists to users about their progress.
    """
    
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
