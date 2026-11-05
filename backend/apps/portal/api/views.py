"""Operations portal API (Phase 10) — staff-only surfaces under /ops/*.
Views are thin: authorization here, logic in apps.portal.services (and the
domain services they reuse). Reads support-or-admin; config writes are
admin-only (user-roles matrix)."""

from __future__ import annotations

import csv

from django.db.models import Q, Sum
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdmin, IsSupport
from apps.audit.models import AuditEvent
from apps.core.exceptions import DomainError, NotFoundError
from apps.core.money import to_major
from apps.disputes.models import Dispute
from apps.messaging.models import MessageReport
from apps.payments.models import LedgerEntry

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
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "ops_write"
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
    """GET /ops/disputes?status= — operational dispute queue with full evidence workbench telemetry."""

    permission_classes = [IsAuthenticated, IsSupport | IsAdmin]

    def get(self, request):
        qs = Dispute.objects.select_related(
            "order",
            "order__student",
        ).prefetch_related(
            "order__deliveries",
            "order__deliveries__attachments",
            "order__live_sessions",
        ).order_by("-created_at")
        status_filter = request.query_params.get("status")
        if status_filter in Dispute.Status.values:
            qs = qs.filter(status=status_filter)
        total = qs.count()
        limit = min(int(request.query_params.get("limit", 50)), 200)
        results = []
        for dispute in qs[:limit]:
            order = dispute.order
            deliveries = [
                {
                    "id": str(d.id),
                    "revision_number": d.revision_number,
                    "summary": d.summary,
                    "status": d.status,
                    "submitted_at": d.submitted_at.isoformat() if d.submitted_at else None,
                    "attachments": [
                        {"id": str(a.id), "name": a.original_name, "file_size": a.file_size}
                        for a in d.attachments.all()
                    ],
                }
                for d in order.deliveries.all()
            ]
            live_session = order.live_sessions.first() if hasattr(order, "live_sessions") else None
            scratchpad_content = live_session.scratchpad_content if live_session else ""

            thread = getattr(order, "thread", None)
            recent_messages = []
            if thread:
                recent_messages = [
                    {
                        "id": str(m.id),
                        "sender_name": (
                            m.sender.email
                            if m.sender
                            else "System"
                        ),
                        "body": m.body[:200],
                        "created_at": m.created_at.isoformat(),
                    }
                    for m in thread.messages.order_by("-created_at")[:5]
                ]

            results.append({
                "id": str(dispute.pk),
                "status": dispute.status,
                "reason": dispute.reason,
                "reason_display": dispute.get_reason_display(),
                "description": dispute.description,
                "outcome": dispute.outcome or None,
                "resolution_notes": dispute.resolution_notes or "",
                "order_id": dispute.order_id,
                "order_number": order.number,
                "order_status": order.status,
                "amount": order.amount,
                "currency": order.currency,
                "student_id": order.student_id,
                "student_name": getattr(order.student, "display_name", None) or order.student.email,
                "student_email": order.student.email,
                "expert_id": order.expert_id,
                "expert_name": order.expert_name,
                "expert_email": f"expert-{order.expert_id}@demo.local",
                "opened_by": dispute.opened_by_id,
                "admin_url": f"/admin/disputes/dispute/{dispute.pk}/change/",
                "created_at": dispute.created_at.isoformat(),
                "resolved_at": dispute.resolved_at.isoformat() if dispute.resolved_at else None,
                "deliveries": deliveries,
                "scratchpad_content": scratchpad_content,
                "messages_count": thread.messages.count() if thread else 0,
                "recent_messages": recent_messages,
            })
        return Response({"total": total, "results": results})


