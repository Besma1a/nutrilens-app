# meals/services.py
"""
Service layer for NutriLens AI food detection.

Architecture: Fat Service / Skinny View pattern.
The FoodDetectionService is the single point of integration with the AI model.
It is intentionally decoupled so it can be called from:
  - A synchronous DRF view (current)
  - A Celery background task (future migration, zero view changes needed)
"""

import logging
import random
import time
from dataclasses import dataclass, field
from typing import Optional
from django.core.files.uploadedfile import InMemoryUploadedFile
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied

from .models import FoodItem, Meal, MealFoodItem

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Data Transfer Objects (DTOs)
# ---------------------------------------------------------------------------

@dataclass
class DetectedFoodDTO:
    """
    A single food item detected by the AI model.
    This is an intermediate, model-agnostic representation that decouples
    the AI output format from our Django ORM models.
    """
    name: str
    confidence: float              # 0.0 – 1.0
    calories_per_100g: float
    estimated_grams: float
    protein_per_100g: float = 0.0
    carbs_per_100g: float = 0.0
    fat_per_100g: float = 0.0
    fiber_per_100g: float = 0.0
    category: str = "other"

    @property
    def calculated_calories(self) -> float:
        """Calories for the estimated portion."""
        return round((self.calories_per_100g * self.estimated_grams) / 100, 2)

    @property
    def calculated_protein(self) -> float:
        return round((self.protein_per_100g * self.estimated_grams) / 100, 2)

    @property
    def calculated_carbs(self) -> float:
        return round((self.carbs_per_100g * self.estimated_grams) / 100, 2)

    @property
    def calculated_fat(self) -> float:
        return round((self.fat_per_100g * self.estimated_grams) / 100, 2)

    @property
    def calculated_fiber(self) -> float:
        return round((self.fiber_per_100g * self.estimated_grams) / 100, 2)


@dataclass
class DetectionResult:
    """
    The complete result returned by FoodDetectionService.detect().
    Wraps a list of DTOs along with metadata about the detection run.
    """
    detected_items: list[DetectedFoodDTO] = field(default_factory=list)
    overall_confidence: float = 0.0
    processing_time_ms: int = 0
    error: Optional[str] = None

    @property
    def success(self) -> bool:
        return self.error is None and len(self.detected_items) > 0

    @property
    def total_calories(self) -> float:
        return round(sum(item.calculated_calories for item in self.detected_items), 2)


# ---------------------------------------------------------------------------
# AI Detection Service
# ---------------------------------------------------------------------------

# Confidence threshold — detections below this score are discarded.
CONFIDENCE_THRESHOLD = 0.50

