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
import requests
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional
from django.conf import settings
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
# Detection constants
# ---------------------------------------------------------------------------

# Confidence threshold — detections below this score are discarded.
CONFIDENCE_THRESHOLD = 0.50

# Path to the YOLO model weights (project_root/model/yolo26n.pt).
_MODEL_PATH = Path(__file__).resolve().parent.parent.parent / "model" / "yolo26n.pt"

# USDA FoodData Central search endpoint.
_USDA_API_URL = "https://api.nal.usda.gov/fdc/v1/foods/search"

# Maps USDA nutrient IDs to our field names (values are per 100 g in SR Legacy).
_USDA_NUTRIENT_IDS: dict[int, str] = {
    1008: "calories_per_100g",   # Energy (kcal)
    1003: "protein_per_100g",    # Protein (g)
    1004: "fat_per_100g",        # Total lipid / fat (g)
    1005: "carbs_per_100g",      # Carbohydrate, by difference (g)
    1079: "fiber_per_100g",      # Fiber, total dietary (g)
}

# ---------------------------------------------------------------------------
# Per-class serving masses — USDA Reference Amounts Customarily Consumed
# (RACC, 21 CFR 101.12).  Keyed by normalised YOLO class name
# (lowercase, spaces replaced with underscores).
# ---------------------------------------------------------------------------
_STANDARD_PORTIONS: dict[str, float] = {
    "coffee":                237.0,   # 1 cup brewed (8 fl oz)
    "carrot":                 61.0,   # 1 medium (~7.5 cm)
    "lemon":                  84.0,   # 1 medium
    "strawberry":            147.0,   # 1 cup whole
    "celery_stick":           40.0,   # 1 medium stalk
    "raspberry":             123.0,   # 1 cup
    "blueberry":             148.0,   # 1 cup
    "green_beans":           100.0,   # 1 cup raw
    "rice":                  186.0,   # 1 cup cooked
    "french_fries":          117.0,   # medium serving (~10 strips)
    "kiwi":                   69.0,   # 1 medium
    "tomato":                123.0,   # 1 medium
    "almond":                 28.0,   # 1 oz (~23 nuts)
    "french_beans":          100.0,   # 1 cup raw
    "grape":                 126.0,   # 1 cup
    "broccoli":               91.0,   # 1 cup chopped
    "bread":                  28.0,   # 1 regular slice
    "banana":                118.0,   # 1 medium
    "cauliflower":           107.0,   # 1 cup chopped
    "cucumber":              119.0,   # 1 cup sliced
    "potato":                148.0,   # 1 medium
    "cake":                   95.0,   # 1 slice (1/12 of 9-in round)
    "milk":                  244.0,   # 1 cup (8 fl oz)
    "cabbage":                89.0,   # 1 cup shredded
    "juice":                 240.0,   # 1 cup (8 fl oz)
    "shrimp":                 85.0,   # 3 oz
    "cherry":                138.0,   # 1 cup with pits
    "fig":                    50.0,   # 1 medium
    "snow_peas":              98.0,   # 1 cup
    "orange":                131.0,   # 1 medium
    "egg":                    50.0,   # 1 large
    "asparagus":             134.0,   # 1 cup (~6 spears)
    "ice_cream":             132.0,   # 1/2 cup (2 scoops)
    "corn":                  154.0,   # 1 cup kernels
    "cilantro_mint":           4.0,   # 2 tbsp (garnish)
    "sauce":                  30.0,   # 2 tbsp
    "tofu":                  126.0,   # 3 oz firm
    "white_radish":          116.0,   # 1 cup sliced
    "biscuit":                57.0,   # 1 standard biscuit
    "chicken_duck":          140.0,   # 1 piece (~5 oz cooked)
    "apple":                 182.0,   # 1 medium
    "steak":                 170.0,   # 6 oz cooked
    "pepper":                 74.0,   # 1 medium bell pepper
    "wine":                  148.0,   # 5 fl oz glass
    "pie":                   125.0,   # 1 slice (1/8 of 9-in)
    "peach":                 150.0,   # 1 medium
    "shellfish":              85.0,   # 3 oz
    "walnut":                 28.0,   # 1 oz (~14 halves)
    "milkshake":             300.0,   # medium (~10 fl oz)
    "olives":                 33.0,   # ~10 olives (1 oz)
    "pasta":                 140.0,   # 1 cup cooked
    "dried_cranberries":      40.0,   # 1/4 cup
    "sausage":                68.0,   # 1 link
    "white_button_mushroom":  96.0,   # 1 cup whole
    "pineapple":             165.0,   # 1 cup chunks
    "chocolate":              40.0,   # standard bar portion
    "watermelon":            280.0,   # 1 wedge
    "onion":                 110.0,   # 1 medium
    "rape":                   30.0,   # 1/2 cup raw
    "garlic":                  3.0,   # 1 clove
    "avocado":               100.0,   # 1/2 medium (flesh only)
    "fish":                  140.0,   # 5 oz fillet
    "lettuce":                36.0,   # 1 cup shredded
    "fried_meat":            140.0,   # 5 oz
    "pumpkin":               116.0,   # 1 cup cubed raw
    "mango":                 165.0,   # 1 cup sliced
    "shiitake":              145.0,   # 1 cup
    "pork":                  113.0,   # 4 oz
    "noodles":               140.0,   # 1 cup cooked
    "wonton_dumplings":      135.0,   # 6 pieces
    "soy":                    86.0,   # 1/2 cup edamame
    "okra":                  100.0,   # 1 cup
    "cheese_butter":          28.0,   # 1 oz
    "cashew":                 28.0,   # 1 oz (~18 whole)
    "bean_sprouts":          104.0,   # 1 cup
    "spring_onion":           15.0,   # 2 tbsp chopped
    "lamb":                  113.0,   # 4 oz
    "pear":                  166.0,   # 1 medium
    "candy":                  40.0,   # standard serving
    "crab":                   85.0,   # 3 oz
    "hanamaki_baozi":        100.0,   # 1 piece
    "red_beans":             172.0,   # 1 cup cooked
    "apricot":                35.0,   # 1 medium
    "eggplant":               82.0,   # 1/2 cup cubed
}

