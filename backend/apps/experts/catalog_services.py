"""Catalog services — KnowledgeProduct publish/edit and KnowledgePurchase (Sprint 4).

Commission: same 15% open-market rate applied to catalog instant purchases.
Double-entry invariant: charge = commission + expert_credit.

Layer contract (ADR-0005): apps.experts (this file) CAN import apps.payments
because experts is ABOVE payments in the layer stack.
"""

from __future__ import annotations

import uuid

from django.db import transaction
from django.utils import timezone

from apps.core.exceptions import DomainError, NotFoundError, PermissionDeniedError
from apps.experts.models import ExpertProfile, KnowledgeProduct, KnowledgePurchase
from apps.payments.config import commission_split
from apps.payments.models import LedgerEntry

# ---------------------------------------------------------------------------
# Catalog queries
# ---------------------------------------------------------------------------


def catalog_queryset(*, status: str = "published"):
    """Public catalog queryset — published products only (or override for admin)."""
    return (
        KnowledgeProduct.objects.filter(status=status)
        .select_related("expert", "expert__user", "subject", "cover_image")
        .order_by("-published_at", "-created_at")
    )


def get_product_by_slug(slug: str) -> KnowledgeProduct:
    """Public detail lookup — raises NotFoundError on miss or non-published."""
    product = KnowledgeProduct.objects.filter(slug=slug).select_related(
        "expert", "expert__user", "subject", "cover_image", "file"
    ).first()
    if product is None or product.status != KnowledgeProduct.Status.PUBLISHED:
        raise NotFoundError("Knowledge product not found.", code="not_found")
    return product


def search_catalog(q: str | None, subject_slug: str | None, product_type: str | None):
    """Full-text or icontains search over the published catalog."""
    from django.contrib.postgres.search import SearchQuery, SearchRank, SearchVector

    qs = catalog_queryset()

    if subject_slug:
        qs = qs.filter(subject__slug=subject_slug)
    if product_type:
        qs = qs.filter(product_type=product_type)

    if q:
        if len(q) >= 3:
            # PostgreSQL weighted full-text search
            vector = SearchVector("title", weight="A") + SearchVector(
                "summary", weight="B"
            ) + SearchVector("description", weight="C")
            search_query = SearchQuery(q, search_type="websearch")
            qs = (
                qs.annotate(rank=SearchRank(vector, search_query))
                .filter(rank__gt=0.01)
                .order_by("-rank", "-published_at")
            )
        else:
            # Fallback for short queries
            from django.db.models import Q
            qs = qs.filter(
                Q(title__icontains=q) | Q(summary__icontains=q)
            )

    return qs


def get_my_purchases(user):
    """All KnowledgePurchase rows for the logged-in buyer."""
    return KnowledgePurchase.objects.filter(buyer=user).select_related(
        "product", "product__expert", "product__subject"
    ).order_by("-created_at")


def has_purchased(user, product: KnowledgeProduct) -> bool:
    """Check if the user already owns this product."""
    return KnowledgePurchase.objects.filter(buyer=user, product=product).exists()


# ---------------------------------------------------------------------------
# Specialist publish / edit
# ---------------------------------------------------------------------------


def require_expert_profile(user) -> ExpertProfile:
    """Raise PermissionDeniedError if the user has no approved ExpertProfile."""
    profile = ExpertProfile.objects.filter(pk=user.pk).first()
    if profile is None:
        raise PermissionDeniedError("Only approved specialists can publish knowledge products.")
    return profile


def publish_product(expert_profile: ExpertProfile, payload: dict) -> KnowledgeProduct:
    """Create and publish a new KnowledgeProduct atomically.

    payload fields: title, summary, description, product_type, price_minor,
                    currency (opt), subject_id (opt), file_id (opt), cover_image_id (opt)
    """
    from apps.files.models import Attachment
    from apps.taxonomy.models import TaxonomyTerm

    title = payload.get("title", "").strip()
    if not title:
        raise DomainError("Title is required.", code="validation_error")
    summary = payload.get("summary", "").strip()
    if not summary:
        raise DomainError("Summary is required.", code="validation_error")
    price_minor = payload.get("price_minor")
    if not price_minor or int(price_minor) < 100:
        raise DomainError("Price must be at least $1.00 (100 minor units).", code="validation_error")

    product_type = payload.get("product_type", KnowledgeProduct.ProductType.STUDY_GUIDE)
    if product_type not in [c[0] for c in KnowledgeProduct.ProductType.choices]:
        raise DomainError("Invalid product_type.", code="validation_error")

    subject = None
    if payload.get("subject_id"):
        subject = TaxonomyTerm.objects.filter(
            pk=payload["subject_id"], kind__in=["subject", "category"], is_active=True
        ).first()

    file_obj = None
    if payload.get("file_id"):
        file_obj = Attachment.objects.filter(pk=payload["file_id"], uploader=expert_profile.user).first()

    cover_image = None
    if payload.get("cover_image_id"):
        cover_image = Attachment.objects.filter(pk=payload["cover_image_id"], uploader=expert_profile.user).first()

    with transaction.atomic():
        product = KnowledgeProduct.objects.create(
            expert=expert_profile,
            title=title,
            summary=summary,
            description=payload.get("description", ""),
            product_type=product_type,
            price_minor=int(price_minor),
            currency=payload.get("currency", "USD"),
            subject=subject,
            file=file_obj,
            cover_image=cover_image,
            status=KnowledgeProduct.Status.PUBLISHED,
            published_at=timezone.now(),
        )
    return product


