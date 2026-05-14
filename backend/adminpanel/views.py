from collections import Counter
from decimal import Decimal
import random

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone
from django.utils.crypto import get_random_string
from rest_framework.authtoken.models import Token
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from blogs.models import Blog
from consultations.models import Consultation, ConsultationFeedback, Nutritionist
from profiles.models import UserProfile
from profiles.models import DietPlanTemplate
from subscriptions.models import Subscription, SubscriptionPlan
from subscriptions.serializers import SubscriptionPlanSerializer

from .auth import create_admin_token, hash_password, humanize_age, verify_password
from .models import (
    AdminAccount,
    AdminNotification,
    NewsletterSubscriber,
    NutritionistAdminProfile,
    SupportTicket,
    SupportTicketMessage,
    Testimonial,
    Transaction,
)
from .permissions import AdminAuth

User = get_user_model()
PLAN_PRICES = {
    "free": Decimal("0"),
    "pro": Decimal("9.99"),
    "premium": Decimal("19.99"),
}


def _plan_price(subscription):
    plan_obj = getattr(subscription, "subscription_plan", None)
    if plan_obj and plan_obj.price is not None:
        return Decimal(plan_obj.price)
    return PLAN_PRICES.get((subscription.plan or "").lower(), Decimal("0"))


def _is_paid_subscription(subscription):
    return _plan_price(subscription) > 0


def paginate_queryset(request, queryset, default_limit=10):
    page = max(int(request.query_params.get("page", 1)), 1)
    limit = max(int(request.query_params.get("limit", default_limit)), 1)
    total = queryset.count()
    total_pages = (total + limit - 1) // limit if total else 1
    start = (page - 1) * limit
    return queryset[start : start + limit], total, total_pages


def _paginate_list(request, data, default_limit=10):
    page = max(int(request.query_params.get("page", 1)), 1)
    limit = max(int(request.query_params.get("limit", default_limit)), 1)
    total = len(data)
    total_pages = (total + limit - 1) // limit if total else 1
    start = (page - 1) * limit
    return data[start : start + limit], total, total_pages


def _build_mock_revenue_payload():
    now = timezone.now()
    monthly_revenue = []
    for months_back in range(5, -1, -1):
        d = now - timezone.timedelta(days=30 * months_back)
        # Smooth synthetic growth curve with gentle variance.
        month_index = 5 - months_back
        revenue = 5200 + month_index * 850 + ((month_index % 3) - 1) * 220
        monthly_revenue.append({"m": d.strftime("%b"), "r": revenue})

    revenue_by_plan = [
        {"name": "Starter", "value": 4200},
        {"name": "Pro", "value": 9800},
        {"name": "Premium", "value": 13600},
    ]

    mrr = sum(item["value"] for item in revenue_by_plan)
    new_revenue = monthly_revenue[-1]["r"] if monthly_revenue else 0

    return {
        "mrr": float(mrr),
        "newRevenue": float(new_revenue),
        "churn": 2.4,
        "refundsTotal": 740.0,
        "monthlyRevenue": monthly_revenue,
        "revenueByPlan": revenue_by_plan,
    }


def _build_mock_transactions():
    first_names = ["Amine", "Sara", "Maya", "Yassine", "Nour", "Adam", "Lina", "Yara"]
    last_names = ["B.", "A.", "K.", "M.", "R.", "T.", "H.", "Z."]
    plans = [("Starter", 19), ("Pro", 39), ("Premium", 69)]
    statuses = ["Paid", "Paid", "Paid", "Refunded", "Failed"]
    methods = ["Card", "PayPal", "Apple Pay"]

    rng = random.Random(42)
    now = timezone.now()
    rows = []
    for i in range(36):
        plan_name, base_amount = plans[i % len(plans)]
        status = statuses[i % len(statuses)]
        amount = float(base_amount + rng.randint(0, 8))
        created_at = now - timezone.timedelta(days=i * 3)
        rows.append(
            {
                "id": f"demo-tx-{1000 + i}",
                "user": f"{first_names[i % len(first_names)]} {last_names[i % len(last_names)]}",
                "plan": plan_name,
                "amount": amount,
                "date": created_at.strftime("%b %d"),
                "method": methods[i % len(methods)],
                "status": status,
                "refundStatus": "Processed" if status == "Refunded" else None,
            }
        )
    return rows


class AdminLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        password = (request.data.get("password") or "").strip()
        if not email or not password:
            return Response({"detail": "Email and password are required."}, status=400)
        try:
            admin = AdminAccount.objects.get(email=email)
        except AdminAccount.DoesNotExist:
            return Response({"detail": "Invalid credentials."}, status=401)
        if not verify_password(password, admin.password_hash):
            return Response({"detail": "Invalid credentials."}, status=401)
        token = create_admin_token(admin)
        return Response(
            {
                "token": token,
                "admin": {"name": admin.name, "email": admin.email, "role": admin.role},
            }
        )


class AdminMeView(APIView):
    permission_classes = [AdminAuth]

    def get(self, request):
        admin = request.admin
        return Response({"name": admin.name, "email": admin.email, "role": admin.role})


