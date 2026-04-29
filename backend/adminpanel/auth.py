from datetime import timedelta

import bcrypt
from django.conf import settings
from django.core import signing
from django.utils import timezone
from rest_framework import exceptions

from .models import AdminAccount

TOKEN_SALT = "adminpanel.auth"
TOKEN_MAX_AGE = int(timedelta(days=7).total_seconds())


def hash_password(raw_password: str) -> str:
    return bcrypt.hashpw(raw_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(raw_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(raw_password.encode("utf-8"), hashed_password.encode("utf-8"))


def create_admin_token(admin: AdminAccount) -> str:
    signer = signing.TimestampSigner(key=settings.SECRET_KEY, salt=TOKEN_SALT)
    return signer.sign(str(admin.id))


def get_admin_from_token(token: str) -> AdminAccount:
    signer = signing.TimestampSigner(key=settings.SECRET_KEY, salt=TOKEN_SALT)
    try:
        admin_id = signer.unsign(token, max_age=TOKEN_MAX_AGE)
    except signing.BadSignature as exc:
        raise exceptions.AuthenticationFailed("Invalid token.") from exc
    except signing.SignatureExpired as exc:
        raise exceptions.AuthenticationFailed("Token expired.") from exc

    try:
        return AdminAccount.objects.get(id=admin_id)
    except AdminAccount.DoesNotExist as exc:
        raise exceptions.AuthenticationFailed("Admin not found.") from exc


def humanize_age(dt):
    if not dt:
        return ""
    delta = timezone.now() - dt
    hours = int(delta.total_seconds() // 3600)
    if hours < 1:
        mins = max(1, int(delta.total_seconds() // 60))
        return f"{mins}m ago"
    if hours < 24:
        return f"{hours}h ago"
    return f"{delta.days}d ago"
