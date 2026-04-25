# users/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserRegistrationViewSet, AuthViewSet, UserProfileViewSet

router = DefaultRouter()
router.register(r'register', UserRegistrationViewSet, basename='user-register')
router.register(r'auth',     AuthViewSet,             basename='user-auth')
router.register(r'profile',  UserProfileViewSet,      basename='user-profile')

urlpatterns = [
    path('', include(router.urls)),
]

# ─────────────────────────────────────────────────────────────────────────────
# This generates these endpoints:
#
#  REGISTRATION
#  POST   /api/v1/users/register/register/          ← RegisterPage.jsx
#
#  AUTH
#  POST   /api/v1/users/auth/login/                 ← LoginPage.jsx
#  POST   /api/v1/users/auth/logout/                ← (any logout button)
#  GET    /api/v1/users/auth/verify-email/?token=.. ← Email link click
#  POST   /api/v1/users/auth/resend-verification/   ← EmailVerification.jsx
#  POST   /api/v1/users/auth/password-reset/        ← PasswordResetRequest.jsx
#  POST   /api/v1/users/auth/password-reset-confirm/  ← PasswordResetConfirm.jsx
#
#  PROFILE (requires token in Authorization header)
#  GET    /api/v1/users/profile/me/                 ← fetch user info
#  PUT    /api/v1/users/profile/update_profile/     ← edit profile
#  POST   /api/v1/users/profile/health_setup/       ← HealthSetupPage.jsx
#  POST   /api/v1/users/profile/change_password/    ← change password
#  GET    /api/v1/users/profile/preferences/        ← get preferences
#  PATCH  /api/v1/users/profile/preferences/        ← update preferences
# ─────────────────────────────────────────────────────────────────────────────