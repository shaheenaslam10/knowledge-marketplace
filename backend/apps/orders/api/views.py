"""Order API — one workspace contract for all three sources (open/managed_*)."""

from __future__ import annotations

import contextlib
import datetime

from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils import dateparse, timezone
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.exceptions import DomainError, PermissionDeniedError
from apps.core.money import to_major
from apps.core.pagination import DefaultCursorPagination
from apps.files import services as files_services
from apps.orders import services
from apps.orders.delivery import Delivery
from apps.orders.models import LiveSession, Order
from apps.payments import services as payment_services
from apps.payments.models import Payment


def _role(user, order: Order) -> str:
    if order.student_id == user.id:
        return "student"
    if order.expert_id == user.id:
        return "expert"
    if getattr(user, "is_staff", False):
        return "staff"
    raise PermissionDeniedError("You are not a party to this order.")


def _attachment_meta(attachment, request=None) -> dict:
    url = None
    if request:
        try:
            url = files_services.download_url(request, attachment)
        except Exception:
            url = None
    return {
        "id": str(attachment.id),
        "original_name": attachment.original_name,
        "size": attachment.size,
        "content_type": attachment.content_type,
        "download_url": url,
    }


def _delivery_meta(
    delivery: Delivery,
    request=None,
    revision_note: str | None = None,
    is_latest: bool = False,
) -> dict:
    return {
        "id": str(delivery.id),
        "revision_number": delivery.revision_number,
        "version_label": f"v{delivery.revision_number + 1}",
        "summary": delivery.summary,
        "status": delivery.status,
        "submitted_at": delivery.submitted_at,
        "approved_at": delivery.approved_at,
        "approval_source": delivery.approval_source,
        "student_revision_note": revision_note,
        "is_latest": is_latest,
        "attachments": [_attachment_meta(a, request) for a in delivery.attachments.all()],
    }


def _deadline_proposal_meta(order: Order, role: str) -> dict | None:
    proposal = getattr(order, "deadline_proposal", None)
    if proposal is None:
        return None
    delta_hours = None
    baseline = order.delivery_due_at or order.deadline
    if baseline and proposal.proposed_due_at:
        if isinstance(baseline, datetime.datetime):
            diff = proposal.proposed_due_at - baseline
        elif isinstance(baseline, datetime.date):
            base_dt = datetime.datetime.combine(baseline, datetime.time.min, tzinfo=datetime.UTC)
            diff = proposal.proposed_due_at - base_dt
        else:
            diff = None
        if diff is not None:
            delta_hours = round(diff.total_seconds() / 3600)

    proposer_role = "student" if proposal.proposed_by_id == order.student_id else "expert"
    return {
        "id": proposal.pk,
        "status": proposal.status,
        "proposed_due_at": proposal.proposed_due_at,
        "proposed_by_id": proposal.proposed_by_id,
        "proposed_by_role": proposer_role,
        "note": proposal.note,
        "delta_hours": delta_hours,
        "created_at": proposal.created_at,
    }


def _order_meta(order: Order, role: str) -> dict:
    counterparty = order.expert_name if role == "student" else str(order.student.email)
    return {
        "id": str(order.id),
        "number": order.number,
        "source": order.source,
        "request_id": str(order.request_id),
        "request_title": order.request.title,
        "request_category": order.request.category,
        "status": order.status,
        "role": role,
        "counterparty": counterparty,
        "amount_display": to_major(order.amount, order.currency),
        "expert_amount_display": to_major(order.expert_amount, order.currency),
        "commission_display": to_major(order.commission_amount, order.currency),
        "currency": order.currency,
        "deadline": order.deadline,
        "delivery_due_at": order.delivery_due_at,
        "revisions_allowed": order.revisions_allowed,
        "revisions_used": order.revisions_used,
        "auto_approve_at": order.auto_approve_at,
        "created_at": order.created_at,
        "paid_at": order.paid_at,
        "delivered_at": order.delivered_at,
        "completed_at": order.completed_at,
        "cancelled_at": order.cancelled_at,
        "cancellation_reason": order.cancellation_reason,
    }


class MyOrderListView(generics.ListAPIView):
    pagination_class = DefaultCursorPagination
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return (
            (Order.objects.filter(student=user) | Order.objects.filter(expert_id=user.id))
            .select_related("request")
            .order_by("-created_at")
        )

    def list(self, request, *args, **kwargs):
        page = self.paginate_queryset(self.get_queryset())
        return self.get_paginated_response(
            [
                {
                    "id": str(o.id),
                    "number": o.number,
                    "status": o.status,
                    "source": o.source,
                    "request_title": o.request.title,
                    "amount_display": to_major(o.amount, o.currency),
                    "role": _role(request.user, o),
                    "created_at": o.created_at,
                }
                for o in page
            ]
        )