class DisputeResolveView(APIView):
    """POST /ops/disputes/{pk}/resolve — operational dispute resolution (support or admin)."""

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "ops_write"
    permission_classes = [IsAuthenticated, IsSupport | IsAdmin]

    def post(self, request, pk: str):
        from apps.disputes.services import resolve, take_case

        dispute = Dispute.objects.select_related("order").filter(pk=pk).first()
        if dispute is None:
            raise NotFoundError("Dispute not found.")

        outcome = request.data.get("outcome")
        resolution_notes = str(request.data.get("resolution_notes", "")).strip()
        refund_amount_minor = request.data.get("refund_amount_minor")
        split_percent = request.data.get("split_percent")

        if split_percent is not None and refund_amount_minor is None:
            pct = max(0.0, min(100.0, float(split_percent)))
            refund_amount_minor = round(dispute.order.amount * (pct / 100.0))

        if not outcome:
            raise DomainError("Outcome is required.", code="validation_error")

        if dispute.status == Dispute.Status.OPEN:
            dispute = take_case(dispute, actor=request.user)

        dispute = resolve(
            dispute,
            actor=request.user,
            outcome=outcome,
            resolution_notes=resolution_notes,
            refund_amount_minor=refund_amount_minor,
        )

        return Response({
            "id": str(dispute.pk),
            "status": dispute.status,
            "outcome": dispute.outcome,
            "resolution_notes": dispute.resolution_notes,
            "resolved_at": dispute.resolved_at.isoformat() if dispute.resolved_at else None,
        })


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
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "ops_write"
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


class LedgerExplorerView(APIView):
    """GET /ops/finance/ledger — Granular Double-Entry Financial Ledger Explorer."""

    permission_classes = [IsAuthenticated, IsSupport | IsAdmin]

    def get(self, request):
        entry_type = request.query_params.get("entry_type")
        q = request.query_params.get("q", "").strip()
        order_number = request.query_params.get("order_number", "").strip()

        try:
            limit = min(int(request.query_params.get("limit", 50)), 200)
            offset = max(int(request.query_params.get("offset", 0)), 0)
        except ValueError:
            limit, offset = 50, 0

        qs = LedgerEntry.objects.select_related("order", "user").order_by("-created_at", "-id")

        if entry_type and entry_type.lower() not in ("all", ""):
            qs = qs.filter(entry_type=entry_type.lower())

        if order_number:
            qs = qs.filter(order__number__icontains=order_number)

        if q:
            qs = qs.filter(
                Q(order__number__icontains=q)
                | Q(user__email__icontains=q)
                | Q(description__icontains=q)
                | Q(provider_object_id__icontains=q)
            )

        total_count = qs.count()
        page_entries = list(qs[offset : offset + limit])

        # Precompute invariant status for relevant orders in page
        order_ids = {entry.order_id for entry in page_entries if entry.order_id}
        order_balances: dict[int, dict] = {}
        if order_ids:
            order_sums = (
                LedgerEntry.objects.filter(order_id__in=order_ids)
                .values("order_id", "entry_type")
                .annotate(total=Sum("amount_minor"))
            )
            for row in order_sums:
                oid = row["order_id"]
                if oid not in order_balances:
                    order_balances[oid] = {"lhs": 0, "rhs": 0, "entries": {}}
                etype = row["entry_type"]
                amt = int(row["total"] or 0)
                order_balances[oid]["entries"][etype] = amt
                if etype in ("charge", "refund"):
                    order_balances[oid]["lhs"] += amt
                elif etype in ("commission", "expert_credit", "fee"):
                    order_balances[oid]["rhs"] += amt

        results = []
        for e in page_entries:
            bal_info = order_balances.get(e.order_id)
            is_balanced = True
            lhs, rhs = 0, 0
            if bal_info is not None:
                lhs, rhs = bal_info["lhs"], bal_info["rhs"]
                is_balanced = lhs == rhs

            results.append(
                {
                    "id": str(e.id),
                    "created_at": e.created_at,
                    "entry_type": e.entry_type,
                    "entry_type_label": e.get_entry_type_display(),
                    "amount_minor": e.amount_minor,
                    "amount_display": to_major(e.amount_minor, e.currency),
                    "currency": e.currency,
                    "order_id": str(e.order_id) if e.order_id else None,
                    "order_number": e.order.number if e.order else None,
                    "user_id": e.user_id,
                    "user_email": e.user.email if e.user else None,
                    "description": e.description,
                    "provider_object_id": e.provider_object_id,
                    "is_balanced": is_balanced,
                    "t_account": {
                        "charge_plus_refund": lhs,
                        "allocations": rhs,
                    }
                    if bal_info
                    else None,
                }
            )

        totals_by_type = {
            row["entry_type"]: int(row["total"] or 0)
            for row in LedgerEntry.objects.values("entry_type").annotate(total=Sum("amount_minor"))
        }

        total_charges = totals_by_type.get("charge", 0)
        total_commissions = totals_by_type.get("commission", 0)
        total_credits = totals_by_type.get("expert_credit", 0)
        total_refunds = totals_by_type.get("refund", 0)
        total_fees = totals_by_type.get("fee", 0)

        lhs_system = total_charges + total_refunds
        rhs_system = total_commissions + total_credits + total_fees

        return Response(
            {
                "count": total_count,
                "results": results,
                "summary": {
                    "total_charges": total_charges,
                    "total_commissions": total_commissions,
                    "total_credits": total_credits,
                    "total_refunds": total_refunds,
                    "total_fees": total_fees,
                    "system_balanced": (lhs_system == rhs_system),
                },
            }
        )


