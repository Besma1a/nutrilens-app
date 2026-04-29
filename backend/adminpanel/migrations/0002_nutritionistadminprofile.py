from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("consultations", "0002_consultation_post_notes_consultation_session_type_and_more"),
        ("adminpanel", "0001_initial"),
        ("users", "0005_customuser_activity_level_customuser_allergies_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="NutritionistAdminProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("status", models.CharField(choices=[("Pending", "Pending"), ("Approved", "Approved"), ("Suspended", "Suspended"), ("Rejected", "Rejected")], default="Pending", max_length=20)),
                ("linked_user", models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="nutritionist_admin_profile", to="users.customuser")),
                ("nutritionist", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="admin_profile", to="consultations.nutritionist")),
            ],
            options={"ordering": ["-id"]},
        ),
    ]
