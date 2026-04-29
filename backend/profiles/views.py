# profiles/views.py
import logging
from rest_framework import viewsets, status, filters
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action
from rest_framework.views import APIView
from django.db.models import Q
from django.db import DatabaseError, transaction
from django.db.utils import OperationalError, ProgrammingError
from django.contrib.auth import get_user_model
from django.utils.dateparse import parse_date

from .models import (
    UserProfile,
    WeightEntry,
    BodyMeasurement,
    NutritionistFeedback,
    DietPlan,
    DietPlanTemplate,
    PlanAssignment,
)
from .plan_assignments import ensure_plan_assignments_for_diet_plan
from .serializers import (
    UserProfileSerializer,
    WeightEntrySerializer,
    BodyMeasurementSerializer,
    NutritionistFeedbackSerializer,
    NutritionistPatientSerializer,
    DietPlanSerializer,
    DietPlanTemplateSerializer,
    plan_assignment_to_camel,
)
from adminpanel.models import NutritionistAdminProfile

logger = logging.getLogger(__name__)
User = get_user_model()


def _sync_profile_targets_from_active_diet_plan(plan):
    """
    Copy macro targets from an active DietPlan onto the patient's UserProfile.
    Patient dashboard (meals summary) and tracker read calorie and macro goals from the profile.
    """
    if not plan.is_active:
        return
    profile, _ = UserProfile.objects.get_or_create(user=plan.user)
    profile.daily_calorie_goal = plan.daily_calorie_target
    profile.protein_goal_g = plan.protein_target_g
    profile.carbs_goal_g = plan.carbs_target_g
    profile.fat_goal_g = plan.fat_target_g
    profile.goal_setting_mode = "manual"
    profile.save(
        update_fields=[
            "daily_calorie_goal",
            "protein_goal_g",
            "carbs_goal_g",
            "fat_goal_g",
            "goal_setting_mode",
        ]
    )


