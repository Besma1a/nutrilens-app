from django.db import migrations, models
import django.db.models.deletion
import uuid
from decimal import Decimal


def seed_default_admin(apps, schema_editor):
    AdminAccount = apps.get_model("adminpanel", "AdminAccount")
    if not AdminAccount.objects.filter(email="admin@nutrilens.com").exists():
        AdminAccount.objects.create(
            name="Admin User",
            email="admin@nutrilens.com",
            password_hash="$2b$12$bBb5WBiQPtYzZivIV.HW7eJxhrGR0mICRg1vlmiMQNIUv/R6le45.",
            role="Platform Administrator",
            timezone="UTC",
            bio="Platform administrator account.",
        )


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("subscriptions", "0001_initial"),
        ("users", "0005_customuser_activity_level_customuser_allergies_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="AdminAccount",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=120)),
                ("email", models.EmailField(max_length=254, unique=True)),
                ("password_hash", models.CharField(max_length=255)),
                ("phone", models.CharField(blank=True, max_length=30)),
                ("role", models.CharField(default="Platform Administrator", max_length=120)),
                ("timezone", models.CharField(default="UTC", max_length=64)),
                ("bio", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
        ),
        migrations.CreateModel(
            name="SupportTicket",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("subject", models.CharField(max_length=255)),
                ("priority", models.CharField(choices=[("Low", "Low"), ("Medium", "Medium"), ("High", "High")], default="Medium", max_length=20)),
                ("status", models.CharField(choices=[("Open", "Open"), ("In Progress", "In Progress"), ("Waiting for User", "Waiting for User"), ("Resolved", "Resolved"), ("Closed", "Closed")], default="Open", max_length=30)),
                ("assigned", models.CharField(blank=True, max_length=120)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to="users.customuser")),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="Testimonial",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=120)),
                ("plan", models.CharField(default="Basic", max_length=40)),
                ("rating", models.PositiveSmallIntegerField(default=5)),
                ("text", models.TextField()),
                ("status", models.CharField(choices=[("Pending", "Pending"), ("Approved", "Approved"), ("Rejected", "Rejected")], default="Pending", max_length=20)),
                ("featured", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("user", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to="users.customuser")),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="Transaction",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("plan", models.CharField(max_length=40)),
                ("amount", models.DecimalField(decimal_places=2, default=Decimal("0.00"), max_digits=10)),
                ("method", models.CharField(default="Stripe", max_length=50)),
                ("status", models.CharField(choices=[("Paid", "Paid"), ("Pending", "Pending"), ("Failed", "Failed"), ("Refunded", "Refunded")], default="Paid", max_length=20)),
                ("refund_status", models.CharField(choices=[("None", "None"), ("Processed", "Processed")], default="None", max_length=20)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("subscription", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to="subscriptions.subscription")),
                ("user", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to="users.customuser")),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="SupportTicketMessage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("from_name", models.CharField(max_length=120)),
                ("role", models.CharField(default="user", max_length=20)),
                ("text", models.TextField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("ticket", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="messages", to="adminpanel.supportticket")),
            ],
            options={"ordering": ["created_at"]},
        ),
        migrations.RunPython(seed_default_admin, migrations.RunPython.noop),
    ]
