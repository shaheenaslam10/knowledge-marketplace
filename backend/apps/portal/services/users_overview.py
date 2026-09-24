"""Users/experts operational overview (Phase 10) — read-only cross-object
visibility; edits stay in Django admin (admin-journey.md surface matrix)."""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db.models import Q


def users_overview(*, role: str = "all", query: str = "", limit: int = 50, offset: int = 0) -> dict:
    User = get_user_model()
    qs = User.objects.all().order_by("-created_at")
    if role == "staff":
        qs = qs.filter(is_staff=True)
    elif role == "expert":
        qs = qs.filter(expert_profile__isnull=False)
    if query:
        qs = qs.filter(Q(email__icontains=query) | Q(name__icontains=query))
    total = qs.count()
    rows = []
    for user in qs.select_related("expert_profile")[offset : offset + limit]:
        profile = getattr(user, "expert_profile", None)
        rows.append(
            {
                "id": user.pk,
                "email": user.email,
                "name": user.name,
                "is_staff": user.is_staff,
                "email_verified": user.email_verified_at is not None,
                "created_at": user.created_at.isoformat(),
                "expert": {
                    "slug": profile.slug,
                    "status": getattr(user, "expert_application", None).status
                    if getattr(user, "expert_application", None) is not None
                    else None,
                    "availability": profile.availability,
                    "rating_avg": str(profile.rating_avg)
                    if profile.rating_avg is not None
                    else None,
                    "rating_count": profile.rating_count,
                }
                if profile
                else None,
                "orders_as_student": user.student_orders.count(),
                "reviews_written": user.reviews_written.count(),
                "disputes_opened": user.disputes_opened.count(),
            }
        )
    return {"total": total, "results": rows}