class CurrentUserProfileView(APIView):
    """
    Unified endpoint for:
      - GET/PATCH /api/v1/profiles/profile/ (regular user profile)
      - GET /api/v1/profiles/profile/ for nutritionist managed patients list
    """
    permission_classes = [IsAuthenticated]

    def _fallback_profile_payload(self, request):
        return {
            "user": request.user.id,
            "height_cm": None,
            "current_weight_kg": None,
            "start_weight_kg": None,
            "goal_weight_kg": None,
            "daily_calorie_goal": 2000,
            "protein_goal_g": 120,
            "carbs_goal_g": 200,
            "fat_goal_g": 65,
            "bmi": None,
            "is_subscribed": False,
            "subscription_plan": "free",
            "subscription_end_date": None,
            "subscription_is_active": False,
            "goal_setting_mode": "auto",
            "managed_by": None,
            "scans_used_today": 0,
            "created_at": None,
            "updated_at": None,
        }

    def get(self, request):
        # Nutritionist dashboard expects a managed patients payload at this URL.
        if getattr(request.user, "is_nutritionist", False):
            try:
                managed_profiles = UserProfile.objects.filter(
                    managed_by=request.user
                ).select_related("user")

                managed_patients = [
                    {
                        "id": p.user.id,
                        "username": p.user.username,
                        "email": p.user.email,
                        "first_name": p.user.first_name,
                        "last_name": p.user.last_name,
                    }
                    for p in managed_profiles
                ]
                return Response({"managed_patients": managed_patients})
            except (OperationalError, ProgrammingError, DatabaseError) as exc:
                logger.error("Failed loading managed patients: %s", str(exc), exc_info=True)
                return Response({"managed_patients": []})

        try:
            profile, _ = UserProfile.objects.get_or_create(user=request.user)
            serializer = UserProfileSerializer(profile)
            return Response(serializer.data)
        except (OperationalError, ProgrammingError, DatabaseError) as exc:
            logger.error("Failed loading user profile: %s", str(exc), exc_info=True)
            return Response(self._fallback_profile_payload(request))

    def patch(self, request):
        try:
            profile, _ = UserProfile.objects.get_or_create(user=request.user)
            serializer = UserProfileSerializer(profile, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        except (OperationalError, ProgrammingError, DatabaseError) as exc:
            logger.error("Failed updating user profile: %s", str(exc), exc_info=True)
            return Response(
                {"detail": "Profile storage is not ready yet. Run migrations and try again."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


class UserProfileViewSet(viewsets.ModelViewSet):
    """
    User profile management.
    GET /api/v1/profiles/profile/
    PATCH /api/v1/profiles/profile/
    """
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.OrderingFilter]

    def get_queryset(self):
        return UserProfile.objects.filter(user=self.request.user)

    @action(detail=False, methods=['get'])
    def profile(self, request):
        """Get current user's profile."""
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        serializer = self.get_serializer(profile)
        return Response(serializer.data)

    @action(detail=False, methods=['patch'])
    def update_profile(self, request):
        """Update current user's profile."""
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        serializer = self.get_serializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class WeightEntryViewSet(viewsets.ModelViewSet):
    """
    Weight tracking.
    GET /api/v1/profiles/weight/
    POST /api/v1/profiles/weight/
    PATCH /api/v1/profiles/weight/{id}/
    DELETE /api/v1/profiles/weight/{id}/
    GET /api/v1/profiles/weight/latest/
    """
    serializer_class = WeightEntrySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering = ['-date', '-logged_at']

    def get_queryset(self):
        return WeightEntry.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def latest(self, request):
        """Get latest weight entry."""
        latest_entry = self.get_queryset().first()
        if latest_entry:
            serializer = self.get_serializer(latest_entry)
            return Response(serializer.data)
        return Response(None)

    @action(detail=False, methods=['get'])
    def for_patient(self, request):
        """
        Nutritionist-only endpoint to read a managed patient's weight history.
        GET /api/v1/profiles/weight/for_patient/?patient_id=<id>
        """
        if not getattr(request.user, "is_nutritionist", False):
            return Response(
                {"detail": "Only nutritionists can access patient data."},
                status=status.HTTP_403_FORBIDDEN,
            )

        patient_id = request.query_params.get("patient_id")
        if not patient_id:
            return Response(
                {"detail": "patient_id query parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            patient_id = int(patient_id)
        except (TypeError, ValueError):
            return Response(
                {"detail": "Invalid patient_id."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            patient = User.objects.select_related("profile").get(pk=patient_id)
        except User.DoesNotExist:
            return Response(
                {"detail": "Patient not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        managed_by_id = getattr(getattr(patient, "profile", None), "managed_by_id", None)
        if managed_by_id != request.user.pk:
            return Response(
                {"detail": "You do not manage this patient."},
                status=status.HTTP_403_FORBIDDEN,
            )

        queryset = WeightEntry.objects.filter(user=patient).order_by("-date", "-logged_at")
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class AssignPatientView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not getattr(request.user, "is_nutritionist", False):
            return Response(
                {"detail": "Only nutritionists can assign patients."},
                status=status.HTTP_403_FORBIDDEN,
            )

        patient_id = request.data.get("patient_id")
        if patient_id is None:
            return Response(
                {"detail": "patient_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            patient_id = int(patient_id)
        except (TypeError, ValueError):
            return Response(
                {"detail": "Invalid patient_id."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            profile = UserProfile.objects.select_related("user").get(user_id=patient_id)
        except UserProfile.DoesNotExist:
            return Response({"detail": "Patient not found"}, status=status.HTTP_404_NOT_FOUND)

        if getattr(profile.user, "is_nutritionist", False):
            return Response(
                {"detail": "Cannot assign another nutritionist as a patient."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        profile.managed_by = request.user
        profile.save(update_fields=["managed_by"])
        return Response({"status": "assigned", "patient_id": patient_id})


class SelectNutritionistView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if getattr(request.user, "is_nutritionist", False):
            return Response(
                {"detail": "Nutritionists cannot select a nutritionist."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        nutritionist_id = request.data.get("nutritionist_id")
        if nutritionist_id is None:
            return Response(
                {"detail": "nutritionist_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            nutritionist_id = int(nutritionist_id)
        except (TypeError, ValueError):
            return Response(
                {"detail": "Invalid nutritionist_id."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        admin_profile = (
            NutritionistAdminProfile.objects.select_related("linked_user", "nutritionist")
            .filter(nutritionist_id=nutritionist_id, status="Approved")
            .first()
        )
        if not admin_profile or not admin_profile.linked_user:
            return Response(
                {"detail": "Selected nutritionist is not currently available."},
                status=status.HTTP_404_NOT_FOUND,
            )

        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        profile.managed_by = admin_profile.linked_user
        profile.save(update_fields=["managed_by", "updated_at"])
        return Response(
            {
                "status": "assigned",
                "nutritionistId": admin_profile.nutritionist_id,
                "nutritionistName": admin_profile.nutritionist.name,
                "managedBy": admin_profile.linked_user_id,
            }
        )


class NutritionistPatientsView(APIView):
    """
    List patients assigned to the authenticated nutritionist.
    GET /api/patients/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not getattr(request.user, "is_nutritionist", False):
            return Response(
                {"detail": "Only nutritionists can access patients."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            profiles = (
                UserProfile.objects.filter(managed_by=request.user)
                .select_related("user")
                .order_by("user__first_name", "user__last_name", "user__username")
            )
            serializer = NutritionistPatientSerializer(
                profiles,
                many=True,
                context={"request": request},
            )
            return Response(serializer.data)
        except Exception as exc:
            logger.error("Failed loading nutritionist patients: %s", str(exc), exc_info=True)
            return Response([], status=status.HTTP_200_OK)


class BodyMeasurementViewSet(viewsets.ModelViewSet):
    """
    Body measurement tracking.
    GET /api/v1/profiles/measurements/
    POST /api/v1/profiles/measurements/
    PATCH /api/v1/profiles/measurements/{id}/
    DELETE /api/v1/profiles/measurements/{id}/
    GET /api/v1/profiles/measurements/latest/
    """
    serializer_class = BodyMeasurementSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering = ['-date', '-logged_at']

    def get_queryset(self):
        return BodyMeasurement.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def latest(self, request):
        """Get latest measurement entry."""
        latest_entry = self.get_queryset().first()
        if latest_entry:
            serializer = self.get_serializer(latest_entry)
            return Response(serializer.data)
        return Response(None)


class NutritionistFeedbackViewSet(viewsets.ModelViewSet):
    """
    Nutritionist feedback management.
    
    GET /api/v1/profiles/feedback/
      - Returns all feedback received by the current user (patient side).
    
    GET /api/v1/profiles/feedback/?patient_id=<id>
      - Nutritionist reads feedback they sent to a specific patient.
      - Requires is_nutritionist=True.
    
    POST /api/v1/profiles/feedback/
      - Nutritionist sends feedback to a patient.
    """
    serializer_class = NutritionistFeedbackSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering = ['-created_at']

    def get_queryset(self):
        """
        Filter based on context:
        - If ?patient_id=<id>, return feedback THIS nutritionist sent to that patient.
        - Otherwise, return feedback THIS user (patient) received.
        """
        patient_id = self.request.query_params.get('patient_id')
        
        if patient_id:
            # Nutritionist reading feedback they sent to a patient
            if not getattr(self.request.user, 'is_nutritionist', False):
                logger.warning(f"Non-nutritionist {self.request.user.id} attempted to read patient feedback")
                return NutritionistFeedback.objects.none()
            
            try:
                patient_id = int(patient_id)
            except (ValueError, TypeError):
                return NutritionistFeedback.objects.none()
            
            # Only return feedback THIS nutritionist sent to that patient
            return NutritionistFeedback.objects.filter(
                nutritionist=self.request.user,
                user_id=patient_id
            ).order_by('-created_at')
        else:
            # Patient reading feedback they received
            return NutritionistFeedback.objects.filter(
                user=self.request.user
            ).order_by('-created_at')

    def perform_create(self, serializer):
        """Set nutritionist to current user on create."""
        if not getattr(self.request.user, 'is_nutritionist', False):
            raise PermissionError("Only nutritionists can send feedback.")
        serializer.save(nutritionist=self.request.user)

    @action(detail=False, methods=['post'])
    def mark_as_read(self, request):
        """Mark feedback as read."""
        feedback_id = request.data.get('feedback_id')
        try:
            feedback = NutritionistFeedback.objects.get(id=feedback_id, user=request.user)
            feedback.is_read = True
            feedback.save()
            return Response({'status': 'marked as read'})
        except NutritionistFeedback.DoesNotExist:
            return Response({'error': 'Feedback not found'}, status=status.HTTP_404_NOT_FOUND)


class DietPlanViewSet(viewsets.ModelViewSet):
    """
    Diet plan management for patients and nutritionists.
    
    GET /api/v1/profiles/diet-plans/
      - Patient: Returns their own diet plans.
      - Nutritionist: Not allowed (use patient-specific endpoint).
    
    GET /api/v1/profiles/diet-plans/?patient_id=<id>
      - Nutritionist only: Returns diet plans for a specific patient they manage.
    
    GET /api/v1/profiles/diet-plans/{id}/
      - Get a specific diet plan (patient can only see their own).
    
    POST /api/v1/profiles/diet-plans/
      - Nutritionist assigns a new diet plan to a patient.
      - Body: { "user": <patient_id>, "title": "...", "plan_type": "...", ... }
    
    PATCH /api/v1/profiles/diet-plans/{id}/
      - Update a diet plan.
    """
    serializer_class = DietPlanSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering = ['-created_at']

    def get_queryset(self):
        """
        Filter based on context:
        - If ?patient_id=<id>, return plans for that patient (nutritionist only).
        - Otherwise, return plans for the current user (patient).
        """
        patient_id = self.request.query_params.get('patient_id')
        
        if patient_id:
            # Nutritionist viewing a patient's diet plans
            if not getattr(self.request.user, 'is_nutritionist', False):
                logger.warning(f"Non-nutritionist {self.request.user.id} attempted to access patient diet plans")
                return DietPlan.objects.none()
            
            try:
                patient_id = int(patient_id)
            except (ValueError, TypeError):
                return DietPlan.objects.none()
            
            # Verify nutritionist manages this patient
            try:
                patient_profile = UserProfile.objects.get(user_id=patient_id)
                if patient_profile.managed_by_id != self.request.user.id:
                    logger.warning(
                        f"Nutritionist {self.request.user.id} attempted to access patient {patient_id} they don't manage"
                    )
                    return DietPlan.objects.none()
            except UserProfile.DoesNotExist:
                return DietPlan.objects.none()
            
            return DietPlan.objects.filter(user_id=patient_id).order_by('-created_at')
        else:
            # Patient viewing their own diet plans
            return DietPlan.objects.filter(user=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        """Set assigned_by to current user (nutritionist) on create."""
        if not getattr(self.request.user, 'is_nutritionist', False):
            raise PermissionError("Only nutritionists can assign diet plans.")
        with transaction.atomic():
            plan = serializer.save(assigned_by=self.request.user, is_active=True)

            # Keep a single active plan per user.
            DietPlan.objects.filter(user=plan.user, is_active=True).exclude(pk=plan.pk).update(is_active=False)

            # Lock profile targets to this manually assigned clinical plan.
            _sync_profile_targets_from_active_diet_plan(plan)

    def perform_update(self, serializer):
        plan = serializer.save()
        _sync_profile_targets_from_active_diet_plan(plan)

    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get the currently active diet plan."""
        patient_id = request.query_params.get('patient_id')
        
        if patient_id:
            # Nutritionist getting a patient's active plan
            if not getattr(request.user, 'is_nutritionist', False):
                return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
            
            try:
                patient_id = int(patient_id)
            except (ValueError, TypeError):
                return Response({'error': 'Invalid patient_id'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Verify nutritionist manages this patient
            try:
                patient_profile = UserProfile.objects.get(user_id=patient_id)
                if patient_profile.managed_by_id != request.user.id:
                    return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
            except UserProfile.DoesNotExist:
                return Response({'error': 'Patient not found'}, status=status.HTTP_404_NOT_FOUND)
            
            plan = DietPlan.objects.filter(user_id=patient_id, is_active=True).first()
        else:
            # Patient getting their own active plan
            plan = DietPlan.objects.filter(user=request.user, is_active=True).first()
        
        if not plan:
            return Response(
                {"detail": "No active diet plan found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        ensure_plan_assignments_for_diet_plan(plan)
        data = DietPlanSerializer(plan, context={"request": request}).data
        ordered = plan.plan_assignments.all().order_by("day_index", "slot_key")
        data["assignments"] = [plan_assignment_to_camel(a) for a in ordered]
        return Response(data)


class DietPlanTemplateViewSet(viewsets.ModelViewSet):
    """
    Diet plan templates (blog-like workflow).

    GET /api/v1/profiles/diet-plan-templates/
      - Public: lists only approved + published templates (home/catalog)
      - Nutritionist: pass ?scope=mine to list their own templates (incl pending) + system templates

    POST /api/v1/profiles/diet-plan-templates/
      - Nutritionist only: create a template (created_by=current user).
    """

    serializer_class = DietPlanTemplateSerializer
    filter_backends = [filters.OrderingFilter]
    ordering = ["-created_at"]

    def get_permissions(self):
        # Mirror blogs API: GET is public, write actions require auth + nutritionist.
        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            return [AllowAny()]
        return [IsAuthenticated()]

    def _require_nutritionist(self):
        return getattr(self.request.user, "is_nutritionist", False)

    def get_queryset(self):
        scope = (self.request.query_params.get("scope") or "").strip().lower()

        # Nutritionist library view
        if scope == "mine" and self.request.user.is_authenticated and self._require_nutritionist():
            return DietPlanTemplate.objects.filter(
                Q(created_by=self.request.user) | Q(created_by__isnull=True)
            ).order_by("-created_at")

        # Public catalog view
        return DietPlanTemplate.objects.filter(
            is_published=True,
            moderation_status=DietPlanTemplate.STATUS_APPROVED,
        ).order_by("-created_at")

    def create(self, request, *args, **kwargs):
        if not self._require_nutritionist():
            return Response(
                {"detail": "Only nutritionists can create diet plan templates."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        instance = serializer.save(
            created_by=self.request.user,
            is_published=False,
            moderation_status=DietPlanTemplate.STATUS_PENDING,
        )

        # Admin notification for new content awaiting moderation (best-effort)
        try:
            from adminpanel.models import AdminNotification

            author = self.request.user
            author_name = (
                f"{author.first_name} {author.last_name}".strip() or getattr(author, "username", "Nutritionist")
            )
            AdminNotification.create(
                title="New diet plan submitted",
                message=f"{author_name} submitted a diet plan: “{instance.title}”.",
                notification_type=AdminNotification.TYPE_CONTENT,
                link="/admin#content",
            )
        except Exception:
            pass

    def perform_update(self, serializer):
        if not self._require_nutritionist():
            raise PermissionError("Only nutritionists can update diet plan templates.")
        instance = self.get_object()
        # Allow editing system templates by copying to user's library.
        if instance.created_by_id is None:
            serializer.save(
                created_by=self.request.user,
                is_published=False,
                moderation_status=DietPlanTemplate.STATUS_PENDING,
            )
        else:
            serializer.save(
                is_published=False,
                moderation_status=DietPlanTemplate.STATUS_PENDING,
            )

    def destroy(self, request, *args, **kwargs):
        if not self._require_nutritionist():
            return Response(
                {"detail": "Only nutritionists can delete diet plan templates."},
                status=status.HTTP_403_FORBIDDEN,
            )
        instance = self.get_object()
        if instance.created_by_id is None:
            return Response(
                {"detail": "System templates cannot be deleted."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)


class PublicDietPlanTemplateViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Public catalog of published DietPlanTemplate cards.

    GET /api/v1/profiles/public-diet-plan-templates/
    GET /api/v1/profiles/public-diet-plan-templates/{id}/
    """

    serializer_class = DietPlanTemplateSerializer
    permission_classes = [AllowAny]
    filter_backends = [filters.OrderingFilter]
    ordering = ["-created_at"]

    def get_queryset(self):
        return DietPlanTemplate.objects.filter(
            is_published=True,
            moderation_status=DietPlanTemplate.STATUS_APPROVED,
        ).order_by("-created_at")


def _normalize_plan_assignment_patch_payload(raw):
    """Accept camelCase (task) or snake_case keys; return snake_case dict or None if not a dict."""
    if not isinstance(raw, dict):
        return None
    out = {}
    pairs = (
        ("mealIds", "meal_ids"),
        ("portionSize", "portion_size"),
        ("scheduledDate", "scheduled_date"),
        ("notes", "notes"),
    )
    for camel, snake in pairs:
        if camel in raw:
            out[snake] = raw[camel]
        elif snake in raw:
            out[snake] = raw[snake]
    return out


def _parse_plan_assignment_pk(assignment_id):
    """
    Match integer PK (P2 / Django) or 24-char hex ObjectId shape.
    Returns (pk_int_or_none, err_code) where err_code is 'invalid' | 'unsupported'.
    """
    s = str(assignment_id).strip()
    if not s:
        return None, "invalid"
    if s.isdigit():
        return int(s), None
    if len(s) == 24 and all(c in "0123456789abcdefABCDEF" for c in s):
        return None, "unsupported"
    # UUID
    if len(s) == 36 and s.count("-") == 4:
        return None, "unsupported"
    return None, "invalid"


def _user_can_access_plan_assignment(user, assignment):
    plan = assignment.diet_plan
    if plan.user_id == user.id:
        return True
    if not getattr(user, "is_nutritionist", False):
        return False
    try:
        patient_profile = UserProfile.objects.get(user_id=plan.user_id)
    except UserProfile.DoesNotExist:
        return False
    return patient_profile.managed_by_id == user.id


class PlanAssignmentPatchView(APIView):
    """
    PATCH /api/plan-assignments/:id/
    Body (all optional, merge): mealIds, portionSize, scheduledDate, notes
    Response: 200 { data: PlanAssignment } (camelCase assignment object)
    """

    permission_classes = [IsAuthenticated]

    def patch(self, request, assignment_id, *args, **kwargs):
        pk, err = _parse_plan_assignment_pk(assignment_id)
        if err == "invalid":
            return Response(
                {"error": "Invalid plan assignment id"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if err == "unsupported":
            return Response(
                {"error": "Invalid plan assignment id"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        normalized = _normalize_plan_assignment_patch_payload(request.data)
        if normalized is None:
            return Response(
                {"error": "Malformed request body"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(normalized) == 0:
            return Response(
                {"error": "No fields to update"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            assignment = PlanAssignment.objects.select_related("diet_plan").get(pk=pk)
        except PlanAssignment.DoesNotExist:
            return Response(
                {"error": "Plan assignment not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not _user_can_access_plan_assignment(request.user, assignment):
            return Response({"error": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)

        update_fields = []

        if "meal_ids" in normalized:
            meal_ids = normalized["meal_ids"]
            if meal_ids is not None and not isinstance(meal_ids, list):
                return Response(
                    {"error": "mealIds must be an array"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if meal_ids is not None:
                for mid in meal_ids:
                    if not isinstance(mid, (int, str)):
                        return Response(
                            {"error": "mealIds must contain only numbers or strings"},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
            assignment.meal_ids = meal_ids if meal_ids is not None else []
            update_fields.append("meal_ids")

        if "portion_size" in normalized:
            ps = normalized["portion_size"]
            if ps is not None and not isinstance(ps, (int, float)):
                try:
                    ps = float(ps)
                except (TypeError, ValueError):
                    return Response(
                        {"error": "portionSize must be a number"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            assignment.portion_size = ps
            update_fields.append("portion_size")

        if "scheduled_date" in normalized:
            sd = normalized["scheduled_date"]
            if sd is None or sd == "":
                assignment.scheduled_date = None
            elif isinstance(sd, str):
                parsed = parse_date(sd[:10]) if len(sd) >= 10 else parse_date(sd)
                if parsed is None:
                    return Response(
                        {"error": "scheduledDate must be an ISO date string (YYYY-MM-DD)"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                assignment.scheduled_date = parsed
            else:
                return Response(
                    {"error": "scheduledDate must be an ISO date string (YYYY-MM-DD)"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            update_fields.append("scheduled_date")

        if "notes" in normalized:
            notes = normalized["notes"]
            if notes is None:
                assignment.notes = ""
            elif isinstance(notes, str):
                assignment.notes = notes
            else:
                return Response(
                    {"error": "notes must be a string"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            update_fields.append("notes")

        if not update_fields:
            return Response(
                {"error": "No fields to update"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            assignment.save(update_fields=update_fields + ["updated_at"])
            assignment.refresh_from_db()
        except (DatabaseError, OperationalError, ProgrammingError) as e:
            logger.exception("PlanAssignment PATCH failed: %s", e)
            return Response(
                {"error": "Unexpected server error"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        except Exception as e:
            logger.exception("PlanAssignment PATCH failed: %s", e)
            return Response(
                {"error": "Unexpected server error"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response({"data": plan_assignment_to_camel(assignment)}, status=status.HTTP_200_OK)