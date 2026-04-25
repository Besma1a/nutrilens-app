# consultations/views.py
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

from .models import Nutritionist, Consultation, NutritionistFeedback, ConsultationFeedback
from .serializers import (
    NutritionistSerializer,
    NutritionistListSerializer,
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
    queryset = Nutritionist.objects.filter(is_active=True)
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields   = ['name', 'specialization', 'bio']
    ordering_fields = ['name', 'specialization']

    def get_serializer_class(self):
        if self.action == 'list':
            return NutritionistListSerializer
        return NutritionistSerializer


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
        nutritionist = serializer.validated_data.get('nutritionist')
        if not nutritionist:
            nutritionist = Nutritionist.objects.filter(is_active=True).first()
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

        consultation.status    = 'confirmed'
        consultation.zoom_link = request.data.get('zoom_link', consultation.zoom_link or '')
        consultation.save()

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