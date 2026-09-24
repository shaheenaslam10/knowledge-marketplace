"""Message reports (BR-34) — Phase 9 surface; the review queue is Phase 10."""

from __future__ import annotations

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.exceptions import NotFoundError
from apps.messaging import services
from apps.messaging.models import Message


class MessageReportView(APIView):
    """POST /api/v1/me/messages/{id}/report — thread participant reports."""

    permission_classes = [IsAuthenticated]

    def post(self, request, message_id: str):
        message = Message.objects.select_related("thread").filter(pk=message_id).first()
        if message is None:
            raise NotFoundError("Message not found.")
        data = request.data or {}
        report = services.report_message(
            message,
            actor=request.user,
            reason=str(data.get("reason", "")),
            details=str(data.get("details", "")),
        )
        return Response(
            {
                "id": str(report.pk),
                "message_id": str(message.pk),
                "reason": report.reason,
                "status": report.status,
            },
            status=201,
        )
