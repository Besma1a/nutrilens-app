# consultations/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NutritionistViewSet, ConsultationViewSet, NutritionistConsultationViewSet

router = DefaultRouter()
router.register(r'nutritionists',          NutritionistViewSet,             basename='nutritionist')
router.register(r'consultations',          ConsultationViewSet,             basename='consultation')
router.register(r'nutritionist-sessions',  NutritionistConsultationViewSet, basename='nutritionist-session')

urlpatterns = [
    path('', include(router.urls)),
]