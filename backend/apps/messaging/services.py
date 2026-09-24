"""Messaging services — ALL business rules live here (consumers/views/tasks
are thin callers). Participants are re-validated server-side on every action;
the WS transport can never bypass a guard (docs/workflows/messaging.md).
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.audit.services import log as audit_log
from apps.core.exceptions import DomainError, PermissionDeniedError
from apps.messaging.models import Message, MessageReceipt, Thread

if TYPE_CHECKING:
    from apps.messaging.models import MessageReport

logger = logging.getLogger(__name__)

READ_ONLY_CONTEXTS_ORDER = {"cancelled"}  # disputed opens with Phase 9
READ_ONLY_CONTEXTS_REQUEST = {"cancelled", "expired"}
UNREAD_EPOCH = datetime(1970, 1, 1, tzinfo=UTC)


# --- context authorization ------------------------------------------------------


def _context_request(thread: Thread):
    return thread.request


def _context_order(thread: Thread):
    return thread.order


def _context_participants(thread: Thread) -> set[int]:
    """Participant user-ids for the thread's context, resolved from the live
    context rows (never from the M2M snapshot — authorization follows reality)."""
    if (
        thread.context_type in (Thread.Context.ORDER, Thread.Context.DISPUTE)
        and thread.order is not None
    ):
        return {thread.order.student_id, thread.order.expert_id}
    if thread.context_type == Thread.Context.REQUEST and thread.request is not None:
        ids = {thread.request.student_id}
        ids.update(thread.request.offers.values_list("expert_id", flat=True))
        return ids
    return set(thread.participants.values_list("id", flat=True))


def _assert_participant(user, thread: Thread) -> None:
    ids = _context_participants(thread)
    if user.id not in ids:
        raise PermissionDeniedError("You are not a participant of this conversation.")


@transaction.atomic
def set_message_hidden(message: Message, *, actor, hidden: bool, reason: str = "") -> Message:
    """Moderation visibility toggle (BR-35): the ONLY non-view write path for
    `Message.is_hidden` (Django admin actions call this too). Audited."""
    message = Message.objects.select_for_update().get(pk=message.pk)
    if message.is_hidden == hidden:
        return message  # idempotent
    message.is_hidden = hidden
    message.save(update_fields=["is_hidden", "updated_at"])
    audit_log(
        actor,
        action="moderation.message_hidden" if hidden else "moderation.message_unhidden",
        obj=message,
        detail={"reason": reason[:200]},
    )
    return message


@transaction.atomic
def report_message(message: Message, *, actor, reason: str, details: str = "") -> MessageReport:
    """BR-34: a thread participant reports a message. Idempotent per
    (message, reporter) while the previous report is still open."""
    from .models import MessageReport

    _assert_participant(actor, message.thread)
    if reason not in MessageReport.Reason.values:
        raise DomainError("Unknown report reason.", code="validation_error")
    if MessageReport.objects.filter(
        message=message, reported_by=actor, status=MessageReport.Status.OPEN
    ).exists():
        raise DomainError("You already reported this message.", code="duplicate_report")
    report = MessageReport.objects.create(
        message=message,
        reported_by=actor,
        reason=reason,
        details=(details or "")[:500],
    )
    audit_log(actor, action="messaging.message_reported", obj=message, detail={"reason": reason})
    return report


def thread_has_moderation_grounds(thread: Thread) -> bool:
    """BR-35: staff thread view is unlocked by an open dispute on the thread's
    order or an open message report inside the thread. The dispute check rides
    the denormalized `Order.has_open_dispute` flag (orders is a lower layer;
    the flag is maintained by the disputes state machine)."""
    from .models import MessageReport

    if thread.order is not None and thread.order.has_open_dispute:
        return True
    return MessageReport.objects.filter(
        message__thread=thread, status=MessageReport.Status.OPEN
    ).exists()


def _assert_context_open(thread: Thread) -> None:
    """BR-34: ended contexts become read-only (history preserved)."""
    order_read_only = (
        thread.context_type == Thread.Context.ORDER
        and thread.order is not None
        and thread.order.status in READ_ONLY_CONTEXTS_ORDER
    )
    request_read_only = (
        thread.context_type == Thread.Context.REQUEST
        and thread.request is not None
        and thread.request.status in READ_ONLY_CONTEXTS_REQUEST
    )
    if order_read_only:
        raise DomainError(
            "This order is cancelled — the conversation is read-only.", code="thread_read_only"
        )
    if request_read_only:
        raise DomainError(
            "This request has ended — the conversation is read-only.", code="thread_read_only"
        )


# --- thread lifecycle ------------------------------------------------------------


@transaction.atomic
def get_or_create_thread(*, context_type: str, context, actor) -> Thread:
    """Lazy thread creation; the actor MUST already be a legitimate context
    participant (order parties / request owner / expert with an offer)."""
    if context_type == Thread.Context.ORDER:
        participants = {context.student_id, context.expert_id}
        if actor.id not in participants:
            raise PermissionDeniedError("You are not a participant of this order.")
        thread, created = Thread.objects.get_or_create(
            context_type=context_type,
            order=context,
            defaults={"last_message_at": timezone.now()},
        )
    elif context_type == Thread.Context.REQUEST:
        if (
            context.student_id != actor.id
            and not context.offers.filter(expert_id=actor.id).exists()
        ):
            raise PermissionDeniedError(
                "Only the request owner or an expert with an offer can open this chat."
            )
        participants = {context.student_id, *context.offers.values_list("expert_id", flat=True)}
        thread, created = Thread.objects.get_or_create(
            context_type=context_type,
            request=context,
            defaults={"last_message_at": timezone.now()},
        )
    elif context_type == Thread.Context.DISPUTE:
        # context is the disputed ORDER — messaging stays dispute-agnostic
        participants = {context.student_id, context.expert_id}
        if actor.id not in participants:
            raise PermissionDeniedError("You are not a participant of this dispute.")
        thread, created = Thread.objects.get_or_create(
            context_type=context_type,
            order=context,
            defaults={"last_message_at": timezone.now()},
        )
    else:
        raise DomainError("Unknown thread context.", code="validation_error")

    if created:
        thread.participants.set(User.objects.filter(id__in=participants))
        audit_log(
            actor, action="messaging.thread_created", obj=thread, detail={"context": context_type}
        )
    _assert_participant(actor, thread)
    return thread


def thread_for_user(thread_id, user) -> Thread:
    thread = Thread.objects.select_related("order", "request").filter(pk=thread_id).first()
    if thread is None:
        raise DomainError("Conversation not found.", code="not_found", status_code=404)
    _assert_participant(user, thread)
    return thread


# --- messages --------------------------------------------------------------------


@transaction.atomic
def message_payload(message: Message) -> dict:
    """Wire shape shared by the REST views and the WS broadcast (one contract)."""
    return {
        "id": str(message.pk),
        "sender_id": message.sender_id,
        "sender_name": message.sender.name or message.sender.email,
        "body": message.body,
        "created_at": message.created_at.isoformat(),
        "attachment": (
            {"id": str(message.attachment.id), "original_name": message.attachment.original_name}
            if (message.attachment_id and not message.is_hidden)
            else None
        ),
    }


def send_message(thread: Thread, *, sender, body: str, attachment=None) -> Message:
    _assert_participant(sender, thread)
    _assert_context_open(thread)
    body = (body or "").strip()
    if not body and attachment is None:
        raise DomainError("Message cannot be empty.", code="validation_error")
    if len(body) > Message.BodyLimits.MAX_CHARS:
        raise DomainError(
            f"Message exceeds {Message.BodyLimits.MAX_CHARS} characters.", code="validation_error"
        )
    if attachment is not None and attachment.purpose != "message":
        raise DomainError("Only message-purpose files can be attached.", code="validation_error")

    if attachment is not None and isinstance(attachment, str):
        from apps.files.models import Attachment

        attachment = Attachment.objects.filter(
            pk=attachment, purpose="message", uploader=sender
        ).first()
        if attachment is None:
            raise DomainError("Attachment not available.", code="validation_error")
    message = Message.objects.create(thread=thread, sender=sender, body=body, attachment=attachment)
    thread.last_message_at = message.created_at
    thread.save(update_fields=["last_message_at", "updated_at"])
    audit_log(
        sender, action="messaging.message_sent", obj=thread, detail={"message_id": str(message.pk)}
    )

    # Notify the other participants through the Phase 8 notification funnel
    # (in-app + realtime + email per preference). E-mail-if-offline heuristics
    # are deferred (no last-seen tracking); the email preference governs.
    from apps.notifications.services import notify

    preview = (body[:80] + "…") if len(body) > 80 else body
    for user_id in _context_participants(thread):
        if user_id == sender.id:
            continue
        notify(
            user_id,
            "message_new",
            title=f"New message from {sender.name or sender.email}",
            body=preview,
            url=f"/messages/{thread.pk}",
            context={"thread_id": str(thread.pk), "message_id": str(message.pk)},
        )
    return message


def thread_messages(thread: Thread, *, since=None):
    qs = thread.messages.select_related("sender", "attachment").order_by("created_at")
    if since is not None:
        qs = qs.filter(created_at__gt=since)
    return qs


@transaction.atomic
def mark_read(thread: Thread, *, user) -> None:
    _assert_participant(user, thread)
    receipt, _created = MessageReceipt.objects.update_or_create(
        thread=thread, user=user, defaults={"last_read_at": timezone.now()}
    )
    return receipt


def inbox(user) -> list[dict]:
    """Thread cards: context label, counterpart name, last message, unread count."""
    threads = (
        Thread.objects.filter(participants=user)
        .select_related("order", "request")
        .prefetch_related("participants")
    )
    receipts = {r.thread_id: r.last_read_at for r in MessageReceipt.objects.filter(user=user)}
    cards: list[dict] = []
    for thread in threads:
        last = thread.messages.filter(is_hidden=False).select_related("sender").last()
        participants = {p.id: p for p in thread.participants.all() if p.id != user.id}
        counterpart = next(iter(participants.values()), None)
        last_read_at = receipts.get(thread.pk, UNREAD_EPOCH)
        unread = (
            thread.messages.filter(is_hidden=False)
            .exclude(sender=user)
            .filter(created_at__gt=last_read_at)
            .count()
        )
        context_label = thread.get_context_type_display()
        if thread.order is not None:
            context_label = f"Order {thread.order.number}"
        elif thread.request is not None:
            context_label = f"Request: {thread.request.title}"
        cards.append(
            {
                "id": str(thread.pk),
                "context_type": thread.context_type,
                "context_label": context_label,
                "counterpart": getattr(counterpart, "name", "")
                or getattr(counterpart, "email", "Participant"),
                "last_message": last.body[:120] if last else "",
                "last_message_at": last.created_at if last else thread.created_at,
                "unread": unread,
                "read_only": _is_read_only(thread),
            }
        )
    cards.sort(key=lambda c: c["last_message_at"], reverse=True)
    return cards


def _is_read_only(thread: Thread) -> bool:
    try:
        _assert_context_open(thread)
    except DomainError:
        return True
    return False


# --- moderation (BR-35) ------------------------------------------------------------


def admin_view_thread(thread: Thread, *, admin) -> list[Message]:
    """BR-35: staff thread view ONLY for an open dispute on the thread's order
    or an open message report inside the thread; every view is audited."""
    if admin is None or not getattr(admin, "is_staff", False):
        raise PermissionDeniedError("Only staff can inspect conversations.")
    if not thread_has_moderation_grounds(thread):
        raise PermissionDeniedError(
            "Thread inspection requires an open dispute or report (BR-35).",
            code="no_moderation_grounds",
        )
    audit_log(
        admin,
        action="messaging.thread_viewed",
        obj=thread,
        detail={"reason": "moderation-inspection"},
    )
    return list(thread.messages.select_related("sender").order_by("created_at"))
