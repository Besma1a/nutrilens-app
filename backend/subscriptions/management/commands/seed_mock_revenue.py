import random
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from subscriptions.models import Subscription

User = get_user_model()


FIRST_NAMES = [
    "Alex",
    "Mia",
    "Noah",
    "Lina",
    "Omar",
    "Sara",
    "Youssef",
    "Emma",
    "Lucas",
    "Nora",
]
LAST_NAMES = [
    "Smith",
    "Johnson",
    "Brown",
    "Williams",
    "Garcia",
    "Lopez",
    "Martin",
    "Lee",
    "Davis",
    "Taylor",
]
PLAN_WEIGHTS = [("free", 0.45), ("pro", 0.35), ("premium", 0.20)]


class Command(BaseCommand):
    help = "Seed realistic mock users/subscriptions for admin revenue pages."

    def add_arguments(self, parser):
        parser.add_argument("--count", type=int, default=200, help="Number of fake users to create.")

    def handle(self, *args, **options):
        target_count = options["count"]
        now = timezone.now()
        created_users = 0
        created_subscriptions = 0

        for _ in range(target_count):
            first_name = random.choice(FIRST_NAMES)
            last_name = random.choice(LAST_NAMES)
            suffix = random.randint(1000, 999999)
            username = f"{first_name.lower()}.{last_name.lower()}.{suffix}"
            email = f"{username}@example.com"

            month_offset = random.randint(0, 11)
            random_days = random.randint(0, 27)
            random_seconds = random.randint(0, 86400 - 1)
            plan_started_at = now - timedelta(days=(month_offset * 30 + random_days), seconds=random_seconds)
            plan = random.choices(
                [item[0] for item in PLAN_WEIGHTS],
                weights=[item[1] for item in PLAN_WEIGHTS],
                k=1,
            )[0]

            user = User.objects.create(
                username=username,
                email=email,
                first_name=first_name,
                last_name=last_name,
                is_active=True,
                plan=plan,
                plan_started_at=plan_started_at,
                onboarding_complete=True,
            )
            user.set_password("MockPassword123!")
            user.save(update_fields=["password"])
            created_users += 1

            subscription_status = "active"
            if plan == "free":
                subscription_status = random.choices(["active", "cancelled"], weights=[0.8, 0.2], k=1)[0]
            elif random.random() < 0.1:
                subscription_status = "cancelled"

            subscription = Subscription.objects.create(
                user=user,
                plan=plan,
                status=subscription_status,
                end_date=plan_started_at + timedelta(days=30),
            )
            Subscription.objects.filter(pk=subscription.pk).update(created_at=plan_started_at)
            created_subscriptions += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {created_users} users and {created_subscriptions} subscriptions over the last 12 months."
            )
        )