# Mock food database used by the stub AI adapter.
# Replace this with a real DB lookup or external API call in production.
_MOCK_FOOD_DATABASE: list[dict] = [
    {
        "name": "Apple",
        "calories_per_100g": 52,
        "protein_per_100g": 0.3,
        "carbs_per_100g": 14.0,
        "fat_per_100g": 0.2,
        "fiber_per_100g": 2.4,
        "category": "fruit",
        "estimated_grams": 182,
    },
    {
        "name": "Banana",
        "calories_per_100g": 89,
        "protein_per_100g": 1.1,
        "carbs_per_100g": 23.0,
        "fat_per_100g": 0.3,
        "fiber_per_100g": 2.6,
        "category": "fruit",
        "estimated_grams": 118,
    },
    {
        "name": "Grilled Chicken Breast",
        "calories_per_100g": 165,
        "protein_per_100g": 31.0,
        "carbs_per_100g": 0.0,
        "fat_per_100g": 3.6,
        "fiber_per_100g": 0.0,
        "category": "protein",
        "estimated_grams": 150,
    },
    {
        "name": "White Rice",
        "calories_per_100g": 130,
        "protein_per_100g": 2.7,
        "carbs_per_100g": 28.2,
        "fat_per_100g": 0.3,
        "fiber_per_100g": 0.4,
        "category": "grain",
        "estimated_grams": 200,
    },
    {
        "name": "Broccoli",
        "calories_per_100g": 34,
        "protein_per_100g": 2.8,
        "carbs_per_100g": 7.0,
        "fat_per_100g": 0.4,
        "fiber_per_100g": 2.6,
        "category": "vegetable",
        "estimated_grams": 100,
    },
    {
        "name": "Whole Egg",
        "calories_per_100g": 155,
        "protein_per_100g": 13.0,
        "carbs_per_100g": 1.1,
        "fat_per_100g": 11.0,
        "fiber_per_100g": 0.0,
        "category": "protein",
        "estimated_grams": 60,
    },
    {
        "name": "Pasta",
        "calories_per_100g": 158,
        "protein_per_100g": 5.8,
        "carbs_per_100g": 31.0,
        "fat_per_100g": 0.9,
        "fiber_per_100g": 1.8,
        "category": "grain",
        "estimated_grams": 180,
    },
    {
        "name": "Salmon Fillet",
        "calories_per_100g": 208,
        "protein_per_100g": 20.0,
        "carbs_per_100g": 0.0,
        "fat_per_100g": 13.0,
        "fiber_per_100g": 0.0,
        "category": "protein",
        "estimated_grams": 170,
    },
    {
        "name": "Mixed Salad",
        "calories_per_100g": 15,
        "protein_per_100g": 1.3,
        "carbs_per_100g": 2.9,
        "fat_per_100g": 0.2,
        "fiber_per_100g": 1.5,
        "category": "vegetable",
        "estimated_grams": 120,
    },
    {
        "name": "Greek Yogurt",
        "calories_per_100g": 59,
        "protein_per_100g": 10.0,
        "carbs_per_100g": 3.6,
        "fat_per_100g": 0.4,
        "fiber_per_100g": 0.0,
        "category": "dairy",
        "estimated_grams": 150,
    },
]


