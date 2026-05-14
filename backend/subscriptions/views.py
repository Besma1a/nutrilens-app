from datetime import timedelta

from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from adminpanel.models import Transaction
from profiles.models import UserProfile
from .models import Subscription, SubscriptionPlan
from .serializers import (
    SubscribeRequestSerializer,
    SubscriptionPlanSerializer,
    SubscriptionResponseSerializer,
)


class SubscriptionViewSet(viewsets.ViewSet):
    """
    API endpoints for managing user subscriptions.

    Endpoints:
    - POST /api/v1/subscriptions/subscribe/        → Create or update subscription
    - POST /api/v1/subscriptions/unsubscribe/      → Cancel subscription
    - GET  /api/v1/subscriptions/get_subscription/ → Get current subscription status
    """

    permission_classes = [IsAuthenticated]

    def list(self, request):
        """Public plan list for landing and subscribe pages."""
        plans = SubscriptionPlan.objects.filter(is_active=True).order_by("sort_order", "price", "name")
        serializer = SubscriptionPlanSerializer(plans, many=True)
        return Response(serializer.data)

    # ── Subscribe ──────────────────────────────────────────────────────────────

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def subscribe(self, request):
        """
        Create or update user subscription.

        Request body:
            { "plan": "Monthly" | "Quarterly" | "Annual" }

        Returns:
            { isSubscribed, plan, status, endDate, daysRemaining }
        """
        serializer = SubscribeRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        plan_id = serializer.validated_data.get("planId")
        plan_name = serializer.validated_data.get("plan")
        user = request.user

        try:
            if plan_id:
                plan = SubscriptionPlan.objects.filter(id=plan_id, is_active=True).first()
            else:
                plan = SubscriptionPlan.objects.filter(name=plan_name, is_active=True).first()

            if not plan:
                return Response(
                    {"detail": "Selected subscription plan was not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            end_date = timezone.now() + timedelta(days=plan.duration_days)
            subscription, created = Subscription.objects.update_or_create(
                user=user,
                defaults={
                    "subscription_plan": plan,
                    "plan": plan.name,
                    "status": "active",
                    "end_date": end_date,
                },
            )

            # On resubscription, clear the previously assigned nutritionist so
            # the user is forced through the nutritionist selection step again.
            if not created:
                UserProfile.objects.filter(user=user).update(managed_by=None)

            # Record a Transaction row for every activation so the admin
            # revenue page can show real transaction history.
            Transaction.objects.create(
                user=user,
                subscription=subscription,
                plan=plan.name,
                amount=plan.price,
                method="Direct",
                status="Paid",
            )

            response_serializer = SubscriptionResponseSerializer(subscription)
            return Response(
                response_serializer.data,
                status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
            )

        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    # ── Unsubscribe ────────────────────────────────────────────────────────────

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def unsubscribe(self, request):
        """
        Cancel user subscription.

        Returns:
            { isSubscribed: false, plan, status: "cancelled", endDate, daysRemaining }
        """
        user = request.user

        try:
            subscription = Subscription.objects.get(user=user)
            subscription.status = "cancelled"
            subscription.save()

            # Clear the assigned nutritionist so a cancelled user
            # sees no pre-assignment on the Nutritionists page.
            UserProfile.objects.filter(user=user).update(managed_by=None)

            response_serializer = SubscriptionResponseSerializer(subscription)
            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except Subscription.DoesNotExist:
            # No subscription found — return a safe empty response
            response_serializer = SubscriptionResponseSerializer(None)
            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    # ── Get subscription status ────────────────────────────────────────────────

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def get_subscription(self, request):
        """
        Get current subscription status for the authenticated user.

        Returns:
            {
                "isSubscribed":    bool,
                "plan":            string | null,
                "status":          "active" | "cancelled" | null,
                "endDate":         datetime | null,
                "daysRemaining":   int
            }
        """
        user = request.user

        try:
            subscription = Subscription.objects.get(user=user)
        except Subscription.DoesNotExist:
            subscription = None

        response_serializer = SubscriptionResponseSerializer(subscription)
        return Response(response_serializer.data, status=status.HTTP_200_OK)

    def get_permissions(self):
        if self.action == "list":
            return [AllowAny()]
        return super().get_permissions()