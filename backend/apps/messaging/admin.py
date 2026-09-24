"""Messaging admin — inspection + report-driven moderation only (BR-35)."""

from django.contrib import admin

from apps.messaging.models import Message, MessageReceipt, MessageReport, Thread


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    fields = ("sender", "body", "attachment", "is_hidden", "created_at")
    readonly_fields = ("sender", "body", "attachment", "created_at")
    can_delete = False

    def has_add_permission(self, request, obj=None) -> bool:
        return False


@admin.register(Thread)
class ThreadAdmin(admin.ModelAdmin):
    list_display = ("context_type", "order", "request", "last_message_at", "created_at")
    list_filter = ("context_type",)
    inlines = [MessageInline]

    def has_add_permission(self, request) -> bool:
        return False  # threads are created lazily by services

    def has_change_permission(self, request, obj=None) -> bool:
        return False  # message content is not editable; hiding happens on Message

    def has_delete_permission(self, request, obj=None) -> bool:
        return False


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    """Report-driven moderation: staff can only toggle the hidden flag; every
    view of a thread through services is audited (BR-35)."""

    list_display = ("thread", "sender", "created_at", "is_hidden")
    list_filter = ("is_hidden",)
    search_fields = ("body",)
    readonly_fields = ("thread", "sender", "body", "attachment", "created_at")

    def has_add_permission(self, request) -> bool:
        return False

    def has_delete_permission(self, request, obj=None) -> bool:
        return False


admin.site.register(MessageReceipt)


@admin.register(MessageReport)
class MessageReportAdmin(admin.ModelAdmin):
    list_display = ("__str__", "reason", "status", "created_at")
    list_filter = ("reason", "status")
    search_fields = ("details",)
    readonly_fields = [f.name for f in MessageReport._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.action(description="Hide selected messages (audited)")
def hide_messages(modeladmin, request, queryset):
    from apps.messaging.services import set_message_hidden

    for message in queryset.filter(is_hidden=False):
        set_message_hidden(message, actor=request.user, hidden=True, reason="admin-action")


@admin.action(description="Unhide selected messages (audited)")
def unhide_messages(modeladmin, request, queryset):
    from apps.messaging.services import set_message_hidden

    for message in queryset.filter(is_hidden=True):
        set_message_hidden(message, actor=request.user, hidden=False, reason="admin-action")


MessageAdmin.actions = ["hide_messages", "unhide_messages"]


# NOTE: report review/dismiss deliberately does NOT live here. The portal owns
# that flow (apps.portal.services.moderation — audited dismiss/confirm-hide);
# letting Django admin actions import the portal layer would invert the
# app-layering contract (import-linter). Admin keeps read-only report rows.
