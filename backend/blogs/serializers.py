from rest_framework import serializers

from .models import Blog


def _uploads_url(request, image_name: str) -> str:
    path = f"/uploads/{image_name.replace(chr(92), '/')}"
    if request:
        return request.build_absolute_uri(path)
    return path


class BlogReadSerializer(serializers.ModelSerializer):
    imageUrl = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    author = serializers.SerializerMethodField()

    class Meta:
        model = Blog
        fields = ("id", "title", "content", "excerpt", "imageUrl", "author", "createdAt")

    def get_imageUrl(self, obj):
        if not obj.image:
            return None
        name = obj.image.name
        if not name:
            return None
        return _uploads_url(self.context.get("request"), name)

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
        validated_data.setdefault("is_published", True)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        old_image = instance.image if instance.image else None
        instance = super().update(instance, validated_data)
        if old_image and old_image != instance.image:
            old_image.delete(save=False)
        return instance
