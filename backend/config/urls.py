# config/urls.py
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.authtoken import views as authtoken_views
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from rest_framework import permissions
from profiles.views import NutritionistPatientsView, PlanAssignmentPatchView

schema_view = get_schema_view(
    openapi.Info(
        title="NutriLens API",
        default_version='v1',
        description="AI-powered nutrition tracking and consultation platform",
        contact=openapi.Contact(email="support@nutrilens.com"),
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    path("admin/", admin.site.urls),
    

    # Token authentication
    path('api/v1/auth/token/', authtoken_views.obtain_auth_token, name='api-token-auth'),

    # Swagger / ReDoc
    path('api/docs/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('api/redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),

    # App routers
    path('api/v1/users/', include('users.urls')),
    path('api/v1/meals/', include('meals.urls')),
    path('api/v1/consultations/', include('consultations.urls')),
    path('api/v1/profiles/', include('profiles.urls')),
    path(
        "api/plan-assignments/<str:assignment_id>/",
        PlanAssignmentPatchView.as_view(),
        name="plan-assignment-patch",
    ),
    path('api/v1/subscriptions/', include('subscriptions.urls')),
    path('api/patients/', NutritionistPatientsView.as_view(), name='api-patients'),
     path("api/v1/notifications/", include("notifications.urls")),

    path("api/dashboard/", include("dashboard.urls")),
    path("api/v1/dashboard/", include("dashboard.urls")),
    path("api/blogs/", include("blogs.urls")),
    path("api/v1/blogs/", include("blogs.urls")),
    path("api/admin/", include("adminpanel.urls")),

    # DRF browsable API login (dev only)
    path('api-auth/', include('rest_framework.urls')),
]

# Serve uploaded media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(
        "/uploads/",
        document_root=settings.MEDIA_ROOT,
        show_indexes=False,
    )
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
