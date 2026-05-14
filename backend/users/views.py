from django.core.mail import send_mail
from django.conf import settings
# users/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authtoken.models import Token
from rest_framework.views import APIView
from django.contrib.auth import get_user_model

from .models import UserPreferences, EmailVerificationToken, PasswordResetToken
from profiles.models import UserProfile
from notifications.models import Notification
from .serializers import (
    UserRegistrationSerializer,
    LoginSerializer,
    EmailVerifySerializer,
    ResendVerificationSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    HealthSetupSerializer,
    UserProfileSerializer,
    UserPreferencesSerializer,
    ChangePasswordSerializer,
)

User = get_user_model()


# ─────────────────────────────────────────────────────────────────────────────
# HELPER: build the full user dict returned by login / register / verify
# Single source of truth so every auth endpoint returns the same shape.
# ─────────────────────────────────────────────────────────────────────────────

def _resolve_profile_picture(user):
    """
    Return the best available profile-picture URL for a user.

    Priority:
      1. CustomUser.profile_picture  (set when a user uploads via their profile page)
      2. Nutritionist.profile_picture (set via the admin / nutritionist profile page)
         — looked up by email because Nutritionist has no FK to CustomUser.
      3. None
    """
    try:
        pic = user.profile_picture
        if pic and pic.name:
            return pic.url
    except Exception:
        pass

    if getattr(user, 'is_nutritionist', False):
        try:
            from consultations.models import Nutritionist
            nut = Nutritionist.objects.filter(email=user.email).first()
            if nut and nut.profile_picture and nut.profile_picture.name:
                return nut.profile_picture.url
        except Exception:
            pass

    return None