class AdminProfileView(APIView):
    permission_classes = [AdminAuth]

    def get(self, request):
        admin = request.admin
        return Response(
            {
                "name": admin.name,
                "email": admin.email,
                "phone": admin.phone,
                "role": admin.role,
                "timezone": admin.timezone,
                "bio": admin.bio,
            }
        )

    def put(self, request):
        admin = request.admin
        admin.name = request.data.get("name", admin.name)
        admin.phone = request.data.get("phone", admin.phone)
        admin.timezone = request.data.get("timezone", admin.timezone)
        admin.bio = request.data.get("bio", admin.bio)
        admin.save(update_fields=["name", "phone", "timezone", "bio", "updated_at"])
        return self.get(request)


class AdminPasswordView(APIView):
    permission_classes = [AdminAuth]

    def put(self, request):
        admin = request.admin
        current = request.data.get("currentPassword") or ""
        new_pw = request.data.get("newPassword") or ""
        if not verify_password(current, admin.password_hash):
            return Response({"detail": "Current password is incorrect."}, status=400)
        admin.password_hash = hash_password(new_pw)
        admin.save(update_fields=["password_hash", "updated_at"])
        return Response({"detail": "Password updated successfully."})


class AdminStatsView(APIView):
    permission_classes = [AdminAuth]

    def get(self, request):
        total_users = User.objects.filter(is_nutritionist=False).count()
        total_nutritionists = Nutritionist.objects.count()
        active_subscriptions = Subscription.objects.filter(status="active").count()
        open_tickets = SupportTicket.objects.exclude(status__in=["Resolved", "Closed"]).count()

        now = timezone.now()
        user_growth = []
        for months_back in range(5, -1, -1):
            d = now - timezone.timedelta(days=30 * months_back)
            month_start = d.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            next_month = (month_start + timezone.timedelta(days=32)).replace(day=1)
            count = User.objects.filter(created_at__gte=month_start, created_at__lt=next_month).count()
            user_growth.append({"m": month_start.strftime("%b"), "u": count})

        dist_counter = Counter(Subscription.objects.values_list("plan", flat=True))
        subscription_distribution = [
            {"name": name, "value": val} for name, val in sorted(dist_counter.items())
        ]

        recent_activity = []
        for user in User.objects.order_by("-created_at")[:10]:
            recent_activity.append(
                {
                    "name": f"{user.first_name} {user.last_name}".strip() or user.username,
                    "action": "Registered account",
                    "time": humanize_age(user.created_at),
                    "status": "Active" if user.is_active else "Suspended",
                }
            )

        return Response(
            {
                "totalUsers": total_users,
                "totalNutritionists": total_nutritionists,
                "activeSubscriptions": active_subscriptions,
                "openTickets": open_tickets,
                "userGrowth": user_growth,
                "subscriptionDistribution": subscription_distribution,
                "recentActivity": recent_activity,
            }
        )


class AdminUsersView(APIView):
    permission_classes = [AdminAuth]

    def get(self, request):
        qs = User.objects.filter(is_nutritionist=False).order_by("-created_at")
        search = (request.query_params.get("search") or "").strip()
        status_q = request.query_params.get("status")
        plan_q = request.query_params.get("plan")
        if search:
            qs = qs.filter(
                Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(email__icontains=search)
                | Q(username__icontains=search)
            )
        if status_q and status_q != "All Status":
            qs = qs.filter(is_active=(status_q == "Active"))
        rows, total, total_pages = paginate_queryset(request, qs)
        data = []
        for u in rows:
            sub = getattr(u, "subscription", None)
            if not sub:
                plan = "Unsubscribed"
                plan_status = "Unsubscribed"
            else:
                plan_status = "Cancelled" if sub.status == "cancelled" else "Active"
                plan = sub.plan if sub.status == "active" else f"{sub.plan} (Cancelled)"

            if plan_q and plan_q != "All Plans" and plan != plan_q and plan_status != plan_q:
                continue
            data.append(
                {
                    "id": u.id,
                    "name": f"{u.first_name} {u.last_name}".strip() or u.username,
                    "email": u.email,
                    "plan": plan,
                    "planStatus": plan_status,
                    "status": "Active" if u.is_active else "Suspended",
                    "joined": u.created_at.strftime("%b %d, %Y"),
                    "phone": "",
                    "consultations": u.consultations.count(),
                    "notes": u.bio or "",
                }
            )
        return Response({"users": data, "total": total, "totalPages": total_pages})


class AdminUserDetailView(APIView):
    permission_classes = [AdminAuth]

    def put(self, request, user_id):
        user = User.objects.get(id=user_id)
        full_name = (request.data.get("name") or "").split(" ", 1)
        if full_name and full_name[0]:
            user.first_name = full_name[0]
            user.last_name = full_name[1] if len(full_name) > 1 else ""
        user.email = request.data.get("email", user.email)
        user.is_active = request.data.get("status", "Active") != "Suspended"
        user.bio = request.data.get("notes", user.bio)
        user.save()
        return Response({"detail": "User updated."})

    def delete(self, request, user_id):
        user = User.objects.filter(id=user_id).first()
        if not user:
            return Response(status=204)
        Token.objects.filter(user=user).delete()
        user.delete()
        return Response(status=204)


