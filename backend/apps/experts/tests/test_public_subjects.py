"""Public subject discovery endpoints — `GET /api/v1/subjects[/{slug}]`.

These back the `/subjects/[slug]` landing pages specified in seo-ux.md. The
behaviour that matters is not "returns 200": it is that a subject page can
never advertise an expert the directory itself would hide, and that a retired
subject 404s instead of lingering as an orphan page in search results.
"""

from __future__ import annotations

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.experts.tests.test_api import make_expert
from apps.taxonomy.models import TaxonomyTerm
from apps.taxonomy.services import ensure_term

pytestmark = pytest.mark.django_db


def _client() -> APIClient:
    return APIClient()


def _subject(name: str, parent=None) -> TaxonomyTerm:
    term, _ = ensure_term(kind="subject", name=name, parent=parent)
    return term


def _category(name: str) -> TaxonomyTerm:
    term, _ = ensure_term(kind="category", name=name)
    return term


def _teach(user, *terms) -> None:
    user.expert_profile.subjects.set(terms)


# --- routing ---------------------------------------------------------------


def test_routes_are_reversible():
    assert reverse("public-subject-list") == "/api/v1/subjects"
    assert reverse("public-subject-detail", args=["mathematics"]) == "/api/v1/subjects/mathematics"


def test_detail_is_anonymous():
    _subject("Mathematics")
    res = _client().get("/api/v1/subjects/mathematics")
    assert res.status_code == 200
    assert res.json()["subject"]["name"] == "Mathematics"


# --- 404 boundaries --------------------------------------------------------


def test_unknown_slug_404s():
    assert _client().get("/api/v1/subjects/does-not-exist").status_code == 404


def test_deactivated_subject_404s_rather_than_orphaning_a_page():
    term = _subject("Astrology")
    term.is_active = False
    term.save(update_fields=["is_active"])

    assert _client().get("/api/v1/subjects/astrology").status_code == 404


def test_a_skill_is_not_a_subject_page():
    """Skills share the slug space but are not public landing pages."""
    ensure_term(kind="skill", name="Calculus")

    assert _client().get("/api/v1/subjects/calculus").status_code == 404


# --- expert counts obey directory visibility -------------------------------


def test_counts_only_experts_the_directory_would_show(django_user_model):
    maths = _subject("Mathematics")
    visible = make_expert(django_user_model, "vis@demo.local", "Visible Expert")
    hidden = make_expert(django_user_model, "hid@demo.local", "Hidden Expert")
    _teach(visible, maths)
    _teach(hidden, maths)

    # Opting out of the directory must also remove them from the subject page.
    hidden.expert_profile.is_public = False
    hidden.expert_profile.save(update_fields=["is_public"])

    body = _client().get("/api/v1/subjects/mathematics").json()
    assert body["expert_count"] == 1


def test_deactivated_user_drops_out_of_the_count(django_user_model):
    maths = _subject("Mathematics")
    expert = make_expert(django_user_model, "gone@demo.local", "Departed Expert")
    _teach(expert, maths)
    assert _client().get("/api/v1/subjects/mathematics").json()["expert_count"] == 1

    expert.is_active = False
    expert.save(update_fields=["is_active"])

    assert _client().get("/api/v1/subjects/mathematics").json()["expert_count"] == 0


def test_subject_with_no_experts_is_a_valid_page_not_a_404():
    """Empty subjects still render — the page has an empty state by design."""
    _subject("Underwater Basket Weaving")

    res = _client().get("/api/v1/subjects/underwater-basket-weaving")

    assert res.status_code == 200
    assert res.json()["expert_count"] == 0


# --- internal linking ------------------------------------------------------


def test_related_prefers_siblings_under_the_same_category():
    stem = _category("STEM")
    humanities = _category("Humanities")
    _subject("Mathematics", parent=stem)
    _subject("Physics", parent=stem)
    _subject("History", parent=humanities)

    body = _client().get("/api/v1/subjects/mathematics").json()

    slugs = [r["slug"] for r in body["related"]]
    assert "physics" in slugs
    assert "history" not in slugs
    assert body["parent"] == {"name": "STEM", "slug": "STEM".lower()}


def test_related_falls_back_to_any_subject_when_there_are_no_siblings():
    """A parentless taxonomy must still produce internal links, not a dead end."""
    _subject("Mathematics")
    _subject("Physics")

    body = _client().get("/api/v1/subjects/mathematics").json()

    assert [r["slug"] for r in body["related"]] == ["physics"]
    assert body["parent"] is None


def test_related_excludes_self_and_inactive_subjects():
    stem = _category("STEM")
    _subject("Mathematics", parent=stem)
    retired = _subject("Alchemy", parent=stem)
    retired.is_active = False
    retired.save(update_fields=["is_active"])

    slugs = [r["slug"] for r in _client().get("/api/v1/subjects/mathematics").json()["related"]]

    assert "mathematics" not in slugs
    assert "alchemy" not in slugs


# --- list endpoint ---------------------------------------------------------


def test_list_returns_active_subjects_with_counts(django_user_model):
    maths = _subject("Mathematics")
    _subject("Physics")
    retired = _subject("Alchemy")
    retired.is_active = False
    retired.save(update_fields=["is_active"])
    _teach(make_expert(django_user_model, "m@demo.local", "Maths Expert"), maths)

    body = _client().get("/api/v1/subjects").json()

    by_slug = {s["slug"]: s for s in body["subjects"]}
    assert set(by_slug) == {"mathematics", "physics"}
    assert by_slug["mathematics"]["expert_count"] == 1
    assert by_slug["physics"]["expert_count"] == 0


def test_list_does_not_leak_private_fields():
    _subject("Mathematics")

    entry = _client().get("/api/v1/subjects").json()["subjects"][0]

    assert set(entry) == {"name", "slug", "expert_count"}
