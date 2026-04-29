from django.urls import path

from .views import BlogDetailView, BlogListCreateView

urlpatterns = [
    path("", BlogListCreateView.as_view(), name="blog-list-create"),
    path("<int:pk>/", BlogDetailView.as_view(), name="blog-detail"),
]