class FoodDetectionService:
    """
    Wraps the AI food detection model.

    Current implementation: deterministic mock that simulates a real model.

    To swap in a real model (YOLOv8, Claude Vision, etc.):
      1. Replace `_run_inference()` with your actual API/model call.
      2. Replace `_parse_raw_output()` with your output-format parser.
      3. Keep the public `detect()` interface unchanged — views are unaffected.

    To move to Celery:
      - Call `FoodDetectionService().detect(image)` from inside a Celery task.
      - No changes to the service itself are required.
    """

    CONFIDENCE_THRESHOLD: float = CONFIDENCE_THRESHOLD

    def detect(self, image_file: InMemoryUploadedFile) -> DetectionResult:
        """
        Main public API.  Takes an uploaded image and returns a DetectionResult.

        Args:
            image_file: The uploaded image (Django InMemoryUploadedFile or
                        any file-like object with a `.name` attribute).

        Returns:
            DetectionResult with detected food items or an error description.
        """
        start_time = time.monotonic()

        try:
            self._validate_image(image_file)
            raw_output = self._run_inference(image_file)
            detected_items = self._parse_raw_output(raw_output)
            filtered_items = self._apply_confidence_filter(detected_items)

            elapsed_ms = int((time.monotonic() - start_time) * 1000)

            if not filtered_items:
                logger.warning(
                    "FoodDetectionService: no items above confidence threshold "
                    "(%.2f) for image '%s'.",
                    self.CONFIDENCE_THRESHOLD,
                    getattr(image_file, "name", "unknown"),
                )
                return DetectionResult(
                    detected_items=[],
                    overall_confidence=0.0,
                    processing_time_ms=elapsed_ms,
                    error="No food items could be detected in the image. "
                          "Please try a clearer photo.",
                )

            overall_confidence = round(
                sum(i.confidence for i in filtered_items) / len(filtered_items), 3
            )

            logger.info(
                "FoodDetectionService: detected %d item(s) in %dms (confidence=%.2f).",
                len(filtered_items),
                elapsed_ms,
                overall_confidence,
            )

            return DetectionResult(
                detected_items=filtered_items,
                overall_confidence=overall_confidence,
                processing_time_ms=elapsed_ms,
            )

        except InvalidImageError as exc:
            logger.warning("FoodDetectionService: invalid image — %s", exc)
            return DetectionResult(error=str(exc))

        except Exception as exc:  # noqa: BLE001
            logger.exception("FoodDetectionService: unexpected error during detection.")
            return DetectionResult(
                error="An unexpected error occurred during food detection. "
                      "Please try again."
            )

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _validate_image(self, image_file: InMemoryUploadedFile) -> None:
        """Raise InvalidImageError if the file looks unusable."""
        if image_file is None:
            raise InvalidImageError("No image file provided.")

        allowed_types = {"image/jpeg", "image/png", "image/webp", "image/gif"}
        content_type = getattr(image_file, "content_type", "")
        if content_type and content_type not in allowed_types:
            raise InvalidImageError(
                f"Unsupported image format '{content_type}'. "
                f"Please upload a JPEG, PNG, or WebP image."
            )

        max_size_bytes = 10 * 1024 * 1024  # 10 MB
        size = getattr(image_file, "size", 0)
        if size > max_size_bytes:
            raise InvalidImageError(
                f"Image size ({size // (1024*1024)} MB) exceeds the 10 MB limit."
            )

    def _run_inference(self, image_file: InMemoryUploadedFile) -> list[dict]:
        """
        *** MOCK IMPLEMENTATION ***

        Simulates a call to a YOLOv8 / Claude Vision / custom model.
        In production, replace this body with your real model call, e.g.:

            model = YOLO("weights/nutrilens_v1.pt")
            results = model(image_file)
            return results[0].tojson()

        Or, for an external API:

            response = anthropic_client.messages.create(
                model="claude-opus-4-5",
                max_tokens=1024,
                messages=[{"role": "user", "content": [..., image_content]}],
            )
            return json.loads(response.content[0].text)
        """
        # Deterministic seed based on filename so tests are reproducible.
        seed = sum(ord(c) for c in getattr(image_file, "name", "mock"))
        rng = random.Random(seed)

        # Pick 1–3 random items from the mock database.
        num_items = rng.randint(1, 3)
        selected = rng.sample(_MOCK_FOOD_DATABASE, k=min(num_items, len(_MOCK_FOOD_DATABASE)))

        raw_output = []
        for item in selected:
            raw_output.append({
                **item,
                # Vary portion size slightly (+/- 20 %) and confidence.
                "estimated_grams": round(item["estimated_grams"] * rng.uniform(0.8, 1.2)),
                "confidence": round(rng.uniform(0.70, 0.99), 2),
            })

        return raw_output

    def _parse_raw_output(self, raw_output: list[dict]) -> list[DetectedFoodDTO]:
        """Convert raw model output dicts into typed DTOs."""
        items: list[DetectedFoodDTO] = []
        for raw in raw_output:
            try:
                items.append(DetectedFoodDTO(
                    name=raw["name"],
                    confidence=float(raw["confidence"]),
                    calories_per_100g=float(raw["calories_per_100g"]),
                    estimated_grams=float(raw["estimated_grams"]),
                    protein_per_100g=float(raw.get("protein_per_100g", 0)),
                    carbs_per_100g=float(raw.get("carbs_per_100g", 0)),
                    fat_per_100g=float(raw.get("fat_per_100g", 0)),
                    fiber_per_100g=float(raw.get("fiber_per_100g", 0)),
                    category=raw.get("category", "other"),
                ))
            except (KeyError, ValueError, TypeError) as exc:
                logger.warning("Could not parse raw detection item %s: %s", raw, exc)
                continue
        return items

    def _apply_confidence_filter(
        self, items: list[DetectedFoodDTO]
    ) -> list[DetectedFoodDTO]:
        """Discard detections below the confidence threshold."""
        return [i for i in items if i.confidence >= self.CONFIDENCE_THRESHOLD]


