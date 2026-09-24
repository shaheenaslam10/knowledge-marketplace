"""Disputes API — open, detail (participant), evidence add. Resolution is an
admin-only service path surfaced through Django admin actions (Phase 9 scope)."""

from __future__ import annotations

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.exceptions import NotFoundError
from apps.disputes import services
from apps.disputes.models import Dispute
from apps.messaging import services as messaging
from apps.orders.models import Order


def _dispute_payload(dispute: Dispute, *, include_evidence: bool = True) -> dict:
    data = {
        "id": str(dispute.pk),
        "order_id": str(dispute.order_id),
        "order_number": dispute.order.number,
        "opened_by": dispute.opened_by_id,
        "reason": dispute.reason,
        "reason_display": dispute.get_reason_display(),
        "description": dispute.description,
        "status": dispute.status,
        "outcome": dispute.outcome,
        "resolution_notes": dispute.resolution_notes
        if dispute.status in ("resolved", "closed")
        else "",
        "created_at": dispute.created_at,
        "resolved_at": dispute.resolved_at,
        "thread": None,
    }
    thread = messaging.Thread.objects.filter(
        context_type="dispute", order_id=dispute.order_id
    ).first()
    if thread is not None:
        data["thread"] = str(thread.pk)
    if include_evidence:
        data["evidence"] = [
            {"id": str(a.pk), "original_name": a.original_name} for a in dispute.evidence.all()
        ]
    return data


class OrderDisputeView(APIView):
    """POST /api/v1/me/orders/{id}/dispute — participant opens (BR-40).
    GET — the order's dispute for participants (workspace embed, 404 if none)."""

    permission_classes = [IsAuthenticated]

    def get(self, request, order_id: str):
        order = Order.objects.filter(pk=order_id).first()
        if order is None or request.user.id not in (order.student_id, order.expert_id):
            raise NotFoundError("Order not found.")
        dispute = Dispute.objects.filter(order=order).select_related("order").first()
        if dispute is None:
            raise NotFoundError("No dispute on this order.")
        return Response(_dispute_payload(dispute))

    def post(self, request, order_id: str):
        order = Order.objects.filter(pk=order_id).first()
        if order is None:
            raise NotFoundError("Order not found.")
        data = request.data or {}
        dispute = services.open_dispute(
            order,
            actor=request.user,
            reason=str(data.get("reason", "")),
            description=str(data.get("description", "")),
            evidence_ids=list(data.get("evidence_ids") or []),
        )
        return Response(_dispute_payload(dispute), status=201)


class MyDisputeDetailView(APIView):
    """GET /api/v1/me/disputes/{id} — participant/staff detail."""

    permission_classes = [IsAuthenticated]

    def get(self, request, dispute_id: str):
        dispute = services.get_for_user(dispute_id, request.user)
        return Response(_dispute_payload(dispute))


class DisputeEvidenceView(APIView):
    """POST /api/v1/me/disputes/{id}/evidence — attach more uploads while open."""

    permission_classes = [IsAuthenticated]

    def post(self, request, dispute_id: str):
        dispute = services.get_for_user(dispute_id, request.user)
        if dispute.status not in ("open", "under_review", "awaiting_response"):
            from apps.core.exceptions import DomainError

            raise DomainError("This dispute is closed to new evidence.", code="invalid_transition")
        attachment_ids = list((request.data or {}).get("evidence_ids") or [])
        from apps.files.models import Attachment

        added = []
        for attachment_id in attachment_ids:
            attachment = Attachment.objects.filter(pk=attachment_id).first()
            if attachment is None or attachment.purpose != "dispute_evidence":
                raise NotFoundError("Evidence files must use the dispute_evidence purpose.")
            if attachment.uploader_id != request.user.id:
                raise NotFoundError("Only your own uploads can be attached.")
            dispute.evidence.add(attachment)
            added.append({"id": str(attachment.pk), "original_name": attachment.original_name})
        return Response({"added": added})