def update_product(user, slug: str, payload: dict) -> KnowledgeProduct:
    """Update a specialist's own KnowledgeProduct (draft or published)."""
    from apps.files.models import Attachment
    from apps.taxonomy.models import TaxonomyTerm

    expert_profile = require_expert_profile(user)
    product = KnowledgeProduct.objects.filter(slug=slug, expert=expert_profile).first()
    if product is None:
        raise NotFoundError("Product not found.", code="not_found")
    if product.status == KnowledgeProduct.Status.ARCHIVED:
        raise DomainError("Cannot edit an archived product.", code="invalid_state")

    updatable = ["title", "summary", "description", "price_minor", "currency"]
    for field in updatable:
        if field in payload:
            setattr(product, field, payload[field])

    if "subject_id" in payload:
        product.subject = TaxonomyTerm.objects.filter(
            pk=payload["subject_id"], kind__in=["subject", "category"], is_active=True
        ).first()

    if "file_id" in payload:
        product.file = Attachment.objects.filter(pk=payload["file_id"], uploader=user).first()

    if "cover_image_id" in payload:
        product.cover_image = Attachment.objects.filter(pk=payload["cover_image_id"], uploader=user).first()

    if payload.get("publish") and product.status == KnowledgeProduct.Status.DRAFT:
        product.status = KnowledgeProduct.Status.PUBLISHED
        product.published_at = timezone.now()

    with transaction.atomic():
        product.save()
    return product


def list_my_products(user):
    """All KnowledgeProducts for the logged-in specialist (any status)."""
    expert_profile = ExpertProfile.objects.filter(pk=user.pk).first()
    if expert_profile is None:
        return KnowledgeProduct.objects.none()
    return KnowledgeProduct.objects.filter(expert=expert_profile).select_related(
        "subject", "file", "cover_image"
    ).order_by("-created_at")


# ---------------------------------------------------------------------------
# Purchase flow (double-entry)
# ---------------------------------------------------------------------------


def purchase_knowledge_product(product: KnowledgeProduct, buyer) -> KnowledgePurchase:
    """Instant purchase: create KnowledgePurchase + 3 LedgerEntry rows atomically.

    Double-entry invariant: charge = commission + expert_credit.
    Commission rate: same as COMMISSION_RATE from payments.config (15%).
    """
    if product.status != KnowledgeProduct.Status.PUBLISHED:
        raise DomainError("This product is not available for purchase.", code="invalid_state")

    # Live cohort seat capacity enforcement
    if (
        product.product_type == KnowledgeProduct.ProductType.LIVE_COHORT
        and product.max_seats > 0
        and product.enrolled_count >= product.max_seats
    ):
        raise DomainError("This live cohort workshop is fully booked.", code="cohort_full")

    # Prevent re-purchase
    if KnowledgePurchase.objects.filter(buyer=buyer, product=product).exists():
        raise DomainError("You have already purchased this product.", code="already_purchased")

    amount_minor = product.price_minor
    commission_minor, expert_net_minor = commission_split(amount_minor)

    # Shared reference for all 3 ledger rows (traceable audit)
    ref = f"catalog-{uuid.uuid4().hex[:16]}"

    with transaction.atomic():
        purchase = KnowledgePurchase.objects.create(
            product=product,
            buyer=buyer,
            amount_minor=amount_minor,
            currency=product.currency,
            ledger_ref=ref,
        )

        # Charge student
        LedgerEntry.objects.create(
            entry_type=LedgerEntry.EntryType.CHARGE,
            amount_minor=amount_minor,
            currency=product.currency,
            user=buyer,
            description=f"Catalog purchase: {product.title[:80]}",
            provider_object_id=ref,
        )

        # Platform commission
        LedgerEntry.objects.create(
            entry_type=LedgerEntry.EntryType.COMMISSION,
            amount_minor=commission_minor,
            currency=product.currency,
            user=product.expert.user,
            description=f"Commission on catalog sale: {product.title[:80]}",
            provider_object_id=ref,
        )

        # Expert credit
        LedgerEntry.objects.create(
            entry_type=LedgerEntry.EntryType.EXPERT_CREDIT,
            amount_minor=expert_net_minor,
            currency=product.currency,
            user=product.expert.user,
            description=f"Credit for catalog sale: {product.title[:80]}",
            provider_object_id=ref,
        )

        # Increment sales counter & enrolled count for live cohorts
        updates = {"sales_count": models_F("sales_count") + 1}
        if product.product_type == KnowledgeProduct.ProductType.LIVE_COHORT:
            updates["enrolled_count"] = models_F("enrolled_count") + 1
        KnowledgeProduct.objects.filter(pk=product.pk).update(**updates)

    return purchase


# Small helper to avoid circular import on F expression
def models_F(field_name: str):
    from django.db.models import F
    return F(field_name)
