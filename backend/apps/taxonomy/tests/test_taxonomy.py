"""Taxonomy: term invariants + public list API."""

import pytest
from django.core.exceptions import ValidationError

from apps.taxonomy.models import TaxonomyTerm
from apps.taxonomy.services import ensure_term

pytestmark = pytest.mark.django_db


def test_ensure_term_is_idempotent_with_unique_slug_per_kind():
    a, created_a = ensure_term(kind="subject", name="Python")
    b, created_b = ensure_term(kind="subject", name="Python")
    assert created_a and not created_b and a.id == b.id
    other, created = ensure_term(kind="skill", name="Python")
    assert created and other.slug == a.slug and other.id != a.id  # same slug, different kind


def test_slug_collision_gets_suffix():
    a, _ = ensure_term(kind="subject", name="Data Science")
    # direct model save with a different name that slugifies identically → suffix
    b = TaxonomyTerm(kind="subject", name="Data Science!")
    b.full_clean(exclude=["slug"])
    b.save()
    assert a.slug == "data-science" and b.slug == "data-science-2"


def test_only_categories_can_parent_subjects():
    subject, _ = ensure_term(kind="subject", name="Algebra")
    with pytest.raises(ValidationError):
        ensure_term(kind="subject", name="Linear Algebra", parent=subject)
    category, _ = ensure_term(kind="category", name="Mathematics")
    with pytest.raises(ValidationError):
        ensure_term(kind="category", name="Nested Category", parent=category)
    child, _ = ensure_term(kind="subject", name="Linear Algebra", parent=category)
    assert child.parent_id == category.id


def test_list_terms_filters(client):
    ensure_term(kind="subject", name="Python")
    ensure_term(kind="skill", name="pandas")
    ensure_term(kind="subject", name="Hidden", is_active=False)

    response = client.get("/api/v1/taxonomy/terms?kind=subject")
    assert response.status_code == 200
    names = [t["name"] for t in response.json()["terms"]]
    assert "Python" in names and "Hidden" not in names

    response = client.get("/api/v1/taxonomy/terms?q=pand")
    assert [t["slug"] for t in response.json()["terms"]] == ["pandas"]

    response = client.get("/api/v1/taxonomy/terms")
    assert response.status_code == 200  # public
