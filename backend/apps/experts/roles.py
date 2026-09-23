"""Role wiring — the `expert` role provider consumed by accounts.get_roles."""

from __future__ import annotations

from apps.experts.models import ExpertApplication


def is_expert(user) -> bool:
    """Approved AND not suspended (BR-03/BR-04). Rejected/pending users and
    suspended experts are students with extra history, nothing more.

    Deliberately a QUERY, not the cached `user.expert_application` relation:
    instances created before the application exists cache DoesNotExist, which
    would hide a mid-session approval. One row lookup keeps role checks honest.
    """
    return ExpertApplication.objects.filter(
        pk=user.pk, status=ExpertApplication.Status.APPROVED
    ).exists()
