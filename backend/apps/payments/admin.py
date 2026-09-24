"""Payment admin — operational inspection + service-routed actions (ADR-0010).

Financial records are read-only here: state changes go through
apps.payments.services (audited, row-locked) via admin actions. No inline
editing of money fields, no deletions on the ledger.
"""

from __future__ import annotations

from django.contrib import admin

from apps.payments import services
from apps.payments.models import LedgerEntry, Payment, Payout, Refund, WebhookEvent


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        "order",
        "gateway",
        "status",
        "amount_minor",
        "currency",
        "refunded_minor",
        "paid_at",
    )
    list_filter = ("gateway", "status", "currency")
    search_fields = ("provider_reference", "order__number")
    readonly_fields = [f.name for f in Payment._meta.fields]
    actions = ("confirm_operator_payment", "issue_full_refund")

    @admin.action(description="Confirm payment (manual rails: operator verified the transfer)")
    def confirm_operator_payment(self, request, queryset):
        for payment in queryset:
            try:
                services.confirm_payment(payment, actor=request.user, source="admin")
            except Exception as exc:  # surface per-row failures without aborting the batch
                self.message_user(request, f"{payment}: {exc}", level="WARNING")

    @admin.action(description="Issue full refund (admin_decision)")
    def issue_full_refund(self, request, queryset):
        for payment in queryset.filter(status=Payment.Status.SUCCEEDED):
            try:
                services.issue_refund(
                    payment,
                    amount_minor=payment.amount_minor - payment.refunded_minor,
                    reason=Refund.Reason.ADMIN_DECISION,
                    note="Full refund via admin action",
                    initiated_by=request.user,
                )
            except Exception as exc:
                self.message_user(request, f"{payment}: {exc}", level="WARNING")

    def has_add_permission(self, request) -> bool:
        return False  # payments are created by services only

    def has_change_permission(self, request, obj=None) -> bool:
        return False  # financial records are immutable from the admin

    def has_delete_permission(self, request, obj=None) -> bool:
        return False


@admin.register(Refund)
class RefundAdmin(admin.ModelAdmin):
    list_display = (
        "payment",
        "amount_minor",
        "reason",
        "status",
        "provider_reference",
        "processed_at",
    )
    list_filter = ("status", "reason")
    readonly_fields = [f.name for f in Refund._meta.fields]

    def has_add_permission(self, request) -> bool:
        return False

    def has_change_permission(self, request, obj=None) -> bool:
        return False

    def has_delete_permission(self, request, obj=None) -> bool:
        return False


@admin.register(Payout)
class PayoutAdmin(admin.ModelAdmin):
    list_display = ("order", "expert", "amount_minor", "currency", "status", "settled_at")
    list_filter = ("status", "currency")
    search_fields = ("provider_reference", "order__number")
    readonly_fields = [f.name for f in Payout._meta.fields]
    actions = ("settle_payouts", "mark_failed")

    @admin.action(description="Settle payouts (manual rails: external transfer executed)")
    def settle_payouts(self, request, queryset):
        for payout in queryset.filter(status__in=[Payout.Status.SCHEDULED, Payout.Status.FAILED]):
            try:
                services.settle_payout(payout, actor=request.user)
            except Exception as exc:
                self.message_user(request, f"{payout}: {exc}", level="WARNING")

    @admin.action(description="Mark payout failed")
    def mark_failed(self, request, queryset):
        for payout in queryset.exclude(status=Payout.Status.PAID):
            services.mark_payout_failed(
                payout, actor=request.user, reason="Marked failed via admin"
            )

    def has_add_permission(self, request) -> bool:
        return False

    def has_change_permission(self, request, obj=None) -> bool:
        return False

    def has_delete_permission(self, request, obj=None) -> bool:
        return False


@admin.register(LedgerEntry)
class LedgerEntryAdmin(admin.ModelAdmin):
    list_display = (
        "created_at",
        "entry_type",
        "amount_minor",
        "currency",
        "order",
        "user",
        "description",
    )
    list_filter = ("entry_type", "currency")
    search_fields = ("description", "provider_object_id", "order__number")
    readonly_fields = [f.name for f in LedgerEntry._meta.fields]
    date_hierarchy = "created_at"

    def has_add_permission(self, request) -> bool:
        return False

    def has_change_permission(self, request, obj=None) -> bool:
        return False

    def has_delete_permission(self, request, obj=None) -> bool:
        return False


@admin.register(WebhookEvent)
class WebhookEventAdmin(admin.ModelAdmin):
    list_display = ("received_at", "provider", "event_id", "type", "status", "processed_at")
    list_filter = ("provider", "status")
    search_fields = ("event_id", "type")
    readonly_fields = [f.name for f in WebhookEvent._meta.fields]
    actions = ("replay_events",)

    @admin.action(description="Replay failed events")
    def replay_events(self, request, queryset):
        from apps.payments import webhooks

        for event in queryset.filter(status=WebhookEvent.Status.FAILED):
            replayed = webhooks.redeliver(event)
            if replayed.status != WebhookEvent.Status.PROCESSED:
                self.message_user(request, f"{event.event_id}: {replayed.error}", level="WARNING")

    def has_add_permission(self, request) -> bool:
        return False

    def has_change_permission(self, request, obj=None) -> bool:
        return False

    def has_delete_permission(self, request, obj=None) -> bool:
        return False
