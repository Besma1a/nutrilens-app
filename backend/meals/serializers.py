# meals/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Meal, FoodItem

User = get_user_model()


class FoodItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodItem
        fields = ['id', 'name', 'quantity_g', 'calories', 'protein_g', 'carbs_g', 'fat_g', 'confidence']


class MealSerializer(serializers.ModelSerializer):
    food_items = FoodItemSerializer(many=True, read_only=True)

    class Meta:
        model = Meal
        fields = [
            'id', 'meal_type', 'image',
            'total_calories', 'total_protein_g', 'total_carbs_g', 'total_fat_g',
            'logged_at', 'consumed_at', 'notes', 'food_items',
        ]
        read_only_fields = ['user']


class MealCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating meals with food items (supports both image upload and manual entry)"""
    food_items = FoodItemSerializer(many=True, required=False)

    class Meta:
        model = Meal
        fields = [
            'meal_type', 'image',
            'total_calories', 'total_protein_g', 'total_carbs_g', 'total_fat_g',
            'consumed_at', 'notes', 'food_items',
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['image'].required = False
        self.fields['meal_type'].required = False

    def create(self, validated_data):
        food_items_data = validated_data.pop('food_items', [])
        meal = Meal.objects.create(**validated_data)
        for food_item_data in food_items_data:
            FoodItem.objects.create(meal=meal, **food_item_data)
        return meal


class DailySummarySerializer(serializers.Serializer):
    """Serializer for daily nutritional summary"""
    date                = serializers.DateField()
    total_calories      = serializers.FloatField()
    total_protein_g     = serializers.FloatField()
    total_carbs_g       = serializers.FloatField()
    total_fat_g         = serializers.FloatField()
    goal_calories       = serializers.IntegerField()
    goal_protein_g      = serializers.FloatField()
    goal_carbs_g        = serializers.FloatField()
    goal_fat_g          = serializers.FloatField()
    calories_remaining  = serializers.FloatField()
    protein_remaining   = serializers.FloatField()
    carbs_remaining     = serializers.FloatField()
    fat_remaining       = serializers.FloatField()
    calories_percentage = serializers.FloatField()
    protein_percentage  = serializers.FloatField()
    carbs_percentage    = serializers.FloatField()
    fat_percentage      = serializers.FloatField()
    meal_count          = serializers.IntegerField()


class DailyCalorieHistorySerializer(serializers.Serializer):
    """
    Serializer for daily calorie aggregation over a date range.
    Only includes fields that the history view actually builds.
    Used by Progress.jsx calorie chart.
    """
    date      = serializers.DateField()
    label     = serializers.CharField()
    calories  = serializers.FloatField()
    protein_g = serializers.FloatField()
    carbs_g   = serializers.FloatField()
    fat_g     = serializers.FloatField()