# profiles/admin.py
from django.contrib import admin
from .models import UserProfile, WeightEntry, BodyMeasurement, NutritionistFeedback


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = (
        "user", "height_cm", "current_weight_kg",
        "goal_weight_kg", "is_subscribed", "subscription_plan", "subscription_is_active",
    )
    list_filter = ("is_subscribed", "subscription_plan")
    search_fields = ("user__username", "user__email")
    readonly_fields = (
        "bmi", "subscription_is_active", "scans_used_today",
        "created_at", "updated_at",
    )

    def scans_used_today(self, obj):
        return obj.scans_used_today()
    scans_used_today.short_description = "Scans today"


@admin.register(WeightEntry)
class WeightEntryAdmin(admin.ModelAdmin):
    list_display = ("user", "date", "weight_kg", "logged_at")
    list_filter = ("date",)
    search_fields = ("user__username",)
    ordering = ("-date",)


@admin.register(BodyMeasurement)
class BodyMeasurementAdmin(admin.ModelAdmin):
    list_display = ("user", "date", "waist_cm", "hips_cm", "chest_cm", "arms_cm", "neck_cm")
    list_filter = ("date",)
    search_fields = ("user__username",)
    ordering = ("-date",)


@admin.register(NutritionistFeedback)
class NutritionistFeedbackAdmin(admin.ModelAdmin):
    list_display = ("user", "nutritionist", "title", "created_at", "is_read")
    list_filter = ("is_read", "created_at", "nutritionist")
    search_fields = ("user__username", "nutritionist__username", "title")
    ordering = ("-created_at",)
    readonly_fields = ("created_at", "updated_at")