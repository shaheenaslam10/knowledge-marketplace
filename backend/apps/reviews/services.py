"""Review services (Phase 9, BR-37..39) — eligibility, one-reply rules, and
the weighted public rating aggregate (docs/workflows/reviews.md).

All mutations recompute the expert's weighted aggregate (recompute-on-write)
and stamp ExpertProfile.rating_avg/rating_count — the same fields the public
directory already reads.
"""

from __future__ import annotations

from django.utils import timezone

from apps.audit.services import log as audit_log
from apps.core.exceptions import DomainError, NotFoundError, PermissionDeniedError

from .models import Review

MIN_BODY = 20
MAX_BODY = 5000
RATING_MIN, RATING_MAX = 1, 5
HALF_LIFE_DAYS = 365.0  # BR-39: recent orders weigh more (documented formula)


def _validate_rating(value, field: str) -> int:
    try:
        value = int(value)
    except (TypeError, ValueError):
        raise DomainError(f"{field} must be an integer.", code="validation_error") from None
    if not RATING_MIN <= value <= RATING_MAX:
        raise DomainError(f"{field} must be between 1 and 5.", code="validation_error")
    return value


def _validate_body(body: str) -> str:
    body = (body or "").strip()
    if len(body) < MIN_BODY:
        raise DomainError("Reviews need at least 20 characters.", code="validation_error")
    if len(body) > MAX_BODY:
        raise DomainError(f"Reviews are limited to {MAX_BODY} characters.", code="validation_error")
    return body


def submit_review(
    order,
    *,
    actor,
    rating,
    body: str,
    sub_quality=None,
    sub_communication=None,
    sub_timeliness=None,
) -> Review:
    """Student-only, completed orders, one per order (BR-37)."""
    if order.student_id != actor.id:
        raise PermissionDeniedError("Only the order's student can review it.")
    if order.status != "completed":
        raise DomainError("Only completed orders can be reviewed.", code="validation_error")
    if Review.objects.filter(order=order).exists():
        raise DomainError("This order has already been reviewed.", code="duplicate_review")
    review = Review.objects.create(
        order=order,
        author=actor,
        expert_id=order.expert_id,
        rating=_validate_rating(rating, "rating"),
        sub_quality=_validate_rating(sub_quality, "sub_quality") if sub_quality else None,
        sub_communication=_validate_rating(sub_communication, "sub_communication")
        if sub_communication
        else None,
        sub_timeliness=_validate_rating(sub_timeliness, "sub_timeliness")
        if sub_timeliness
        else None,
        body=_validate_body(body),
    )
    _recompute_expert_aggregate(review.expert_id)
    from apps.notifications.services import notify

    notify(
        review.expert_id,
        "review_new",
        title="You received a new review",
        body=f"Your recent order was rated {review.rating}/5.",
        url="/orders",
        context={"review_id": str(review.pk)},
    )
    audit_log(actor, action="review.submitted", obj=review, detail={"rating": review.rating})
    return review


def edit_review(
    review: Review,
    *,
    actor,
    rating=None,
    body=None,
    sub_quality=None,
    sub_communication=None,
    sub_timeliness=None,
) -> Review:
    """Author-only, until the expert replies (docs/workflows/reviews.md)."""
    if review.author_id != actor.id:
        raise PermissionDeniedError("Only the review author can edit it.")
    if review.replied_at is not None:
        raise DomainError(
            "Reviews can no longer be edited after the expert reply.",
            code="review_already_answered",
        )
    if rating is not None:
        review.rating = _validate_rating(rating, "rating")
    if body is not None:
        review.body = _validate_body(body)
    if sub_quality is not None:
        review.sub_quality = _validate_rating(sub_quality, "sub_quality")
    if sub_communication is not None:
        review.sub_communication = _validate_rating(sub_communication, "sub_communication")
    if sub_timeliness is not None:
        review.sub_timeliness = _validate_rating(sub_timeliness, "sub_timeliness")
    review.edited_at = timezone.now()
    review.save(
        update_fields=[
            "rating",
            "body",
            "sub_quality",
            "sub_communication",
            "sub_timeliness",
            "edited_at",
            "updated_at",
        ]
    )
    _recompute_expert_aggregate(review.expert_id)
    audit_log(actor, action="review.edited", obj=review, detail={"rating": review.rating})
    return review


def reply_to_review(review: Review, *, actor, reply: str, rating_of_student=None) -> Review:
    """Expert-only, exactly once, immutable (BR-37)."""
    if review.expert_id != actor.id:
        raise PermissionDeniedError("Only the reviewed expert can reply.")
    if review.replied_at is not None:
        raise DomainError("This review has already been answered.", code="duplicate_reply")
    reply = _validate_body(reply)
    review.expert_reply = reply
    review.replied_at = timezone.now()
    if rating_of_student is not None:
        review.expert_rating_of_student = _validate_rating(rating_of_student, "rating_of_student")
    review.save(
        update_fields=["expert_reply", "replied_at", "expert_rating_of_student", "updated_at"]
    )
    from apps.notifications.services import notify

    notify(
        review.author_id,
        "review_reply",
        title="The expert replied to your review",
        body=reply[:80],
        url="/orders",
        context={"review_id": str(review.pk)},
    )
    audit_log(actor, action="review.replied", obj=review)
    return review


def set_hidden(review: Review, *, actor, hidden: bool) -> Review:
    """Moderation (BR-38 escalation): hidden reviews leave public surfaces and
    aggregates. Staff-only, audited."""
    if actor is None or not getattr(actor, "is_staff", False):
        raise PermissionDeniedError("Only staff can hide or restore reviews.")
    review.status = Review.Status.HIDDEN if hidden else Review.Status.PUBLISHED
    review.save(update_fields=["status", "updated_at"])
    _recompute_expert_aggregate(review.expert_id)
    audit_log(actor, action="review.hidden" if hidden else "review.unhidden", obj=review)
    return review


def public_reviews(expert_id: int) -> list[Review]:
    return list(
        Review.objects.filter(expert_id=expert_id, status=Review.Status.PUBLISHED).select_related(
            "order"
        )
    )


def weighted_aggregate(expert_id: int, *, now=None) -> tuple[float | None, int]:
    """BR-39: weight = 0.5 ** (age_days / 365) over published reviews."""
    now = now or timezone.now()
    reviews = Review.objects.filter(expert_id=expert_id, status=Review.Status.PUBLISHED).only(
        "rating", "created_at"
    )
    weight_sum = 0.0
    weighted_total = 0.0
    count = 0
    for review in reviews:
        age_days = max((now - review.created_at).total_seconds() / 86400.0, 0.0)
        weight = 0.5 ** (age_days / HALF_LIFE_DAYS)
        weight_sum += weight
        weighted_total += review.rating * weight
        count += 1
    if count == 0 or weight_sum == 0:
        return None, 0
    return round(weighted_total / weight_sum, 2), count


def _recompute_expert_aggregate(expert_id: int) -> None:
    from apps.experts.models import ExpertProfile

    rating_avg, count = weighted_aggregate(expert_id)
    updated = ExpertProfile.objects.filter(pk=expert_id).update(
        rating_avg=rating_avg, rating_count=count
    )
    if not updated:  # approved profile missing (shouldn't happen for experts with orders)
        raise NotFoundError("Expert profile not found for aggregate update.")
