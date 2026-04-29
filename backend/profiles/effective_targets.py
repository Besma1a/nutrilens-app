"""Resolve calorie / macro targets for API responses (active plan overrides profile)."""

from .models import DietPlan, UserProfile
from .utils import calculate_macro_goals, infer_goal_from_weights

SLOT_KEYS = ("breakfast", "lunch", "dinner", "snacks")


def _planned_day_calories_from_meals_data(meals_data):
    """Sum kcal for first planned day (matches MealPlan.jsx day header fallback)."""
    raw = meals_data
    if isinstance(raw, dict):
        raw = list(raw.values())
    if not isinstance(raw, list) or len(raw) == 0:
        return None
    day0 = raw[0] or {}
    meals = day0.get("meals") or {}
    total = 0
    for slot_key in SLOT_KEYS:
        meal = meals.get(slot_key) or {}
        tk = meal.get("targetKcal")
        if tk is not None and tk != "":
            try:
                total += int(float(tk))
            except (TypeError, ValueError):
                pass
            continue
        for ing in meal.get("ingredients") or []:
            try:
                total += int(float(ing.get("kcal") or 0))
            except (TypeError, ValueError):
                pass
    return total if total > 0 else None


def _scale_macros_to_match_calories(protein_g, carbs_g, fat_g, target_daily_cal):
    """
    Scale protein / carbs / fat (grams) so their energy matches target_daily_cal,
    preserving the current P:C:F calorie ratio.
    """
    if target_daily_cal is None or target_daily_cal <= 0:
        return None
    p = float(protein_g or 0)
    c = float(carbs_g or 0)
    f = float(fat_g or 0)
    implied = p * 4 + c * 4 + f * 9
    if implied <= 0:
        return None
    factor = float(target_daily_cal) / implied
    return round(p * factor, 1), round(c * factor, 1), round(f * factor, 1)


def _macro_goals_from_calories(user, daily_calories):
    """Standard macro split when plan does not define grams (or scaling is impossible)."""
    if daily_calories is None or daily_calories <= 0:
        return None
    cal_int = max(1, int(round(float(daily_calories))))
    try:
        prof = user.profile
        goal = infer_goal_from_weights(prof.current_weight_kg, prof.goal_weight_kg)
    except (UserProfile.DoesNotExist, AttributeError, TypeError):
        goal = "maintain"
    if goal not in ("lose", "maintain", "gain"):
        goal = "maintain"
    m = calculate_macro_goals(cal_int, goal=goal)
    if m.get("protein_g") is None:
        return None
    return float(m["protein_g"]), float(m["carbs_g"]), float(m["fat_g"])


def get_effective_macro_targets(user):
    """
    Dashboard, tracker, and meal summary use these values.
    Active DietPlan fields override UserProfile when set on the plan.
    """
    defaults = (2000, 120, 200, 65)
    try:
        profile = user.profile
        cal = profile.daily_calorie_goal or defaults[0]
        prot = profile.protein_goal_g or defaults[1]
        carbs = profile.carbs_goal_g or defaults[2]
        fat = profile.fat_goal_g or defaults[3]
    except (UserProfile.DoesNotExist, AttributeError):
        cal, prot, carbs, fat = defaults

    plan = DietPlan.objects.filter(user=user, is_active=True).first()
    used_derived_daily_cal = False
    if plan:
        derived_cal = _planned_day_calories_from_meals_data(plan.meals_data)
        if plan.daily_calorie_target is not None:
            cal = plan.daily_calorie_target
        elif derived_cal is not None:
            cal = derived_cal
            used_derived_daily_cal = True
        if plan.protein_target_g is not None:
            prot = plan.protein_target_g
        if plan.carbs_target_g is not None:
            carbs = plan.carbs_target_g
        if plan.fat_target_g is not None:
            fat = plan.fat_target_g

        if used_derived_daily_cal:
            scaled = _scale_macros_to_match_calories(prot, carbs, fat, cal)
            if scaled is not None:
                prot, carbs, fat = scaled
            else:
                fallback = _macro_goals_from_calories(user, cal)
                if fallback is not None:
                    prot, carbs, fat = fallback
        else:
            if (
                plan.protein_target_g is None
                or plan.carbs_target_g is None
                or plan.fat_target_g is None
            ):
                fallback = _macro_goals_from_calories(user, cal)
                if fallback is not None:
                    prot, carbs, fat = fallback

    return cal, prot, carbs, fat
