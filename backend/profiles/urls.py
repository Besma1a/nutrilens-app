# profiles/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CurrentUserProfileView,
    AssignPatientView,
    SelectNutritionistView,
    NutritionistPatientsView,
    WeightEntryViewSet,
    BodyMeasurementViewSet,
    NutritionistFeedbackViewSet,
    DietPlanViewSet,
    DietPlanTemplateViewSet,
    PublicDietPlanTemplateViewSet,
)

router = DefaultRouter()
router.register(r'weight', WeightEntryViewSet, basename='weight')
router.register(r'measurements', BodyMeasurementViewSet, basename='measurements')
router.register(r'feedback', NutritionistFeedbackViewSet, basename='feedback')
router.register(r'diet-plans', DietPlanViewSet, basename='diet-plan')
router.register(r'diet-plan-templates', DietPlanTemplateViewSet, basename='diet-plan-template')
router.register(r'public-diet-plan-templates', PublicDietPlanTemplateViewSet, basename='public-diet-plan-template')

urlpatterns = [
    path('profile/', CurrentUserProfileView.as_view(), name='current-user-profile'),
    path('assign-patient/', AssignPatientView.as_view(), name='assign-patient'),
    path('select-nutritionist/', SelectNutritionistView.as_view(), name='select-nutritionist'),
    path('patients/', NutritionistPatientsView.as_view(), name='nutritionist-patients'),
    path('', include(router.urls)),
]