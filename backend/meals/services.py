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
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional
from django.core.files.uploadedfile import InMemoryUploadedFile
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied

from .models import FoodItem, Meal

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

    @property
    def total_protein(self) -> float:
        return round(sum(item.calculated_protein for item in self.detected_items), 2)

    @property
    def total_carbs(self) -> float:
        return round(sum(item.calculated_carbs for item in self.detected_items), 2)

    @property
    def total_fat(self) -> float:
        return round(sum(item.calculated_fat for item in self.detected_items), 2)


# ---------------------------------------------------------------------------
# AI Detection Service
# ---------------------------------------------------------------------------

# Confidence threshold — detections below this score are discarded.
CONFIDENCE_THRESHOLD = 0.50

# Path to the YOLO model weights (project_root/model/yolo26n.pt).
_MODEL_PATH = Path(__file__).resolve().parent.parent.parent / "model" / "yolo26n.pt"

# Nutritional data keyed by lowercase class name as reported by the YOLO model.
# Values are per 100 g.  Add / extend entries to match your model's class list.
_NUTRITION_LOOKUP: dict[str, dict] = {
    "apple":              {"name": "Apple",              "calories_per_100g": 52,  "protein_per_100g": 0.3,  "carbs_per_100g": 14.0, "fat_per_100g": 0.2,  "fiber_per_100g": 2.4,  "category": "fruit",     "estimated_grams": 182},
    "banana":             {"name": "Banana",             "calories_per_100g": 89,  "protein_per_100g": 1.1,  "carbs_per_100g": 23.0, "fat_per_100g": 0.3,  "fiber_per_100g": 2.6,  "category": "fruit",     "estimated_grams": 118},
    "orange":             {"name": "Orange",             "calories_per_100g": 47,  "protein_per_100g": 0.9,  "carbs_per_100g": 12.0, "fat_per_100g": 0.1,  "fiber_per_100g": 2.4,  "category": "fruit",     "estimated_grams": 131},
    "grapes":             {"name": "Grapes",             "calories_per_100g": 69,  "protein_per_100g": 0.7,  "carbs_per_100g": 18.0, "fat_per_100g": 0.2,  "fiber_per_100g": 0.9,  "category": "fruit",     "estimated_grams": 150},
    "watermelon":         {"name": "Watermelon",         "calories_per_100g": 30,  "protein_per_100g": 0.6,  "carbs_per_100g": 8.0,  "fat_per_100g": 0.2,  "fiber_per_100g": 0.4,  "category": "fruit",     "estimated_grams": 300},
    "strawberry":         {"name": "Strawberry",         "calories_per_100g": 32,  "protein_per_100g": 0.7,  "carbs_per_100g": 7.7,  "fat_per_100g": 0.3,  "fiber_per_100g": 2.0,  "category": "fruit",     "estimated_grams": 100},
    "broccoli":           {"name": "Broccoli",           "calories_per_100g": 34,  "protein_per_100g": 2.8,  "carbs_per_100g": 7.0,  "fat_per_100g": 0.4,  "fiber_per_100g": 2.6,  "category": "vegetable", "estimated_grams": 100},
    "carrot":             {"name": "Carrot",             "calories_per_100g": 41,  "protein_per_100g": 0.9,  "carbs_per_100g": 10.0, "fat_per_100g": 0.2,  "fiber_per_100g": 2.8,  "category": "vegetable", "estimated_grams": 80},
    "tomato":             {"name": "Tomato",             "calories_per_100g": 18,  "protein_per_100g": 0.9,  "carbs_per_100g": 3.9,  "fat_per_100g": 0.2,  "fiber_per_100g": 1.2,  "category": "vegetable", "estimated_grams": 123},
    "cucumber":           {"name": "Cucumber",           "calories_per_100g": 15,  "protein_per_100g": 0.7,  "carbs_per_100g": 3.6,  "fat_per_100g": 0.1,  "fiber_per_100g": 0.5,  "category": "vegetable", "estimated_grams": 100},
    "mixed_salad":        {"name": "Mixed Salad",        "calories_per_100g": 15,  "protein_per_100g": 1.3,  "carbs_per_100g": 2.9,  "fat_per_100g": 0.2,  "fiber_per_100g": 1.5,  "category": "vegetable", "estimated_grams": 120},
    "salad":              {"name": "Mixed Salad",        "calories_per_100g": 15,  "protein_per_100g": 1.3,  "carbs_per_100g": 2.9,  "fat_per_100g": 0.2,  "fiber_per_100g": 1.5,  "category": "vegetable", "estimated_grams": 120},
    "chicken":            {"name": "Grilled Chicken",    "calories_per_100g": 165, "protein_per_100g": 31.0, "carbs_per_100g": 0.0,  "fat_per_100g": 3.6,  "fiber_per_100g": 0.0,  "category": "protein",   "estimated_grams": 150},
    "chicken_breast":     {"name": "Grilled Chicken",    "calories_per_100g": 165, "protein_per_100g": 31.0, "carbs_per_100g": 0.0,  "fat_per_100g": 3.6,  "fiber_per_100g": 0.0,  "category": "protein",   "estimated_grams": 150},
    "salmon":             {"name": "Salmon Fillet",      "calories_per_100g": 208, "protein_per_100g": 20.0, "carbs_per_100g": 0.0,  "fat_per_100g": 13.0, "fiber_per_100g": 0.0,  "category": "protein",   "estimated_grams": 170},
    "fish":               {"name": "Fish Fillet",        "calories_per_100g": 130, "protein_per_100g": 24.0, "carbs_per_100g": 0.0,  "fat_per_100g": 3.5,  "fiber_per_100g": 0.0,  "category": "protein",   "estimated_grams": 150},
    "egg":                {"name": "Whole Egg",          "calories_per_100g": 155, "protein_per_100g": 13.0, "carbs_per_100g": 1.1,  "fat_per_100g": 11.0, "fiber_per_100g": 0.0,  "category": "protein",   "estimated_grams": 60},
    "eggs":               {"name": "Whole Egg",          "calories_per_100g": 155, "protein_per_100g": 13.0, "carbs_per_100g": 1.1,  "fat_per_100g": 11.0, "fiber_per_100g": 0.0,  "category": "protein",   "estimated_grams": 60},
    "rice":               {"name": "White Rice",         "calories_per_100g": 130, "protein_per_100g": 2.7,  "carbs_per_100g": 28.2, "fat_per_100g": 0.3,  "fiber_per_100g": 0.4,  "category": "grain",     "estimated_grams": 200},
    "white_rice":         {"name": "White Rice",         "calories_per_100g": 130, "protein_per_100g": 2.7,  "carbs_per_100g": 28.2, "fat_per_100g": 0.3,  "fiber_per_100g": 0.4,  "category": "grain",     "estimated_grams": 200},
    "pasta":              {"name": "Pasta",              "calories_per_100g": 158, "protein_per_100g": 5.8,  "carbs_per_100g": 31.0, "fat_per_100g": 0.9,  "fiber_per_100g": 1.8,  "category": "grain",     "estimated_grams": 180},
    "bread":              {"name": "Bread",              "calories_per_100g": 265, "protein_per_100g": 9.0,  "carbs_per_100g": 49.0, "fat_per_100g": 3.2,  "fiber_per_100g": 2.7,  "category": "grain",     "estimated_grams": 60},
    "pizza":              {"name": "Pizza Slice",        "calories_per_100g": 266, "protein_per_100g": 11.0, "carbs_per_100g": 33.0, "fat_per_100g": 10.0, "fiber_per_100g": 2.3,  "category": "grain",     "estimated_grams": 120},
    "sandwich":           {"name": "Sandwich",           "calories_per_100g": 220, "protein_per_100g": 10.0, "carbs_per_100g": 27.0, "fat_per_100g": 8.0,  "fiber_per_100g": 2.0,  "category": "grain",     "estimated_grams": 150},
    "burger":             {"name": "Burger",             "calories_per_100g": 295, "protein_per_100g": 17.0, "carbs_per_100g": 24.0, "fat_per_100g": 14.0, "fiber_per_100g": 1.5,  "category": "grain",     "estimated_grams": 200},
    "yogurt":             {"name": "Greek Yogurt",       "calories_per_100g": 59,  "protein_per_100g": 10.0, "carbs_per_100g": 3.6,  "fat_per_100g": 0.4,  "fiber_per_100g": 0.0,  "category": "dairy",     "estimated_grams": 150},
    "greek_yogurt":       {"name": "Greek Yogurt",       "calories_per_100g": 59,  "protein_per_100g": 10.0, "carbs_per_100g": 3.6,  "fat_per_100g": 0.4,  "fiber_per_100g": 0.0,  "category": "dairy",     "estimated_grams": 150},
    "milk":               {"name": "Milk",               "calories_per_100g": 42,  "protein_per_100g": 3.4,  "carbs_per_100g": 5.0,  "fat_per_100g": 1.0,  "fiber_per_100g": 0.0,  "category": "dairy",     "estimated_grams": 240},
    "cheese":             {"name": "Cheese",             "calories_per_100g": 402, "protein_per_100g": 25.0, "carbs_per_100g": 1.3,  "fat_per_100g": 33.0, "fiber_per_100g": 0.0,  "category": "dairy",     "estimated_grams": 30},
}

