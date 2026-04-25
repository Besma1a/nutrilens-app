from django.contrib import admin
from .models import CustomUser, UserPreferences


@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'goal', 'weight', 'height')
    list_filter = ('goal', 'created_at')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    ordering = ('-created_at',)
    fieldsets = (
        ('Authentication', {'fields': ('username', 'email', 'password')}),
        ('Personal Info', {'fields': ('first_name', 'last_name', 'profile_picture', 'bio')}),
        ('Health Profile', {'fields': ('weight', 'height', 'goal', 'daily_calorie_goal')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser')}),
        ('Important Dates', {'fields': ('last_login', 'date_joined')}),
    )


@admin.register(UserPreferences)
class UserPreferencesAdmin(admin.ModelAdmin):
    list_display = ('user', 'is_premium', 'notifications_enabled', 'email_notifications')
    list_filter = ('is_premium', 'notifications_enabled', 'created_at')
    search_fields = ('user__username', 'preferred_nutritionist')

