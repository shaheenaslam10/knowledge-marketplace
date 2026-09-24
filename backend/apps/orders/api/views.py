"""Order API — one workspace contract for all three sources (open/managed_*)."""

from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.exceptions import PermissionDeniedError
from apps.core.money import to_major
from apps.core.pagination import DefaultCursorPagination
from apps.orders import services
from apps.orders.delivery import Delivery
from apps.orders.models import Order
from apps.payments import services as payment_services
from apps.payments.models import Payment


def _role(user, order: Order) -> str:
    if order.student_id == user.id:
        return "student"
    if order.expert_id == user.id:
        return "expert"
    raise PermissionDeniedError("You are not a party to this order.")


def _attachment_meta(attachment) -> dict:
    return {
        "id": str(attachment.id),
        "original_name": attachment.original_name,
        "size": attachment.size,
        "content_type": attachment.content_type,
    }


def _delivery_meta(delivery: Delivery) -> dict:
    return {
        "id": str(delivery.id),
        "revision_number": delivery.revision_number,
        "summary": delivery.summary,
        "status": delivery.status,
        "submitted_at": delivery.submitted_at,
        "approved_at": delivery.approved_at,
        "approval_source": delivery.approval_source,
        "attachments": [_attachment_meta(a) for a in delivery.attachments.all()],
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


class MyOrderDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _order(self, request, pk) -> Order:
        order = get_object_or_404(Order.objects.select_related("request"), pk=pk)
        _role(request.user, order)  # ownership gate — non-parties get 403
        return order

    def get(self, request, pk):
        order = self._order(request, pk)
        role = _role(request.user, order)
        events = [
            {"event_type": e.event_type, "created_at": e.created_at, "data": e.data}
            for e in order.events.all()
        ]
        deliveries = [_delivery_meta(d) for d in order.deliveries.prefetch_related("attachments")]
        return Response(
            {
                **_order_meta(order, role),
                "events": events,
                "deliveries": deliveries,
                "payment": _payment_meta(order, role),
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
        return Response(_delivery_meta(delivery))


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
        # Static instructions snapshot for the manual rails; never provider secrets.
        meta["instructions"] = payment.instructions
        meta["dev_self_confirm"] = payment.gateway == "manual" and getattr(
            settings, "PAYMENT_DEV_SELF_CONFIRM", False
        )
    return meta


class OrderPayView(APIView):
    """POST /me/orders/{id}/pay — student starts payment (manual instructions
    today; a provider client_secret with Stripe later). Amounts are read from
    the booked order server-side; the client cannot submit prices."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        order = get_object_or_404(Order.objects.select_related("request"), pk=pk)
        _role(request.user, order)
        payment_services.start_payment(order, actor=request.user)
        return Response({"status": order.status, "payment": _payment_meta(order, "student")})


class OrderPaymentConfirmView(APIView):
    """POST /me/orders/{id}/payment/confirm — DEVELOPMENT/TEST action for the
    manual gateway only: 'the transfer arrived, activate the order'. Gated by
    PAYMENT_DEV_SELF_CONFIRM (dev settings; never production) plus student
    ownership. Operator confirmation in real manual deployments is the Django
    admin action; provider rails confirm exclusively via webhooks."""

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