# Fallback nutrition used when the detected class is not in the lookup table.
_DEFAULT_NUTRITION: dict = {
    "name": None,  # will be replaced by the class name
    "calories_per_100g": 150,
    "protein_per_100g": 5.0,
    "carbs_per_100g": 20.0,
    "fat_per_100g": 5.0,
    "fiber_per_100g": 1.0,
    "category": "other",
    "estimated_grams": 150,
}

# Mock food database kept for reference / unit tests.
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
    Wraps the YOLO food detection model (yolo26n.pt).

    The model is loaded once and cached at the class level.  Swap the weights
    or the inference backend by overriding _run_inference() only — the public
    detect() interface and MealProcessingService are untouched.
    """

    CONFIDENCE_THRESHOLD: float = CONFIDENCE_THRESHOLD
    _model = None  # class-level model cache

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
            import traceback
            print(f"[NutriLens] DETECTION ERROR: {exc}")
            traceback.print_exc()
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

    @classmethod
    def _get_model(cls):
        """Load and cache the YOLO model (runs once per process)."""
        if cls._model is None:
            try:
                from ultralytics import YOLO
            except ImportError as exc:
                raise RuntimeError(
                    "ultralytics is not installed. Run: pip install ultralytics"
                ) from exc
            if not _MODEL_PATH.exists():
                raise RuntimeError(
                    f"YOLO model not found at {_MODEL_PATH}. "
                    "Ensure model/yolo26n.pt is present in the project root."
                )
            print(f"[NutriLens] Loading YOLO model from {_MODEL_PATH} …")
            cls._model = YOLO(str(_MODEL_PATH))
            print(f"[NutriLens] YOLO loaded. Classes: {list(cls._model.names.values())}")
        return cls._model

    def _run_inference(self, image_file: InMemoryUploadedFile) -> list[dict]:
        """Run YOLOv8 inference and return a list of nutrition dicts."""
        from PIL import Image

        model = self._get_model()

        image_file.seek(0)
        pil_image = Image.open(image_file).convert("RGB")
        img_area = pil_image.width * pil_image.height

        results = model(pil_image, verbose=False)

        raw_output: list[dict] = []
        seen_classes: set[str] = set()

        if not results:
            return raw_output

        for box in results[0].boxes:
            cls_id = int(box.cls[0])
            class_name: str = results[0].names[cls_id]
            confidence: float = round(float(box.conf[0]), 2)
            key = class_name.lower().replace(" ", "_")

            # Skip duplicates — keep the highest-confidence detection per class.
            if key in seen_classes:
                continue
            seen_classes.add(key)

            nutrition = dict(_NUTRITION_LOOKUP.get(key, _DEFAULT_NUTRITION))
            if nutrition["name"] is None:
                nutrition["name"] = class_name.replace("_", " ").title()

            # Scale default portion by bounding-box area relative to image area.
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            box_area = (x2 - x1) * (y2 - y1)
            area_ratio = (box_area / img_area) if img_area > 0 else 0.3
            scale = max(0.5, min(area_ratio * 4, 2.0))
            estimated_grams = round(nutrition["estimated_grams"] * scale)

            raw_output.append({
                **nutrition,
                "confidence": confidence,
                "estimated_grams": estimated_grams,
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

        print(f"[NutriLens] Opening image for meal {meal.pk}: {meal.image.name}")
        with meal.image.open('rb') as image_file:
            result = self._detector.detect(image_file)

        print(f"[NutriLens] Detection result — success={result.success} items={len(result.detected_items)} error={result.error!r}")

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
        Create FoodItem rows linked directly to the meal via the FK.
        The serializer reads meal.food_items (FoodItem.meal FK), so items
        must be created with meal=meal — not via the MealFoodItem junction.
        """
        for dto in result.detected_items:
            food_item = FoodItem.objects.create(
                meal=meal,
                name=dto.name,
                quantity_g=dto.estimated_grams,
                calories=dto.calculated_calories,
                protein_g=dto.calculated_protein,
                carbs_g=dto.calculated_carbs,
                fat_g=dto.calculated_fat,
                confidence=dto.confidence,
                calories_per_100g=dto.calories_per_100g,
                protein_per_100g=dto.protein_per_100g,
                carbs_per_100g=dto.carbs_per_100g,
                fat_per_100g=dto.fat_per_100g,
                fiber_per_100g=dto.fiber_per_100g,
                category=dto.category,
            )
            print(f"[NutriLens] Created FoodItem pk={food_item.pk} name='{dto.name}' meal={meal.pk}")

    def _update_meal_totals(self, meal: Meal, result: DetectionResult) -> None:
        """Refresh the denormalised totals on the Meal row."""
        meal.total_calories = result.total_calories
        meal.total_protein_g = result.total_protein
        meal.total_carbs_g = result.total_carbs
        meal.total_fat_g = result.total_fat
        meal.ai_confidence_score = result.overall_confidence
        meal.save(update_fields=["total_calories", "total_protein_g", "total_carbs_g", "total_fat_g", "ai_confidence_score"])
        print(f"[NutriLens] Meal {meal.pk} totals — cal={meal.total_calories} protein={meal.total_protein_g} carbs={meal.total_carbs_g} fat={meal.total_fat_g}")


# ---------------------------------------------------------------------------
# Custom Exceptions
# ---------------------------------------------------------------------------

class InvalidImageError(ValueError):
    """Raised when the uploaded file is not a valid / supported image."""
