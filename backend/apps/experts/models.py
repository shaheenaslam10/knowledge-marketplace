"""Experts domain — expert application (review artifact) and expert profile
(live business object) are DISTINCT models (role-onboarding decision, ADR-0012):

- `ExpertApplication` — one per user; carries the submitted information,
  the credentials, and the LIFECYCLE STATE. Admin reviews THIS.
- `ExpertProfile` — created/activated ONLY on approval; the public business
  profile. A registered user never becomes an expert automatically (BR-03).

Lifecycle (docs/workflows/expert-journey.md, BR-03):

    not_applied (no row) → draft → submitted → under_review
        → approved | rejected → (rejected → submitted on resubmit)
        approved ⇄ suspended

Rules: applicant edits only in draft/submitted/rejected; under_review and
beyond locks applicant edits; only approved (and not suspended) experts get
the `expert` role + directory visibility; suspended experts keep student
access (BR-04). All admin transitions are audited + emailed.
"""

from __future__ import annotations

from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel
from apps.files.models import Attachment


class ExpertApplication(TimeStampedModel):
    """The expert onboarding/review artifact (one per user)."""

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft (not yet submitted)"
        SUBMITTED = "submitted", "Submitted"
        UNDER_REVIEW = "under_review", "Under review"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        SUSPENDED = "suspended", "Suspended"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        primary_key=True,
        related_name="expert_application",
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DRAFT, db_index=True
    )

    # --- application content (mirrors the profile fields; copied to the
    # ExpertProfile at approval; the application itself is the review record)
    display_name = models.CharField("professional/display name", max_length=150)
    headline = models.CharField(max_length=120)
    bio = models.TextField("bio / expertise description", max_length=2000)
    expertise_summary = models.CharField("expertise summary", max_length=500)
    experience_years = models.PositiveSmallIntegerField(default=0)
    qualifications = models.CharField("qualifications", max_length=1000, blank=True)
    languages = models.CharField(
        max_length=200, blank=True, help_text="Comma-separated, e.g. 'English, Urdu'."
    )
    timezone = models.CharField(max_length=63, default="UTC")
    availability_note = models.CharField(max_length=300, blank=True)

    subjects = models.ManyToManyField(
        "taxonomy.TaxonomyTerm", blank=True, related_name="expert_applications"
    )
    skills = models.ManyToManyField(
        "taxonomy.TaxonomyTerm", blank=True, related_name="application_skills"
    )

    credentials = models.ManyToManyField(Attachment, blank=True, related_name="expert_applications")

    # --- attestations (validated at submit; BR-02/BR-14 + §14 integrity boundary)
    certified_18_plus = models.BooleanField(default=False)
    integrity_acknowledged = models.BooleanField(
        default=False,
        help_text="Acknowledged the tutor guidelines: 'You are a teacher, not a ghostwriter.'",
    )

    # --- review bookkeeping
    rejection_reason = models.CharField(max_length=500, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="expert_reviews",
    )
    review_note = models.CharField(max_length=500, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    resubmission_count = models.PositiveSmallIntegerField(default=0)

    class Meta:
        indexes = [models.Index(fields=["status", "-submitted_at"])]

    def __str__(self) -> str:
        return f"expert-application:{self.user_id}:{self.status}"


class ExpertProfile(TimeStampedModel):
    """The live expert business profile — exists only after approval.

    Suspension does NOT delete the profile; it flips the application status
    (this row stays for order obligations/history) and the directory + role
    checks exclude it (docs/workflows/expert-journey.md §1.4).
    """

    class Availability(models.TextChoices):
        AVAILABLE = "available", "Available"
        PAUSED = "paused", "Paused (not accepting new work)"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        primary_key=True,
        related_name="expert_profile",
    )
    slug = models.SlugField(max_length=180, unique=True, editable=False)
    display_name = models.CharField(max_length=150)
    headline = models.CharField(max_length=120)
    bio = models.TextField(max_length=2000, blank=True)
    expertise_summary = models.CharField(max_length=500, blank=True)
    experience_years = models.PositiveSmallIntegerField(default=0)
    qualifications = models.CharField(max_length=1000, blank=True)
    languages = models.CharField(max_length=200, blank=True)
    timezone = models.CharField(max_length=63, default="UTC")
    availability = models.CharField(
        max_length=20, choices=Availability.choices, default=Availability.AVAILABLE, db_index=True
    )
    avatar = models.ForeignKey(
        Attachment,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="avatar_of",
        limit_choices_to={"purpose": "avatar"},
    )
    subjects = models.ManyToManyField(
        "taxonomy.TaxonomyTerm", blank=True, related_name="expert_profiles"
    )
    skills = models.ManyToManyField(
        "taxonomy.TaxonomyTerm", blank=True, related_name="profile_skills"
    )
    is_public = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Opt-out of the public directory regardless of approval state.",
    )

    # --- aggregates: placeholders; written by reviews/orders in later phases
    rating_avg = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    rating_count = models.PositiveIntegerField(default=0)
    completed_orders = models.PositiveIntegerField(default=0)

    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["is_public", "availability"]),
            models.Index(fields=["-rating_avg"]),
        ]

    def __str__(self) -> str:
        return f"expert:{self.slug}"
