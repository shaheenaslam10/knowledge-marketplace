"""Moderation queue services (Phase 10) — the only writers for report
review state. Reuses messaging services for message visibility; every action
is staff-authorized at the API layer and audited here. No account
suspension/warning capability exists in the architecture (recorded decision:
admin-journey.md) — adding one is a business-rule change."""

from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from apps.audit.services import log as audit_log
from apps.core.exceptions import DomainError
from apps.messaging.models import MessageReport


class ReportAction:
    DISMISS = "dismiss"
    CONFIRM_HIDE = "confirm_hide"


CHOICES = (ReportAction.DISMISS, ReportAction.CONFIRM_HIDE)


@transaction.atomic
def review_report(report: MessageReport, *, actor, action: str, note: str = "") -> MessageReport:
    """Close an open report: dismiss it or confirm + hide the message.

    Idempotency: acting on an already-closed report raises `report_not_open`
    (the queue only ever shows open reports; double-submits fail loudly).
    """
    if action not in CHOICES:
        raise DomainError("Unknown moderation action.", code="validation_error")
    report = MessageReport.objects.select_for_update().get(pk=report.pk)
    if report.status != MessageReport.Status.OPEN:
        raise DomainError("This report was already reviewed.", code="report_not_open")

    if action == ReportAction.CONFIRM_HIDE:
        from apps.messaging.services import set_message_hidden

        set_message_hidden(report.message, actor=actor, hidden=True, reason=f"report:{report.pk}")
        report.status = MessageReport.Status.REVIEWED
    else:
        report.status = MessageReport.Status.DISMISSED

    report.reviewed_by = actor
    report.reviewed_at = timezone.now()
    report.details = (note or report.details or "")[:500]
    report.save(update_fields=["status", "reviewed_by", "reviewed_at", "details", "updated_at"])
    audit_log(
        actor,
        action=f"moderation.report_{action}",
        obj=report,
        detail={"message_id": str(report.message_id), "note": note[:200]},
    )
    return report
