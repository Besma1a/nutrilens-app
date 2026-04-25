from datetime import datetime, time, timedelta

from django.db.models import Avg, Sum
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

from consultations.models import Nutritionist, Consultation
from meals.models import Meal
from profiles.models import UserProfile, DietPlan, WeightEntry


def _nutritionist_record_for_user(user):
    if not getattr(user, "is_nutritionist", False):
        return None
    try:
        return Nutritionist.objects.get(email=user.email, is_active=True)
    except Nutritionist.DoesNotExist:
        return None


def _managed_patient_user_ids(nutritionist_user):
    return list(
        UserProfile.objects.filter(managed_by=nutritionist_user).values_list(
            "user_id", flat=True
        )
    )


def _local_day_bounds(day):
    """Return [start, end) datetimes (aware) for calendar `day` in the default timezone."""
    tz = timezone.get_current_timezone()
    start = timezone.make_aware(datetime.combine(day, time.min), tz)
    return start, start + timedelta(days=1)


def _short_ago(dt):
    if not dt:
        return ""
    now = timezone.now()
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, timezone.get_current_timezone())
    secs = int((now - dt).total_seconds())
    if secs < 45:
        return "Just now"
    if secs < 3600:
        m = max(1, secs // 60)
        return f"{m} min ago"
    if secs < 86400:
        h = max(1, secs // 3600)
        return f"{h} hr ago"
    d = secs // 86400
    return "1 day ago" if d == 1 else f"{d} days ago"


WEEKDAY_LABEL = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


class DashboardStatsView(APIView):
    """
    GET /api/dashboard/stats
    GET /api/v1/dashboard/stats

    Aggregates clients (managed profiles), consultations, and active diet plans.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not getattr(request.user, "is_nutritionist", False):
            return Response(
                {"detail": "Only nutritionists can access dashboard stats."},
                status=status.HTTP_403_FORBIDDEN,
            )

        user = request.user
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        total_clients = UserProfile.objects.filter(managed_by=user).count()
        active_meal_plans = DietPlan.objects.filter(assigned_by=user, is_active=True).count()
        new_clients_this_month = UserProfile.objects.filter(
            managed_by=user,
            created_at__gte=month_start,
        ).count()

        nut = _nutritionist_record_for_user(user)
        upcoming_statuses = ("pending", "confirmed")
        if nut:
            upcoming_qs = (
                Consultation.objects.filter(
                    nutritionist=nut,
                    scheduled_at__gte=now,
                    status__in=upcoming_statuses,
                )
                .select_related("user")
                .order_by("scheduled_at")
            )
            upcoming_sessions = upcoming_qs.count()
            next_slice = list(upcoming_qs[:10])
        else:
            upcoming_sessions = 0
            next_slice = []

        next_sessions = []
        for c in next_slice:
            u = c.user
            client_name = (u.get_full_name() or "").strip() or u.username
            dt = timezone.localtime(c.scheduled_at)
            next_sessions.append(
                {
                    "clientName": client_name,
                    "date": dt.strftime("%Y-%m-%d"),
                    "time": dt.strftime("%H:%M"),
                }
            )

        return Response(
            {
                "totalClients": total_clients,
                "upcomingSessions": upcoming_sessions,
                "activeMealPlans": active_meal_plans,
                "newClientsThisMonth": new_clients_this_month,
                "nextSessions": next_sessions,
            }
        )


class DashboardWeeklyCaloriesView(APIView):
    """
    GET /api/v1/dashboard/weekly-calories/

    Last 7 local calendar days: summed cohort calories from managed patients' meals
    vs average daily calorie goal across those profiles.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not getattr(request.user, "is_nutritionist", False):
            return Response(
                {"detail": "Only nutritionists can access this endpoint."},
                status=status.HTTP_403_FORBIDDEN,
            )

        user = request.user
        patient_ids = _managed_patient_user_ids(user)
        avg_goal = UserProfile.objects.filter(managed_by=user).aggregate(
            a=Avg("daily_calorie_goal")
        )["a"]
        target = int(round(avg_goal or 1800))

        today = timezone.localdate()
        out = []
        for i in range(6, -1, -1):
            day = today - timedelta(days=i)
            start, end = _local_day_bounds(day)
            total = 0.0
            if patient_ids:
                agg = Meal.objects.filter(
                    user_id__in=patient_ids,
                    logged_at__gte=start,
                    logged_at__lt=end,
                ).aggregate(s=Sum("total_calories"))
                total = float(agg["s"] or 0)
            out.append(
                {
                    "id": 7 - i,
                    "day": WEEKDAY_LABEL[day.weekday()],
                    "intake": int(round(total)),
                    "target": target,
                }
            )
        return Response(out)


class DashboardActivityView(APIView):
    """
    GET /api/v1/dashboard/activity/

    Recent meals and weight entries for patients managed by this nutritionist.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not getattr(request.user, "is_nutritionist", False):
            return Response(
                {"detail": "Only nutritionists can access this endpoint."},
                status=status.HTTP_403_FORBIDDEN,
            )

        user = request.user
        patient_ids = _managed_patient_user_ids(user)
        if not patient_ids:
            return Response([])

        events = []

        for m in (
            Meal.objects.filter(user_id__in=patient_ids)
            .select_related("user")
            .order_by("-logged_at")[:15]
        ):
            u = m.user
            name = (u.get_full_name() or "").strip() or u.username
            events.append(
                {
                    "_ts": m.logged_at,
                    "id": f"meal-{m.id}",
                    "icon": "utensils",
                    "bg": "#dcfce7",
                    "text": f"{name} logged {m.meal_type} – {int(round(m.total_calories))} kcal",
                    "time": _short_ago(m.logged_at),
                }
            )

        for w in (
            WeightEntry.objects.filter(user_id__in=patient_ids)
            .select_related("user")
            .order_by("-logged_at")[:10]
        ):
            u = w.user
            name = (u.get_full_name() or "").strip() or u.username
            events.append(
                {
                    "_ts": w.logged_at,
                    "id": f"weight-{w.id}",
                    "icon": "trending",
                    "bg": "#dbeafe",
                    "text": f"{name} logged weight {w.weight_kg} kg",
                    "time": _short_ago(w.logged_at),
                }
            )

        events.sort(key=lambda x: x["_ts"], reverse=True)
        out = [{k: v for k, v in row.items() if k != "_ts"} for row in events[:20]]
        return Response(out)
