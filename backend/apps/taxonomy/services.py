"""Taxonomy service layer — term creation and lookup.

Views/admin/seed call these; nothing else touches the model directly
(docs/architecture/backend.md app anatomy).
"""

from __future__ import annotations

from django.db.models import Q, QuerySet

from .models import TaxonomyTerm


def ensure_term(
    *,
    kind: str,
    name: str,
    parent: TaxonomyTerm | None = None,
    description: str = "",
    is_active: bool = True,
) -> tuple[TaxonomyTerm, bool]:
    """Idempotent term creation (seed/admin). Slug is derived from the name."""
    from django.db import transaction

    with transaction.atomic():
        existing = TaxonomyTerm.objects.filter(kind=kind, slug=_slugify(name)).first()
        if existing:
            return existing, False
        term = TaxonomyTerm(
            kind=kind, name=name, parent=parent, description=description, is_active=is_active
        )
        term.full_clean()
        term.save()
        return term, True


def _slugify(name: str) -> str:
    from django.utils.text import slugify

    return slugify(name)[:160]


def list_terms(
    *,
    kind: str | None = None,
    parent_id: int | None = None,
    q: str | None = None,
    include_inactive: bool = False,
) -> QuerySet[TaxonomyTerm]:
    """Selector for the public taxonomy list endpoint."""
    qs = TaxonomyTerm.objects.select_related("parent")
    if not include_inactive:
        qs = qs.filter(is_active=True)
    if kind:
        qs = qs.filter(kind=kind)
    if parent_id is not None:
        qs = qs.filter(parent_id=parent_id)
    if q:
        qs = qs.filter(Q(name__icontains=q) | Q(description__icontains=q))
    return qs.order_by("kind", "name")
