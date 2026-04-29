"""P3: materialize PlanAssignment rows from DietPlan.meals_data (read path only; does not alter POST)."""

SLOT_KEYS = ("breakfast", "lunch", "dinner", "snacks")


def ensure_plan_assignments_for_diet_plan(diet_plan):
    """
    For each day in meals_data and each standard slot, ensure a PlanAssignment row exists.
    Idempotent get_or_create; leaves existing meal_ids / portion_size / notes untouched.
    """
    from .models import PlanAssignment

    raw = diet_plan.meals_data

    if isinstance(raw, dict):
        raw = list(raw.values())

    if not isinstance(raw, list) or len(raw) == 0:
        return

    for day_index in range(len(raw)):
        for slot_key in SLOT_KEYS:
            PlanAssignment.objects.get_or_create(
                diet_plan=diet_plan,
                day_index=day_index,
                slot_key=slot_key,
                defaults={
                    "meal_ids": [],
                    "portion_size": None,
                    "scheduled_date": None,
                    "notes": "",
                },
            )