class AdminUserBanView(APIView):
    permission_classes = [AdminAuth]

    def patch(self, request, user_id):
        user = User.objects.get(id=user_id)
        user.is_active = not user.is_active
        user.save(update_fields=["is_active"])
        return Response({"status": "Active" if user.is_active else "Suspended"})


class AdminNutritionistsView(APIView):
    permission_classes = [AdminAuth]

    def get(self, request):
        qs = Nutritionist.objects.all().order_by("-created_at")
        search = (request.query_params.get("search") or "").strip()
        status_q = request.query_params.get("status")
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(email__icontains=search))
        if status_q and status_q != "All Status":
            qs = qs.filter(admin_profile__status=status_q)
        rows, total, total_pages = paginate_queryset(request, qs)
        items = []
        for n in rows:
            admin_profile, _ = NutritionistAdminProfile.objects.get_or_create(nutritionist=n)
            patients_count = 0
            if admin_profile.linked_user:
                patients_count = UserProfile.objects.filter(managed_by=admin_profile.linked_user).count()
            items.append(
                {
                    "id": n.id,
                    "name": n.name,
                    "email": n.email,
                    "phone": n.phone or "",
                    "specialization": n.specialization,
                    "licenseNumber": n.credentials or "",
                    "clinic": n.availability_url or "",
                    "status": admin_profile.status,
                    "joined": n.created_at.strftime("%b %d, %Y"),
                    "patientsCount": patients_count,
                }
            )
        return Response({"nutritionists": items, "total": total, "totalPages": total_pages})

    def post(self, request):
        temp_password = f"Temp{get_random_string(6)}!"
        n = Nutritionist.objects.create(
            name=request.data.get("name", ""),
            email=request.data.get("email", ""),
            phone=request.data.get("phone"),
            specialization=request.data.get("specialization", "general"),
            credentials=request.data.get("licenseNumber", ""),
            availability_url=request.data.get("clinic", ""),
            is_active=True,
        )
        username_seed = (request.data.get("email", "").split("@")[0] or f"nutri{n.id}")[:25]
        username = f"{username_seed}_{n.id}"
        linked_user = User.objects.create(
            username=username,
            email=request.data.get("email", ""),
            first_name=(request.data.get("name", "") or "").split(" ")[0],
            last_name=" ".join((request.data.get("name", "") or "").split(" ")[1:]),
            is_nutritionist=True,
            is_active=True,
        )
        linked_user.set_password(temp_password)
        linked_user.save(update_fields=["password"])

        NutritionistAdminProfile.objects.create(
            nutritionist=n, linked_user=linked_user, status="Approved"
        )

        return Response(
            {"id": n.id, "tempPassword": temp_password, "status": "Approved"}, status=201
        )


class AdminNutritionistDetailView(APIView):
    permission_classes = [AdminAuth]

    def put(self, request, nutritionist_id):
        n = Nutritionist.objects.get(id=nutritionist_id)
        n.name = request.data.get("name", n.name)
        n.email = request.data.get("email", n.email)
        n.phone = request.data.get("phone", n.phone)
        n.specialization = request.data.get("specialization", n.specialization)
        n.credentials = request.data.get("licenseNumber", n.credentials)
        n.availability_url = request.data.get("clinic", n.availability_url)
        n.save()
        return Response({"detail": "Nutritionist updated."})

    def delete(self, request, nutritionist_id):
        Nutritionist.objects.filter(id=nutritionist_id).delete()
        return Response(status=204)


class AdminNutritionistStatusView(APIView):
    permission_classes = [AdminAuth]

    def patch(self, request, nutritionist_id):
        n = Nutritionist.objects.get(id=nutritionist_id)
        status_value = request.data.get("status", "Pending")
        admin_profile, _ = NutritionistAdminProfile.objects.get_or_create(nutritionist=n)
        admin_profile.status = status_value
        admin_profile.save(update_fields=["status"])
        n.is_active = status_value == "Approved"
        n.save(update_fields=["is_active"])
        if admin_profile.linked_user:
            admin_profile.linked_user.is_active = status_value not in ["Suspended", "Rejected"]
            admin_profile.linked_user.save(update_fields=["is_active"])
        return Response({"status": status_value})


class AdminSubscriptionsView(APIView):
    permission_classes = [AdminAuth]

    def get(self, request):
        qs = Subscription.objects.select_related("user").order_by("-created_at")
        search = (request.query_params.get("search") or "").strip()
        plan = request.query_params.get("plan")
        if search:
            qs = qs.filter(
                Q(user__email__icontains=search)
                | Q(user__first_name__icontains=search)
                | Q(user__last_name__icontains=search)
            )
        if plan and plan != "All Plans":
            qs = qs.filter(plan=plan)
        rows, total, total_pages = paginate_queryset(request, qs)
        data = []
        for s in rows:
            user_name = f"{s.user.first_name} {s.user.last_name}".strip() or s.user.username
            data.append(
                {
                    "id": s.id,
                    "user": user_name,
                    "email": s.user.email,
                    "plan": s.plan,
                    "status": "Active" if s.status == "active" else "Cancelled",
                    "startDate": s.start_date.date().isoformat(),
                    "nextBilling": s.end_date.date().isoformat(),
                    "amount": float(getattr(getattr(s, "subscription_plan", None), "price", 0) or 0),
                }
            )
        return Response({"subscriptions": data, "total": total, "totalPages": total_pages})


