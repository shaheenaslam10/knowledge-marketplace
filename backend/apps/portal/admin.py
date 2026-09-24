"""Portal app admin — PlatformConfig (singleton, audited edits via the
portal service; the admin form here is read-only to keep ONE write path)."""

from django.contrib import admin

from apps.core.models import PlatformConfig


@admin.register(PlatformConfig)
class PlatformConfigAdmin(admin.ModelAdmin):
    """View-only: changes go through POST /api/v1/ops/config (validated +
    audited) or the shell (`manage.py shell`) — never ad-hoc admin edits."""

    list_display = ("pk", "open_commission_rate", "managed_commission_rate", "updated_at")
    readonly_fields = [f.name for f in PlatformConfig._meta.fields]

    def has_add_permission(self, request) -> bool:
        return False

    def has_delete_permission(self, request, obj=None) -> bool:
        return False

    def has_change_permission(self, request, obj=None) -> bool:
        return False
