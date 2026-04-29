from django.conf import settings
from django.db import models


class Blog(models.Model):
    STATUS_PENDING = "Pending"
    STATUS_APPROVED = "Approved"
    STATUS_REJECTED = "Rejected"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_APPROVED, "Approved"),
        (STATUS_REJECTED, "Rejected"),
    ]

    """Nutritionist-authored article; public list shows published rows only."""

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="blog_posts",
    )
    title = models.CharField(max_length=255)
    content = models.TextField()
    excerpt = models.TextField(blank=True)
    image = models.ImageField(upload_to="blogs/", blank=True, null=True)
    is_published = models.BooleanField(default=False)
    moderation_status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["is_published", "-created_at"]),
            models.Index(fields=["moderation_status", "-created_at"]),
        ]

    def __str__(self):
        return self.title