class AdminSubscriptionPlansView(APIView):
    permission_classes = [AdminAuth]

    def get(self, request):
        plans = SubscriptionPlan.objects.order_by("sort_order", "price", "name")
        return Response({"plans": SubscriptionPlanSerializer(plans, many=True).data})

    def post(self, request):
        serializer = SubscriptionPlanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=201)


class AdminSubscriptionPlanDetailView(APIView):
    permission_classes = [AdminAuth]

    def put(self, request, plan_id):
        plan = SubscriptionPlan.objects.get(id=plan_id)
        serializer = SubscriptionPlanSerializer(plan, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, plan_id):
        plan = SubscriptionPlan.objects.filter(id=plan_id).first()
        if not plan:
            return Response(status=204)
        plan.delete()
        return Response(status=204)


class AdminSubscriptionCancelView(APIView):
    permission_classes = [AdminAuth]

    def patch(self, request, subscription_id):
        s = Subscription.objects.get(id=subscription_id)
        s.status = "cancelled"
        s.save(update_fields=["status"])
        return Response({"status": "Cancelled"})


class AdminContentView(APIView):
    permission_classes = [AdminAuth]

    def get(self, request):
        # Get search and filter params
        search = (request.query_params.get("search") or "").strip()
        type_q = request.query_params.get("type")
        status_q = request.query_params.get("status")
        
        items = []
        
        # Get blogs
        blog_qs = Blog.objects.select_related("author").order_by("-created_at")
        if search:
            blog_qs = blog_qs.filter(Q(title__icontains=search) | Q(author__username__icontains=search))
        if status_q and status_q != "All Status":
            blog_qs = blog_qs.filter(moderation_status=status_q)
        
        for b in blog_qs:
            author = (
                f"{b.author.first_name} {b.author.last_name}".strip() or b.author.username
            )
            risk = "Low"
            text = (b.content or "").lower()
            if any(flag in text for flag in ["extreme", "starve", "dangerous"]):
                risk = "High"
            elif any(flag in text for flag in ["fast", "detox"]):
                risk = "Medium"
            items.append(
                {
                    "id": f"blog_{b.id}",
                    "title": b.title,
                    "type": "Blog Article",
                    "author": author,
                    "date": b.created_at.strftime("%b %d"),
                    "status": b.moderation_status,
                    "risk": risk,
                    "body": b.excerpt or b.content[:280],
                    "content_type": "blog",
                }
            )
        
        # Get diet plans
        diet_qs = DietPlanTemplate.objects.select_related("created_by").order_by("-created_at")
        if search:
            diet_qs = diet_qs.filter(Q(title__icontains=search) | Q(created_by__username__icontains=search))
        if status_q and status_q != "All Status":
            diet_qs = diet_qs.filter(moderation_status=status_q)
        
        for d in diet_qs:
            author = "System"
            if d.created_by:
                author = (
                    f"{d.created_by.first_name} {d.created_by.last_name}".strip()
                    or d.created_by.username
                )
            risk = "Low"  # Diet plans are generally low risk
            items.append(
                {
                    "id": f"diet_{d.id}",
                    "title": d.title,
                    "type": "Diet Plan",
                    "author": author,
                    "date": d.created_at.strftime("%b %d"),
                    "status": d.moderation_status,
                    "risk": risk,
                    "body": d.overview[:280] if d.overview else d.description[:280],
                    "content_type": "diet_plan",
                }
            )
        
        # Sort by date descending
        items.sort(key=lambda x: x["date"], reverse=True)
        
        # Filter by type if specified
        if type_q and type_q != "All Types":
            if type_q == "Blog Article":
                items = [i for i in items if i["type"] == "Blog Article"]
            elif type_q == "Diet Plan":
                items = [i for i in items if i["type"] == "Diet Plan"]
        
        # Paginate
        rows, total, total_pages = _paginate_list(request, items, default_limit=8)
        
        return Response({"items": rows, "total": total, "totalPages": total_pages})


def _notify_users_new_blog(blog):
    """
    Create an in-app Notification for every registered user (non-nutritionist,
    non-staff) when a blog post is approved and published.
    Uses bulk_create for efficiency — one DB round-trip regardless of user count.
    """
    from notifications.models import Notification

    author_name = blog.author.get_full_name() or blog.author.username
    excerpt = (blog.excerpt or blog.content[:120]).rstrip()
    if len(blog.content) > 120 and not blog.excerpt:
        excerpt += "…"

    users = User.objects.filter(
        is_active=True,
        is_staff=False,
        is_superuser=False,
        is_nutritionist=False,
    ).values_list("id", flat=True)

    notifications = [
        Notification(
            recipient_id=uid,
            actor=blog.author,
            notification_type=Notification.TYPE_SYSTEM,
            title=f"New article: {blog.title}",
            message=f"By {author_name} — {excerpt}",
            link=f"/blog/{blog.id}",
        )
        for uid in users
    ]
    if notifications:
        Notification.objects.bulk_create(notifications, ignore_conflicts=True)


