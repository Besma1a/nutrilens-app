# users/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate
from .models import UserPreferences, PasswordResetToken, EmailVerificationToken

User = get_user_model()


# ─────────────────────────────────────────────────────────────────────────────
# REGISTRATION
# ─────────────────────────────────────────────────────────────────────────────

class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Used by RegisterPage.jsx
    Accepts: fullName, email, password, password_confirm
    """
    fullName = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['id', 'fullName', 'email', 'password', 'password_confirm']
        read_only_fields = ['id']

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate(self, data):
        if data['password'] != data.pop('password_confirm'):
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return data

    def create(self, validated_data):
        full_name = validated_data.pop('fullName', '')
        parts = full_name.strip().split(' ', 1)
        first_name = parts[0]
        last_name = parts[1] if len(parts) > 1 else ''

        email = validated_data['email']
        user = User.objects.create_user(
            username=email,
            email=email,
            password=validated_data['password'],
            first_name=first_name,
            last_name=last_name,
        )
        UserPreferences.objects.create(user=user)
        return user


# ─────────────────────────────────────────────────────────────────────────────
# LOGIN
# ─────────────────────────────────────────────────────────────────────────────

class LoginSerializer(serializers.Serializer):
    """
    Used by LoginPage.jsx
    Accepts: email, password
    """
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        email = data.get('email')
        password = data.get('password')

        try:
            user_obj = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError("No account found with this email address.")

        user = authenticate(username=user_obj.username, password=password)
        if not user:
            raise serializers.ValidationError("Incorrect password.")

        if not user.is_active:
            raise serializers.ValidationError("This account has been disabled.")

        data['user'] = user
        return data


# ─────────────────────────────────────────────────────────────────────────────
# EMAIL VERIFICATION
# ─────────────────────────────────────────────────────────────────────────────

class EmailVerifySerializer(serializers.Serializer):
    """
    Used when the user clicks the link in their email.
    Accepts: token (UUID from the URL)
    """
    token = serializers.UUIDField()

    def validate_token(self, value):
        try:
            token_obj = EmailVerificationToken.objects.get(token=value, is_used=False)
        except EmailVerificationToken.DoesNotExist:
            raise serializers.ValidationError("Invalid or already used verification link.")

        if token_obj.is_expired():
            raise serializers.ValidationError("This verification link has expired. Please request a new one.")

        self.token_obj = token_obj
        return value

    def save(self):
        self.token_obj.is_used = True
        self.token_obj.save()
        user = self.token_obj.user
        user.email_verified = True
        user.save()
        return user


class ResendVerificationSerializer(serializers.Serializer):
    """
    Used by the 'Resend verification email' button in EmailVerification.jsx
    Accepts: email
    """
    email = serializers.EmailField()

    def validate_email(self, value):
        try:
            self.user = User.objects.get(email=value)
        except User.DoesNotExist:
            self.user = None
        return value


# ─────────────────────────────────────────────────────────────────────────────
# PASSWORD RESET
# ─────────────────────────────────────────────────────────────────────────────

class PasswordResetRequestSerializer(serializers.Serializer):
    """
    Used by PasswordResetRequest.jsx
    Accepts: email
    """
    email = serializers.EmailField()

    def validate_email(self, value):
        try:
            self.user = User.objects.get(email=value)
        except User.DoesNotExist:
            self.user = None
        return value


class PasswordResetConfirmSerializer(serializers.Serializer):
    """
    Used by PasswordResetConfirm.jsx
    Accepts: token, new_password, new_password_confirm
    """
    token = serializers.UUIDField()
    new_password = serializers.CharField(write_only=True, min_length=8)
    new_password_confirm = serializers.CharField(write_only=True, min_length=8)

    def validate_token(self, value):
        try:
            self.token_obj = PasswordResetToken.objects.get(token=value, is_used=False)
        except PasswordResetToken.DoesNotExist:
            raise serializers.ValidationError("Invalid or already used reset link.")

        if self.token_obj.is_expired():
            raise serializers.ValidationError("This reset link has expired. Please request a new one.")

        return value

    def validate(self, data):
        if data['new_password'] != data['new_password_confirm']:
            raise serializers.ValidationError({"new_password": "Passwords do not match."})
        return data

    def save(self):
        self.token_obj.is_used = True
        self.token_obj.save()
        user = self.token_obj.user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user


# ─────────────────────────────────────────────────────────────────────────────
# HEALTH SETUP
# ─────────────────────────────────────────────────────────────────────────────

class HealthSetupSerializer(serializers.ModelSerializer):
    """
    Used by HealthSetupPage.jsx (the 6-step onboarding form).
    
    FIX: The frontend sends camelCase keys (firstName, lastName, goalType, etc.)
    but Django model fields are snake_case. We declare explicit write-only fields
    with source= so DRF maps them correctly before hitting the model.
    """

    # ── Step 1: camelCase inputs → snake_case model fields ─────────────
    firstName        = serializers.CharField(write_only=True, required=False, source='first_name')
    lastName         = serializers.CharField(write_only=True, required=False, source='last_name')
    # date_of_birth / gender / location come in already snake_case from the form — fine as-is

    # ── Step 2 ──────────────────────────────────────────────────────────
    # 'height' and 'weight' match the model directly, no alias needed.
    goalWeight       = serializers.FloatField(write_only=True, required=False, source='goal_weight', allow_null=True)
    bodyFat          = serializers.FloatField(write_only=True, required=False, source='body_fat', allow_null=True)

    # ── Step 3 ──────────────────────────────────────────────────────────
    dietStyle        = serializers.CharField(write_only=True, required=False, source='diet_style', allow_blank=True)
    goalDesc         = serializers.CharField(write_only=True, required=False, source='goal_desc', allow_blank=True)

    # ── Step 4 ──────────────────────────────────────────────────────────
    goalType         = serializers.CharField(write_only=True, required=False, source='goal_type', allow_blank=True)
    activityLevel    = serializers.CharField(write_only=True, required=False, source='activity_level', allow_blank=True)
    sleepTargetHours = serializers.FloatField(write_only=True, required=False, source='sleep_target_hours', allow_null=True)

    # ── Step 5 ──────────────────────────────────────────────────────────
    # medicalConditions / medications / allergies — camelCase from frontend
    medicalConditions = serializers.JSONField(write_only=True, required=False, source='medical_conditions')

    class Meta:
        model = User
        fields = [
            # camelCase aliases (write-only, map via source=)
            'firstName', 'lastName',
            'goalWeight', 'bodyFat',
            'dietStyle', 'goalDesc',
            'goalType', 'activityLevel', 'sleepTargetHours',
            'medicalConditions',
            # snake_case fields that arrive as-is from the form
            'gender', 'date_of_birth', 'location',
            'height', 'weight',
            'medications', 'allergies',
            'goal', 'daily_calorie_goal',
        ]

    def update(self, instance, validated_data):
        # Set every incoming field on the model instance
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # FIX: set start_weight once — only if it hasn't been set before.
        # This preserves the original baseline even if the user later updates weight.
        if instance.start_weight is None and instance.weight is not None:
            instance.start_weight = instance.weight

        instance.onboarding_complete = True
        instance.save()
        return instance


# ─────────────────────────────────────────────────────────────────────────────
# PROFILE
# ─────────────────────────────────────────────────────────────────────────────

class UserProfileSerializer(serializers.ModelSerializer):
    goal_display = serializers.CharField(source='get_goal_display', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'weight', 'height', 'goal', 'goal_display', 'daily_calorie_goal',
            'profile_picture', 'bio', 'gender', 'date_of_birth', 'location',
            'goal_weight', 'body_fat', 'diet_style', 'goal_type', 'goal_desc',
            'activity_level', 'sleep_target_hours',
            'medical_conditions', 'medications', 'allergies',
            'email_verified', 'onboarding_complete',
            'start_weight',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'email_verified', 'onboarding_complete', 'start_weight', 'created_at', 'updated_at']


class UserPreferencesSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPreferences
        fields = [
            'id', 'notifications_enabled', 'email_notifications',
            'is_premium', 'preferred_nutritionist', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class UserListSerializer(serializers.ModelSerializer):
    goal_display = serializers.CharField(source='get_goal_display', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'goal_display', 'profile_picture']
        read_only_fields = ['id']


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True, required=True)
    new_password = serializers.CharField(write_only=True, required=True, min_length=8)
    new_password_confirm = serializers.CharField(write_only=True, required=True, min_length=8)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate(self, data):
        if data['new_password'] != data['new_password_confirm']:
            raise serializers.ValidationError({"new_password": "New passwords do not match."})
        return data

    def save(self):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user