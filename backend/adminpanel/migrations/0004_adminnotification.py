from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("adminpanel", "0003_supportticket_contact_email_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="AdminNotification",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "notification_type",
                    models.CharField(
                        choices=[
                            ("support", "Support"),
                            ("content", "Content"),
                            ("testimonial", "Testimonial"),
                            ("system", "System"),
                        ],
                        default="system",
                        max_length=30,
                    ),
                ),
                ("title", models.CharField(max_length=255)),
                ("message", models.TextField(blank=True, default="")),
                ("link", models.CharField(blank=True, default="", max_length=500)),
                ("is_read", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "recipient",
                    models.ForeignKey(
                        blank=True,
                        help_text="If empty, notification is visible to all admins.",
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="notifications",
                        to="adminpanel.adminaccount",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="adminnotification",
            index=models.Index(fields=["recipient", "is_read", "-created_at"], name="adminpanel__recipie_6f71c5_idx"),
        ),
        migrations.AddIndex(
            model_name="adminnotification",
            index=models.Index(fields=["is_read", "-created_at"], name="adminpanel__is_read_6f2368_idx"),
        ),
    ]

