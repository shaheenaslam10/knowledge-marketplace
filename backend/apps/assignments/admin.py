"""Managed-service triage via Django admin (ADR-0010) — all writes go through
services, so validation, auditing and student-visible quotes stay consistent."""

from datetime import timedelta

from django.contrib import admin, messages
from django.utils import timezone

from apps.assignments import services
from apps.assignments.models import DirectAssignment, PoolInvitation
from apps.service_requests import services as request_services


@admin.register(PoolInvitation)
class PoolInvitationAdmin(admin.ModelAdmin):
    list_display = ("request", "expert", "status", "expires_at", "responded_at")
    list_filter = ("status",)
    search_fields = ("expert__email", "request__title")
    readonly_fields = ("status", "responded_at", "created_at", "updated_at")

    actions = ("reinvite",)

    @admin.action(description="Re-broadcast selected expired/declined invitations (fresh 48h)")
    def reinvite(self, request, queryset):
        count = 0
        for invitation in queryset.filter(
            status__in=(PoolInvitation.Status.EXPIRED, PoolInvitation.Status.DECLINED)
        ):
            PoolInvitation.objects.create(
                request=invitation.request,
                expert=invitation.expert,
                expires_at=timezone.now() + timedelta(hours=48),
                invited_by=request.user,
            )
            count += 1
        messages.info(request, f"Re-broadcast {count} invitation(s).")


@admin.register(DirectAssignment)
class DirectAssignmentAdmin(admin.ModelAdmin):
    list_display = ("request", "expert_name", "amount", "status", "expires_at", "decided_by_admin")
    list_filter = ("status",)
    search_fields = ("expert_name", "request__title")
    readonly_fields = ("status", "responded_at", "decline_reason", "created_at", "updated_at")

    actions = ("supersede",)

    @admin.action(description="Supersede selected pending assignments (reassign)")
    def supersede(self, request, queryset):
        done = 0
        for assignment in queryset.filter(status=DirectAssignment.Status.PENDING):
            services.supersede_direct(request.user, assignment)
            done += 1
        messages.info(request, f"Superseded {done} assignment(s).")

    # Creation = owner triage through the service, so the add form collects ONLY
    # the service inputs. expert_name / currency / expires_at / decided_by_admin
    # are computed by assign_direct — they used to be required-but-discarded
    # inputs, and the expert picker listed every user (Phase 11 E2E finding).
    add_fields = ("request", "expert", "amount", "deadline", "scope_note")

    def get_fields(self, request, obj=None):
        if obj is None:
            return self.add_fields
        return super().get_fields(request, obj)

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        if obj is None:
            # Triage picker: exactly the experts the service accepts, labelled
            # like the ExpertProfile admin (expert:<slug>). The change form keeps
            # the plain FK so existing rows stay editable.
            field = form.base_fields["expert"]
            field.queryset = (
                request_services.eligible_experts()
                .select_related("expert_profile")
                .order_by("expert_profile__slug")
            )
            field.label_from_instance = lambda user: str(user.expert_profile)
        return form

    def save_model(self, request, obj, form, change):
        if change:
            super().save_model(request, obj, form, change)
            return
        # Creation = owner triage → through the service (eligibility, quote, audit, email).
        assignment = services.assign_direct(
            request.user,
            obj.request,
            expert=obj.expert,
            amount=obj.amount,
            deadline=obj.deadline,
            scope_note=obj.scope_note,
        )
        # the admin's success message + LogEntry must reference the real row
        obj.pk = assignment.pk