# ---------------------------------------------------------------------------
# Human-readable display names for YOLO class keys
# (overrides the default title-case conversion for ambiguous labels)
# ---------------------------------------------------------------------------
_DISPLAY_NAMES: dict[str, str] = {
    "coffee":                "Coffee",
    "carrot":                "Carrot",
    "lemon":                 "Lemon",
    "strawberry":            "Strawberry",
    "celery_stick":          "Celery",
    "raspberry":             "Raspberry",
    "blueberry":             "Blueberry",
    "green_beans":           "Green Beans",
    "rice":                  "Rice",
    "french_fries":          "French Fries",
    "kiwi":                  "Kiwi",
    "tomato":                "Tomato",
    "almond":                "Almond",
    "french_beans":          "French Beans",
    "grape":                 "Grape",
    "broccoli":              "Broccoli",
    "bread":                 "Bread",
    "banana":                "Banana",
    "cauliflower":           "Cauliflower",
    "cucumber":              "Cucumber",
    "potato":                "Potato",
    "cake":                  "Cake",
    "milk":                  "Milk",
    "cabbage":               "Cabbage",
    "juice":                 "Juice",
    "shrimp":                "Shrimp",
    "cherry":                "Cherry",
    "fig":                   "Fig",
    "snow_peas":             "Snow Peas",
    "orange":                "Orange",
    "egg":                   "Egg",
    "asparagus":             "Asparagus",
    "ice_cream":             "Ice Cream",
    "corn":                  "Corn",
    "cilantro_mint":         "Cilantro",
    "sauce":                 "Sauce",
    "tofu":                  "Tofu",
    "white_radish":          "White Radish",
    "biscuit":               "Biscuit",
    "chicken_duck":          "Chicken",
    "apple":                 "Apple",
    "steak":                 "Steak",
    "pepper":                "Bell Pepper",
    "wine":                  "Wine",
    "pie":                   "Pie",
    "peach":                 "Peach",
    "shellfish":             "Shellfish",
    "walnut":                "Walnut",
    "milkshake":             "Milkshake",
    "olives":                "Olives",
    "pasta":                 "Pasta",
    "dried_cranberries":     "Dried Cranberries",
    "sausage":               "Sausage",
    "white_button_mushroom": "White Mushroom",
    "pineapple":             "Pineapple",
    "chocolate":             "Chocolate",
    "watermelon":            "Watermelon",
    "onion":                 "Onion",
    "rape":                  "Rapini",
    "garlic":                "Garlic",
    "avocado":               "Avocado",
    "fish":                  "Fish",
    "lettuce":               "Lettuce",
    "fried_meat":            "Fried Meat",
    "pumpkin":               "Pumpkin",
    "mango":                 "Mango",
    "shiitake":              "Shiitake Mushroom",
    "pork":                  "Pork",
    "noodles":               "Noodles",
    "wonton_dumplings":      "Wonton Dumplings",
    "soy":                   "Edamame",
    "okra":                  "Okra",
    "cheese_butter":         "Cheese",
    "cashew":                "Cashew",
    "bean_sprouts":          "Bean Sprouts",
    "spring_onion":          "Spring Onion",
    "lamb":                  "Lamb",
    "pear":                  "Pear",
    "candy":                 "Candy",
    "crab":                  "Crab",
    "hanamaki_baozi":        "Steamed Bun",
    "red_beans":             "Red Beans",
    "apricot":               "Apricot",
    "eggplant":              "Eggplant",
}

