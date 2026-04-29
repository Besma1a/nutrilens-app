from rest_framework import generics, status
from rest_framework.parsers import FormParser, MultiPartParser, JSONParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Blog
from .permissions import IsNutritionistUser
from .serializers import BlogReadSerializer, BlogWriteSerializer


class BlogListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/blogs/     — public, published posts
    POST /api/blogs/     — nutritionist, multipart (title, content, excerpt, image)
    """

    parser_classes = (MultiPartParser, FormParser, JSONParser)
    pagination_class = None

    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]
        return [IsAuthenticated(), IsNutritionistUser()]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return BlogWriteSerializer
        return BlogReadSerializer

    def get_queryset(self):
        return Blog.objects.filter(
            is_published=True, moderation_status=Blog.STATUS_APPROVED
        ).select_related("author")

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        # Admin notification for new content awaiting moderation (best-effort)
        try:
            from adminpanel.models import AdminNotification

            author = getattr(serializer.instance, "author", None)
            author_name = (
                f"{author.first_name} {author.last_name}".strip() or getattr(author, "username", "Nutritionist")
                if author
                else "Nutritionist"
            )
            AdminNotification.create(
                title="New blog submitted",
                message=f"{author_name} submitted a blog: “{serializer.instance.title}”.",
                notification_type=AdminNotification.TYPE_CONTENT,
                link="/admin#content",
            )
        except Exception:
            pass

        read = BlogReadSerializer(serializer.instance, context={"request": request})
        headers = self.get_success_headers(serializer.data)
        return Response(read.data, status=status.HTTP_201_CREATED, headers=headers)


class BlogDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    — public if published
    PATCH  — author nutritionist only; multipart or JSON
    DELETE — author nutritionist only
    """

    parser_classes = (MultiPartParser, FormParser, JSONParser)
    lookup_field = "pk"

    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]
        return [IsAuthenticated(), IsNutritionistUser()]

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return BlogWriteSerializer
        return BlogReadSerializer

    def get_queryset(self):
        user = self.request.user
        base = Blog.objects.all().select_related("author")
        if self.request.method == "GET":
            return base.filter(is_published=True, moderation_status=Blog.STATUS_APPROVED)
        if user.is_authenticated and getattr(user, "is_nutritionist", False):
            return base.filter(author=user)
        return Blog.objects.none()

    def patch(self, request, *args, **kwargs):
        partial = True
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(BlogReadSerializer(instance, context={"request": request}).data)

    def perform_destroy(self, instance):
        if instance.image:
            instance.image.delete(save=False)
        instance.delete()
