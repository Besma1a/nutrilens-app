# profiles/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import UserProfile, WeightEntry, BodyMeasurement, NutritionistFeedback, DietPlan, DietPlanTemplate

User = get_user_model()


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile information."""
    bmi = serializers.SerializerMethodField()
    subscription_is_active = serializers.SerializerMethodField()
    scans_used_today = serializers.SerializerMethodField()
    managed_by_username = serializers.SerializerMethodField()
    nutritionist_id = serializers.SerializerMethodField()
    
    class Meta:
        model = UserProfile
        fields = [
            'user', 'height_cm', 'current_weight_kg', 'start_weight_kg',
            'goal_weight_kg', 'daily_calorie_goal', 'protein_goal_g', 
            'carbs_goal_g', 'fat_goal_g', 'bmi', 'is_subscribed', 
            'subscription_plan', 'subscription_end_date', 'subscription_is_active',
            'goal_setting_mode', 'managed_by', 'managed_by_username', 'nutritionist_id', 'scans_used_today',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'created_at', 'updated_at', 'bmi', 'subscription_is_active', 'scans_used_today']
    
    def get_bmi(self, obj):
        return obj.bmi
    
    def get_subscription_is_active(self, obj):
        return obj.subscription_is_active
    
    def get_scans_used_today(self, obj):
        return obj.scans_used_today()

    def get_managed_by_username(self, obj):
        manager = getattr(obj, "managed_by", None)
        if not manager:
            return None
        name = f"{manager.first_name} {manager.last_name}".strip()
        return name or manager.username

    def get_nutritionist_id(self, obj):
        manager = getattr(obj, "managed_by", None)
        if not manager:
            return None
        try:
            from adminpanel.models import NutritionistAdminProfile
            admin_profile = (
                NutritionistAdminProfile.objects
                .select_related("nutritionist")
                .filter(linked_user=manager, status="Approved")
                .first()
            )
            return admin_profile.nutritionist_id if admin_profile else None
        except Exception:
            return None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        from .effective_targets import get_effective_macro_targets

        cal, prot, carbs, fat = get_effective_macro_targets(instance.user)
        data["daily_calorie_goal"] = cal
        data["protein_goal_g"] = prot
        data["carbs_goal_g"] = carbs
        data["fat_goal_g"] = fat
        return data


class WeightEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = WeightEntry
        fields = ['id', 'user', 'date', 'weight_kg', 'notes', 'logged_at']
        read_only_fields = ['user', 'logged_at']


class BodyMeasurementSerializer(serializers.ModelSerializer):
    """Serializer for body measurement tracking."""
    
    class Meta:
        model = BodyMeasurement
        fields = [
            'id', 'user', 'date', 'waist_cm', 'hips_cm', 'chest_cm',
            'arms_cm', 'neck_cm', 'notes', 'logged_at'
        ]
        read_only_fields = ['user', 'logged_at']


class NutritionistFeedbackSerializer(serializers.ModelSerializer):
    """Serializer for nutritionist feedback."""
    nutritionist_username = serializers.CharField(source='nutritionist.username', read_only=True)
    nutritionist_id = serializers.IntegerField(source='nutritionist.id', read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    
    class Meta:
        model = NutritionistFeedback
        fields = [
            'id', 'user', 'user_id', 'user_username', 'nutritionist', 'nutritionist_id',
            'nutritionist_username', 'title', 'message', 'created_at', 'updated_at', 'is_read'
        ]
        read_only_fields = ['created_at', 'updated_at', 'nutritionist', 'nutritionist_id', 'nutritionist_username']
    
    def create(self, validated_data):
        """Set nutritionist to current user on create."""
        validated_data['nutritionist'] = self.context['request'].user
        return super().create(validated_data)


class DietPlanSerializer(serializers.ModelSerializer):
    """Serializer for diet plans assigned to patients."""
    assigned_by_username = serializers.CharField(source="assigned_by.username", read_only=True, allow_null=True)
    
    class Meta:
        model = DietPlan
        fields = [
            'id', 'user', 'assigned_by', 'assigned_by_username', 'title', 'description',
            'plan_type', 'daily_calorie_target', 'protein_target_g', 'carbs_target_g',
            'fat_target_g', 'meals_data', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class DietPlanTemplateSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source="created_by.username", read_only=True, allow_null=True)

    class Meta:
        model = DietPlanTemplate
        fields = [
            "id",
            "created_by",
            "created_by_username",
            "title",
            "description",
            "overview",
            "plan_type",
            "category",
            "daily_calorie_target",
            "protein_target_g",
            "carbs_target_g",
            "fat_target_g",
            "meals_data",
            "key_guidelines",
            "example_meals",
            "image_url",
            "image",
            "is_published",
            "moderation_status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "created_at",
            "updated_at",
            "created_by",
            "created_by_username",
            "is_published",
            "moderation_status",
        ]

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        request = self.context.get("request")
        if instance.image:
            ret["image_url"] = request.build_absolute_uri(instance.image.url) if request else instance.image.url
        return ret


def plan_assignment_to_camel(instance):
    """API shape for MealPlan / Adjustments (camelCase)."""
    return {
        "id": instance.id,
        "dietPlanId": instance.diet_plan_id,
        "dayIndex": instance.day_index,
        "slotKey": instance.slot_key,
        "mealIds": instance.meal_ids if isinstance(instance.meal_ids, list) else [],
        "portionSize": instance.portion_size,
        "scheduledDate": instance.scheduled_date.isoformat() if instance.scheduled_date else None,
        "notes": instance.notes or "",
    }


class NutritionistPatientSerializer(serializers.ModelSerializer):
    """
    Full patient card shape for Clients.jsx, AssignPlan.jsx dropdowns,
    and any nutritionist view that lists managed patients.

    Shape:
      { id, full_name, email, avatar, goal,
        daily_calorie_goal, protein_goal_g, carbs_goal_g, fat_goal_g,
        height_cm, current_weight_kg, goal_weight_kg,
        dob, location, gender,
        joined_at, has_active_plan }
    """
    id               = serializers.IntegerField(source="user.id",           read_only=True)
    full_name        = serializers.SerializerMethodField()
    email            = serializers.EmailField(source="user.email",          read_only=True)
    avatar           = serializers.SerializerMethodField()
    goal             = serializers.SerializerMethodField()
    joined_at        = serializers.DateTimeField(source="user.date_joined",  read_only=True)
    has_active_plan  = serializers.SerializerMethodField()
    active_diet_plan = serializers.SerializerMethodField()

    # ── Body metrics with fallback to CustomUser onboarding fields ───────
    height_cm         = serializers.SerializerMethodField()
    current_weight_kg = serializers.SerializerMethodField()
    goal_weight_kg    = serializers.SerializerMethodField()

    # ── Nutrition goals ───────────────────────────────────────────────────
    daily_calorie_goal = serializers.SerializerMethodField()
    protein_goal_g     = serializers.FloatField(read_only=True)
    carbs_goal_g       = serializers.FloatField(read_only=True)
    fat_goal_g         = serializers.FloatField(read_only=True)

    # ── Personal info from user model (may not exist on all custom users) ─
    dob          = serializers.SerializerMethodField()
    location     = serializers.SerializerMethodField()
    gender       = serializers.SerializerMethodField()
    phone_number = serializers.SerializerMethodField()
    medical_conditions = serializers.SerializerMethodField()
    medications = serializers.SerializerMethodField()
    allergies = serializers.SerializerMethodField()

    class Meta:
        model  = UserProfile
        fields = [
            "id", "full_name", "email", "avatar",
            "goal", "daily_calorie_goal", "protein_goal_g", "carbs_goal_g", "fat_goal_g",
            "height_cm", "current_weight_kg", "goal_weight_kg",
            "dob", "location", "gender", "phone_number",
            "medical_conditions", "medications", "allergies",
            "joined_at", "has_active_plan", "active_diet_plan",
        ]

    # ── Field implementations ─────────────────────────────────────────────

    def get_full_name(self, obj):
        name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        return name or obj.user.username

    def get_avatar(self, obj):
        picture = (
            getattr(obj, "avatar", None)
            or getattr(obj.user, "profile_picture", None)
        )
        if not picture:
            return None
        try:
            url = picture.url
        except Exception:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(url) if request else url

    def get_goal(self, obj):
        goal = getattr(obj.user, "goal_type", None) or getattr(obj.user, "goal", None) or getattr(obj, "health_goal", None)
        if goal:
            if goal in {"lose", "maintain", "gain"}:
                return {
                    "lose": "Lose Weight",
                    "maintain": "Maintain Weight",
                    "gain": "Gain Weight",
                }.get(goal, goal)
            return goal
        current = obj.current_weight_kg
        target  = obj.goal_weight_kg
        if current is None or target is None:
            return None
        diff = current - target
        if abs(diff) < 1.0:
            return "Maintain Weight"
        return "Lose Weight" if diff > 0 else "Gain Weight"

    def get_has_active_plan(self, obj):
        for rel in ("diet_plans", "meal_plans", "plans"):
            qs = getattr(obj.user, rel, None)
            if qs is not None:
                try:
                    return qs.filter(is_active=True).exists()
                except Exception:
                    pass
        return False

    def get_dob(self, obj):
        """Return date_of_birth from the user model if the field exists."""
        dob = getattr(obj.user, "date_of_birth", None)
        return str(dob) if dob else None

    def get_location(self, obj):
        """Return location from the user model if the field exists."""
        return getattr(obj.user, "location", None) or None

    def get_gender(self, obj):
        """Return gender from the user model if the field exists."""
        return getattr(obj.user, "gender", None) or None

    def get_phone_number(self, obj):
        """Return phone_number from the user model if the field exists."""
        return getattr(obj.user, "phone_number", None) or None

    def get_active_diet_plan(self, obj):
        """Return the active diet plan for this patient if one exists."""
        try:
            active_plan = obj.user.diet_plans.filter(is_active=True).first()
            if active_plan:
                return {
                    'id': active_plan.id,
                    'title': active_plan.title,
                    'description': active_plan.description,
                    'plan_type': active_plan.plan_type,
                    'daily_calorie_target': active_plan.daily_calorie_target,
                    'protein_target_g': active_plan.protein_target_g,
                    'carbs_target_g': active_plan.carbs_target_g,
                    'fat_target_g': active_plan.fat_target_g,
                }
        except Exception:
            pass
        return None

    def get_height_cm(self, obj):
        value = getattr(obj, "height_cm", None)
        if value is not None:
            return value
        return getattr(obj.user, "height", None)

    def get_current_weight_kg(self, obj):
        value = getattr(obj, "current_weight_kg", None)
        if value is not None:
            return value
        return getattr(obj.user, "weight", None)

    def get_goal_weight_kg(self, obj):
        value = getattr(obj, "goal_weight_kg", None)
        if value is not None:
            return value
        return getattr(obj.user, "goal_weight", None)

    def get_daily_calorie_goal(self, obj):
        value = getattr(obj, "daily_calorie_goal", None)
        if value is not None:
            return value
        return getattr(obj.user, "daily_calorie_goal", 2000)

    def get_medical_conditions(self, obj):
        """Return patient's medical conditions from user profile."""
        return getattr(obj.user, "medical_conditions", []) or []

    def get_medications(self, obj):
        """Return patient's medications from user profile."""
        return getattr(obj.user, "medications", []) or []

    def get_allergies(self, obj):
        """Return patient's allergies from user profile."""
        return getattr(obj.user, "allergies", []) or []