def _live_session_meta(order: Order, role: str) -> dict:
    active = (
        order.live_sessions.filter(status__in=[LiveSession.Status.LIVE, LiveSession.Status.SCHEDULED])
        .order_by("-created_at")
        .first()
    )
    recent = list(
        order.live_sessions.filter(status=LiveSession.Status.ENDED).order_by("-ended_at")[:5]
    )

    def _fmt(s: LiveSession):
        return {
            "id": s.id,
            "status": s.status,
            "scheduled_at": s.scheduled_at,
            "started_at": s.started_at,
            "ended_at": s.ended_at,
            "duration_seconds": s.duration_seconds,
            "scratchpad_content": s.scratchpad_content,
            "created_by": {
                "id": s.created_by.id if s.created_by else None,
                "name": getattr(s.created_by, "name", "") if s.created_by else "",
                "email": s.created_by.email if s.created_by else "",
            } if s.created_by else None,
            "created_at": s.created_at,
        }

    return {
        "active_session": _fmt(active) if active else None,
        "recent_sessions": [_fmt(s) for s in recent],
    }

class MyOrderDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _order(self, request, pk) -> Order:
        order = get_object_or_404(
            Order.objects.select_related("request", "deadline_proposal"), pk=pk
        )
        _role(request.user, order)  # ownership gate — non-parties get 403
        return order

    def get(self, request, pk):
        order = self._order(request, pk)
        role = _role(request.user, order)
        events = [
            {"event_type": e.event_type, "created_at": e.created_at, "data": e.data}
            for e in order.events.all()
        ]

        # Extract student revision notes from order events
        revision_notes: dict[int, str] = {}
        for ev in order.events.filter(event_type="revision_requested"):
            data = ev.data or {}
            rev_idx = data.get("revision")
            note_val = data.get("note") or ""
            if rev_idx is not None:
                with contextlib.suppress(ValueError, TypeError):
                    revision_notes[int(rev_idx) - 1] = note_val

        all_deliveries = list(
            order.deliveries.prefetch_related("attachments").order_by("revision_number")
        )
        total_deliveries = len(all_deliveries)
        deliveries = [
            _delivery_meta(
                d,
                request=request,
                revision_note=revision_notes.get(d.revision_number),
                is_latest=(idx == total_deliveries - 1),
            )
            for idx, d in enumerate(all_deliveries)
        ]

        return Response(
            {
                **_order_meta(order, role),
                "events": events,
                "deliveries": deliveries,
                "deadline_proposal": _deadline_proposal_meta(order, role),
                "payment": _payment_meta(order, role),
                "live_session": _live_session_meta(order, role),
            }
        )


class OrderDeliverView(APIView):
    """POST /me/orders/{id}/deliveries — expert submits work (files uploaded
    beforehand via POST /files purpose=delivery, referenced by id)."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        order = get_object_or_404(Order.objects.select_related("request"), pk=pk)
        _role(request.user, order)
        delivery = services.submit_delivery(
            order,
            expert=request.user,
            summary=request.data.get("summary", ""),
            attachment_ids=request.data.get("attachment_ids") or None,
        )
        return Response(_delivery_meta(delivery, request=request, is_latest=True))


class OrderApproveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        order = get_object_or_404(Order.objects.select_related("request"), pk=pk)
        _role(request.user, order)
        order = services.approve_delivery(order, actor=request.user, source="student")
        return Response({"status": order.status, "completed_at": order.completed_at})


class OrderRevisionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        order = get_object_or_404(Order.objects.select_related("request"), pk=pk)
        _role(request.user, order)
        delivery = services.request_revision(
            order, student=request.user, note=request.data.get("note", "")
        )
        return Response(
            {"status": "revision_requested", "revision_number": delivery.revision_number}
        )


class OrderCancelView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        order = get_object_or_404(Order.objects.select_related("request"), pk=pk)
        _role(request.user, order)
        order = services.cancel(order, actor=request.user, reason=request.data.get("reason", ""))
        return Response({"status": order.status, "cancelled_at": order.cancelled_at})


class OrderDeadlineProposalView(APIView):
    """POST /me/orders/{id}/deadline-proposal — propose deadline extension."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        order = get_object_or_404(Order.objects.select_related("request"), pk=pk)
        role = _role(request.user, order)
        raw_due_at = request.data.get("proposed_due_at")
        if not raw_due_at:
            raise DomainError("proposed_due_at is required.", code="validation_error")

        proposed_due_at = dateparse.parse_datetime(raw_due_at)
        if not proposed_due_at:
            # Fall back to date parsing
            parsed_date = dateparse.parse_date(raw_due_at)
            if parsed_date:
                proposed_due_at = datetime.datetime.combine(
                    parsed_date, datetime.time(23, 59, 59), tzinfo=datetime.UTC
                )
            else:
                raise DomainError(
                    "Invalid datetime format for proposed_due_at.", code="validation_error"
                )

        if timezone.is_naive(proposed_due_at):
            proposed_due_at = timezone.make_aware(proposed_due_at)

        note = request.data.get("note", "")
        services.propose_deadline(
            order, actor=request.user, proposed_due_at=proposed_due_at, note=note
        )
        order.refresh_from_db()
        return Response(_deadline_proposal_meta(order, role))