# ---------------------------------------------------------------------------
# Food categories per YOLO class key
# ---------------------------------------------------------------------------
_CATEGORIES: dict[str, str] = {
    "coffee":                "beverage",
    "carrot":                "vegetable",
    "lemon":                 "fruit",
    "strawberry":            "fruit",
    "celery_stick":          "vegetable",
    "raspberry":             "fruit",
    "blueberry":             "fruit",
    "green_beans":           "vegetable",
    "rice":                  "grain",
    "french_fries":          "grain",
    "kiwi":                  "fruit",
    "tomato":                "vegetable",
    "almond":                "protein",
    "french_beans":          "vegetable",
    "grape":                 "fruit",
    "broccoli":              "vegetable",
    "bread":                 "grain",
    "banana":                "fruit",
    "cauliflower":           "vegetable",
    "cucumber":              "vegetable",
    "potato":                "grain",
    "cake":                  "grain",
    "milk":                  "dairy",
    "cabbage":               "vegetable",
    "juice":                 "beverage",
    "shrimp":                "protein",
    "cherry":                "fruit",
    "fig":                   "fruit",
    "snow_peas":             "vegetable",
    "orange":                "fruit",
    "egg":                   "protein",
    "asparagus":             "vegetable",
    "ice_cream":             "dairy",
    "corn":                  "vegetable",
    "cilantro_mint":         "vegetable",
    "sauce":                 "condiment",
    "tofu":                  "protein",
    "white_radish":          "vegetable",
    "biscuit":               "grain",
    "chicken_duck":          "protein",
    "apple":                 "fruit",
    "steak":                 "protein",
    "pepper":                "vegetable",
    "wine":                  "beverage",
    "pie":                   "grain",
    "peach":                 "fruit",
    "shellfish":             "protein",
    "walnut":                "protein",
    "milkshake":             "dairy",
    "olives":                "vegetable",
    "pasta":                 "grain",
    "dried_cranberries":     "fruit",
    "sausage":               "protein",
    "white_button_mushroom": "vegetable",
    "pineapple":             "fruit",
    "chocolate":             "snack",
    "watermelon":            "fruit",
    "onion":                 "vegetable",
    "rape":                  "vegetable",
    "garlic":                "vegetable",
    "avocado":               "fruit",
    "fish":                  "protein",
    "lettuce":               "vegetable",
    "fried_meat":            "protein",
    "pumpkin":               "vegetable",
    "mango":                 "fruit",
    "shiitake":              "vegetable",
    "pork":                  "protein",
    "noodles":               "grain",
    "wonton_dumplings":      "grain",
    "soy":                   "protein",
    "okra":                  "vegetable",
    "cheese_butter":         "dairy",
    "cashew":                "protein",
    "bean_sprouts":          "vegetable",
    "spring_onion":          "vegetable",
    "lamb":                  "protein",
    "pear":                  "fruit",
    "candy":                 "snack",
    "crab":                  "protein",
    "hanamaki_baozi":        "grain",
    "red_beans":             "protein",
    "apricot":               "fruit",
    "eggplant":              "vegetable",
}

# ---------------------------------------------------------------------------
# USDA FoodData Central search-term overrides.
# Only needed for class names that don't map cleanly to USDA search terms.
# All other classes use their display name directly.
# ---------------------------------------------------------------------------
_USDA_SEARCH_TERMS: dict[str, str] = {
    "celery_stick":          "celery raw",
    "french_fries":          "french fried potatoes",
    "french_beans":          "green snap beans raw",
    "snow_peas":             "snow peas raw",
    "ice_cream":             "vanilla ice cream",
    "cilantro_mint":         "cilantro raw",
    "white_radish":          "daikon radish raw",
    "chicken_duck":          "roasted chicken meat",
    "dried_cranberries":     "dried cranberries sweetened",
    "white_button_mushroom": "white mushrooms raw",
    "rape":                  "rapini broccoli rabe raw",
    "fried_meat":            "fried beef patty",
    "wonton_dumplings":      "pork dumplings steamed",
    "soy":                   "edamame cooked",
    "cheese_butter":         "cheddar cheese",
    "bean_sprouts":          "mung bean sprouts raw",
    "spring_onion":          "scallions green onions raw",
    "hanamaki_baozi":        "steamed pork bun",
    "red_beans":             "adzuki beans cooked",
    "milkshake":             "chocolate milkshake",
    "shellfish":             "mixed shellfish cooked",
    "sauce":                 "tomato sauce canned",
    "shiitake":              "shiitake mushrooms raw",
}

