"""Messaging admin — inspection + report-driven moderation only (BR-35)."""

from django.contrib import admin

from apps.messaging.models import Message, MessageReceipt, Thread


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