def build_user_payload(user):
    """
    Returns the user object expected by AuthContext.normalizeUser().
    All keys are snake_case — normalizeUser handles camelCase mapping.
    """
    try:
        prefs = user.preferences
    except UserPreferences.DoesNotExist:
        prefs = UserPreferences.objects.create(user=user)

    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'name': f"{user.first_name} {user.last_name}".strip() or user.username,
        'profile_picture': _resolve_profile_picture(user),
        'gender': user.gender,
        'dob': str(user.date_of_birth) if user.date_of_birth else None,
        'location': user.location,
        'goal_desc': user.goal_desc,
        'goal_type': user.goal_type,
        'diet_style': user.diet_style,
        'activity_level': user.activity_level,
        'sleep_target_hours': user.sleep_target_hours,
        'phone_number': user.phone_number or '',
        'medical_conditions': user.medical_conditions,
        'medications': user.medications,
        'allergies': user.allergies,
        'email_verified': user.email_verified,
        'onboarding_complete': user.onboarding_complete,
        'is_nutritionist': user.is_nutritionist,
        'is_staff': user.is_staff,           # FIX: needed for admin routing in LoginPage
        'is_superuser': user.is_superuser,   # FIX: needed for admin routing in LoginPage
        'is_subscribed': prefs.is_premium,
        'plan_name': 'Premium' if prefs.is_premium else None,
        'stats': {
            'current_weight': user.weight,
            'start_weight': user.start_weight,   # dedicated field — set once at onboarding
            'goal_weight': user.goal_weight,
            'height': user.height,
            'body_fat': user.body_fat,
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# HELPER: simulate sending email (prints to console instead of real email)
# When you're ready for real email, replace with Django send_mail() or
# a service like SendGrid / Mailgun.
# ─────────────────────────────────────────────────────────────────────────────


def send_verification_email(user, token):
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    link = f"{frontend_url}/verify-email?token={token}"
    try:
        send_mail(
            subject="Verify your email",
            message=(
                f"Hi {user.first_name or user.username},\n\n"
                f"Click this link to verify your email:\n{link}\n\n"
                f"This link expires in 24 hours."
            ),
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@example.com'),
            recipient_list=[user.email],
            fail_silently=False,
        )
    except Exception as e:
        # Email not configured — print to console so development still works
        print(f"[EMAIL NOT SENT] Verification link for {user.email}: {link}")
        print(f"[EMAIL ERROR] {e}")


def send_password_reset_email(user, token, request=None):
    # Use the FRONTEND_URL from environment (.env file)
    # This ensures email links point to the React frontend, not the backend API
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    link = f"{frontend_url}/password-reset/confirm?token={token}"
    try:
        send_mail(
            subject="Reset your password",
            message=(
                f"Hi {user.first_name or user.username},\n\n"
                f"Click this link to reset your password:\n{link}\n\n"
                f"This link expires in 1 hour.\n\n"
                f"If you didn't request this, ignore this email."
            ),
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@example.com'),
            recipient_list=[user.email],
            fail_silently=False,
        )
    except Exception as e:
        # Email not configured — print to console so development still works
        print(f"[EMAIL NOT SENT] Password reset link for {user.email}: {link}")
        print(f"[EMAIL ERROR] {e}")


# ─────────────────────────────────────────────────────────────────────────────
# REGISTRATION
# ─────────────────────────────────────────────────────────────────────────────

class UserRegistrationViewSet(viewsets.GenericViewSet):
    """
    POST /api/v1/users/register/register/
    Creates account → sends verification email → returns { user, token }
    """
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]

    @action(detail=False, methods=['post'])
    def register(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Create auth token
        token, _ = Token.objects.get_or_create(user=user)

        # Create & "send" email verification token
        verification = EmailVerificationToken.objects.create(user=user)
        send_verification_email(user, verification.token)

        # FIX: return { user: {...}, token: "..." } — matches RegisterPage.jsx expectation
        return Response({
            'token': token.key,
            'user': build_user_payload(user),
        }, status=status.HTTP_201_CREATED)


# ─────────────────────────────────────────────────────────────────────────────
# AUTH (login / logout / email verification / password reset)
# ─────────────────────────────────────────────────────────────────────────────

class AuthViewSet(viewsets.GenericViewSet):
    permission_classes = [AllowAny]

    # ── LOGIN ─────────────────────────────────────────────────────────
    @action(detail=False, methods=['post'])
    def login(self, request):
        """
        POST /api/v1/users/auth/login/
        Body: { email, password }
        Returns: { token, user }
        """
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']

        token, _ = Token.objects.get_or_create(user=user)

        return Response({
            'token': token.key,
            'user': build_user_payload(user),
        }, status=status.HTTP_200_OK)

    # ── LOGOUT ────────────────────────────────────────────────────────
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def logout(self, request):
        """
        POST /api/v1/users/auth/logout/
        Deletes the auth token (user must send token in Authorization header)
        """
        request.user.auth_token.delete()
        return Response({'detail': 'Successfully logged out.'}, status=status.HTTP_200_OK)

    # ── VERIFY EMAIL ──────────────────────────────────────────────────
    @action(detail=False, methods=['get'], url_path='verify-email')
    def verify_email(self, request):
        """
        GET /api/v1/users/auth/verify-email/?token=<uuid>
        The link in the verification email points here.
        FIX: now returns { token, user } so EmailVerification.jsx can
             call updateUserState() with real data.
        """
        token = request.query_params.get('token')
        if not token:
            return Response({'detail': 'Token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = EmailVerifySerializer(data={'token': token})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        auth_token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'detail': 'Email verified successfully.',
            'token': auth_token.key,
            'user': build_user_payload(user),   # FIX: was missing entirely
        }, status=status.HTTP_200_OK)

    # ── RESEND VERIFICATION EMAIL ─────────────────────────────────────
    @action(detail=False, methods=['post'], url_path='resend-verification')
    def resend_verification(self, request):
        """
        POST /api/v1/users/auth/resend-verification/
        Body: { email }
        """
        serializer = ResendVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.user  # None if email not found (hidden for security)

        if user and not user.email_verified:
            # Invalidate old tokens
            EmailVerificationToken.objects.filter(user=user, is_used=False).update(is_used=True)
            verification = EmailVerificationToken.objects.create(user=user)
            send_verification_email(user, verification.token)

        # Always return success — don't reveal if the email exists
        return Response(
            {'detail': 'If this email is registered and unverified, a new link has been sent.'},
            status=status.HTTP_200_OK,
        )

    # ── PASSWORD RESET REQUEST ────────────────────────────────────────
    @action(detail=False, methods=['post'], url_path='password-reset')
    def password_reset_request(self, request):
        """
        POST /api/v1/users/auth/password-reset/
        Body: { email }
        """
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.user

        if user:
            PasswordResetToken.objects.filter(user=user, is_used=False).update(is_used=True)
            reset_token = PasswordResetToken.objects.create(user=user)
            send_password_reset_email(user, reset_token.token, request)

        return Response(
            {'detail': 'If an account exists for this email, a reset link has been sent.'},
            status=status.HTTP_200_OK,
        )

    # ── PASSWORD RESET CONFIRM ────────────────────────────────────────
    @action(detail=False, methods=['post'], url_path='password-reset-confirm')
    def password_reset_confirm(self, request):
        """
        POST /api/v1/users/auth/password-reset/confirm/
        Body: { token, new_password, new_password_confirm }
        """
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Delete all auth tokens — user must log in fresh
        Token.objects.filter(user=user).delete()

        return Response(
            {'detail': 'Password has been reset successfully. Please log in with your new password.'},
            status=status.HTTP_200_OK,
        )


# ─────────────────────────────────────────────────────────────────────────────
# USER PROFILE (existing + health setup)
# ─────────────────────────────────────────────────────────────────────────────

class UserProfileViewSet(viewsets.GenericViewSet):
    """
    All routes here require the user to be logged in.
    Send the token in headers: Authorization: Token <token>
    """
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'change_password':
            return ChangePasswordSerializer
        if self.action == 'preferences':
            return UserPreferencesSerializer
        if self.action == 'health_setup':
            return HealthSetupSerializer
        return UserProfileSerializer

    # ── GET MY PROFILE ────────────────────────────────────────────────
    @action(detail=False, methods=['get'])
    def me(self, request):
        """GET /api/v1/users/profile/me/"""
        # Use build_user_payload so nutritionist profile pictures are resolved
        # the same way as login/register — avoids a separate code path for
        # CustomUser.profile_picture vs Nutritionist.profile_picture.
        return Response(build_user_payload(request.user))

    # ── UPDATE PROFILE ────────────────────────────────────────────────
    @action(detail=False, methods=['put', 'patch'])
    def update_profile(self, request):
        """PUT/PATCH /api/v1/users/profile/update_profile/"""
        serializer = UserProfileSerializer(
            request.user, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        updated_user = serializer.save()

        # Notify the managing nutritionist when patient updates weight directly
        # through the profile endpoint (outside WeightEntry logging flow).
        if "weight" in serializer.validated_data:
            profile = UserProfile.objects.select_related("managed_by").filter(user=updated_user).first()
            nutritionist_user = getattr(profile, "managed_by", None)

            if nutritionist_user and nutritionist_user.id != updated_user.id:
                    patient_name = (
                        f"{updated_user.first_name} {updated_user.last_name}".strip()
                        or updated_user.username
                    )
                    Notification.create(
                        recipient=nutritionist_user,
                        actor=updated_user,
                        notification_type=Notification.TYPE_WEIGHT,
                        title=f"{patient_name} updated weight",
                        message=f"Latest profile weight: {updated_user.weight} kg.",
                        link="/nutritionist/clients/",
                    )
        return Response(serializer.data)

    # ── HEALTH SETUP (onboarding) ─────────────────────────────────────
    @action(detail=False, methods=['post', 'put', 'patch'])
    def health_setup(self, request):
        """
        POST /api/v1/users/profile/health_setup/
        Called by HealthSetupPage.jsx after email verification.
        Saves all 6 steps of health data at once.
        FIX: now returns full { user } payload so frontend can sync from server.
        FIX: added PATCH method.
        """
        serializer = HealthSetupSerializer(
            request.user, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        return Response({
            'detail': 'Health profile saved successfully.',
            'user': build_user_payload(user),   # FIX: was only returning { detail, onboarding_complete }
        }, status=status.HTTP_200_OK)

    # ── CHANGE PASSWORD ───────────────────────────────────────────────
    @action(detail=False, methods=['post'])
    def change_password(self, request):
        """POST /api/v1/users/profile/change_password/"""
        serializer = ChangePasswordSerializer(
            data=request.data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        # Rotate token so existing sessions are invalidated
        Token.objects.filter(user=request.user).delete()
        new_token, _ = Token.objects.get_or_create(user=request.user)
        return Response(
            {'detail': 'Password updated successfully.', 'token': new_token.key},
            status=status.HTTP_200_OK,
        )

    # ── PREFERENCES ───────────────────────────────────────────────────
    @action(detail=False, methods=['get', 'put', 'patch'])
    def preferences(self, request):
        """GET/PUT/PATCH /api/v1/users/profile/preferences/"""
        preferences, _ = UserPreferences.objects.get_or_create(user=request.user)
        if request.method == 'GET':
            return Response(UserPreferencesSerializer(preferences).data)
        serializer = UserPreferencesSerializer(preferences, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


# ─────────────────────────────────────────────────────────────────────────────
# PUBLIC STATS — no auth required
# GET /api/v1/users/public-stats/
# Returns { member_count, recent_avatars: [{initial, color}] }
# ─────────────────────────────────────────────────────────────────────────────

AVATAR_COLORS = ['#2B5726', '#A50C05', '#F19335', '#4a8040']

class PublicStatsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        User = get_user_model()
        count = User.objects.filter(is_active=True, is_staff=False, is_superuser=False).count()
        recent = (
            User.objects
            .filter(is_active=True, is_staff=False, is_superuser=False)
            .order_by('-date_joined')[:4]
        )
        avatars = [
            {
                'initial': (u.first_name[:1] or u.username[:1]).upper(),
                'color': AVATAR_COLORS[i % len(AVATAR_COLORS)],
            }
            for i, u in enumerate(recent)
        ]
        return Response({'member_count': count, 'recent_avatars': avatars})