# ---------------------------------------------------------------------------
# Hardcoded fallback nutrition (per 100 g) for all 84 classes.
# Used when USDA_API_KEY is absent or the USDA API is unreachable.
# Source: USDA FoodData Central SR Legacy representative values.
# ---------------------------------------------------------------------------
_FALLBACK_NUTRITION: dict[str, dict] = {
    "coffee":                {"name": "Coffee",           "calories_per_100g":   1, "protein_per_100g":  0.1, "carbs_per_100g":  0.0, "fat_per_100g":  0.0, "fiber_per_100g": 0.0, "category": "beverage"},
    "carrot":                {"name": "Carrot",           "calories_per_100g":  41, "protein_per_100g":  0.9, "carbs_per_100g": 10.0, "fat_per_100g":  0.2, "fiber_per_100g": 2.8, "category": "vegetable"},
    "lemon":                 {"name": "Lemon",            "calories_per_100g":  29, "protein_per_100g":  1.1, "carbs_per_100g":  9.3, "fat_per_100g":  0.3, "fiber_per_100g": 2.8, "category": "fruit"},
    "strawberry":            {"name": "Strawberry",       "calories_per_100g":  32, "protein_per_100g":  0.7, "carbs_per_100g":  7.7, "fat_per_100g":  0.3, "fiber_per_100g": 2.0, "category": "fruit"},
    "celery_stick":          {"name": "Celery",           "calories_per_100g":  16, "protein_per_100g":  0.7, "carbs_per_100g":  3.0, "fat_per_100g":  0.2, "fiber_per_100g": 1.6, "category": "vegetable"},
    "raspberry":             {"name": "Raspberry",        "calories_per_100g":  52, "protein_per_100g":  1.2, "carbs_per_100g": 11.9, "fat_per_100g":  0.7, "fiber_per_100g": 6.5, "category": "fruit"},
    "blueberry":             {"name": "Blueberry",        "calories_per_100g":  57, "protein_per_100g":  0.7, "carbs_per_100g": 14.5, "fat_per_100g":  0.3, "fiber_per_100g": 2.4, "category": "fruit"},
    "green_beans":           {"name": "Green Beans",      "calories_per_100g":  31, "protein_per_100g":  1.8, "carbs_per_100g":  7.1, "fat_per_100g":  0.1, "fiber_per_100g": 3.4, "category": "vegetable"},
    "rice":                  {"name": "Rice",             "calories_per_100g": 130, "protein_per_100g":  2.7, "carbs_per_100g": 28.2, "fat_per_100g":  0.3, "fiber_per_100g": 0.4, "category": "grain"},
    "french_fries":          {"name": "French Fries",     "calories_per_100g": 312, "protein_per_100g":  3.4, "carbs_per_100g": 41.0, "fat_per_100g": 15.0, "fiber_per_100g": 3.8, "category": "grain"},
    "kiwi":                  {"name": "Kiwi",             "calories_per_100g":  61, "protein_per_100g":  1.1, "carbs_per_100g": 14.7, "fat_per_100g":  0.5, "fiber_per_100g": 3.0, "category": "fruit"},
    "tomato":                {"name": "Tomato",           "calories_per_100g":  18, "protein_per_100g":  0.9, "carbs_per_100g":  3.9, "fat_per_100g":  0.2, "fiber_per_100g": 1.2, "category": "vegetable"},
    "almond":                {"name": "Almond",           "calories_per_100g": 579, "protein_per_100g": 21.0, "carbs_per_100g": 22.0, "fat_per_100g": 50.0, "fiber_per_100g": 12.5, "category": "protein"},
    "french_beans":          {"name": "French Beans",     "calories_per_100g":  31, "protein_per_100g":  1.8, "carbs_per_100g":  7.1, "fat_per_100g":  0.1, "fiber_per_100g": 3.4, "category": "vegetable"},
    "grape":                 {"name": "Grape",            "calories_per_100g":  69, "protein_per_100g":  0.7, "carbs_per_100g": 18.0, "fat_per_100g":  0.2, "fiber_per_100g": 0.9, "category": "fruit"},
    "broccoli":              {"name": "Broccoli",         "calories_per_100g":  34, "protein_per_100g":  2.8, "carbs_per_100g":  7.0, "fat_per_100g":  0.4, "fiber_per_100g": 2.6, "category": "vegetable"},
    "bread":                 {"name": "Bread",            "calories_per_100g": 265, "protein_per_100g":  9.0, "carbs_per_100g": 49.0, "fat_per_100g":  3.2, "fiber_per_100g": 2.7, "category": "grain"},
    "banana":                {"name": "Banana",           "calories_per_100g":  89, "protein_per_100g":  1.1, "carbs_per_100g": 23.0, "fat_per_100g":  0.3, "fiber_per_100g": 2.6, "category": "fruit"},
    "cauliflower":           {"name": "Cauliflower",      "calories_per_100g":  25, "protein_per_100g":  1.9, "carbs_per_100g":  5.3, "fat_per_100g":  0.3, "fiber_per_100g": 2.5, "category": "vegetable"},
    "cucumber":              {"name": "Cucumber",         "calories_per_100g":  15, "protein_per_100g":  0.7, "carbs_per_100g":  3.6, "fat_per_100g":  0.1, "fiber_per_100g": 0.5, "category": "vegetable"},
    "potato":                {"name": "Potato",           "calories_per_100g":  77, "protein_per_100g":  2.0, "carbs_per_100g": 17.0, "fat_per_100g":  0.1, "fiber_per_100g": 2.2, "category": "grain"},
    "cake":                  {"name": "Cake",             "calories_per_100g": 347, "protein_per_100g":  4.5, "carbs_per_100g": 52.0, "fat_per_100g": 14.0, "fiber_per_100g": 0.8, "category": "grain"},
    "milk":                  {"name": "Milk",             "calories_per_100g":  42, "protein_per_100g":  3.4, "carbs_per_100g":  5.0, "fat_per_100g":  1.0, "fiber_per_100g": 0.0, "category": "dairy"},
    "cabbage":               {"name": "Cabbage",          "calories_per_100g":  25, "protein_per_100g":  1.3, "carbs_per_100g":  5.8, "fat_per_100g":  0.1, "fiber_per_100g": 2.5, "category": "vegetable"},
    "juice":                 {"name": "Juice",            "calories_per_100g":  46, "protein_per_100g":  0.7, "carbs_per_100g": 11.0, "fat_per_100g":  0.2, "fiber_per_100g": 0.2, "category": "beverage"},
    "shrimp":                {"name": "Shrimp",           "calories_per_100g":  85, "protein_per_100g": 20.1, "carbs_per_100g":  0.0, "fat_per_100g":  0.9, "fiber_per_100g": 0.0, "category": "protein"},
    "cherry":                {"name": "Cherry",           "calories_per_100g":  63, "protein_per_100g":  1.1, "carbs_per_100g": 16.0, "fat_per_100g":  0.2, "fiber_per_100g": 2.1, "category": "fruit"},
    "fig":                   {"name": "Fig",              "calories_per_100g":  74, "protein_per_100g":  0.8, "carbs_per_100g": 19.2, "fat_per_100g":  0.3, "fiber_per_100g": 2.9, "category": "fruit"},
    "snow_peas":             {"name": "Snow Peas",        "calories_per_100g":  42, "protein_per_100g":  2.8, "carbs_per_100g":  7.6, "fat_per_100g":  0.2, "fiber_per_100g": 2.6, "category": "vegetable"},
    "orange":                {"name": "Orange",           "calories_per_100g":  47, "protein_per_100g":  0.9, "carbs_per_100g": 12.0, "fat_per_100g":  0.1, "fiber_per_100g": 2.4, "category": "fruit"},
    "egg":                   {"name": "Egg",              "calories_per_100g": 155, "protein_per_100g": 13.0, "carbs_per_100g":  1.1, "fat_per_100g": 11.0, "fiber_per_100g": 0.0, "category": "protein"},
    "asparagus":             {"name": "Asparagus",        "calories_per_100g":  20, "protein_per_100g":  2.2, "carbs_per_100g":  3.9, "fat_per_100g":  0.1, "fiber_per_100g": 2.1, "category": "vegetable"},
    "ice_cream":             {"name": "Ice Cream",        "calories_per_100g": 207, "protein_per_100g":  3.5, "carbs_per_100g": 24.0, "fat_per_100g": 11.0, "fiber_per_100g": 0.7, "category": "dairy"},
    "corn":                  {"name": "Corn",             "calories_per_100g":  86, "protein_per_100g":  3.3, "carbs_per_100g": 19.0, "fat_per_100g":  1.4, "fiber_per_100g": 2.7, "category": "vegetable"},
    "cilantro_mint":         {"name": "Cilantro",         "calories_per_100g":  23, "protein_per_100g":  2.1, "carbs_per_100g":  3.7, "fat_per_100g":  0.5, "fiber_per_100g": 2.8, "category": "vegetable"},
    "sauce":                 {"name": "Sauce",            "calories_per_100g":  32, "protein_per_100g":  1.6, "carbs_per_100g":  7.3, "fat_per_100g":  0.3, "fiber_per_100g": 1.6, "category": "condiment"},
    "tofu":                  {"name": "Tofu",             "calories_per_100g":  76, "protein_per_100g":  8.1, "carbs_per_100g":  1.9, "fat_per_100g":  4.8, "fiber_per_100g": 0.3, "category": "protein"},
    "white_radish":          {"name": "White Radish",     "calories_per_100g":  18, "protein_per_100g":  0.6, "carbs_per_100g":  4.1, "fat_per_100g":  0.1, "fiber_per_100g": 1.6, "category": "vegetable"},
    "biscuit":               {"name": "Biscuit",          "calories_per_100g": 371, "protein_per_100g":  7.6, "carbs_per_100g": 46.0, "fat_per_100g": 18.0, "fiber_per_100g": 1.3, "category": "grain"},
    "chicken_duck":          {"name": "Chicken",          "calories_per_100g": 165, "protein_per_100g": 31.0, "carbs_per_100g":  0.0, "fat_per_100g":  3.6, "fiber_per_100g": 0.0, "category": "protein"},
    "apple":                 {"name": "Apple",            "calories_per_100g":  52, "protein_per_100g":  0.3, "carbs_per_100g": 14.0, "fat_per_100g":  0.2, "fiber_per_100g": 2.4, "category": "fruit"},
    "steak":                 {"name": "Steak",            "calories_per_100g": 271, "protein_per_100g": 26.0, "carbs_per_100g":  0.0, "fat_per_100g": 18.0, "fiber_per_100g": 0.0, "category": "protein"},
    "pepper":                {"name": "Bell Pepper",      "calories_per_100g":  31, "protein_per_100g":  1.0, "carbs_per_100g":  7.3, "fat_per_100g":  0.3, "fiber_per_100g": 2.5, "category": "vegetable"},
    "wine":                  {"name": "Wine",             "calories_per_100g":  83, "protein_per_100g":  0.1, "carbs_per_100g":  2.7, "fat_per_100g":  0.0, "fiber_per_100g": 0.0, "category": "beverage"},
    "pie":                   {"name": "Pie",              "calories_per_100g": 260, "protein_per_100g":  3.0, "carbs_per_100g": 36.0, "fat_per_100g": 12.0, "fiber_per_100g": 1.4, "category": "grain"},
    "peach":                 {"name": "Peach",            "calories_per_100g":  39, "protein_per_100g":  0.9, "carbs_per_100g": 10.0, "fat_per_100g":  0.3, "fiber_per_100g": 1.5, "category": "fruit"},
    "shellfish":             {"name": "Shellfish",        "calories_per_100g":  79, "protein_per_100g": 13.0, "carbs_per_100g":  4.5, "fat_per_100g":  1.0, "fiber_per_100g": 0.0, "category": "protein"},
    "walnut":                {"name": "Walnut",           "calories_per_100g": 654, "protein_per_100g": 15.2, "carbs_per_100g": 14.0, "fat_per_100g": 65.0, "fiber_per_100g": 6.7, "category": "protein"},
    "milkshake":             {"name": "Milkshake",        "calories_per_100g": 112, "protein_per_100g":  3.8, "carbs_per_100g": 18.0, "fat_per_100g":  3.0, "fiber_per_100g": 0.2, "category": "dairy"},
    "olives":                {"name": "Olives",           "calories_per_100g": 115, "protein_per_100g":  0.8, "carbs_per_100g":  6.3, "fat_per_100g": 10.7, "fiber_per_100g": 3.3, "category": "vegetable"},
    "pasta":                 {"name": "Pasta",            "calories_per_100g": 158, "protein_per_100g":  5.8, "carbs_per_100g": 31.0, "fat_per_100g":  0.9, "fiber_per_100g": 1.8, "category": "grain"},
    "dried_cranberries":     {"name": "Dried Cranberries","calories_per_100g": 308, "protein_per_100g":  0.1, "carbs_per_100g": 82.0, "fat_per_100g":  1.1, "fiber_per_100g": 5.3, "category": "fruit"},
    "sausage":               {"name": "Sausage",          "calories_per_100g": 301, "protein_per_100g": 11.7, "carbs_per_100g":  2.4, "fat_per_100g": 27.0, "fiber_per_100g": 0.0, "category": "protein"},
    "white_button_mushroom": {"name": "White Mushroom",   "calories_per_100g":  22, "protein_per_100g":  3.1, "carbs_per_100g":  3.3, "fat_per_100g":  0.3, "fiber_per_100g": 1.0, "category": "vegetable"},
    "pineapple":             {"name": "Pineapple",        "calories_per_100g":  50, "protein_per_100g":  0.5, "carbs_per_100g": 13.1, "fat_per_100g":  0.1, "fiber_per_100g": 1.4, "category": "fruit"},
    "chocolate":             {"name": "Chocolate",        "calories_per_100g": 546, "protein_per_100g":  5.0, "carbs_per_100g": 60.0, "fat_per_100g": 31.0, "fiber_per_100g": 3.4, "category": "snack"},
    "watermelon":            {"name": "Watermelon",       "calories_per_100g":  30, "protein_per_100g":  0.6, "carbs_per_100g":  7.6, "fat_per_100g":  0.2, "fiber_per_100g": 0.4, "category": "fruit"},
    "onion":                 {"name": "Onion",            "calories_per_100g":  40, "protein_per_100g":  1.1, "carbs_per_100g":  9.3, "fat_per_100g":  0.1, "fiber_per_100g": 1.7, "category": "vegetable"},
    "rape":                  {"name": "Rapini",           "calories_per_100g":  22, "protein_per_100g":  2.3, "carbs_per_100g":  2.9, "fat_per_100g":  0.3, "fiber_per_100g": 2.7, "category": "vegetable"},
    "garlic":                {"name": "Garlic",           "calories_per_100g": 149, "protein_per_100g":  6.4, "carbs_per_100g": 33.1, "fat_per_100g":  0.5, "fiber_per_100g": 2.1, "category": "vegetable"},
    "avocado":               {"name": "Avocado",          "calories_per_100g": 160, "protein_per_100g":  2.0, "carbs_per_100g":  9.0, "fat_per_100g": 15.0, "fiber_per_100g": 7.0, "category": "fruit"},
    "fish":                  {"name": "Fish",             "calories_per_100g": 130, "protein_per_100g": 24.0, "carbs_per_100g":  0.0, "fat_per_100g":  3.5, "fiber_per_100g": 0.0, "category": "protein"},
    "lettuce":               {"name": "Lettuce",          "calories_per_100g":  15, "protein_per_100g":  1.4, "carbs_per_100g":  2.9, "fat_per_100g":  0.2, "fiber_per_100g": 1.3, "category": "vegetable"},
    "fried_meat":            {"name": "Fried Meat",       "calories_per_100g": 295, "protein_per_100g": 20.0, "carbs_per_100g":  0.0, "fat_per_100g": 23.0, "fiber_per_100g": 0.0, "category": "protein"},
    "pumpkin":               {"name": "Pumpkin",          "calories_per_100g":  26, "protein_per_100g":  1.0, "carbs_per_100g":  6.5, "fat_per_100g":  0.1, "fiber_per_100g": 0.5, "category": "vegetable"},
    "mango":                 {"name": "Mango",            "calories_per_100g":  60, "protein_per_100g":  0.8, "carbs_per_100g": 15.0, "fat_per_100g":  0.4, "fiber_per_100g": 1.6, "category": "fruit"},
    "shiitake":              {"name": "Shiitake Mushroom","calories_per_100g":  34, "protein_per_100g":  2.2, "carbs_per_100g":  6.8, "fat_per_100g":  0.5, "fiber_per_100g": 2.5, "category": "vegetable"},
    "pork":                  {"name": "Pork",             "calories_per_100g": 242, "protein_per_100g": 27.0, "carbs_per_100g":  0.0, "fat_per_100g": 14.0, "fiber_per_100g": 0.0, "category": "protein"},
    "noodles":               {"name": "Noodles",          "calories_per_100g": 138, "protein_per_100g":  4.5, "carbs_per_100g": 25.0, "fat_per_100g":  2.0, "fiber_per_100g": 1.5, "category": "grain"},
    "wonton_dumplings":      {"name": "Wonton Dumplings", "calories_per_100g": 239, "protein_per_100g": 10.0, "carbs_per_100g": 30.0, "fat_per_100g":  8.0, "fiber_per_100g": 1.2, "category": "grain"},
    "soy":                   {"name": "Edamame",          "calories_per_100g": 141, "protein_per_100g": 12.4, "carbs_per_100g": 11.1, "fat_per_100g":  6.4, "fiber_per_100g": 5.2, "category": "protein"},
    "okra":                  {"name": "Okra",             "calories_per_100g":  33, "protein_per_100g":  1.9, "carbs_per_100g":  7.5, "fat_per_100g":  0.2, "fiber_per_100g": 3.2, "category": "vegetable"},
    "cheese_butter":         {"name": "Cheese",           "calories_per_100g": 402, "protein_per_100g": 25.0, "carbs_per_100g":  1.3, "fat_per_100g": 33.0, "fiber_per_100g": 0.0, "category": "dairy"},
    "cashew":                {"name": "Cashew",           "calories_per_100g": 553, "protein_per_100g": 18.2, "carbs_per_100g": 30.2, "fat_per_100g": 43.9, "fiber_per_100g": 3.3, "category": "protein"},
    "bean_sprouts":          {"name": "Bean Sprouts",     "calories_per_100g":  30, "protein_per_100g":  3.1, "carbs_per_100g":  5.9, "fat_per_100g":  0.2, "fiber_per_100g": 1.8, "category": "vegetable"},
    "spring_onion":          {"name": "Spring Onion",     "calories_per_100g":  32, "protein_per_100g":  1.8, "carbs_per_100g":  7.3, "fat_per_100g":  0.2, "fiber_per_100g": 2.6, "category": "vegetable"},
    "lamb":                  {"name": "Lamb",             "calories_per_100g": 258, "protein_per_100g": 25.6, "carbs_per_100g":  0.0, "fat_per_100g": 17.0, "fiber_per_100g": 0.0, "category": "protein"},
    "pear":                  {"name": "Pear",             "calories_per_100g":  57, "protein_per_100g":  0.4, "carbs_per_100g": 15.2, "fat_per_100g":  0.1, "fiber_per_100g": 3.1, "category": "fruit"},
    "candy":                 {"name": "Candy",            "calories_per_100g": 394, "protein_per_100g":  0.0, "carbs_per_100g": 98.0, "fat_per_100g":  0.0, "fiber_per_100g": 0.0, "category": "snack"},
    "crab":                  {"name": "Crab",             "calories_per_100g":  87, "protein_per_100g": 18.1, "carbs_per_100g":  0.0, "fat_per_100g":  1.1, "fiber_per_100g": 0.0, "category": "protein"},
    "hanamaki_baozi":        {"name": "Steamed Bun",      "calories_per_100g": 223, "protein_per_100g":  7.0, "carbs_per_100g": 40.0, "fat_per_100g":  4.0, "fiber_per_100g": 1.5, "category": "grain"},
    "red_beans":             {"name": "Red Beans",        "calories_per_100g": 129, "protein_per_100g":  8.9, "carbs_per_100g": 23.5, "fat_per_100g":  0.5, "fiber_per_100g": 7.4, "category": "protein"},
    "apricot":               {"name": "Apricot",          "calories_per_100g":  48, "protein_per_100g":  1.4, "carbs_per_100g": 11.1, "fat_per_100g":  0.4, "fiber_per_100g": 2.0, "category": "fruit"},
    "eggplant":              {"name": "Eggplant",         "calories_per_100g":  25, "protein_per_100g":  1.0, "carbs_per_100g":  5.9, "fat_per_100g":  0.2, "fiber_per_100g": 3.0, "category": "vegetable"},
}

