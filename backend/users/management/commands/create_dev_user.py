from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

DEV_USERS = [
    {
        "email": "user@dev.com",
        "username": "devuser",
        "password": "dev1234!",
        "first_name": "Dev",
        "last_name": "User",
        "is_nutritionist": False,
        "email_verified": True,
        "onboarding_complete": True,
    },
    {
        "email": "nutritionist@dev.com",
        "username": "devnutritionist",
        "password": "dev1234!",
        "first_name": "Dev",
        "last_name": "Nutritionist",
        "is_nutritionist": True,
        "email_verified": True,
        "onboarding_complete": True,
    },
]


class Command(BaseCommand):
    help = "Create dev test accounts (user + nutritionist) for local development."

    def handle(self, *args, **options):
        for data in DEV_USERS:
            email = data["email"]
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "username": data["username"],
                    "first_name": data["first_name"],
                    "last_name": data["last_name"],
                    "is_nutritionist": data["is_nutritionist"],
                    "email_verified": data.get("email_verified", True),
                    "onboarding_complete": data.get("onboarding_complete", True),
                },
            )
            if created:
                user.set_password(data["password"])
                user.save()
                label = "nutritionist" if data["is_nutritionist"] else "user"
                self.stdout.write(f"Created {label}: {email} / {data['password']}")
            else:
                self.stdout.write(f"Already exists: {email}")

        self.stdout.write(self.style.SUCCESS("Done."))
