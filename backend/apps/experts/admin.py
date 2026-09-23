"""Django admin for the expert lifecycle — actions call services (never ad-hoc)."""

from django.contrib import admin

from apps.experts.models import ExpertApplication, ExpertProfile
from apps.experts.services import approve, reinstate, reject, start_review, suspend


@admin.register(ExpertApplication)
class ExpertApplicationAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "display_name",
        "status",
        "submitted_at",
        "reviewed_by",
        "resubmission_count",
        "updated_at",
    )
    list_filter = ("status", "timezone")
    search_fields = ("user__email", "user__name", "display_name", "headline", "bio")
    readonly_fields = ("status", "submitted_at", "reviewed_at", "reviewed_by", "resubmission_count")
    filter_horizontal = ("subjects", "skills", "credentials")
    actions = (
        "action_start_review",
        "action_approve",
        "action_reject",
        "action_suspend",
        "action_reinstate",
    )

    @admin.action(description="Start review (submitted → under review)")
    def action_start_review(self, request, queryset):
        for application in queryset:
            start_review(application.pk, reviewer=request.user, request=request)
        self.message_user(request, "Applications moved to under review.")

    @admin.action(description="Approve selected applications")
    def action_approve(self, request, queryset):
        count = 0
        for application in queryset:
            approve(application.pk, reviewer=request.user, request=request)
            count += 1
        self.message_user(request, f"{count} application(s) approved — profiles activated.")

    @admin.action(description="Reject selected applications (uses rejection_reason field)")
    def action_reject(self, request, queryset):
        count = 0
        for application in queryset:
            reason = application.rejection_reason or "See review note."
            reject(application.pk, reviewer=request.user, reason=reason, request=request)
            count += 1
        self.message_user(request, f"{count} application(s) rejected.")

    @admin.action(
        description="Suspend selected approved experts (uses rejection_reason field as reason)"
    )
    def action_suspend(self, request, queryset):
        for application in queryset:
            suspend(
                application.pk,
                reviewer=request.user,
                reason=application.rejection_reason or "Policy review.",
                request=request,
            )
        self.message_user(
            request, "Experts suspended — hidden from directory, student access kept."
        )

    @admin.action(description="Reinstate selected suspended experts")
    def action_reinstate(self, request, queryset):
        for application in queryset:
            reinstate(application.pk, reviewer=request.user, request=request)
        self.message_user(request, "Experts reinstated.")


@admin.register(ExpertProfile)
class ExpertProfileAdmin(admin.ModelAdmin):
    list_display = (
        "slug",
        "display_name",
        "availability",
        "is_public",
        "rating_avg",
        "approved_at",
    )
    list_filter = ("availability", "is_public")
    search_fields = ("slug", "display_name", "headline", "user__email")
    filter_horizontal = ("subjects", "skills")
    readonly_fields = ("slug", "approved_at")
    # Suspension/reinstatement belongs to the application (one source of truth):
    # staff use ExpertApplicationAdmin actions; here only profile fields are edited.
