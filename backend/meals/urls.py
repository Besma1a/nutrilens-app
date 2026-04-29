# meals/urls.py
from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import MealViewSet, PatientFoodLogsView   # ← PatientFoodLogsView added

router = DefaultRouter()
router.register(r'', MealViewSet, basename='meal')

urlpatterns = [
    # Nutritionist read-only: patient food logs
    # GET /api/v1/meals/patients/<patient_id>/food-logs/
    path(
        "patients/<int:patient_id>/food-logs/",
        PatientFoodLogsView.as_view(),
        name="patient-food-logs",
    ),
    *router.urls,
]