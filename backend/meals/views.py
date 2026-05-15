import logging
from rest_framework import viewsets, status, filters
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError
from django.db import IntegrityError
from django.db import DatabaseError
from django.db.utils import OperationalError, ProgrammingError
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta, datetime

from .models import Meal, MealFoodItem, FoodItem
from .serializers import MealSerializer
from .throttles import AiUploadThrottle
from .services import MealProcessingService
from profiles.effective_targets import get_effective_macro_targets

logger = logging.getLogger(__name__)
User = get_user_model()


class MealViewSet(viewsets.ModelViewSet):
    """
    User meal management:
    - POST /meals/ → create (optionally with AI image)
    - GET /meals/ → list all meals
    - GET /meals/{id}/ → retrieve single meal
    - PATCH /meals/{id}/ → update
    - DELETE /meals/{id}/ → delete
    - GET /meals/today/ → today's meals
    - GET /meals/summary/ → daily nutrition summary
    - GET /meals/history/?days=7 → history
    - POST /meals/{id}/confirm/ → confirm meal
    - GET /meals/food-items/?search=chicken → search food database
    """

    serializer_class = MealSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering = ["-logged_at"]
    def get_throttles(self):
        """
        Apply AI upload throttling only to image-upload create requests.
        Keep read endpoints (today/summary/history/list) unthrottled by ai_upload.
        """
        is_create_action = getattr(self, "action", None) == "create"
        has_image_upload = bool(getattr(self.request, "FILES", None) and self.request.FILES.get("image"))
        if is_create_action and has_image_upload:
            return [AiUploadThrottle()]
        return []

    def get_queryset(self):
        """Only return meals for the current user."""
        return Meal.objects.filter(user=self.request.user).order_by("-logged_at")

    def get_serializer_context(self):
        """Add request to context for serializers."""
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def perform_create(self, serializer):
        """
        Create meal and process AI image if provided.
        """
        meal = serializer.save(user=self.request.user)
        print(f"[NutriLens] Meal {meal.pk} saved. image={bool(meal.image)}")

        # If image was provided, run AI detection
        if meal.image:
            try:
                service = MealProcessingService()
                result = service.process_meal_image(meal)
                if not result.success:
                    print(f"[NutriLens] Detection returned no items for meal {meal.pk}: {result.error}")
                    logger.warning(
                        "AI detection failed for meal %d: %s",
                        meal.pk,
                        result.error,
                    )
            except Exception as exc:
                import traceback
                print(f"[NutriLens] EXCEPTION in perform_create for meal {meal.pk}: {exc}")
                traceback.print_exc()
                logger.error(
                    "Error processing meal image for meal %d: %s",
                    meal.pk,
                    str(exc),
                    exc_info=True,
                )
        else:
            print(f"[NutriLens] No image on meal {meal.pk}, skipping detection.")

    @action(detail=False, methods=["get"])
    def today(self, request):
        """GET /api/v1/meals/today/ — today's meals."""
        try:
            today = timezone.now().date()
            meals = self.get_queryset().filter(logged_at__date=today)
            serializer = self.get_serializer(meals, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error in today endpoint: {str(e)}", exc_info=True)
            return Response({"detail": "Unable to fetch today's meals."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """GET /api/v1/meals/summary/ — daily nutrition totals."""
        today = timezone.now().date()
        meals = self.get_queryset().filter(logged_at__date=today)

        total_calories = sum(m.total_calories or 0 for m in meals)
        total_protein = sum(m.total_protein_g or 0 for m in meals)
        total_carbs = sum(m.total_carbs_g or 0 for m in meals)
        total_fat = sum(m.total_fat_g or 0 for m in meals)

        try:
            goal_calories, goal_protein, goal_carbs, goal_fat = get_effective_macro_targets(
                request.user
            )
        except (AttributeError, OperationalError, ProgrammingError, DatabaseError):
            goal_calories = 2000
            goal_protein = 120
            goal_carbs = 200
            goal_fat = 65

        return Response({
            "date": str(today),
            "total_calories": round(total_calories, 2),
            "goal_calories": goal_calories,
            "total_protein_g": round(total_protein, 2),
            "goal_protein_g": goal_protein,
            "total_carbs_g": round(total_carbs, 2),
            "goal_carbs_g": goal_carbs,
            "total_fat_g": round(total_fat, 2),
            "goal_fat_g": goal_fat,
            "meal_count": meals.count(),
        })

    @action(detail=False, methods=["get"])
    def history(self, request):
        """GET /api/v1/meals/history/?days=7 — meal history."""
        try:
            days = max(1, int(request.query_params.get("days", 7)))
        except (ValueError, TypeError):
            days = 7

        since = timezone.now() - timedelta(days=days)
        meals = self.get_queryset().filter(logged_at__gte=since)

        serializer = self.get_serializer(meals, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        """POST /api/v1/meals/{id}/confirm/ — mark meal as confirmed."""
        meal = self.get_object()
        meal.is_confirmed = True
        meal.save(update_fields=["is_confirmed"])
        return Response(self.get_serializer(meal).data)

    @action(detail=False, methods=["get"])
    def food_items(self, request):
        """GET /api/v1/meals/food-items/?search=chicken — search food database."""
        query = request.query_params.get("search", "").strip()
        
        if query:
            foods = FoodItem.objects.filter(name__icontains=query)[:50]
        else:
            foods = FoodItem.objects.all()[:50]

        data = [
            {
                "id": f.id,
                "name": f.name,
                "calories_per_100g": f.calories_per_100g,
                "protein_per_100g": f.protein_per_100g,
                "carbs_per_100g": f.carbs_per_100g,
                "fat_per_100g": f.fat_per_100g,
                "category": f.category,
            }
            for f in foods
        ]
        return Response(data)


# ─────────────────────────────────────────────────────────────────────────────
# NUTRITIONIST → patient food logs (read-only)
# GET /api/v1/meals/patients/<patient_id>/food-logs/
# ─────────────────────────────────────────────────────────────────────────────

class PatientFoodLogsView(APIView):
    """
    Read a patient's meal entries. Caller must be a nutritionist
    and must manage this patient (profile.managed_by == request.user).

    Query params:
      date (YYYY-MM-DD)   - Single day
      days (int)          - Last N days (default: 7)
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, patient_id):
        """Get patient's food logs."""
        if not getattr(request.user, "is_nutritionist", False):
            return Response(
                {"detail": "Only nutritionists can access patient data."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            patient = User.objects.select_related("profile").get(pk=patient_id)
        except User.DoesNotExist:
            return Response(
                {"detail": "Patient not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check if nutritionist manages this patient
        managed_by_id = getattr(getattr(patient, "profile", None), "managed_by_id", None)
        if managed_by_id != request.user.pk:
            return Response(
                {"detail": "You do not manage this patient."},
                status=status.HTTP_403_FORBIDDEN,
            )

        date_str = request.query_params.get("date")
        try:
            days = max(1, int(request.query_params.get("days", 7)))
        except (ValueError, TypeError):
            days = 7

        if date_str:
            # Single day
            try:
                target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            except ValueError:
                return Response(
                    {"detail": "Invalid date format. Use YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            meals = Meal.objects.filter(
                user=patient,
                logged_at__date=target_date,
            ).order_by("-logged_at")
        else:
            # Last N days
            since = timezone.now() - timedelta(days=days)
            meals = Meal.objects.filter(
                user=patient,
                logged_at__gte=since,
            ).order_by("-logged_at")

        serializer = MealSerializer(meals, many=True)
        return Response(serializer.data)