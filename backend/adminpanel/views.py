from collections import Counter
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db.models import Count, Q, Sum
from django.utils import timezone
from django.utils.crypto import get_random_string
from rest_framework.authtoken.models import Token
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from blogs.models import Blog
from consultations.models import Consultation, ConsultationFeedback, Nutritionist
from profiles.models import UserProfile
from subscriptions.models import Subscription

from .auth import create_admin_token, hash_password, humanize_age, verify_password
from .models import (
    AdminAccount,
    NutritionistAdminProfile,
    SupportTicket,
    SupportTicketMessage,
    Testimonial,
    Transaction,
)
from .permissions import AdminAuth

User = get_user_model()


def paginate_queryset(request, queryset, default_limit=10):
    page = max(int(request.query_params.get("page", 1)), 1)
    limit = max(int(request.query_params.get("limit", default_limit)), 1)
    total = queryset.count()
    total_pages = (total + limit - 1) // limit if total else 1
    start = (page - 1) * limit
    return queryset[start : start + limit], total, total_pages


class AdminLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        password = request.data.get("password") or ""
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
            is_active=False,
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
            nutritionist=n, linked_user=linked_user, status="Pending"
        )

        return Response(
            {"id": n.id, "tempPassword": temp_password, "status": "Pending"}, status=201
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


class AdminAssignableUsersView(APIView):
    permission_classes = [AdminAuth]

    def get(self, request):
        search = (request.query_params.get("search") or "").strip()
        qs = (
            User.objects.filter(is_nutritionist=False, profile__managed_by__isnull=True, subscription__status="active")
            .select_related("subscription")
            .order_by("-created_at")
        )
        if search:
            qs = qs.filter(
                Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(username__icontains=search)
                | Q(email__icontains=search)
            )
        users = [
            {
                "id": u.id,
                "name": f"{u.first_name} {u.last_name}".strip() or u.username,
                "email": u.email,
                "plan": getattr(getattr(u, "subscription", None), "plan", "Unknown"),
            }
            for u in qs[:200]
        ]
        return Response({"users": users})


class AdminAssignUserToNutritionistView(APIView):
    permission_classes = [AdminAuth]

    def post(self, request, nutritionist_id):
        user_id = request.data.get("userId")
        admin_profile = NutritionistAdminProfile.objects.filter(nutritionist_id=nutritionist_id).select_related("linked_user").first()
        if not admin_profile or not admin_profile.linked_user:
            return Response({"detail": "Nutritionist account is not linked."}, status=400)

        user = User.objects.filter(id=user_id, is_nutritionist=False).first()
        if not user:
            return Response({"detail": "User not found."}, status=404)
        subscription = getattr(user, "subscription", None)
        if not subscription or subscription.status != "active":
            return Response({"detail": "Only active subscribed users can be assigned."}, status=400)

        profile, _ = UserProfile.objects.get_or_create(user=user)
        if profile.managed_by is not None:
            return Response({"detail": "User is already assigned."}, status=400)
        profile.managed_by = admin_profile.linked_user
        profile.save(update_fields=["managed_by", "updated_at"])
        return Response({"detail": "User assigned successfully."})


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
        amount_map = {"Monthly": 29, "Quarterly": 59, "Annual": 99}
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
                    "amount": amount_map.get(s.plan, 0),
                }
            )
        return Response({"subscriptions": data, "total": total, "totalPages": total_pages})


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
        qs = Blog.objects.select_related("author").order_by("-created_at")
        search = (request.query_params.get("search") or "").strip()
        type_q = request.query_params.get("type")
        status_q = request.query_params.get("status")
        if search:
            qs = qs.filter(Q(title__icontains=search) | Q(author__username__icontains=search))
        if type_q and type_q != "All Types":
            pass
        if status_q and status_q != "All Status":
            qs = qs.filter(is_published=(status_q == "Approved"))
        rows, total, total_pages = paginate_queryset(request, qs, default_limit=8)
        items = []
        for b in rows:
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
                    "id": b.id,
                    "title": b.title,
                    "type": "Article",
                    "author": author,
                    "date": b.created_at.strftime("%b %d"),
                    "status": "Approved" if b.is_published else "Pending",
                    "risk": risk,
                    "body": b.excerpt or b.content[:280],
                }
            )
        return Response({"items": items, "total": total, "totalPages": total_pages})


class AdminContentApproveView(APIView):
    permission_classes = [AdminAuth]

    def patch(self, request, content_id):
        blog = Blog.objects.get(id=content_id)
        blog.is_published = True
        blog.save(update_fields=["is_published"])
        return Response({"status": "Approved"})


class AdminContentRejectView(APIView):
    permission_classes = [AdminAuth]

    def patch(self, request, content_id):
        blog = Blog.objects.get(id=content_id)
        blog.is_published = False
        blog.save(update_fields=["is_published"])
        return Response({"status": "Rejected"})


