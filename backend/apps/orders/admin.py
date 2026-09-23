"""Order admin — the payment seam (manual confirm) + cancellation live here
until the payments phase wires Stripe; transitions go through services."""

from django.contrib import admin, messages

from apps.orders import services
from apps.orders.delivery import Delivery, OrderEvent
from apps.orders.models import Order


class DeliveryInline(admin.TabularInline):
    model = Delivery
    extra = 0
    fields = (
        "revision_number",
        "status",
        "summary",
        "submitted_at",
        "approved_at",
        "approval_source",
    )
    readonly_fields = fields
    show_change_link = True


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "number",
        "student",
        "expert_name",
        "amount",
        "currency",
        "status",
        "source",
        "created_at",
    )
    list_filter = ("status", "source")
    search_fields = ("number", "student__email", "expert_name", "request__title")
    readonly_fields = (
        "number",
        "request",
        "student",
        "expert_id",
        "expert_name",
        "expert_slug",
        "source",
        "offer_id",
        "amount",
        "currency",
        "commission_rate",
        "commission_amount",
        "expert_amount",
        "accepted_at",
        "paid_at",
        "delivered_at",
        "completed_at",
        "cancelled_at",
        "cancelled_by",
        "created_at",
        "updated_at",
    )
    inlines = [DeliveryInline]
    actions = ("confirm_payment", "force_approve", "cancel_order")

    @admin.action(description="Confirm payment (manual mode → active)")
    def confirm_payment(self, request, queryset):
        done = 0
        for order in queryset.filter(status=Order.Status.AWAITING_PAYMENT):
            order = services.mark_paid(order, actor=request.user, via="manual")
            done += 1
        messages.info(request, f"Confirmed payment on {done} order(s) — now active.")

    @admin.action(description="Force-approve delivered orders (admin)")
    def force_approve(self, request, queryset):
        done = 0
        for order in queryset.filter(status=Order.Status.DELIVERED):
            services.approve_delivery(order, actor=request.user, source="admin")
            done += 1
        messages.info(request, f"Force-approved {done} order(s).")

    @admin.action(description="Cancel orders (reason required next prompt)")
    def cancel_order(self, request, queryset):
        done = 0
        for order in queryset.exclude(status__in=(Order.Status.COMPLETED, Order.Status.CANCELLED)):
            services.cancel(
                order, actor=request.user, reason=f"Admin action by {request.user.email}"
            )
            done += 1
        messages.info(request, f"Cancelled {done} order(s).")


@admin.register(Delivery)
class DeliveryAdmin(admin.ModelAdmin):
    list_display = (
        "order",
        "revision_number",
        "status",
        "submitted_at",
        "approved_at",
        "approval_source",
    )
    list_filter = ("status",)
    search_fields = ("order__number", "summary")
    readonly_fields = ("created_at", "updated_at")


@admin.register(OrderEvent)
class OrderEventAdmin(admin.ModelAdmin):
    list_display = ("order", "event_type", "actor", "created_at")
    list_filter = ("event_type",)
    search_fields = ("order__number",)
    readonly_fields = ("order", "event_type", "actor", "data", "created_at", "updated_at")

    def has_add_permission(self, request):
        return False  # events are written by services only
