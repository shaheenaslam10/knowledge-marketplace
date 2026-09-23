"""Order admin — read-only until the payments phase adds transitions."""

from django.contrib import admin

from apps.orders.models import Order


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("number", "student", "expert_name", "amount", "status", "source", "created_at")
    list_filter = ("status", "source")
    search_fields = ("number", "student__email", "expert_name")
    readonly_fields = (
        "number",
        "commission_rate",
        "commission_amount",
        "expert_amount",
        "created_at",
        "updated_at",
    )
