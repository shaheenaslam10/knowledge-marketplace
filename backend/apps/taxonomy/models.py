"""Taxonomy — shared reference data for the whole platform.

Subjects/skills/categories/tags live here ONCE; expert profiles (Phase 3),
service requests (Phase 4) and filters reference the same terms instead of
each domain growing its own subject system (docs/architecture/backend.md).

Deliberately NOT a taxonomy engine: a flat term list with an optional parent
(category → subject) covers the MVP; richer structures are a later need.
"""

from __future__ import annotations

from django.db import models
from django.utils.text import slugify

from apps.core.models import TimeStampedModel


class TaxonomyTerm(TimeStampedModel):
    """A single taxonomy entry (category, subject, skill or tag)."""

    class Kind(models.TextChoices):
        CATEGORY = "category", "Category"
        SUBJECT = "subject", "Subject"
        SKILL = "skill", "Skill"
        TAG = "tag", "Tag"

    kind = models.CharField(max_length=20, choices=Kind.choices, db_index=True)
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="children",
        help_text="Optional parent (categories may contain subjects).",
    )
    name = models.CharField(max_length=150)
    slug = models.SlugField(max_length=170, editable=False)
    description = models.CharField(max_length=500, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["kind", "slug"], name="uniq_term_kind_slug"),
        ]
        indexes = [models.Index(fields=["parent", "kind"])]
        ordering = ["kind", "name"]

    def __str__(self) -> str:
        return f"{self.kind}:{self.name}"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = self._unique_slug()
        super().save(*args, **kwargs)

    def _unique_slug(self) -> str:
        base = slugify(self.name)[:160] or "term"
        candidate, n = base, 2
        qs = TaxonomyTerm.objects.filter(kind=self.kind, slug=candidate)
        if self.pk:
            qs = qs.exclude(pk=self.pk)
        while qs.exists():
            candidate = f"{base}-{n}"
            n += 1
            qs = TaxonomyTerm.objects.filter(kind=self.kind, slug=candidate)
            if self.pk:
                qs = qs.exclude(pk=self.pk)
        return candidate

    def clean(self):
        from django.core.exceptions import ValidationError

        if self.parent_id:
            if self.parent.kind != self.Kind.CATEGORY:
                raise ValidationError({"parent": "Only categories can act as parents."})
            if self.kind == self.Kind.CATEGORY:
                raise ValidationError({"parent": "Categories are top-level (no parent)."})
