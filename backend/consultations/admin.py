# consultations/admin.py
from django.contrib import admin
from .models import Nutritionist, Consultation, NutritionistFeedback, ConsultationFeedback


@admin.register(Nutritionist)
class NutritionistAdmin(admin.ModelAdmin):
    list_display  = ('name', 'email', 'specialization', 'is_active', 'created_at')
    list_filter   = ('specialization', 'is_active')
    search_fields = ('name', 'email', 'bio')
    ordering      = ('name',)


class NutritionistFeedbackInline(admin.StackedInline):
    model      = NutritionistFeedback
    extra      = 0
    fields     = ('text', 'created_at', 'updated_at')
    readonly_fields = ('created_at', 'updated_at')


class ConsultationFeedbackInline(admin.TabularInline):
    model      = ConsultationFeedback
    extra      = 0
    fields     = ('rating', 'comment', 'would_recommend', 'created_at')
    readonly_fields = ('created_at',)


@admin.register(Consultation)
class ConsultationAdmin(admin.ModelAdmin):
    list_display  = ('user', 'nutritionist', 'session_type', 'status', 'scheduled_at', 'is_premium')
    list_filter   = ('status', 'session_type', 'is_premium', 'scheduled_at')
    search_fields = ('user__username', 'nutritionist__name', 'topic')
    inlines       = [NutritionistFeedbackInline, ConsultationFeedbackInline]
    ordering      = ('-scheduled_at',)
    readonly_fields = ('requested_at',)


@admin.register(NutritionistFeedback)
class NutritionistFeedbackAdmin(admin.ModelAdmin):
    list_display  = ('consultation', 'created_at')
    search_fields = ('consultation__user__username', 'text')
    ordering      = ('-created_at',)


@admin.register(ConsultationFeedback)
class ConsultationFeedbackAdmin(admin.ModelAdmin):
    list_display  = ('consultation', 'rating', 'would_recommend', 'created_at')
    list_filter   = ('rating', 'would_recommend')
    search_fields = ('consultation__user__username', 'comment')
    readonly_fields = ('created_at',)