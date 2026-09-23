"""Audit admin — strictly read-only (append-only log)."""

from django.contrib import admin

from .models import AuditEvent


@admin.register(AuditEvent)
class AuditEventAdmin(admin.ModelAdmin):
    list_display = ("action", "object_type", "object_id", "actor", "created_at", "request_id")
    list_filter = ("action", "object_type")
    search_fields = ("action", "object_type", "object_id", "actor__email", "request_id")
    readonly_fields = (
        "actor",
        "action",
        "object_type",
        "object_id",
        "detail",
        "request_id",
        "created_at",
        "updated_at",
    )

    def has_add_permission(self, request) -> bool:
        return False

    def has_change_permission(self, request, obj=None) -> bool:
        return False

    def has_delete_permission(self, request, obj=None) -> bool:
        return False
