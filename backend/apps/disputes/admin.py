"""Disputes admin — operational resolution surface (Phase 9; queue/dashboard
= Phase 10). All actions delegate to services (audit + money handled there)."""

from django.contrib import admin

from apps.disputes.models import Dispute


@admin.register(Dispute)
class DisputeAdmin(admin.ModelAdmin):
    list_display = ("__str__", "order", "reason", "status", "outcome", "created_at")
    list_filter = ("status", "reason", "outcome")
    search_fields = ("description", "order__number")
    readonly_fields = [f.name for f in Dispute._meta.fields] + ["evidence"]

    @admin.action(description="Take case (open → under_review)")
    def take_case(self, request, queryset):
        from apps.disputes import services

        for dispute in queryset:
            services.take_case(dispute, actor=request.user)

    @admin.action(description="Await response (48h)")
    def await_response(self, request, queryset):
        from apps.disputes import services

        for dispute in queryset:
            services.await_response(dispute, actor=request.user)

    @admin.action(description="Resume review")
    def resume_review(self, request, queryset):
        from apps.disputes import services

        for dispute in queryset:
            services.resume_review(dispute, actor=request.user)

    @admin.action(description="Close (funds settled + notified)")
    def close(self, request, queryset):
        from apps.disputes import services

        for dispute in queryset:
            services.close(dispute, actor=request.user)

    actions = ["take_case", "await_response", "resume_review", "close"]

    # Resolution runs from the change-form action below (needs outcome + notes +
    # amounts), not from the bulk list.
    change_form_template = "admin/disputes/dispute_change_form.html"

    def response_change(self, request, obj):
        from apps.disputes import services

        if "_resolve" in request.POST:
            services.resolve(
                obj,
                actor=request.user,
                outcome=request.POST.get("outcome"),
                resolution_notes=request.POST.get("resolution_notes", ""),
                refund_amount_minor=int(request.POST.get("refund_amount_minor") or 0) or None,
            )
            self.message_user(request, "Dispute resolved (money executed via payments services).")
        return super().response_change(request, obj)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return True  # form hosts the resolve action; model fields stay read-only

    def has_delete_permission(self, request, obj=None):
        return False
