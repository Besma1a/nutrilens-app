from rest_framework.permissions import BasePermission

from .auth import get_admin_from_token


class AdminAuth(BasePermission):
    def has_permission(self, request, view):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return False
        token = auth_header.split(" ", 1)[1].strip()
        if not token:
            return False
        admin = get_admin_from_token(token)
        request.admin = admin
        return True