class OrderDeadlineProposalRespondView(APIView):
    """POST /me/orders/{id}/deadline-proposal/respond — accept/decline/withdraw."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk, proposal_id=None):
        order = get_object_or_404(Order.objects.select_related("request"), pk=pk)
        role = _role(request.user, order)
        action = request.data.get("action")
        accept = request.data.get("accept")

        decision = action if action is not None else accept
        if decision is None:
            raise DomainError("action or accept is required.", code="validation_error")

        services.respond_deadline_proposal(order, actor=request.user, accept=decision)
        order.refresh_from_db()
        return Response(_deadline_proposal_meta(order, role))


def _payment_meta(order: Order, role: str) -> dict | None:
    payment = getattr(order, "payment", None)
    if payment is None:
        return None
    meta = {
        "id": str(payment.id),
        "gateway": payment.gateway,
        "status": payment.status,
        "amount_minor": payment.amount_minor,
        "amount_display": to_major(payment.amount_minor, payment.currency),
        "currency": payment.currency,
        "refunded_display": to_major(payment.refunded_minor, payment.currency),
        "failure_reason": payment.failure_reason,
        "paid_at": payment.paid_at,
        "simulated": payment.gateway == "manual",
    }
    if role == "student" and payment.status == payment.Status.PENDING:
        meta["instructions"] = payment.instructions
        meta["dev_self_confirm"] = payment.gateway == "manual" and getattr(
            settings, "PAYMENT_DEV_SELF_CONFIRM", False
        )
    return meta


class OrderPayView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        order = get_object_or_404(Order.objects.select_related("request"), pk=pk)
        _role(request.user, order)
        payment_services.start_payment(order, actor=request.user)
        return Response({"status": order.status, "payment": _payment_meta(order, "student")})


class OrderPaymentConfirmView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if not getattr(settings, "PAYMENT_DEV_SELF_CONFIRM", False):
            raise PermissionDeniedError(
                "Payment self-confirmation is disabled on this environment."
            )
        order = get_object_or_404(Order.objects.select_related("request"), pk=pk)
        _role(request.user, order)
        payment = Payment.objects.filter(order=order).first()
        if payment is None:
            payment = payment_services.start_payment(order, actor=request.user)
        payment_services.confirm_payment(payment, actor=request.user, source="student:dev-confirm")
        order.refresh_from_db()
        return Response({"status": order.status, "payment": _payment_meta(order, "student")})


class OrderLiveSessionView(APIView):
    """GET / POST /me/orders/{pk}/live-session — session state, scheduling, instant start."""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        order = get_object_or_404(Order.objects.select_related("request"), pk=pk)
        role = _role(request.user, order)
        return Response(_live_session_meta(order, role))

    def post(self, request, pk):
        order = get_object_or_404(Order.objects.select_related("request"), pk=pk)
        role = _role(request.user, order)
        action = request.data.get("action", "start")

        if action == "schedule":
            raw_scheduled_at = request.data.get("scheduled_at")
            if not raw_scheduled_at:
                raise DomainError("scheduled_at is required.", code="validation_error")
            parsed_dt = dateparse.parse_datetime(raw_scheduled_at)
            if not parsed_dt:
                parsed_d = dateparse.parse_date(raw_scheduled_at)
                if parsed_d:
                    parsed_dt = datetime.datetime.combine(parsed_d, datetime.time(12, 0), tzinfo=datetime.UTC)
                else:
                    raise DomainError("Invalid datetime format for scheduled_at.", code="validation_error")
            services.schedule_live_session(order, actor=request.user, scheduled_at=parsed_dt)
        elif action == "start":
            services.start_live_session(order, actor=request.user)
        elif action == "save_scratchpad":
            text = str(request.data.get("scratchpad_content", ""))
            active = order.live_sessions.filter(status__in=[LiveSession.Status.LIVE, LiveSession.Status.SCHEDULED]).order_by("-created_at").first()
            if active:
                active.scratchpad_content = text
                active.save(update_fields=["scratchpad_content", "updated_at"])
        else:
            raise DomainError(f"Unknown live session action: {action}", code="invalid_action")

        order.refresh_from_db()
        return Response(_live_session_meta(order, role))


class OrderLiveSessionEndView(APIView):
    """POST /me/orders/{pk}/live-session/end — finalize session and save scratchpad snapshot."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        order = get_object_or_404(Order.objects.select_related("request"), pk=pk)
        role = _role(request.user, order)
        duration_seconds = int(request.data.get("duration_seconds", 0))
        scratchpad_content = str(request.data.get("scratchpad_content", ""))

        services.end_live_session(
            order,
            actor=request.user,
            duration_seconds=duration_seconds,
            scratchpad_content=scratchpad_content,
        )
        order.refresh_from_db()
        return Response(_live_session_meta(order, role))