# Used when a YOLO class is entirely unknown (not in any of the above tables).
_DEFAULT_NUTRITION: dict = {
    "name": None,
    "calories_per_100g": 150,
    "protein_per_100g":  5.0,
    "carbs_per_100g":   20.0,
    "fat_per_100g":      5.0,
    "fiber_per_100g":    1.0,
    "category": "other",
}


# ---------------------------------------------------------------------------
# USDA FoodData Central API helpers
# ---------------------------------------------------------------------------

def _fetch_usda_nutrition(search_term: str, api_key: str) -> Optional[dict]:
    """
    Query the USDA FoodData Central /foods/search endpoint.

    Returns a dict with per-100g macro keys, or None if the call fails
    (network error, bad status, no results, missing Energy nutrient).
    """
    try:
        resp = requests.get(
            _USDA_API_URL,
            params={
                "query":    search_term,
                "dataType": "SR Legacy,Survey (FNDDS)",
                "pageSize": 1,
                "api_key":  api_key,
            },
            timeout=5,
        )
        resp.raise_for_status()
        foods = resp.json().get("foods", [])
        if not foods:
            logger.debug("USDA: no results for '%s'", search_term)
            return None

        nutrients_raw = foods[0].get("foodNutrients", [])
        result: dict = {}
        for nutrient in nutrients_raw:
            nid = nutrient.get("nutrientId")
            if nid in _USDA_NUTRIENT_IDS:
                result[_USDA_NUTRIENT_IDS[nid]] = float(nutrient.get("value", 0.0))

        if "calories_per_100g" not in result:
            logger.debug("USDA: no Energy nutrient in response for '%s'", search_term)
            return None

        # Fill any missing macros with 0 so the DTO never receives None
        for field_name in _USDA_NUTRIENT_IDS.values():
            result.setdefault(field_name, 0.0)

        return result

    except Exception:
        logger.debug("USDA API call failed for '%s'", search_term, exc_info=True)
        return None


def _get_nutrition_for_class(class_key: str) -> dict:
    """
    3-tier nutrition lookup for a YOLO class key:

      Tier 1 — Django DB cache (FoodItem with meal=None):
        avoids a USDA API call on every request once data is seeded.

      Tier 2 — USDA FoodData Central API (requires USDA_API_KEY in settings):
        fetches authoritative per-100g values and writes them to the DB cache.

      Tier 3 — _FALLBACK_NUTRITION hardcoded table:
        used when the API key is absent or the API is unreachable.

    All tiers are wrapped in try/except so a DB outage or network error
    degrades gracefully to the next tier.
    """
    display_name = _DISPLAY_NAMES.get(class_key, class_key.replace("_", " ").title())
    category     = _CATEGORIES.get(class_key, "other")

    # ------------------------------------------------------------------
    # Tier 1: DB cache
    # ------------------------------------------------------------------
    try:
        cached = FoodItem.objects.filter(meal_id=None, name=display_name).first()
        if cached and cached.calories_per_100g > 0:
            return {
                "name":             cached.name,
                "calories_per_100g": cached.calories_per_100g,
                "protein_per_100g":  cached.protein_per_100g,
                "carbs_per_100g":    cached.carbs_per_100g,
                "fat_per_100g":      cached.fat_per_100g,
                "fiber_per_100g":    cached.fiber_per_100g,
                "category":          cached.category,
            }
    except Exception:
        pass  # DB unavailable — fall through

    # ------------------------------------------------------------------
    # Tier 2: USDA FoodData Central API
    # ------------------------------------------------------------------
    api_key = getattr(settings, "USDA_API_KEY", "")
    if api_key:
        search_term = _USDA_SEARCH_TERMS.get(class_key, display_name)
        usda_data   = _fetch_usda_nutrition(search_term, api_key)

        if usda_data:
            nutrition = {"name": display_name, "category": category, **usda_data}

            # Write to DB cache so subsequent requests skip the API call
            try:
                FoodItem.objects.get_or_create(
                    meal_id=None,
                    name=display_name,
                    defaults={
                        "calories_per_100g": usda_data["calories_per_100g"],
                        "protein_per_100g":  usda_data["protein_per_100g"],
                        "carbs_per_100g":    usda_data["carbs_per_100g"],
                        "fat_per_100g":      usda_data["fat_per_100g"],
                        "fiber_per_100g":    usda_data["fiber_per_100g"],
                        "category":          category,
                    },
                )
            except Exception:
                pass  # DB unavailable — skip caching, still return live data

            return nutrition

    # ------------------------------------------------------------------
    # Tier 3: Hardcoded fallback
    # ------------------------------------------------------------------
    fallback = _FALLBACK_NUTRITION.get(class_key)
    if fallback:
        return dict(fallback)

    # Absolute last resort for a class not in any table
    return {**_DEFAULT_NUTRITION, "name": display_name, "category": category}


# ---------------------------------------------------------------------------
# AI Detection Service
# ---------------------------------------------------------------------------

class FoodDetectionService:
    """
    Wraps the YOLO food detection model.

    Portion mass: USDA RACC standard serving mass from _STANDARD_PORTIONS.
    Nutrition:    3-tier lookup (DB cache → USDA API → hardcoded fallback).

    The model is loaded once and cached at the class level.
    """

    CONFIDENCE_THRESHOLD: float = CONFIDENCE_THRESHOLD
    _model = None  # class-level model cache

    def detect(self, image_file: InMemoryUploadedFile) -> DetectionResult:
        """
        Main public API.  Takes an uploaded image and returns a DetectionResult.
        """
        start_time = time.monotonic()

        try:
            self._validate_image(image_file)
            raw_output    = self._run_inference(image_file)
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
        """
        Run YOLOv8 inference.

        For each detected class:
          - Portion mass  = _STANDARD_PORTIONS[key]  (USDA RACC, fixed per class)
          - Nutrition     = _get_nutrition_for_class(key)  (DB → USDA API → fallback)
        """
        from PIL import Image

        model = self._get_model()

        image_file.seek(0)
        pil_image = Image.open(image_file).convert("RGB")

        results = model(pil_image, verbose=False)

        raw_output: list[dict] = []
        seen_classes: set[str] = set()

        if not results:
            return raw_output

        for box in results[0].boxes:
            cls_id     = int(box.cls[0])
            class_name = results[0].names[cls_id]
            confidence = round(float(box.conf[0]), 2)
            key        = class_name.lower().replace(" ", "_")

            # Keep only the highest-confidence detection per class.
            if key in seen_classes:
                continue
            seen_classes.add(key)

            nutrition      = _get_nutrition_for_class(key)
            estimated_grams = _STANDARD_PORTIONS.get(key, 150)

            raw_output.append({
                **nutrition,
                "confidence":      confidence,
                "estimated_grams": estimated_grams,
            })

        return raw_output

    def _parse_raw_output(self, raw_output: list[dict]) -> list[DetectedFoodDTO]:
        """Convert raw output dicts into typed DTOs."""
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
      2. Create FoodItem records linked to the meal (meal FK).
      3. Update Meal totals (calories, protein, carbs, fat).
    """

    def __init__(self) -> None:
        self._detector = FoodDetectionService()

    def process_meal_image(self, meal: Meal) -> DetectionResult:
        """
        Run detection on a Meal's image and persist the results.
        """
        user = meal.user
        subscription = getattr(user, "subscription", None)
        is_free = (
            subscription is None
            or not subscription.is_active
            or subscription.plan != "Pro"
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
        with meal.image.open("rb") as image_file:
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
        The serializer reads meal.food_items (FoodItem.meal FK).
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
        meal.total_calories  = result.total_calories
        meal.total_protein_g = result.total_protein
        meal.total_carbs_g   = result.total_carbs
        meal.total_fat_g     = result.total_fat
        meal.ai_confidence_score = result.overall_confidence
        meal.save(update_fields=[
            "total_calories", "total_protein_g", "total_carbs_g",
            "total_fat_g", "ai_confidence_score",
        ])
        print(f"[NutriLens] Meal {meal.pk} totals — cal={meal.total_calories} protein={meal.total_protein_g} carbs={meal.total_carbs_g} fat={meal.total_fat_g}")


# ---------------------------------------------------------------------------
# Custom Exceptions
# ---------------------------------------------------------------------------

class InvalidImageError(ValueError):
    """Raised when the uploaded file is not a valid / supported image."""
