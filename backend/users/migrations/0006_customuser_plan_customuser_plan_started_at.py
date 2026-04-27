from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0005_customuser_activity_level_customuser_allergies_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="customuser",
            name="plan",
            field=models.CharField(
                choices=[("free", "Free"), ("pro", "Pro"), ("premium", "Premium")],
                default="free",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="customuser",
            name="plan_started_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