class OrderLiveSessionIcsView(APIView):
    """GET /me/orders/{pk}/live-session/ics — RFC 5545 .ics calendar invite."""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        order = get_object_or_404(Order.objects.select_related("request"), pk=pk)
        _role(request.user, order)

        session = order.live_sessions.order_by("-created_at").first()
        session_time = (
            session.scheduled_at
            if session and session.scheduled_at
            else (timezone.now() + datetime.timedelta(hours=24))
        )
        session_id = session.id if session else "default"

        dtstart_str = session_time.strftime("%Y%m%dT%H%M%SZ")
        dtend_str = (session_time + datetime.timedelta(hours=1)).strftime("%Y%m%dT%H%M%SZ")
        dtstamp_str = timezone.now().strftime("%Y%m%dT%H%M%SZ")

        ics_lines = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//Knowledge Marketplace//Live Coaching//EN",
            "CALSCALE:GREGORIAN",
            "METHOD:REQUEST",
            "BEGIN:VEVENT",
            f"UID:live-session-{order.number}-{session_id}@knowledge-marketplace.local",
            f"DTSTAMP:{dtstamp_str}",
            f"DTSTART:{dtstart_str}",
            f"DTEND:{dtend_str}",
            f"SUMMARY:1:1 Live Coaching & Scratchpad - Order #{order.number}",
            f"DESCRIPTION:Live 1:1 Coaching and Collaborative Scratchpad session for Order #{order.number}.",
            "STATUS:CONFIRMED",
            "END:VEVENT",
            "END:VCALENDAR",
        ]
        ics_content = "\r\n".join(ics_lines) + "\r\n"

        from django.http import HttpResponse
        response = HttpResponse(ics_content, content_type="text/calendar; charset=utf-8")
        response["Content-Disposition"] = f'attachment; filename="coaching-session-{order.number}.ics"'
        return response


class BookExpertSessionView(APIView):
    """POST /api/v1/experts/{slug}/book-session — Direct 1:1 consultation speed-booking."""

    permission_classes = [IsAuthenticated]

    def post(self, request, slug: str):
        duration_minutes = int(request.data.get("duration_minutes", 30))
        topic_title = str(request.data.get("topic_title", "1:1 Live Consultation"))
        notes = str(request.data.get("notes", ""))
        scheduled_raw = request.data.get("scheduled_at")
        scheduled_at = None
        if scheduled_raw:
            scheduled_at = dateparse.parse_datetime(str(scheduled_raw))

        order, live_session = services.book_direct_session(
            request.user,
            expert_slug=slug,
            duration_minutes=duration_minutes,
            topic_title=topic_title,
            notes=notes,
            scheduled_at=scheduled_at,
        )

        return Response(
            {
                "order_id": str(order.pk),
                "order_number": order.number,
                "status": order.status,
                "amount": order.amount,
                "amount_display": order.amount / 100,
                "currency": order.currency,
                "duration_minutes": duration_minutes,
                "live_session_id": live_session.pk,
                "scheduled_at": live_session.scheduled_at.isoformat() if live_session.scheduled_at else None,
            },
            status=201,
        )


class StudentVaultView(APIView):
    """GET /api/v1/me/vault — Student knowledge vault & printable invoices."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(services.get_student_vault(request.user))