class AdminTicketsView(APIView):
    permission_classes = [AdminAuth]

    def get(self, request):
        qs = SupportTicket.objects.prefetch_related("messages").order_by("-created_at")
        search = (request.query_params.get("search") or "").strip()
        status_q = request.query_params.get("status")
        priority_q = request.query_params.get("priority")
        if search:
            qs = qs.filter(Q(subject__icontains=search) | Q(user__email__icontains=search))
        if status_q and status_q != "All Status":
            qs = qs.filter(status=status_q)
        if priority_q and priority_q != "All Priority":
            qs = qs.filter(priority=priority_q)
        rows, total, total_pages = paginate_queryset(request, qs)
        tickets = []
        for t in rows:
            user_name = (
                f"{t.user.first_name} {t.user.last_name}".strip() if t.user else "Unknown user"
            )
            tickets.append(
                {
                    "id": t.id,
                    "user": user_name,
                    "subject": t.subject,
                    "priority": t.priority,
                    "date": t.created_at.strftime("%b %d"),
                    "status": t.status,
                    "assigned": t.assigned or None,
                    "messages": [
                        {
                            "from": m.from_name,
                            "role": m.role,
                            "text": m.text,
                            "time": humanize_age(m.created_at),
                        }
                        for m in t.messages.all()
                    ],
                }
            )
        return Response({"tickets": tickets, "total": total, "totalPages": total_pages})


class AdminTicketStatusView(APIView):
    permission_classes = [AdminAuth]

    def patch(self, request, ticket_id):
        ticket = SupportTicket.objects.get(id=ticket_id)
        ticket.status = request.data.get("status", ticket.status)
        ticket.save(update_fields=["status", "updated_at"])
        return Response({"status": ticket.status})


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


class AdminRevenueStatsView(APIView):
    permission_classes = [AdminAuth]

    def get(self, request):
        paid_tx = Transaction.objects.filter(status__in=["Paid", "Refunded"])
        mrr = paid_tx.aggregate(v=Sum("amount"))["v"] or Decimal("0")
        new_revenue = Transaction.objects.filter(
            status="Paid", created_at__gte=timezone.now() - timezone.timedelta(days=30)
        ).aggregate(v=Sum("amount"))["v"] or Decimal("0")
        refunds_total = Transaction.objects.filter(status="Refunded").aggregate(v=Sum("amount"))[
            "v"
        ] or Decimal("0")
        total_subscriptions = Subscription.objects.count()
        churn = (
            round(
                Subscription.objects.filter(status="cancelled").count() / total_subscriptions * 100, 1
            )
            if total_subscriptions
            else 0
        )
        monthly_revenue = []
        now = timezone.now()
        for months_back in range(5, -1, -1):
            d = now - timezone.timedelta(days=30 * months_back)
            month_start = d.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            next_month = (month_start + timezone.timedelta(days=32)).replace(day=1)
            month_sum = (
                Transaction.objects.filter(
                    created_at__gte=month_start, created_at__lt=next_month, status__in=["Paid", "Refunded"]
                ).aggregate(v=Sum("amount"))["v"]
                or Decimal("0")
            )
            monthly_revenue.append({"m": month_start.strftime("%b"), "r": float(month_sum)})
        by_plan = Transaction.objects.values("plan").annotate(value=Sum("amount")).order_by("plan")
        return Response(
            {
                "mrr": float(mrr),
                "newRevenue": float(new_revenue),
                "churn": churn,
                "refundsTotal": float(refunds_total),
                "monthlyRevenue": monthly_revenue,
                "revenueByPlan": [
                    {"name": row["plan"], "value": float(row["value"] or 0)} for row in by_plan
                ],
            }
        )


class AdminTransactionsView(APIView):
    permission_classes = [AdminAuth]

    def get(self, request):
        tx_qs = Transaction.objects.select_related("user").order_by("-created_at")
        data = []
        if tx_qs.exists():
            rows, total, total_pages = paginate_queryset(request, tx_qs, default_limit=8)
            for t in rows:
                user_name = (
                    f"{t.user.first_name} {t.user.last_name}".strip() if t.user else "Unknown user"
                )
                data.append(
                    {
                        "id": str(t.id),
                        "user": user_name,
                        "plan": t.plan,
                        "amount": float(t.amount),
                        "date": t.created_at.strftime("%b %d"),
                        "method": t.method,
                        "status": t.status,
                        "refundStatus": None if t.refund_status == "None" else t.refund_status,
                    }
                )
            return Response({"transactions": data, "total": total, "totalPages": total_pages})

        subs = Subscription.objects.select_related("user").order_by("-created_at")
        rows, total, total_pages = paginate_queryset(request, subs, default_limit=8)
        amount_map = {"Monthly": 29, "Quarterly": 59, "Annual": 99}
        for s in rows:
            data.append(
                {
                    "id": f"sub-{s.id}",
                    "user": f"{s.user.first_name} {s.user.last_name}".strip() or s.user.username,
                    "plan": s.plan,
                    "amount": float(amount_map.get(s.plan, 0)),
                    "date": s.created_at.strftime("%b %d"),
                    "method": "Stripe",
                    "status": "Paid" if s.status == "active" else "Refunded",
                    "refundStatus": "Processed" if s.status == "cancelled" else None,
                }
            )
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