class AdminContentApproveView(APIView):
    permission_classes = [AdminAuth]

    def patch(self, request, content_id):
        # Parse content_type and ID from content_id (format: "blog_1" or "diet_1")
        parts = content_id.split("_", 1)
        if len(parts) != 2:
            return Response({"error": "Invalid content ID"}, status=400)

        content_type, obj_id = parts

        if content_type == "blog":
            blog = Blog.objects.get(id=obj_id)
            blog.moderation_status = Blog.STATUS_APPROVED
            blog.is_published = True
            blog.save(update_fields=["moderation_status", "is_published"])
            # Push an in-app notification to all registered users.
            _notify_users_new_blog(blog)
        elif content_type == "diet":
            diet = DietPlanTemplate.objects.get(id=obj_id)
            diet.moderation_status = DietPlanTemplate.STATUS_APPROVED
            diet.is_published = True
            diet.save(update_fields=["moderation_status", "is_published"])
        else:
            return Response({"error": "Unknown content type"}, status=400)

        return Response({"status": "Approved"})


class AdminContentRejectView(APIView):
    permission_classes = [AdminAuth]

    def patch(self, request, content_id):
        # Parse content_type and ID from content_id
        parts = content_id.split("_", 1)
        if len(parts) != 2:
            return Response({"error": "Invalid content ID"}, status=400)
        
        content_type, obj_id = parts
        
        if content_type == "blog":
            blog = Blog.objects.get(id=obj_id)
            blog.moderation_status = Blog.STATUS_REJECTED
            blog.is_published = False
            blog.save(update_fields=["moderation_status", "is_published"])
        elif content_type == "diet":
            diet = DietPlanTemplate.objects.get(id=obj_id)
            diet.moderation_status = DietPlanTemplate.STATUS_REJECTED
            diet.is_published = False
            diet.save(update_fields=["moderation_status", "is_published"])
        else:
            return Response({"error": "Unknown content type"}, status=400)
        
        return Response({"status": "Rejected"})


class AdminDietPlansView(APIView):
    """
    Admin moderation queue for diet plan templates.
    GET /api/admin/diet-plans?search=&status=
    """

    permission_classes = [AdminAuth]

    def get(self, request):
        qs = DietPlanTemplate.objects.select_related("created_by").order_by("-created_at")
        search = (request.query_params.get("search") or "").strip()
        status_q = request.query_params.get("status")
        if search:
            qs = qs.filter(
                Q(title__icontains=search) | Q(created_by__username__icontains=search)
            )
        if status_q and status_q != "All Status":
            qs = qs.filter(moderation_status=status_q)

        rows, total, total_pages = paginate_queryset(request, qs, default_limit=8)
        items = []
        for t in rows:
            author = "System"
            if t.created_by:
                author = (
                    f"{t.created_by.first_name} {t.created_by.last_name}".strip()
                    or t.created_by.username
                )
            items.append(
                {
                    "id": t.id,
                    "title": t.title,
                    "type": "Diet Plan",
                    "author": author,
                    "date": t.created_at.strftime("%b %d"),
                    "status": t.moderation_status,
                    "risk": "Low",
                    "body": (t.description or "")[:280],
                }
            )

        return Response({"items": items, "total": total, "totalPages": total_pages})


class AdminDietPlanApproveView(APIView):
    permission_classes = [AdminAuth]

    def patch(self, request, template_id):
        t = DietPlanTemplate.objects.get(id=template_id)
        t.moderation_status = DietPlanTemplate.STATUS_APPROVED
        t.is_published = True
        t.save(update_fields=["moderation_status", "is_published"])
        return Response({"status": "Approved"})


class AdminDietPlanRejectView(APIView):
    permission_classes = [AdminAuth]

    def patch(self, request, template_id):
        t = DietPlanTemplate.objects.get(id=template_id)
        t.moderation_status = DietPlanTemplate.STATUS_REJECTED
        t.is_published = False
        t.save(update_fields=["moderation_status", "is_published"])
        return Response({"status": "Rejected"})


