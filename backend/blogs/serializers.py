from rest_framework import serializers

from .models import Blog


def _media_url(request, image_field) -> str:
    """Return a full absolute URL for a Django ImageField using the standard
    /media/ path.  Falls back to a protocol-relative URL when no request
    context is available (e.g. management commands)."""
    if not image_field:
        return None
    try:
        relative = image_field.url          # e.g.  /media/blogs/photo.jpg
    except ValueError:
        return None
    if request:
        return request.build_absolute_uri(relative)
    return relative


class BlogReadSerializer(serializers.ModelSerializer):
    imageUrl = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    status = serializers.CharField(source="moderation_status", read_only=True)
    author = serializers.SerializerMethodField()

    class Meta:
        model = Blog
        fields = (
            "id",
            "title",
            "content",
            "excerpt",
            "imageUrl",
            "author",
            "createdAt",
            "status",
        )

    def get_imageUrl(self, obj):
        return _media_url(self.context.get("request"), obj.image)

    def get_author(self, obj):
        u = obj.author
        full = (u.get_full_name() or "").strip()
        return full or u.username


class BlogWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Blog
        fields = ("title", "content", "excerpt", "image")

    def create(self, validated_data):
        validated_data["author"] = self.context["request"].user
        validated_data["is_published"] = False
        validated_data["moderation_status"] = Blog.STATUS_PENDING
        return super().create(validated_data)

    def update(self, instance, validated_data):
        old_image = instance.image if instance.image else None
        if any(field in validated_data for field in ("title", "content", "excerpt", "image")):
            validated_data["is_published"] = False
            validated_data["moderation_status"] = Blog.STATUS_PENDING
        instance = super().update(instance, validated_data)
        if old_image and old_image != instance.image:
            old_image.delete(save=False)
        return instance
