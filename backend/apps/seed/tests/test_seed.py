"""Seed: full demo dataset, every application persona, idempotent double-run."""

import pytest
from django.core.management import call_command

from apps.accounts.models import StudentProfile
from apps.experts.models import ExpertApplication
from apps.experts.services import directory_queryset

pytestmark = pytest.mark.django_db


@pytest.fixture
def seeded(db, monkeypatch, settings):
    monkeypatch.delenv("DJANGO_SEED_DEMO_PASSWORD", raising=False)
    call_command("seed_demo")
    return None


def test_seed_creates_all_personas(seeded, django_user_model):
    User = django_user_model
    expected = {
        "admin@demo.local": None,
        "student@demo.local": None,
        "expert@demo.local": ExpertApplication.Status.APPROVED,
        "expert.applicant@demo.local": ExpertApplication.Status.SUBMITTED,
        "expert.review@demo.local": ExpertApplication.Status.UNDER_REVIEW,
        "expert.rejected@demo.local": ExpertApplication.Status.REJECTED,
        "expert.suspended@demo.local": ExpertApplication.Status.SUSPENDED,
        "noapply@demo.local": None,
    }
    for email, status in expected.items():
        user = User.objects.filter(email=email).first()
        assert user is not None, f"missing persona {email}"
        if status is not None:
            assert user.expert_application.status == status, email

    # rejected persona carries the reviewer's reason
    rejected = User.objects.get(email="expert.rejected@demo.local").expert_application
    assert rejected.rejection_reason
    assert rejected.reviewed_by.is_staff

    # student onboarding is complete for the demo student
    assert StudentProfile.objects.filter(user__email="student@demo.local").exists()

    # exactly the approved+public experts are in the directory
    assert [p.slug for p in directory_queryset()] == ["ayra-k"]


def test_seed_is_idempotent(seeded, django_user_model):
    call_command("seed_demo")  # second run must not duplicate or crash
    assert (
        django_user_model.objects.filter(email__endswith="@demo.local").count() == 9
    )  # + expert.market@
    assert ExpertApplication.objects.count() == 6
    assert [p.slug for p in directory_queryset()] == ["ayra-k"]  # feed-only expert stays out

    from apps.assignments.models import PoolInvitation
    from apps.bidding.models import Offer
    from apps.service_requests.models import ServiceRequest

    assert (
        ServiceRequest.objects.filter(student__email="student@demo.local").count() == 4
    )  # open + draft + 2 managed
    assert Offer.objects.count() == 2  # Ayra + Hina on the open request
    assert (
        ServiceRequest.objects.filter(mode="managed", status="in_review").count() == 1
    )  # triage demo
    assert (
        PoolInvitation.objects.filter(expert__email="expert@demo.local", status="pending").count()
        == 1
    )


def test_seed_refuses_outside_dev_test(monkeypatch, settings):
    settings.SETTINGS_MODULE = "config.settings.prod"
    with pytest.raises(SystemExit, match="Refusing to seed"):
        call_command("seed_demo")
