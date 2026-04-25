# meals/models.py
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Meal(models.Model):
    """AI-detected meal with nutritional data."""
    
    MEAL_TYPES = [
        ('Breakfast', 'Breakfast'),
        ('Lunch', 'Lunch'),
        ('Snack', 'Snack'),
        ('Dinner', 'Dinner'),
    ]
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="meals",
    )
    meal_type = models.CharField(
        max_length=20,
        choices=MEAL_TYPES,
        default='Breakfast',
        help_text="Type of meal (Breakfast, Lunch, Snack, Dinner)"
    )
    image = models.ImageField(upload_to='meals/', null=True, blank=True)
    total_calories = models.FloatField(default=0)
    total_protein_g = models.FloatField(default=0)
    total_carbs_g = models.FloatField(default=0)
    total_fat_g = models.FloatField(default=0)
    logged_at = models.DateTimeField(auto_now_add=True)
    consumed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-logged_at']


class FoodItem(models.Model):
    """Individual food item detected in a meal."""
    
    meal = models.ForeignKey(
        Meal,
        on_delete=models.CASCADE,
        related_name="food_items",
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=255)
    quantity_g = models.FloatField(default=0)
    calories = models.FloatField(default=0)
    protein_g = models.FloatField(default=0)
    carbs_g = models.FloatField(default=0)
    fat_g = models.FloatField(default=0)
    confidence = models.FloatField(default=0.95)
    
    class Meta:
        ordering = ['name']


class MealFoodItem(models.Model):
    """Relationship between meals and food items (alias for FoodItem)."""
    
    meal = models.ForeignKey(
        Meal,
        on_delete=models.CASCADE,
        related_name="meal_food_items",
        null=True,
        blank=True,
    )
    food_item = models.ForeignKey(
        FoodItem,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    quantity = models.FloatField(default=0)
    
    class Meta:
        unique_together = ['meal', 'food_item']
