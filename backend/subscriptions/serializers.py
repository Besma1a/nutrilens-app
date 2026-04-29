from rest_framework import serializers

from .models import Subscription, SubscriptionPlan


class SubscriptionSerializer(serializers.ModelSerializer):
    """Serializer for subscription data."""
    
    plan = serializers.CharField()
    status = serializers.CharField()
    end_date = serializers.DateTimeField(format='%Y-%m-%dT%H:%M:%S.%fZ', read_only=True)
    start_date = serializers.DateTimeField(format='%Y-%m-%dT%H:%M:%S.%fZ', read_only=True)
    is_active = serializers.SerializerMethodField(read_only=True)
    days_remaining = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = Subscription
        fields = [
            'id',
            'user',
            'plan',
            'status',
            'start_date',
            'end_date',
            'is_active',
            'days_remaining',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'user',
            'start_date',
            'created_at',
            'updated_at',
        ]
    
    def get_is_active(self, obj):
        return obj.is_active
    
    def get_days_remaining(self, obj):
        return obj.days_remaining


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = [
            "id",
            "name",
            "price",
            "features",
            "duration_days",
            "is_active",
            "is_featured",
            "sort_order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class SubscribeRequestSerializer(serializers.Serializer):
    """Serializer for subscription request (POST /api/subscribe/)."""

    planId = serializers.IntegerField(required=False)
    plan = serializers.CharField(required=False)

    def validate(self, attrs):
        if not attrs.get("planId") and not attrs.get("plan"):
            raise serializers.ValidationError("Either planId or plan is required.")
        return attrs


class SubscriptionResponseSerializer(serializers.Serializer):
    """Response serializer for subscription status."""
    
    isSubscribed = serializers.SerializerMethodField()
    plan = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    endDate = serializers.SerializerMethodField()
    daysRemaining = serializers.SerializerMethodField()
    
    def get_isSubscribed(self, obj):
        """Return whether subscription is active."""
        return obj.is_active if obj else False
    
    def get_plan(self, obj):
        """Return the plan name."""
        return obj.plan if obj else None
    
    def get_status(self, obj):
        """Return the subscription status."""
        return obj.status if obj else None
    
    def get_endDate(self, obj):
        """Return the end date in ISO format."""
        if not obj:
            return None
        return obj.end_date.isoformat()
    
    def get_daysRemaining(self, obj):
        """Return days remaining."""
        return obj.days_remaining if obj else 0
