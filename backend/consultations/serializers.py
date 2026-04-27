# consultations/serializers.py
from rest_framework import serializers
from django.utils import timezone
from .models import Nutritionist, Consultation, NutritionistFeedback, ConsultationFeedback


# ─────────────────────────────────────────────────────────────────────────────
# NUTRITIONIST
# ─────────────────────────────────────────────────────────────────────────────

class NutritionistSerializer(serializers.ModelSerializer):
    specialization_display = serializers.CharField(
        source='get_specialization_display', read_only=True
    )

    class Meta:
        model  = Nutritionist
        fields = [
            'id', 'name', 'email', 'phone',
            'specialization', 'specialization_display',
            'bio', 'credentials', 'profile_picture',
            'availability_url', 'zoom_meeting_link',
            'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class NutritionistListSerializer(serializers.ModelSerializer):
    specialization_display = serializers.CharField(
        source='get_specialization_display', read_only=True
    )

    class Meta:
        model  = Nutritionist
        fields = [
            'id', 'name', 'email', 'specialization', 'specialization_display',
            'bio', 'credentials', 'profile_picture', 'availability_url', 'is_active'
        ]
        read_only_fields = ['id']


class NutritionistSelfUpdateSerializer(serializers.ModelSerializer):
    """
    Editable profile fields for the authenticated nutritionist.
    Keeps admin-controlled/system fields read-only.
    """

    class Meta:
        model = Nutritionist
        fields = [
            'id',
            'name',
            'email',
            'phone',
            'specialization',
            'bio',
            'credentials',
            'availability_url',
            'zoom_meeting_link',
            'profile_picture',
        ]
        read_only_fields = ['id', 'email']


# ─────────────────────────────────────────────────────────────────────────────
# NUTRITIONIST FEEDBACK
# ─────────────────────────────────────────────────────────────────────────────

class NutritionistFeedbackSerializer(serializers.ModelSerializer):
    nutritionist_name = serializers.CharField(
        source='consultation.nutritionist.name', read_only=True
    )

    class Meta:
        model  = NutritionistFeedback
        fields = ['id', 'text', 'nutritionist_name', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class NutritionistFeedbackCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = NutritionistFeedback
        fields = ['text']


# ─────────────────────────────────────────────────────────────────────────────
# CONSULTATION FEEDBACK
# ─────────────────────────────────────────────────────────────────────────────

class ConsultationFeedbackSerializer(serializers.ModelSerializer):
    rating_display = serializers.CharField(source='get_rating_display', read_only=True)

    class Meta:
        model  = ConsultationFeedback
        fields = ['id', 'consultation', 'rating', 'rating_display',
                  'comment', 'would_recommend', 'created_at']
        read_only_fields = ['id', 'created_at']


class ConsultationFeedbackCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ConsultationFeedback
        fields = ['rating', 'comment', 'would_recommend']


# ─────────────────────────────────────────────────────────────────────────────
# CONSULTATION  (user side)
# ─────────────────────────────────────────────────────────────────────────────

class ConsultationSerializer(serializers.ModelSerializer):
    nutritionist_detail  = NutritionistSerializer(source='nutritionist', read_only=True)
    status_display       = serializers.CharField(source='get_status_display', read_only=True)
    session_type_display = serializers.CharField(source='get_session_type_display', read_only=True)
    user_detail          = serializers.StringRelatedField(source='user', read_only=True)
    feedback             = ConsultationFeedbackSerializer(read_only=True)
    nutritionist_feedback = NutritionistFeedbackSerializer(read_only=True)

    class Meta:
        model  = Consultation
        fields = [
            'id', 'user', 'user_detail',
            'nutritionist', 'nutritionist_detail',
            'status', 'status_display',
            'session_type', 'session_type_display',
            'scheduled_at', 'duration_minutes',
            'zoom_link', 'topic', 'notes',
            'is_premium', 'post_notes', 'recommendations',
            'requested_at', 'completed_at',
            'feedback', 'nutritionist_feedback',
        ]
        read_only_fields = ['id', 'requested_at', 'user_detail',
                            'nutritionist_detail', 'nutritionist_feedback']


class ConsultationListSerializer(serializers.ModelSerializer):
    nutritionist_name    = serializers.CharField(source='nutritionist.name', read_only=True)
    status_display       = serializers.CharField(source='get_status_display', read_only=True)
    session_type_display = serializers.CharField(source='get_session_type_display', read_only=True)

    class Meta:
        model  = Consultation
        fields = [
            'id', 'nutritionist_name', 'status', 'status_display',
            'session_type', 'session_type_display',
            'scheduled_at', 'is_premium',
        ]
        read_only_fields = ['id']


class ConsultationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Consultation
        fields = [
            'nutritionist',
            'scheduled_at',
            'duration_minutes',
            'session_type',
            'topic',
            'notes',
            'is_premium',
        ]

    def validate_scheduled_at(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError(
                "Consultation must be scheduled for a future date/time."
            )
        return value


class ConsultationUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Consultation
        fields = [
            'status',
            'zoom_link',
            'post_notes',
            'recommendations',
            'completed_at',
        ]


# ─────────────────────────────────────────────────────────────────────────────
# NUTRITIONIST CONSULTATION SERIALIZER  (Calendar.jsx shape)
# ─────────────────────────────────────────────────────────────────────────────

class NutritionistConsultationSerializer(serializers.ModelSerializer):
    """
    Serializes consultations into the exact shape Calendar.jsx expects:

    {
      id, patient, isoDate, time, type, notes,
      status: "awaiting" | "approved" | "rejected",
      zoom
    }

    status mapping:
      pending   → "awaiting"
      confirmed → "approved"
      cancelled → "rejected"
      completed → "approved"   (still shows as done/approved in the calendar)
      no_show   → "rejected"
    """

    # Patient full name
    patient  = serializers.SerializerMethodField()

    # "YYYY-MM-DD"
    isoDate  = serializers.SerializerMethodField()

    # "HH:MM" 24-hour
    time     = serializers.SerializerMethodField()

    # session_type display label
    type     = serializers.CharField(source='get_session_type_display')

    # user-supplied notes
    notes    = serializers.CharField(default='')

    # mapped status string
    status   = serializers.SerializerMethodField()

    # zoom link or empty string
    zoom     = serializers.SerializerMethodField()

    class Meta:
        model  = Consultation
        fields = ['id', 'patient', 'isoDate', 'time', 'type', 'notes', 'status', 'zoom']

    STATUS_MAP = {
        'pending':   'awaiting',
        'confirmed': 'approved',
        'completed': 'approved',
        'cancelled': 'rejected',
        'no_show':   'rejected',
    }

    def get_patient(self, obj):
        u = obj.user
        full = f"{u.first_name} {u.last_name}".strip()
        return full or u.username

    def get_isoDate(self, obj):
        return obj.scheduled_at.strftime('%Y-%m-%d')

    def get_time(self, obj):
        return obj.scheduled_at.strftime('%H:%M')

    def get_status(self, obj):
        return self.STATUS_MAP.get(obj.status, 'awaiting')

    def get_zoom(self, obj):
        return obj.zoom_link or ''