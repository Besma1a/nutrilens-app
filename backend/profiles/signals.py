# profiles/signals.py
"""
Signals for the profiles app:

1. Auto-create a UserProfile whenever a new User is saved for the first time.
2. After a WeightEntry is saved, mirror the most recent weight to
   UserProfile.current_weight_kg (and set start_weight_kg on first entry).
3. After a WeightEntry is deleted, recalculate current_weight_kg from the
   remaining entries.
"""

import logging
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)

User = get_user_model()


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created: bool, **kwargs) -> None:
    """Create a blank UserProfile the first time a User row is saved."""
    if created:
        from .models import UserProfile
        UserProfile.objects.get_or_create(user=instance)
        logger.debug("UserProfile created for user=%s", instance.pk)


@receiver(post_save, sender="profiles.WeightEntry")
def sync_current_weight_on_save(sender, instance, created: bool, **kwargs) -> None:
    """
    After any weigh-in is saved:
    - Update current_weight_kg with the most recent entry.
    - If this is the user's very first entry, also set start_weight_kg.
    - If goal_setting_mode == 'auto', automatically calculate and save new goals.
    """
    from .models import WeightEntry, UserProfile
    from .utils import calculate_daily_calorie_goal, calculate_macro_goals, infer_goal_from_weights

    try:
        profile, _ = UserProfile.objects.get_or_create(user=instance.user)

        latest = (
            WeightEntry.objects.filter(user=instance.user)
            .order_by("-date", "-logged_at")
            .first()
        )
        if latest:
            profile.current_weight_kg = latest.weight_kg

        # Set start_weight_kg only once (when it has never been set)
        if profile.start_weight_kg is None:
            earliest = (
                WeightEntry.objects.filter(user=instance.user)
                .order_by("date", "logged_at")
                .first()
            )
            if earliest:
                profile.start_weight_kg = earliest.weight_kg

        # Auto-calculate goals if in AUTO mode and we have required data
        if profile.goal_setting_mode == 'auto':
            # Get user profile data needed for calculations
            user = instance.user
            age = None
            gender = None
            activity_level = 'moderately_active'  # Default fallback
            
            # Try to get age and gender from user model
            if hasattr(user, 'date_of_birth') and user.date_of_birth:
                from datetime import date
                today = date.today()
                age = today.year - user.date_of_birth.year - ((today.month, today.day) < (user.date_of_birth.month, user.date_of_birth.day))
            
            if hasattr(user, 'gender') and user.gender:
                gender = user.gender
            
            # Try to get activity level from user model if available
            if hasattr(user, 'activity_level') and user.activity_level:
                activity_level = user.activity_level.lower().replace(' ', '_')
            
            # Calculate goals if we have essential data
            if profile.current_weight_kg and profile.height_cm and age and gender:
                goal = infer_goal_from_weights(profile.current_weight_kg, profile.goal_weight_kg)
                
                # Calculate daily calorie goal
                daily_calories = calculate_daily_calorie_goal(
                    weight_kg=profile.current_weight_kg,
                    height_cm=profile.height_cm,
                    age=age,
                    gender=gender,
                    activity_level=activity_level,
                    goal=goal
                )
                
                if daily_calories:
                    # Calculate macro goals
                    macros = calculate_macro_goals(daily_calories, goal, activity_level)
                    
                    # Update profile with calculated goals
                    profile.daily_calorie_goal = daily_calories
                    profile.protein_goal_g = macros['protein_g']
                    profile.carbs_goal_g = macros['carbs_g']
                    profile.fat_goal_g = macros['fat_g']
                    
                    logger.debug(
                        "Auto-calculated goals for user=%s: %d kcal, P:%.1fg C:%.1fg F:%.1fg",
                        user.pk,
                        daily_calories,
                        macros['protein_g'],
                        macros['carbs_g'],
                        macros['fat_g'],
                    )

        # Determine which fields need updating
        update_fields = ["current_weight_kg", "start_weight_kg"]
        if profile.goal_setting_mode == 'auto':
            update_fields.extend(["daily_calorie_goal", "protein_goal_g", "carbs_goal_g", "fat_goal_g"])
        
        profile.save(update_fields=update_fields)
        logger.debug(
            "UserProfile current_weight updated for user=%s → %.1f kg",
            instance.user.pk,
            profile.current_weight_kg or 0,
        )
    except Exception as e:
        logger.error(
            "Error in sync_current_weight_on_save for user=%s: %s",
            instance.user.pk,
            str(e),
            exc_info=True
        )


@receiver(post_delete, sender="profiles.WeightEntry")
def sync_current_weight_on_delete(sender, instance, **kwargs) -> None:
    """
    After a weigh-in is deleted, recalculate current_weight_kg
    from whatever entries remain.
    """
    from .models import WeightEntry, UserProfile

    profile, _ = UserProfile.objects.get_or_create(user=instance.user)

    latest = (
        WeightEntry.objects.filter(user=instance.user)
        .order_by("-date", "-logged_at")
        .first()
    )
    profile.current_weight_kg = latest.weight_kg if latest else None
    profile.save(update_fields=["current_weight_kg"])