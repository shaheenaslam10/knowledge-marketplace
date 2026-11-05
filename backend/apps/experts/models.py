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
from django.utils.text import slugify

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

    # --- Sprint 5: Direct 1:1 Consultation Speed-Booking ---
    session_30m_price = models.PositiveIntegerField(
        default=4500,
        help_text="Price for 30-min live session in minor units (e.g. 4500 = $45.00 USD).",
    )
    session_60m_price = models.PositiveIntegerField(
        default=8000,
        help_text="Price for 60-min live session in minor units (e.g. 8000 = $80.00 USD).",
    )

    class Meta:
        indexes = [
            models.Index(fields=["is_public", "availability"]),
            models.Index(fields=["-rating_avg"]),
        ]

    def __str__(self) -> str:
        return f"expert:{self.slug}"


# ---------------------------------------------------------------------------
# Sprint 4: Self-Serve Digital Knowledge Catalog
# ---------------------------------------------------------------------------


class KnowledgeProduct(TimeStampedModel):
    """A pre-packaged digital knowledge resource published by an approved Specialist.

    Product types: study_guide, code_template, recorded_masterclass, research_pack.
    Price is in integer minor units (ADR-0009) — e.g. 2500 = $25.00 USD.
    """

    class ProductType(models.TextChoices):
        STUDY_GUIDE = "study_guide", "Study Guide"
        CODE_TEMPLATE = "code_template", "Code Template"
        RECORDED_MASTERCLASS = "recorded_masterclass", "Recorded Masterclass"
        RESEARCH_PACK = "research_pack", "Research Pack"
        LIVE_COHORT = "live_cohort", "Live Group Workshop"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        ARCHIVED = "archived", "Archived"

    expert = models.ForeignKey(
        ExpertProfile,
        on_delete=models.PROTECT,
        related_name="knowledge_products",
    )
    slug = models.SlugField(max_length=220, unique=True, editable=False)
    title = models.CharField(max_length=200)
    summary = models.CharField(max_length=500)
    description = models.TextField(blank=True)
    product_type = models.CharField(
        max_length=25, choices=ProductType.choices, default=ProductType.STUDY_GUIDE, db_index=True
    )
    subject = models.ForeignKey(
        "taxonomy.TaxonomyTerm",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="knowledge_products",
        limit_choices_to={"kind__in": ["subject", "category"]},
    )
    price_minor = models.PositiveIntegerField(
        help_text="Price in integer minor units (e.g. 2500 = $25.00 USD)."
    )
    currency = models.CharField(max_length=3, default="USD")
    status = models.CharField(
        max_length=12, choices=Status.choices, default=Status.DRAFT, db_index=True
    )
    # The downloadable file (upload-first contract via /files)
    file = models.ForeignKey(
        Attachment,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="knowledge_products",
    )
    # Cover image for the catalog grid
    cover_image = models.ForeignKey(
        Attachment,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="product_covers",
    )
    sales_count = models.PositiveIntegerField(default=0)
    max_seats = models.PositiveIntegerField(
        default=0, help_text="Maximum seats for live cohorts (0 = unlimited digital asset)"
    )
    enrolled_count = models.PositiveIntegerField(
        default=0, help_text="Number of enrolled students in this live cohort"
    )
    cohort_scheduled_at = models.DateTimeField(
        null=True, blank=True, help_text="Scheduled live workshop date and time"
    )
    live_room_code = models.CharField(
        max_length=64, blank=True, help_text="WebRTC session room code for live workshop"
    )
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["status", "-published_at"]),
            models.Index(fields=["expert", "status"]),
            models.Index(fields=["product_type", "status"]),
        ]
        ordering = ["-published_at", "-created_at"]

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.title)[:180]
            slug = base
            n = 1
            while KnowledgeProduct.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{n}"
                n += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"product:{self.slug}:{self.status}"


class KnowledgePurchase(TimeStampedModel):
    """Records a buyer's purchase of a KnowledgeProduct (instant ledger transaction)."""

    product = models.ForeignKey(
        KnowledgeProduct,
        on_delete=models.PROTECT,
        related_name="purchases",
    )
    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="knowledge_purchases",
    )
    amount_minor = models.PositiveIntegerField()
    currency = models.CharField(max_length=3, default="USD")
    download_count = models.PositiveSmallIntegerField(default=0)
    # Link to the three LedgerEntry rows created atomically at purchase time
    ledger_ref = models.CharField(
        max_length=40,
        blank=True,
        help_text="Shared provider_object_id prefix for the 3 ledger entries.",
    )

    class Meta:
        unique_together = [("product", "buyer")]
        indexes = [
            models.Index(fields=["buyer", "-created_at"]),
            models.Index(fields=["product", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"purchase:{self.product_id}:{self.buyer_id}"