class PublicTestimonialsView(APIView):
    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated()]
        return [AllowAny()]

    def get(self, request):
        qs = Testimonial.objects.filter(status="Approved").order_by("-created_at")
        items = [
            {
                "id": t.id,
                "name": t.name,
                "plan": t.plan,
                "rating": t.rating,
                "text": t.text,
                "featured": t.featured,
                "createdAt": t.created_at.isoformat(),
            }
            for t in qs
        ]
        return Response({"testimonials": items})

    def post(self, request):
        text = (request.data.get("text") or "").strip()
        if len(text) < 30:
            return Response(
                {"detail": "Testimonial text must be at least 30 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        name = (request.data.get("name") or "").strip()
        if not name:
            full_name = (
                f"{request.user.first_name} {request.user.last_name}".strip()
                if request.user.is_authenticated
                else ""
            )
            name = full_name or getattr(request.user, "username", "Anonymous")

        rating = int(request.data.get("rating") or 5)
        rating = min(max(rating, 1), 5)

        t = Testimonial.objects.create(
            user=request.user,
            name=name,
            plan=(request.data.get("plan") or "Basic")[:40],
            rating=rating,
            text=text,
            status="Pending",
            featured=False,
        )

        # Admin notification (best-effort)
        try:
            AdminNotification.create(
                title="New testimonial pending review",
                message=f"{name} submitted a testimonial.",
                notification_type=AdminNotification.TYPE_TESTIMONIAL,
                link="/admin#testimonials",
            )
        except Exception:
            pass
        return Response(
            {"id": t.id, "status": t.status, "detail": "Submitted for admin review."},
            status=status.HTTP_201_CREATED,
        )


class AdminTicketsView(APIView):
    permission_classes = [AdminAuth]

    def get(self, request):
        qs = SupportTicket.objects.prefetch_related("messages").order_by("-created_at")
        search = (request.query_params.get("search") or "").strip()
        status_q = request.query_params.get("status")
        if search:
            qs = qs.filter(
                Q(contact_name__icontains=search)
                | Q(contact_email__icontains=search)
                | Q(message__icontains=search)
                | Q(user__email__icontains=search)
            )
        if status_q and status_q != "All Status":
            qs = qs.filter(status=status_q)
        rows, total, total_pages = paginate_queryset(request, qs)
        tickets = []
        for t in rows:
            user_name = f"{t.user.first_name} {t.user.last_name}".strip() if t.user else ""
            user_email = t.user.email if t.user else ""
            first_user_message = next((m for m in t.messages.all() if m.role == "user"), None)
            tickets.append(
                {
                    "id": t.id,
                    "name": t.contact_name or (first_user_message.from_name if first_user_message else user_name) or "Unknown",
                    "email": t.contact_email or user_email,
                    "message": t.message or (first_user_message.text if first_user_message else ""),
                    "date": t.created_at.strftime("%b %d"),
                    "status": t.status,
                }
            )
        return Response({"tickets": tickets, "total": total, "totalPages": total_pages})


class AdminTicketStatusView(APIView):
    permission_classes = [AdminAuth]

    def patch(self, request, ticket_id):
        ticket = SupportTicket.objects.get(id=ticket_id)
        next_status = request.data.get("status", ticket.status)
        if next_status not in ["Open", "Resolved"]:
            return Response({"detail": "Invalid status."}, status=400)
        ticket.status = next_status
        ticket.save(update_fields=["status", "updated_at"])
        return Response({"status": ticket.status})


class PublicSupportTicketCreateView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        name = (request.data.get("name") or "").strip()
        email = (request.data.get("email") or "").strip().lower()
        message = (request.data.get("message") or "").strip()

        if not name:
            return Response({"name": ["This field is required."]}, status=400)
        if not email:
            return Response({"email": ["This field is required."]}, status=400)
        if not message:
            return Response({"message": ["This field is required."]}, status=400)

        linked_user = None
        if getattr(request.user, "is_authenticated", False):
            linked_user = request.user
        else:
            linked_user = User.objects.filter(email__iexact=email).first()

        ticket = SupportTicket.objects.create(
            user=linked_user,
            contact_name=name,
            contact_email=email,
            message=message,
            subject=f"Support request from {name}",
            priority="Medium",
            status="Open",
            assigned="",
        )
        SupportTicketMessage.objects.create(
            ticket=ticket,
            from_name=name,
            role="user",
            text=message,
        )

        # Admin notification (best-effort)
        try:
            AdminNotification.create(
                title="New support ticket",
                message=f"{name} submitted a support request.",
                notification_type=AdminNotification.TYPE_SUPPORT,
                link="/admin#support",
            )
        except Exception:
            pass
        return Response(
            {
                "ticketId": ticket.id,
                "detail": "Support ticket submitted successfully.",
            },
            status=status.HTTP_201_CREATED,
        )


class AdminTicketAssignView(APIView):
    permission_classes = [AdminAuth]

    def patch(self, request, ticket_id):
        ticket = SupportTicket.objects.get(id=ticket_id)
        ticket.assigned = request.data.get("assigned", "")
        ticket.save(update_fields=["assigned", "updated_at"])
        return Response({"assigned": ticket.assigned})


class AdminTicketReplyView(APIView):
    permission_classes = [AdminAuth]

    def post(self, request, ticket_id):
        ticket = SupportTicket.objects.get(id=ticket_id)
        message = SupportTicketMessage.objects.create(
            ticket=ticket,
            from_name=request.admin.name,
            role="admin",
            text=request.data.get("text", ""),
        )
        return Response(
            {
                "from": message.from_name,
                "role": message.role,
                "text": message.text,
                "time": humanize_age(message.created_at),
            },
            status=201,
        )


class AdminNotificationsView(APIView):
    """
    GET /api/admin/notifications?unread_only=true&limit=20
    """

    permission_classes = [AdminAuth]

    def get(self, request):
        qs = AdminNotification.objects.filter(
            Q(recipient__isnull=True) | Q(recipient=request.admin)
        ).order_by("-created_at")

        if request.query_params.get("unread_only", "").lower() in ("1", "true", "yes"):
            qs = qs.filter(is_read=False)

        limit = int(request.query_params.get("limit") or 20)
        limit = max(1, min(limit, 100))
        qs = qs[:limit]

        items = [
            {
                "id": n.id,
                "type": n.notification_type,
                "title": n.title,
                "message": n.message,
                "link": n.link,
                "isRead": n.is_read,
                "createdAt": n.created_at.isoformat(),
            }
            for n in qs
        ]

        unread_count = AdminNotification.objects.filter(
            Q(recipient__isnull=True) | Q(recipient=request.admin),
            is_read=False,
        ).count()

        return Response({"items": items, "unreadCount": unread_count})


class AdminNotificationsMarkAllReadView(APIView):
    permission_classes = [AdminAuth]

    def post(self, request):
        updated = AdminNotification.objects.filter(
            Q(recipient__isnull=True) | Q(recipient=request.admin),
            is_read=False,
        ).update(is_read=True)
        return Response({"markedRead": updated})


class AdminNotificationReadView(APIView):
    permission_classes = [AdminAuth]

    def patch(self, request, notification_id):
        notif = AdminNotification.objects.filter(
            Q(recipient__isnull=True) | Q(recipient=request.admin),
            id=notification_id,
        ).first()
        if not notif:
            return Response({"detail": "Not found."}, status=404)
        notif.is_read = True
        notif.save(update_fields=["is_read", "updated_at"])
        return Response({"id": notif.id, "isRead": True})


class AdminRevenueStatsView(APIView):
    permission_classes = [AdminAuth]

    def get(self, request):
        now = timezone.now()

        # ── MRR: sum plan prices for all currently active subscriptions ──────
        active_subs = Subscription.objects.filter(status="active").select_related("subscription_plan")
        mrr = sum(_plan_price(s) for s in active_subs)

        # ── Monthly revenue: last 6 months, sum Transaction amounts per month ─
        monthly_revenue = []
        for months_back in range(5, -1, -1):
            month_start = (now - timezone.timedelta(days=30 * months_back)).replace(
                day=1, hour=0, minute=0, second=0, microsecond=0
            )
            month_end = (month_start + timezone.timedelta(days=32)).replace(day=1)
            total = Transaction.objects.filter(
                status="Paid",
                created_at__gte=month_start,
                created_at__lt=month_end,
            ).aggregate(total=Sum("amount"))["total"] or Decimal("0")
            monthly_revenue.append({"m": month_start.strftime("%b"), "r": float(total)})

        # ── Revenue by plan: group active subscriptions by plan name ──────────
        plan_buckets = {}
        for s in active_subs:
            name = s.plan or "Unknown"
            plan_buckets[name] = plan_buckets.get(name, Decimal("0")) + _plan_price(s)
        revenue_by_plan = [{"name": k, "value": float(v)} for k, v in sorted(plan_buckets.items())]

        # ── New revenue: Transaction amounts created this calendar month ──────
        month_start_this = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        new_revenue = Transaction.objects.filter(
            status="Paid",
            created_at__gte=month_start_this,
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0")

        # ── Churn: cancelled this month / active at start of month × 100 ─────
        cancelled_this_month = Subscription.objects.filter(
            status="cancelled",
            updated_at__gte=month_start_this,
        ).count()
        active_at_month_start = Subscription.objects.filter(
            status="active",
            created_at__lt=month_start_this,
        ).count()
        churn = round(
            (cancelled_this_month / active_at_month_start * 100) if active_at_month_start else 0.0,
            1,
        )

        # ── Refunds: sum Transaction amounts where status = Refunded ─────────
        refunds_total = Transaction.objects.filter(
            status="Refunded",
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0")

        return Response({
            "mrr": float(mrr),
            "newRevenue": float(new_revenue),
            "churn": churn,
            "refundsTotal": float(refunds_total),
            "monthlyRevenue": monthly_revenue,
            "revenueByPlan": revenue_by_plan,
        })


class AdminRevenueSummaryView(APIView):
    permission_classes = [AdminAuth]

    def get(self, request):
        active_subscriptions = Subscription.objects.filter(status="active").select_related("subscription_plan")
        counts = Counter()
        mrr = Decimal("0")
        for subscription in active_subscriptions:
            plan_name = (subscription.plan or "unknown").lower()
            counts[plan_name] += 1
            mrr += _plan_price(subscription)

        return Response(
            {
                "totalMrr": float(mrr),
                "subscriberCountByPlan": dict(sorted(counts.items())),
            }
        )


class AdminRevenueTrendView(APIView):
    permission_classes = [AdminAuth]

    def get(self, request):
        grouped = (
            Subscription.objects.filter(status="active")
            .select_related("subscription_plan")
            .annotate(month=TruncMonth("created_at"))
            .values("id", "month")
            .order_by("month")
        )
        buckets = {}
        subscriptions = {s.id: s for s in Subscription.objects.filter(id__in=[r["id"] for r in grouped]).select_related("subscription_plan")}
        for row in grouped:
            month = row["month"].strftime("%Y-%m")
            buckets.setdefault(month, Decimal("0"))
            subscription = subscriptions.get(row["id"])
            if subscription:
                buckets[month] += _plan_price(subscription)

        trend = [{"month": month, "mrr": float(mrr)} for month, mrr in buckets.items()]
        return Response({"trend": trend})


class AdminRevenueSubscribersView(APIView):
    permission_classes = [AdminAuth]

    def get(self, request):
        subscriptions = (
            Subscription.objects.filter(status="active")
            .select_related("user")
            .order_by("-created_at")
        )
        subscribers = []
        for subscription in subscriptions:
            if not _is_paid_subscription(subscription):
                continue
            user = subscription.user
            full_name = f"{user.first_name} {user.last_name}".strip() or user.username
            start_at = user.plan_started_at or subscription.created_at
            subscribers.append(
                {
                    "userId": user.id,
                    "name": full_name,
                    "email": user.email,
                    "plan": subscription.plan,
                    "planStartedAt": start_at.isoformat() if start_at else None,
                }
            )
        return Response({"subscribers": subscribers})


class AdminTransactionsView(APIView):
    permission_classes = [AdminAuth]

    def get(self, request):
        qs = Transaction.objects.select_related("user").order_by("-created_at")
        rows, total, total_pages = paginate_queryset(request, qs, default_limit=8)
        data = []
        for t in rows:
            user_name = (
                f"{t.user.first_name} {t.user.last_name}".strip() or t.user.username
                if t.user else "Unknown"
            )
            data.append({
                "id": str(t.id),
                "user": user_name,
                "plan": t.plan,
                "amount": float(t.amount),
                "date": t.created_at.strftime("%b %d"),
                "method": t.method,
                "status": t.status,
                "refundStatus": t.refund_status if t.refund_status != "None" else None,
            })
        return Response({"transactions": data, "total": total, "totalPages": total_pages})


class AdminTransactionRefundView(APIView):
    permission_classes = [AdminAuth]

    def post(self, request, transaction_id):
        t = Transaction.objects.filter(id=transaction_id).first()
        if t:
            t.status = "Refunded"
            t.refund_status = "Processed"
            t.save(update_fields=["status", "refund_status"])
            return Response({"status": "Refunded"})
        return Response({"detail": "Transaction not found."}, status=404)


class AdminTestimonialsView(APIView):
    permission_classes = [AdminAuth]

    def get(self, request):
        qs = Testimonial.objects.order_by("-created_at")
        search = (request.query_params.get("search") or "").strip()
        status_q = request.query_params.get("status")
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(text__icontains=search))
        if status_q and status_q != "All Status":
            qs = qs.filter(status=status_q)
        rows, total, total_pages = paginate_queryset(request, qs, default_limit=5)
        items = [
            {
                "id": t.id,
                "name": t.name,
                "plan": t.plan,
                "date": t.created_at.strftime("%b %d"),
                "rating": t.rating,
                "text": t.text,
                "status": t.status,
                "featured": t.featured,
            }
            for t in rows
        ]
        return Response({"testimonials": items, "total": total, "totalPages": total_pages})


class AdminTestimonialApproveView(APIView):
    permission_classes = [AdminAuth]

    def patch(self, request, testimonial_id):
        t = Testimonial.objects.get(id=testimonial_id)
        t.status = "Approved"
        t.save(update_fields=["status"])
        return Response({"status": "Approved"})


class AdminTestimonialRejectView(APIView):
    permission_classes = [AdminAuth]

    def patch(self, request, testimonial_id):
        t = Testimonial.objects.get(id=testimonial_id)
        t.status = "Rejected"
        t.featured = False
        t.save(update_fields=["status", "featured"])
        return Response({"status": "Rejected"})


class AdminTestimonialFeatureView(APIView):
    permission_classes = [AdminAuth]

    def patch(self, request, testimonial_id):
        t = Testimonial.objects.get(id=testimonial_id)
        t.featured = not t.featured
        t.save(update_fields=["featured"])
        return Response({"featured": t.featured})


class NewsletterSubscribeView(APIView):
    """
    POST /api/v1/newsletter/subscribe/
    Body: { "email": "user@example.com" }

    Public endpoint — no authentication required.
    Returns 201 on first subscription, 200 if the address was already
    registered (idempotent so double-clicks don't surface errors to the user).
    """
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        if not email:
            return Response(
                {"detail": "A valid email address is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        subscriber, created = NewsletterSubscriber.objects.get_or_create(
            email=email,
            defaults={"is_active": True},
        )

        # If the address existed but had been unsubscribed, reactivate it.
        if not created and not subscriber.is_active:
            subscriber.is_active = True
            subscriber.save(update_fields=["is_active"])

        return Response(
            {"detail": "Subscribed successfully."},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )
