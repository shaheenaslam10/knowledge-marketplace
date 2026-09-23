"""ServiceRequest admin — lifecycle is service-driven; admin triages (Phase 5)."""

from django.contrib import admin

from apps.service_requests.models import ServiceRequest


@admin.register(ServiceRequest)
class ServiceRequestAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "student",
        "status",
        "mode",
        "category",
        "offer_count",
        "deadline",
        "created_at",
    )
    list_filter = ("status", "mode", "category")
    search_fields = ("title", "student__email", "description")
    readonly_fields = (
        "offer_count",
        "view_count",
        "integrity_attested_at",
        "integrity_policy_version",
        "created_at",
        "updated_at",
    )