class LedgerExportCsvView(APIView):
    """GET /ops/finance/ledger/export-csv — download full ledger audit CSV."""

    permission_classes = [IsAuthenticated, IsSupport | IsAdmin]

    def get(self, request):
        entry_type = request.query_params.get("entry_type")
        q = request.query_params.get("q", "").strip()

        qs = LedgerEntry.objects.select_related("order", "user").order_by("-created_at", "-id")

        if entry_type and entry_type.lower() not in ("all", ""):
            qs = qs.filter(entry_type=entry_type.lower())

        if q:
            qs = qs.filter(
                Q(order__number__icontains=q)
                | Q(user__email__icontains=q)
                | Q(description__icontains=q)
                | Q(provider_object_id__icontains=q)
            )

        response = HttpResponse(content_type="text/csv")
        ts = timezone.now().strftime("%Y%m%d_%H%M%S")
        response["Content-Disposition"] = f'attachment; filename="ledger_export_{ts}.csv"'

        writer = csv.writer(response)
        writer.writerow(
            [
                "Entry ID",
                "Created At (UTC)",
                "Order Number",
                "User Email",
                "Entry Type",
                "Amount Minor",
                "Amount Display",
                "Currency",
                "Description",
                "Provider Ref",
            ]
        )

        for e in qs[:5000]:
            writer.writerow(
                [
                    str(e.id),
                    e.created_at.isoformat() if e.created_at else "",
                    e.order.number if e.order else "N/A",
                    e.user.email if e.user else "N/A",
                    e.entry_type,
                    e.amount_minor,
                    to_major(e.amount_minor, e.currency),
                    e.currency,
                    e.description,
                    e.provider_object_id,
                ]
            )

        return response


class OpsPayoutListView(APIView):
    """GET /api/v1/ops/payouts — Operations view of all scheduled and pending payout requests."""

    permission_classes = [IsAuthenticated, IsSupport | IsAdmin]

    def get(self, request):
        from apps.payments.models import Payout

        payouts = Payout.objects.select_related("expert", "order").order_by("-created_at")[:50]
        results = [
            {
                "id": p.id,
                "expert_id": p.expert_id,
                "expert_name": p.expert.name or p.expert.email,
                "expert_email": p.expert.email,
                "order_number": p.order.number if p.order else "Balance Withdrawal",
                "amount_minor": p.amount_minor,
                "amount_display": f"${p.amount_minor / 100:.2f}",
                "currency": p.currency,
                "status": p.status,
                "provider_reference": p.provider_reference,
                "created_at": p.created_at.isoformat(),
                "settled_at": p.settled_at.isoformat() if p.settled_at else None,
            }
            for p in payouts
        ]
        return Response({"results": results})


class OpsPayoutSettleView(APIView):
    """POST /api/v1/ops/payouts/<id>/settle — Staff approval & settlement of payout."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, payout_id: int):
        from apps.core.exceptions import NotFoundError
        from apps.payments.models import Payout
        from apps.payments.services import settle_payout

        payout = Payout.objects.filter(pk=payout_id).first()
        if not payout:
            raise NotFoundError("Payout not found.")
        settled = settle_payout(payout, actor=request.user)
        return Response(
            {
                "id": settled.id,
                "status": settled.status,
                "settled_at": settled.settled_at.isoformat() if settled.settled_at else None,
                "provider_reference": settled.provider_reference,
                "amount_display": f"${settled.amount_minor / 100:.2f}",
            }
        )
