"""Notifications admin — inbox inspection; nothing financial, read-only."""

from django.contrib import admin

from apps.notifications.models import Notification, NotificationPreference


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("created_at", "recipient", "type", "title", "read_at", "emailed_at")
    list_filter = ("type",)
    search_fields = ("recipient__email", "title")
    readonly_fields = [f.name for f in Notification._meta.fields]

    def has_add_permission(self, request) -> bool:
        return False

    def has_change_permission(self, request, obj=None) -> bool:
        return False

    def has_delete_permission(self, request, obj=None) -> bool:
        return False


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = ("user", "category", "email_enabled")
    list_filter = ("category", "email_enabled")

    def has_change_permission(self, request, obj=None) -> bool:
        return False  # preferences change only through the user's own API

    def has_add_permission(self, request) -> bool:
        return False

    def has_delete_permission(self, request, obj=None) -> bool:
        return False
