"""Messaging REST API — same services the WS consumer calls (one business path)."""

from __future__ import annotations

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.exceptions import NotFoundError
from apps.messaging import services


def _message_meta(message) -> dict:
    return {
        "id": str(message.pk),
        "sender_id": message.sender_id,
        "sender_name": message.sender.name or message.sender.email,
        "body": message.body,
        "created_at": message.created_at,
        "attachment": (
            {"id": str(message.attachment.id), "original_name": message.attachment.original_name}
            if (message.attachment and not message.is_hidden)
            else None
        ),
    }


class MyThreadListView(APIView):
    """GET /api/v1/me/threads — inbox cards (counterpart, preview, unread)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"results": services.inbox(request.user)})


class MyThreadDetailView(APIView):
    """GET /api/v1/me/threads/{id} — thread + messages (marks read)."""

    permission_classes = [IsAuthenticated]

    def get(self, request, thread_id):
        try:
            thread = services.thread_for_user(thread_id, request.user)
        except Exception as exc:
            raise NotFoundError("Conversation not found.") from exc
        services.mark_read(thread, user=request.user)
        messages = [_message_meta(m) for m in services.thread_messages(thread) if not m.is_hidden]
        return Response(
            {
                "id": str(thread.pk),
                "context_type": thread.context_type,
                "context_label": (
                    f"Order {thread.order.number}"
                    if thread.order
                    else f"Request: {thread.request.title}"
                ),
                "read_only": services._is_read_only(thread),
                "messages": messages,
            }
        )


class MyThreadMessageCreateView(APIView):
    """POST /api/v1/me/threads/{id}/messages — {body, attachment_id?}."""

    permission_classes = [IsAuthenticated]

    def post(self, request, thread_id):
        try:
            thread = services.thread_for_user(thread_id, request.user)
        except Exception as exc:
            raise NotFoundError("Conversation not found.") from exc
        message = services.send_message(
            thread,
            sender=request.user,
            body=str(request.data.get("body", "")),
            attachment=request.data.get("attachment_id"),
        )
        return Response(_message_meta(message))


class MyThreadReadView(APIView):
    """POST /api/v1/me/threads/{id}/read — mark the thread read."""

    permission_classes = [IsAuthenticated]

    def post(self, request, thread_id):
        try:
            thread = services.thread_for_user(thread_id, request.user)
        except Exception as exc:
            raise NotFoundError("Conversation not found.") from exc
        services.mark_read(thread, user=request.user)
        return Response({"read": True})


class ThreadContextOpenView(APIView):
    """POST /api/v1/me/threads/open — {context_type, request_id|order_id} →
    thread id (lazy creation). Entry point for request/order pages."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        from apps.orders.models import Order
        from apps.service_requests.models import ServiceRequest

        context_type = str(request.data.get("context_type", ""))
        if context_type == "order":
            context = Order.objects.filter(pk=request.data.get("order_id")).first()
        elif context_type == "request":
            context = ServiceRequest.objects.filter(pk=request.data.get("request_id")).first()
        else:
            context = None
        if context is None:
            raise NotFoundError("Context not found.")
        thread = services.get_or_create_thread(
            context_type=context_type, context=context, actor=request.user
        )
        return Response({"id": str(thread.pk), "context_type": thread.context_type})
