# Generated manually for P3 plan assignment adjustments

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("profiles", "0007_dietplan_meals_data"),
    ]

    operations = [
        migrations.CreateModel(
            name="PlanAssignment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("day_index", models.PositiveIntegerField(default=0)),
                (
                    "slot_key",
                    models.CharField(
                        default="breakfast",
                        help_text="Meal slot within the day (breakfast, lunch, dinner, snacks).",
                        max_length=32,
                    ),
                ),
                ("meal_ids", models.JSONField(blank=True, default=list)),
                ("portion_size", models.FloatField(blank=True, null=True)),
                ("scheduled_date", models.DateField(blank=True, null=True)),
                ("notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "diet_plan",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="plan_assignments",
                        to="profiles.dietplan",
                    ),
                ),
            ],
            options={
                "ordering": ["diet_plan_id", "day_index", "slot_key"],
            },
        ),
        migrations.AddConstraint(
            model_name="planassignment",
            constraint=models.UniqueConstraint(
                fields=("diet_plan", "day_index", "slot_key"),
                name="profiles_planassignment_plan_day_slot_uniq",
            ),
        ),
    ]
