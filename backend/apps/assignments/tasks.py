"""Assignment emails + expiry — thin django-q2 wrappers (pattern: experts.tasks).

Notification events for the Phase 8 system to expand: invitation received,
direct assignment received, assignment outcome. The queue is the ORM broker;
no Redis.
"""

from __future__ import annotations

import logging

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def send_invitation_email(invitation_id: str) -> dict:
    from apps.accounts.models import User
    from apps.assignments.models import PoolInvitation

    invitation = PoolInvitation.objects.select_related("request").get(pk=invitation_id)
    user = User.objects.get(pk=invitation.expert_id)
    request = invitation.request
    send_mail(
        subject="New managed invitation — Hybrid Expert Marketplace",
        message=(
            f"Hi {user.name or 'there'},\n\n"
            f'Our team matched you with a managed request: "{request.title}".\n'
            f"Platform-set price: {request.quote_amount / 100:.2f} {request.currency}. "
            "Respond within 48 hours — first acceptance is assigned.\n\n"
            "Open your Assignments page to accept or decline."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )
    logger.info("assignment invitation email sent invitation=%s", invitation_id)
    return {"sent": True}


def send_assignment_email(assignment_id: str) -> dict:
    from apps.accounts.models import User
    from apps.assignments.models import DirectAssignment

    assignment = DirectAssignment.objects.select_related("request").get(pk=assignment_id)
    user = User.objects.get(pk=assignment.expert_id)
    request = assignment.request
    send_mail(
        subject="New managed assignment — Hybrid Expert Marketplace",
        message=(
            f"Hi {user.name or 'there'},\n\n"
            f'Our team assigned "{request.title}" to you directly.\n'
            f"Proposed price: {assignment.amount / 100:.2f} {assignment.currency}. "
            "Please accept or decline within 24 hours.\n\n"
            "Open your Assignments page to respond."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )
    logger.info("direct assignment email sent assignment=%s", assignment_id)
    return {"sent": True}


def send_triage_decision_email(request_id, decision: str) -> dict:
    from apps.service_requests.models import ServiceRequest

    request = ServiceRequest.objects.get(pk=request_id)
    copy = {
        "rejected": (
            "Update on your managed request",
            "After review we could not route your request at this time. "
            f"Reviewer note: {request.review_notes or '—'}",
        ),
        "pooled": (
            "Your managed request is being routed",
            "Our team approved your request and is matching it with a suitable expert. "
            "You'll see the agreed price on the request page before anything is charged.",
        ),
        "matched": (
            "An expert accepted your managed request",
            "Your request is now matched — next step is the order and payment screen.",
        ),
    }
    subject, body = copy.get(
        decision, ("Update on your managed request", "Please sign in for details.")
    )
    send_mail(
        subject=f"{subject} — Hybrid Expert Marketplace",
        message=f"Hi {request.student.name or 'there'},\n\n{body}\n",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[request.student.email],
        fail_silently=False,
    )
    logger.info("triage decision email sent request=%s decision=%s", request_id, decision)
    return {"sent": True}


def expire_due_assignments() -> int:
    """Hourly django-q2 schedule (ops setup): TTL for invitations/assignments."""
    from apps.assignments import services

    return services.expire_due()
