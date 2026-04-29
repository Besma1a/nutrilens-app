from django.db import migrations, models
import django.db.models.deletion


def seed_default_plans(apps, schema_editor):
    SubscriptionPlan = apps.get_model("subscriptions", "SubscriptionPlan")
    defaults = [
        {
            "name": "Monthly",
            "price": "29.00",
            "features": [
                "Unlimited AI meal scans",
                "Personalized meal plans",
                "2 consultations/month",
                "Direct nutritionist messaging",
                "Progress tracking & reports",
                "Cancel anytime",
            ],
            "duration_days": 30,
            "is_featured": False,
            "sort_order": 1,
        },
        {
            "name": "Quarterly",
            "price": "69.00",
            "features": [
                "All Monthly features",
                "8 consultations total",
                "Priority support",
                "Seasonal meal plans",
                "Recipe library access",
                "20% savings",
            ],
            "duration_days": 90,
            "is_featured": True,
            "sort_order": 2,
        },
        {
            "name": "Annual",
            "price": "199.00",
            "features": [
                "All Quarterly features",
                "Unlimited consultations",
                "Personal health coach",
                "Custom meal planning",
                "Premium analytics",
                "Best value",
            ],
            "duration_days": 365,
            "is_featured": False,
            "sort_order": 3,
        },
    ]
    for item in defaults:
        SubscriptionPlan.objects.update_or_create(name=item["name"], defaults=item)


def link_existing_subscriptions(apps, schema_editor):
    Subscription = apps.get_model("subscriptions", "Subscription")
    SubscriptionPlan = apps.get_model("subscriptions", "SubscriptionPlan")
    plan_map = {plan.name: plan for plan in SubscriptionPlan.objects.all()}
    for subscription in Subscription.objects.all():
        plan = plan_map.get(subscription.plan)
        if plan:
            subscription.subscription_plan_id = plan.id
            subscription.save(update_fields=["subscription_plan"])


class Migration(migrations.Migration):

    dependencies = [
        ("subscriptions", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="SubscriptionPlan",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=100, unique=True)),
                ("price", models.DecimalField(decimal_places=2, max_digits=10)),
                ("features", models.JSONField(blank=True, default=list)),
                ("duration_days", models.PositiveIntegerField(default=30)),
                ("is_active", models.BooleanField(default=True)),
                ("is_featured", models.BooleanField(default=False)),
                ("sort_order", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Subscription Plan",
                "verbose_name_plural": "Subscription Plans",
                "ordering": ["sort_order", "price", "name"],
            },
        ),
        migrations.AddField(
            model_name="subscription",
            name="subscription_plan",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="subscriptions", to="subscriptions.subscriptionplan"),
        ),
        migrations.AlterField(
            model_name="subscription",
            name="plan",
            field=models.CharField(help_text="Snapshot of the selected plan name", max_length=100),
        ),
        migrations.RunPython(seed_default_plans, migrations.RunPython.noop),
        migrations.RunPython(link_existing_subscriptions, migrations.RunPython.noop),
    ]
