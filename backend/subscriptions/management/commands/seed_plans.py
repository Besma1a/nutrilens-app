from django.core.management.base import BaseCommand
from subscriptions.models import SubscriptionPlan


class Command(BaseCommand):
    help = "Seed the Free and Pro subscription plans."

    def handle(self, *args, **options):
        plans = [
            {
                "name": "Free",
                "price": "0.00",
                "duration_days": 36500,
                "is_active": True,
                "is_featured": False,
                "sort_order": 0,
                "features": [
                    "3 AI calorie scans per day",
                    "Browse nutritionists & public content",
                    "Progress tracking dashboard",
                ],
            },
            {
                "name": "Pro",
                "price": "9.99",
                "duration_days": 30,
                "is_active": True,
                "is_featured": True,
                "sort_order": 1,
                "features": [
                    "Unlimited AI calorie scans",
                    "Online consultation with a nutritionist",
                    "Personalized diet plan assigned by nutritionist",
                    "Diet plan updated based on consultation progress",
                ],
            },
        ]

        for data in plans:
            plan, created = SubscriptionPlan.objects.update_or_create(
                name=data["name"],
                defaults=data,
            )
            status = "Created" if created else "Updated"
            self.stdout.write(f"{status}: {plan.name} — ${plan.price}")

        self.stdout.write(self.style.SUCCESS("Done."))
