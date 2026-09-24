"""Operations portal API (Phase 10) — staff-only surfaces under /ops/*.
Views are thin: authorization here, logic in apps.portal.services (and the
domain services they reuse). Reads support-or-admin; config writes are
admin-only (user-roles matrix)."""

from __future__ import annotations

from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdmin, IsSupport
from apps.audit.models import AuditEvent
from apps.core.exceptions import DomainError, NotFoundError
from apps.disputes.models import Dispute
from apps.messaging.models import MessageReport

RANGES = ("today", "7d", "30d")
MAX_CUSTOM_RANGE_DAYS = 190


def _resolve_range(params: dict) -> tuple:
    """Operational ranges → UTC [from, to). today = UTC calendar day;
    custom = [from 00:00 UTC, to+1d 00:00 UTC) — inclusive of both shown days."""
    import datetime

    from django.utils.dateparse import parse_date

    now = timezone.now()
    which = str(params.get("range", "30d"))
    if which in ("7d", "30d"):
        days = 7 if which == "7d" else 30
        start = (now - timezone.timedelta(days=days)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        return start, now
    if which == "today":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        return start, now
    if which == "custom":
        raw_from, raw_to = params.get("from"), params.get("to")
        if not raw_from or not raw_to:
            raise DomainError(
                "Custom ranges need from and to (YYYY-MM-DD).", code="validation_error"
            )
        parsed_from, parsed_to = parse_date(raw_from), parse_date(raw_to)
        if parsed_from is None or parsed_to is None or parsed_to < parsed_from:
            raise DomainError("Invalid custom date range.", code="validation_error")
        start = timezone.make_aware(
            datetime.datetime.combine(parsed_from, datetime.time.min), datetime.UTC
        )
        end_exclusive = timezone.make_aware(
            datetime.datetime.combine(parsed_to, datetime.time.min), datetime.UTC
        ) + timezone.timedelta(days=1)
        if end_exclusive - start > timezone.timedelta(days=MAX_CUSTOM_RANGE_DAYS):
            raise DomainError("Custom ranges are limited to 190 days.", code="validation_error")
        return start, end_exclusive
    raise DomainError("Unknown range — use today|7d|30d|custom.", code="validation_error")


class KpiDashboardView(APIView):
    """GET /ops/kpis?range=today|7d|30d|custom&from=&to= — read-only KPIs."""

    permission_classes = [IsAuthenticated, IsSupport | IsAdmin]

    def get(self, request):
        from apps.portal.services.analytics import kpis_for_range

        date_from, date_to = _resolve_range(request.query_params)
        return Response(kpis_for_range(date_from, date_to))


class ReportQueueView(APIView):
    """GET /ops/reports?status=&reason= — moderation report queue."""

    permission_classes = [IsAuthenticated, IsSupport | IsAdmin]

    def get(self, request):
        qs = MessageReport.objects.select_related("message__thread", "reported_by").order_by(
            "-created_at"
        )
        status = request.query_params.get("status")
        if status in MessageReport.Status.values:
            qs = qs.filter(status=status)
        reason = request.query_params.get("reason")
        if reason in MessageReport.Reason.values:
            qs = qs.filter(reason=reason)
        total = qs.count()
        limit = min(int(request.query_params.get("limit", 50)), 200)
        try:
            offset = max(int(request.query_params.get("offset", 0)), 0)
        except ValueError:
            offset = 0
        results = [
            {
                "id": str(report.pk),
                "status": report.status,
                "reason": report.reason,
                "reason_display": report.get_reason_display(),
                "details": report.details,
                "reporter": {"id": report.reported_by_id, "name": report.reported_by.name},
                "message": {
                    "id": str(report.message_id),
                    "sender": report.message.sender.name,
                    "sender_id": report.message.sender_id,
                    "body": report.message.body[:280],
                    "thread_id": str(report.message.thread_id),
                    "created_at": report.message.created_at.isoformat(),
                    "is_hidden": report.message.is_hidden,
                },
                "reviewed_by": report.reviewed_by_id,
                "reviewed_at": report.reviewed_at.isoformat() if report.reviewed_at else None,
                "created_at": report.created_at.isoformat(),
            }
            for report in qs[offset : offset + limit]
        ]
        return Response({"total": total, "results": results})


class ReportReviewView(APIView):
    """POST /ops/reports/{id}/review {action: dismiss|confirm_hide, note?} —
    service-backed + audited (support or admin)."""

    permission_classes = [IsAuthenticated, IsSupport | IsAdmin]

    def post(self, request, report_id: str):
        from apps.portal.services.moderation import review_report

        report = MessageReport.objects.filter(pk=report_id).first()
        if report is None:
            raise NotFoundError("Report not found.")
        data = request.data or {}
        report = review_report(
            report,
            actor=request.user,
            action=str(data.get("action", "")),
            note=str(data.get("note", "")),
        )
        return Response(
            {
                "id": str(report.pk),
                "status": report.status,
                "reviewed_at": report.reviewed_at.isoformat(),
            }
        )


class DisputeQueueView(APIView):
    """GET /ops/disputes?status= — operational dispute queue (read-only;
    resolution stays the Django admin service action, deep-linked from here)."""

    permission_classes = [IsAuthenticated, IsSupport | IsAdmin]

    def get(self, request):
        qs = Dispute.objects.select_related("order").order_by("-created_at")
        status = request.query_params.get("status")
        if status in Dispute.Status.values:
            qs = qs.filter(status=status)
        total = qs.count()
        limit = min(int(request.query_params.get("limit", 50)), 200)
        results = [
            {
                "id": str(dispute.pk),
                "status": dispute.status,
                "reason": dispute.reason,
                "reason_display": dispute.get_reason_display(),
                "outcome": dispute.outcome or None,
                "order_id": dispute.order_id,
                "order_number": dispute.order.number,
                "order_status": dispute.order.status,
                "amount": dispute.order.amount,
                "currency": dispute.order.currency,
                "student_id": dispute.order.student_id,
                "expert_id": dispute.order.expert_id,
                "opened_by": dispute.opened_by_id,
                "admin_url": f"/admin/disputes/dispute/{dispute.pk}/change/",
                "created_at": dispute.created_at.isoformat(),
                "resolved_at": dispute.resolved_at.isoformat() if dispute.resolved_at else None,
            }
            for dispute in qs[:limit]
        ]
        return Response({"total": total, "results": results})


class AuditViewerView(APIView):
    """GET /ops/audit?actor=&action=&object_type=&object_id=&from=&to= —
    read-only, append-only (BR-42); no write methods exist on this view."""

    permission_classes = [IsAuthenticated, IsSupport | IsAdmin]

    def get(self, request):
        from django.utils.dateparse import parse_date

        qs = AuditEvent.objects.all().order_by("-created_at")
        params = request.query_params
        if params.get("actor_id"):
            qs = qs.filter(actor_id=params["actor_id"])
        if params.get("action"):
            qs = qs.filter(action__icontains=params["action"])
        if params.get("object_type"):
            qs = qs.filter(object_type=params["object_type"])
        if params.get("object_id"):
            qs = qs.filter(object_id=params["object_id"])
        if params.get("from"):
            parsed = parse_date(params["from"])
            if parsed:
                qs = qs.filter(created_at__gte=parsed)
        if params.get("to"):
            parsed = parse_date(params["to"])
            if parsed:
                qs = qs.filter(created_at__lt=parsed + timezone.timedelta(days=1))
        total = qs.count()
        limit = min(int(params.get("limit", 50)), 200)
        results = [
            {
                "id": event.pk,
                "actor": event.actor_id,
                "actor_name": event.actor.name if event.actor else None,
                "action": event.action,
                "object_type": event.object_type,
                "object_id": str(event.object_id),
                "detail": event.detail,
                "created_at": event.created_at.isoformat(),
            }
            for event in qs[:limit]
        ]
        return Response({"total": total, "results": results})


class PlatformConfigView(APIView):
    """GET /ops/config (support+admin) · PUT /ops/config (admin only) —
    service-validated, audited before/after."""

    permission_classes = [IsAuthenticated, IsSupport | IsAdmin]

    def get(self, request):
        from apps.portal.services.config_editor import config_payload

        return Response(config_payload())

    def put(self, request):
        if not IsAdmin().has_permission(request, self):
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Only admins can change platform configuration.")
        from apps.portal.services.config_editor import update_config

        return Response(update_config(request.user, dict(request.data or {})))


class ReconciliationView(APIView):
    """GET /ops/reconciliation — read-only consistency report (no repairs)."""

    permission_classes = [IsAuthenticated, IsSupport | IsAdmin]

    def get(self, request):
        from apps.portal.services.reconciliation import reconciliation_report

        return Response(reconciliation_report())


class UsersOverviewView(APIView):
    """GET /ops/users?role=all|expert|staff&q= — operational overview
    (read-only; edits stay in Django admin)."""

    permission_classes = [IsAuthenticated, IsSupport | IsAdmin]

    def get(self, request):
        from apps.portal.services.users_overview import users_overview

        try:
            limit = min(int(request.query_params.get("limit", 50)), 200)
            offset = max(int(request.query_params.get("offset", 0)), 0)
        except ValueError:
            limit, offset = 50, 0
        return Response(
            users_overview(
                role=request.query_params.get("role", "all"),
                query=request.query_params.get("q", ""),
                limit=limit,
                offset=offset,
            )
        )