# ---------------------------------------------------------------------------
# Meal Processing Service
# ---------------------------------------------------------------------------

class MealProcessingService:
    """
    Orchestrates the complete meal-creation workflow:

      1. Call FoodDetectionService to get detected items.
      2. Upsert FoodItem records in the database (get-or-create).
      3. Create MealFoodItem junction rows.
      4. Update Meal.total_calories and Meal.ai_confidence_score.

    This service is intentionally separate from FoodDetectionService so that
    step 1 can be replaced by a Celery task result without touching the ORM logic.
    """

    def __init__(self) -> None:
        self._detector = FoodDetectionService()

    def process_meal_image(self, meal: Meal) -> DetectionResult:
        """
        Run detection on a Meal's image and persist the results.

        Args:
            meal: A freshly saved Meal instance (image already stored on disk).

        Returns:
            The DetectionResult (callers can inspect `.success` / `.error`).
        """
        user = meal.user
        subscription = getattr(user, 'subscription', None)
        is_free = (
            subscription is None
            or not subscription.is_active
            or subscription.plan != 'Pro'
        )
        if is_free:
            today = timezone.now().date()
            scan_count = Meal.objects.filter(
                user=user,
                logged_at__date=today,
                ai_confidence_score__isnull=False,
            ).count()
            if scan_count >= 3:
                raise PermissionDenied(
                    "Free plan limit reached. You can perform 3 AI scans per day. "
                    "Upgrade to Pro for unlimited scans."
                )

        result = self._detector.detect(meal.image)

        if not result.success:
            logger.warning(
                "MealProcessingService: detection failed for meal %d — %s",
                meal.pk,
                result.error,
            )
            return result

        self._persist_food_items(meal, result)
        self._update_meal_totals(meal, result)

        return result

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _persist_food_items(self, meal: Meal, result: DetectionResult) -> None:
        """
        Upsert FoodItem rows and create MealFoodItem junction records.
        Uses get_or_create so the food catalog grows automatically from AI output.
        """
        for dto in result.detected_items:
            food_item, created = FoodItem.objects.get_or_create(
                name__iexact=dto.name,
                defaults={
                    "name": dto.name,
                    "calories_per_100g": dto.calories_per_100g,
                    "protein_per_100g": dto.protein_per_100g,
                    "carbs_per_100g": dto.carbs_per_100g,
                    "fat_per_100g": dto.fat_per_100g,
                    "fiber_per_100g": dto.fiber_per_100g,
                    "category": dto.category,
                },
            )

            if created:
                logger.info("MealProcessingService: new FoodItem created — '%s'.", dto.name)

            # MealFoodItem has unique_together=['meal', 'food_item'].
            # Use update_or_create to be idempotent (e.g. if processing is retried).
            MealFoodItem.objects.update_or_create(
                meal=meal,
                food_item=food_item,
                defaults={
                    "quantity": dto.estimated_grams,
                    "unit": "g",
                    "calories": dto.calculated_calories,
                    "protein_g": dto.calculated_protein,
                    "carbs_g": dto.calculated_carbs,
                    "fat_g": dto.calculated_fat,
                    "fiber_g": dto.calculated_fiber,
                    "ai_detected": True,
                    "user_edited": False,
                    "confidence_score": dto.confidence,
                },
            )

    def _update_meal_totals(self, meal: Meal, result: DetectionResult) -> None:
        """Refresh the denormalised totals on the Meal row."""
        meal.total_calories = result.total_calories
        meal.ai_confidence_score = result.overall_confidence
        meal.save(update_fields=["total_calories", "ai_confidence_score"])


# ---------------------------------------------------------------------------
# Custom Exceptions
# ---------------------------------------------------------------------------

class InvalidImageError(ValueError):
    """Raised when the uploaded file is not a valid / supported image."""
