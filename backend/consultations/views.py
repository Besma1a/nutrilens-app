# consultations/views.py
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import JSONParser, FormParser, MultiPartParser
from django.utils import timezone
from django.db.models import Q
from datetime import timedelta

from .models import Nutritionist, Consultation, NutritionistFeedback, ConsultationFeedback
from .serializers import (
    NutritionistSerializer,
    NutritionistListSerializer,
    NutritionistSelfUpdateSerializer,
    ConsultationSerializer,
    ConsultationListSerializer,
    ConsultationCreateSerializer,
    ConsultationUpdateSerializer,
    ConsultationFeedbackSerializer,
    ConsultationFeedbackCreateSerializer,
    NutritionistFeedbackSerializer,
    NutritionistFeedbackCreateSerializer,
    NutritionistConsultationSerializer,
)


class NutritionistViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/v1/consultations/nutritionists/        → list
    GET /api/v1/consultations/nutritionists/{id}/   → detail
    """
    # Public "Meet Our Experts" should include all non-suspended nutritionists.
    # Older records may be marked inactive from the prior admin assignment flow.
    queryset = Nutritionist.objects.exclude(
        Q(admin_profile__status="Suspended") | Q(admin_profile__status="Rejected")
    )
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields   = ['name', 'specialization', 'bio']
    ordering_fields = ['name', 'specialization']

    def get_serializer_class(self):
        if self.action == 'list':
            return NutritionistListSerializer
        return NutritionistSerializer

    def get_permissions(self):
        if self.action == "list":
            return [AllowAny()]
        return [permission() for permission in self.permission_classes]

    @action(
        detail=False,
        methods=['get', 'patch'],
        permission_classes=[IsAuthenticated],
        url_path='me',
        parser_classes=[JSONParser, FormParser, MultiPartParser],
    )
    def me(self, request):
        """
        GET/PATCH /api/v1/consultations/nutritionists/me/
        Read/update the logged-in nutritionist profile mapped by email.
        """
        try:
            nutritionist = Nutritionist.objects.get(email=request.user.email, is_active=True)
        except Nutritionist.DoesNotExist:
            return Response(
                {"detail": "No active nutritionist profile found for this account."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if request.method == 'GET':
            return Response(NutritionistSerializer(nutritionist).data)

        serializer = NutritionistSelfUpdateSerializer(
            nutritionist,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(NutritionistSerializer(nutritionist).data)


class ConsultationViewSet(viewsets.ModelViewSet):
    """
    Standard routes (USER side)
    ───────────────────────────
    GET    /api/v1/consultations/consultations/           → list (all user's)
    POST   /api/v1/consultations/consultations/           → create (book)
    GET    /api/v1/consultations/consultations/{id}/      → detail
    PATCH  /api/v1/consultations/consultations/{id}/      → update
    DELETE /api/v1/consultations/consultations/{id}/      → delete

    Extra actions
    ─────────────
    GET  /api/v1/consultations/consultations/upcoming/
    GET  /api/v1/consultations/consultations/past/
    GET  /api/v1/consultations/consultations/all-feedback/
    POST /api/v1/consultations/consultations/{id}/cancel/
    POST /api/v1/consultations/consultations/{id}/add-user-feedback/
    GET  /api/v1/consultations/consultations/{id}/feedback/
    POST /api/v1/consultations/consultations/{id}/add-feedback/
    """
    permission_classes = [IsAuthenticated]
    filter_backends    = [filters.OrderingFilter]
    ordering_fields    = ['-scheduled_at']

    def get_queryset(self):
        return (
            Consultation.objects
            .filter(user=self.request.user)
            .select_related('nutritionist', 'nutritionist_feedback')
            .order_by('-scheduled_at')
        )

    def get_serializer_class(self):
        if self.action == 'create':
            return ConsultationCreateSerializer
        if self.action in ('partial_update', 'update'):
            return ConsultationUpdateSerializer
        if self.action == 'list':
            return ConsultationListSerializer
        return ConsultationSerializer

    def perform_create(self, serializer):
        from adminpanel.models import NutritionistAdminProfile
        from profiles.models import UserProfile
        
        nutritionist = serializer.validated_data.get('nutritionist')
        
        # If no nutritionist specified, try to get the patient's assigned nutritionist
        if not nutritionist:
            try:
                user_profile = UserProfile.objects.get(user=self.request.user)
                if user_profile.managed_by:
                    # Get the Nutritionist linked to this user
                    admin_profile = NutritionistAdminProfile.objects.filter(
                        linked_user=user_profile.managed_by
                    ).first()
                    if admin_profile:
                        nutritionist = admin_profile.nutritionist
            except UserProfile.DoesNotExist:
                pass
        
        if not nutritionist:
            raise ValidationError("Please select a nutritionist before booking a consultation.")

        week_start = timezone.now().date() - timedelta(days=timezone.now().weekday())
        bookings_this_week = Consultation.objects.filter(
            user=self.request.user,
            requested_at__date__gte=week_start,
        ).count()
        if bookings_this_week >= 4:
            raise ValidationError("You have reached the limit of 4 consultations per week on the Pro plan.")

        serializer.save(user=self.request.user, nutritionist=nutritionist)

    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        qs = self.get_queryset().filter(
            scheduled_at__gte=timezone.now()
        ).exclude(status__in=['cancelled', 'no_show'])
        serializer = ConsultationSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def past(self, request):
        qs = self.get_queryset().filter(scheduled_at__lt=timezone.now())
        serializer = ConsultationSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='all-feedback')
    def all_feedback(self, request):
        feedbacks = (
            NutritionistFeedback.objects
            .filter(consultation__user=request.user)
            .select_related('consultation__nutritionist')
            .order_by('-created_at')
        )
        serializer = NutritionistFeedbackSerializer(feedbacks, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        consultation = self.get_object()
        if consultation.status in ('completed', 'cancelled'):
            return Response(
                {'error': 'Cannot cancel a completed or already-cancelled consultation.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        consultation.status = 'cancelled'
        consultation.save()
        return Response(ConsultationSerializer(consultation).data)

    @action(detail=True, methods=['get'])
    def feedback(self, request, pk=None):
        consultation = self.get_object()
        try:
            fb = consultation.nutritionist_feedback
            return Response(NutritionistFeedbackSerializer(fb).data)
        except NutritionistFeedback.DoesNotExist:
            return Response({}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'], url_path='add-feedback')
    def add_feedback(self, request, pk=None):
        consultation = self.get_object()
        if hasattr(consultation, 'nutritionist_feedback'):
            return Response(
                {'error': 'Feedback already exists. Use PATCH to update it.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        serializer = NutritionistFeedbackCreateSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(consultation=consultation)
            return Response(
                NutritionistFeedbackSerializer(consultation.nutritionist_feedback).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='add-user-feedback')
    def add_user_feedback(self, request, pk=None):
        consultation = self.get_object()
        if consultation.status != 'completed':
            return Response(
                {'error': 'You can only rate completed consultations.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if hasattr(consultation, 'feedback'):
            return Response(
                {'error': 'You have already rated this consultation.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        serializer = ConsultationFeedbackCreateSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(consultation=consultation)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ─────────────────────────────────────────────────────────────────────────────
# NUTRITIONIST PANEL  (Calendar.jsx)
# ─────────────────────────────────────────────────────────────────────────────

class NutritionistConsultationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Nutritionist-scoped consultation management.

    Routes
    ──────
    GET   /api/v1/consultations/nutritionist-sessions/
          → all consultations assigned to the logged-in nutritionist's record

    POST  /api/v1/consultations/nutritionist-sessions/{id}/approve/
          body: { "zoom_link": "https://zoom.us/j/..." }   (zoom_link optional)

    POST  /api/v1/consultations/nutritionist-sessions/{id}/reject/
          no body required

    NOTE: This viewset looks up the Nutritionist record by matching
          nutritionist.email == request.user.email.
          If your auth model links nutritionists differently (e.g. a OneToOne
          on the User model), adjust _get_nutritionist() accordingly.
    """
    permission_classes = [IsAuthenticated]

    def _get_nutritionist(self):
        """
        Resolve the Nutritionist record for the currently logged-in user.
        Raises 403 if no matching nutritionist is found.
        """
        try:
            return Nutritionist.objects.get(email=self.request.user.email, is_active=True)
        except Nutritionist.DoesNotExist:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("No active nutritionist account found for this user.")

    def get_queryset(self):
        nutritionist = self._get_nutritionist()
        return (
            Consultation.objects
            .filter(nutritionist=nutritionist)
            .select_related('user', 'nutritionist')
            .order_by('scheduled_at')
        )

    def get_serializer_class(self):
        return NutritionistConsultationSerializer

    # ── Approve ───────────────────────────────────────────────────────────────
    # POST /api/v1/consultations/nutritionist-sessions/{id}/approve/
    # Body: { "zoom_link": "https://zoom.us/j/..." }

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """
        Approve a pending consultation.
        Optionally attach a Zoom link.
        Returns the updated session in Calendar.jsx shape.
        """
        consultation = self.get_object()

        if consultation.status not in ('pending', 'confirmed'):
            return Response(
                {'error': f'Cannot approve a consultation with status "{consultation.status}".'},
                status=status.HTTP_400_BAD_REQUEST
            )

        old_zoom_link = consultation.zoom_link or ''
        new_zoom_link = request.data.get('zoom_link', old_zoom_link)

        consultation.status    = 'confirmed'
        consultation.zoom_link = new_zoom_link
        consultation.save()

        # Notify patient when a Zoom link is added or updated
        if new_zoom_link and new_zoom_link != old_zoom_link:
            try:
                from notifications.signals import _create
                from notifications.models import Notification
                nutritionist_user = getattr(consultation.nutritionist, 'user', None)
                _create(
                    recipient=consultation.user,
                    title="Meeting link ready",
                    message="Your nutritionist has attached a meeting link to your appointment.",
                    notification_type=Notification.TYPE_APPOINTMENT,
                    actor=nutritionist_user,
                    link="/appointments/",
                )
            except Exception:
                pass  # Notification failure must never break the approve action

        return Response(NutritionistConsultationSerializer(consultation).data)

    # ── Reject ────────────────────────────────────────────────────────────────
    # POST /api/v1/consultations/nutritionist-sessions/{id}/reject/

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """
        Reject / cancel a consultation from the nutritionist side.
        """
        consultation = self.get_object()

        if consultation.status in ('completed', 'cancelled'):
            return Response(
                {'error': f'Cannot reject a consultation with status "{consultation.status}".'},
                status=status.HTTP_400_BAD_REQUEST
            )

        consultation.status    = 'cancelled'
        consultation.zoom_link = ''
        consultation.save()

        return Response(NutritionistConsultationSerializer(consultation).data)