from django.contrib import admin
from .models import Subscription


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('user', 'plan', 'status', 'start_date', 'end_date', 'is_active', 'days_remaining')
    list_filter = ('status', 'plan', 'created_at')
    search_fields = ('user__username', 'user__email')
    readonly_fields = ('start_date', 'created_at', 'updated_at', 'is_active', 'days_remaining')
    
    fieldsets = (
        ('User', {
            'fields': ('user',)
        }),
        ('Plan Details', {
            'fields': ('plan', 'status')
        }),
        ('Dates', {
            'fields': ('start_date', 'end_date')
        }),
        ('Status Information', {
            'fields': ('is_active', 'days_remaining')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
