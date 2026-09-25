"""Experts API: public directory visibility/filters, application ownership, envelopes."""

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.experts.services import apply, approve, start_review, submit_application, suspend

pytestmark = pytest.mark.django_db

PASSWORD = "long-pass-123"
PNG = SimpleUploadedFile("cert.png", b"\x89PNG\r\n\x1a\n" + b"x" * 32)

APPLICATION_DATA = {
    "display_name": "Ayra K.",
    "headline": "Python tutor",
    "bio": "Guided tutoring only — you do the work, I coach it.",
    "expertise_summary": "Python, statistics",
    "experience_years": 5,
    "qualifications": "MSc Statistics",
    "languages": "English",
    "timezone": "UTC",
    "availability_note": "Evenings",
    "certified_18_plus": True,
    "integrity_acknowledged": True,
}


def api_login(client, user):
    response = client.post(
        "/api/v1/auth/token",
        {"email": user.email, "password": PASSWORD},
        content_type="application/json",
    )
    assert response.status_code == 200
    return client


def make_expert(django_user_model, email: str, display_name: str, rating=None):
    user = django_user_model.objects.create_user(email=email, password=PASSWORD, name=display_name)
    user.mark_email_verified()
    application = apply(user, data={**APPLICATION_DATA, "display_name": display_name})
    from apps.files.services import store_upload

    attachment, _ = store_upload(user, purpose="credential", uploaded_file=PNG)
    application.credentials.add(attachment)
    submit_application(user)
    admin = (
        django_user_model.objects.get(email="admin@demo.local")
        if django_user_model.objects.filter(email="admin@demo.local").exists()
        else _make_admin(django_user_model)
    )
    start_review(application.pk, reviewer=admin)
    approve(application.pk, reviewer=admin)
    if rating is not None:
        profile = user.expert_profile
        profile.rating_avg = rating
        profile.rating_count = 5
        profile.save(update_fields=["rating_avg", "rating_count", "updated_at"])
    return user


def _make_admin(django_user_model):
    return django_user_model.objects.create_user(
        email="admin@demo.local", password=PASSWORD, name="Admin", is_staff=True, is_superuser=True
    )


@pytest.fixture
def admin(django_user_model):
    return _make_admin(django_user_model)


# --- public directory --------------------------------------------------------


def test_directory_lists_only_approved_public_experts(client, django_user_model, admin):
    make_expert(django_user_model, "one@demo.local", "Expert One")
    other = make_expert(django_user_model, "two@demo.local", "Expert Two")
    # suspend the second → hidden
    suspend(other.expert_application.pk, reviewer=admin, reason="demo")
    # third: approved but opted out of the directory
    third = make_expert(django_user_model, "three@demo.local", "Expert Three")
    third.expert_profile.is_public = False
    third.expert_profile.save(update_fields=["is_public", "updated_at"])

    response = client.get("/api/v1/experts")
    assert response.status_code == 200
    slugs = [r["slug"] for r in response.json()["results"]]
    assert slugs == ["expert-one"]


def test_directory_filters_search_and_pagination(client, django_user_model, admin):
    from apps.taxonomy.services import ensure_term

    make_expert(django_user_model, "py@demo.local", "Python Pro", rating=4.5)
    make_expert(django_user_model, "stat@demo.local", "Stats Sage", rating=4.0)
    subject, _ = ensure_term(kind="subject", name="Numerics")

    # q search
    assert [r["slug"] for r in client.get("/api/v1/experts?q=sage").json()["results"]] == [
        "stats-sage"
    ]
    # rating_min
    assert [r["slug"] for r in client.get("/api/v1/experts?rating_min=4.2").json()["results"]] == [
        "python-pro"
    ]
    # subject filter by slug (no expert has it → empty)
    assert client.get(f"/api/v1/experts?subject={subject.slug}").json()["results"] == []
    # pagination: page_size respected
    assert len(client.get("/api/v1/experts?page_size=1").json()["results"]) == 1
    # no private fields leak
    body = client.get("/api/v1/experts").json()["results"][0]
    assert "credentials" not in body and "review_note" not in body and "email" not in body


def test_public_detail_hidden_for_suspended_or_private(client, django_user_model, admin):
    user = make_expert(django_user_model, "vis@demo.local", "Visible Vera")
    slug = user.expert_profile.slug
    assert client.get(f"/api/v1/experts/{slug}").status_code == 200

    suspend(user.expert_application.pk, reviewer=admin, reason="demo")
    assert client.get(f"/api/v1/experts/{slug}").status_code == 404


# --- application flow --------------------------------------------------------


def test_anonymous_cannot_access_application_or_submit(client):
    assert client.get("/api/v1/me/expert-application").status_code == 401
    response = client.post("/api/v1/me/expert-application/submit")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "not_authenticated"


def test_apply_create_and_get_own_application(client, django_user_model):
    user = django_user_model.objects.create_user(
        email="new@demo.local", password=PASSWORD, name="N"
    )
    user.mark_email_verified()
    api_login(client, user)

    response = client.get("/api/v1/me/expert-application")
    assert response.json() == {"application": None, "status": "not_applied"}

    from apps.files.services import store_upload

    attachment, _ = store_upload(user, purpose="credential", uploaded_file=PNG)
    response = client.post(
        "/api/v1/me/expert-application",
        {
            **APPLICATION_DATA,
            "credential_ids": str(attachment.id),
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "draft"
    assert len(body["application"]["credentials"]) == 1

    # duplicate apply → 409 envelope
    response = client.post("/api/v1/me/expert-application", {**APPLICATION_DATA})
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "application_exists"


def test_apply_accepts_credential_ids_as_json_list(client, django_user_model):
    """The UI posts JSON — credential_ids arrives as a list. Regression: the view
    wrapped the whole list as one element and UUID coercion raised a 500."""
    user = django_user_model.objects.create_user(
        email="jsonlist@demo.local", password=PASSWORD, name="J"
    )
    user.mark_email_verified()
    api_login(client, user)

    from apps.files.services import store_upload

    attachment, _ = store_upload(user, purpose="credential", uploaded_file=PNG)
    response = client.post(
        "/api/v1/me/expert-application",
        {**APPLICATION_DATA, "credential_ids": [str(attachment.id)]},
        content_type="application/json",
    )
    assert response.status_code == 201
    assert len(response.json()["application"]["credentials"]) == 1


def test_apply_with_malformed_credential_id_returns_400_not_500(client, django_user_model):
    user = django_user_model.objects.create_user(
        email="baduuid@demo.local", password=PASSWORD, name="B"
    )
    user.mark_email_verified()
    api_login(client, user)
    response = client.post(
        "/api/v1/me/expert-application",
        {**APPLICATION_DATA, "credential_ids": ["not-a-uuid"]},
        content_type="application/json",
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "validation_error"


def test_cannot_reference_someone_elses_credential(client, django_user_model):
    owner = django_user_model.objects.create_user(
        email="own@demo.local", password=PASSWORD, name="O"
    )
    owner.mark_email_verified()
    from apps.files.services import store_upload

    attachment, _ = store_upload(owner, purpose="credential", uploaded_file=PNG)

    user = django_user_model.objects.create_user(
        email="evil@demo.local", password=PASSWORD, name="E"
    )
    user.mark_email_verified()
    api_login(client, user)
    response = client.post(
        "/api/v1/me/expert-application", {**APPLICATION_DATA, "credential_ids": str(attachment.id)}
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "validation_error"


def test_submit_without_credential_returns_envelope(client, django_user_model):
    user = django_user_model.objects.create_user(email="nc@demo.local", password=PASSWORD, name="N")
    user.mark_email_verified()
    api_login(client, user)
    client.post("/api/v1/me/expert-application", {**APPLICATION_DATA})
    response = client.post("/api/v1/me/expert-application/submit")
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "credential_required"


def test_application_ownership_is_absolute(client, django_user_model):
    """Only the owner's application is reachable; there is no lookup-by-id at all."""
    owner = django_user_model.objects.create_user(
        email="appo@demo.local", password=PASSWORD, name="O"
    )
    owner.mark_email_verified()
    api_login(client, owner)
    client.post("/api/v1/me/expert-application", {**APPLICATION_DATA})

    stranger = django_user_model.objects.create_user(
        email="stranger@demo.local", password=PASSWORD, name="S"
    )
    stranger.mark_email_verified()
    api_login(client, stranger)
    response = client.get("/api/v1/me/expert-application")
    assert response.json() == {"application": None, "status": "not_applied"}


def test_edit_locked_while_under_review(client, django_user_model, admin):
    user = django_user_model.objects.create_user(
        email="lock@demo.local", password=PASSWORD, name="L"
    )
    user.mark_email_verified()
    application = apply(user, data=dict(APPLICATION_DATA))
    from apps.files.services import store_upload

    attachment, _ = store_upload(user, purpose="credential", uploaded_file=PNG)
    application.credentials.add(attachment)
    submit_application(user)
    start_review(application.pk, reviewer=admin)

    api_login(client, user)
    import json

    response = client.patch(
        "/api/v1/me/expert-application",
        json.dumps({"headline": "hacked"}),
        content_type="application/json",
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "application_locked"


def test_rejected_applicant_sees_reason_and_can_resubmit(client, django_user_model, admin):
    user = django_user_model.objects.create_user(
        email="rej@demo.local", password=PASSWORD, name="R"
    )
    user.mark_email_verified()
    application = apply(user, data=dict(APPLICATION_DATA))
    from apps.files.services import store_upload

    attachment, _ = store_upload(user, purpose="credential", uploaded_file=PNG)
    application.credentials.add(attachment)
    submit_application(user)
    start_review(application.pk, reviewer=admin)
    from apps.experts.services import reject

    reject(application.pk, reviewer=admin, reason="Please attach a university transcript.")

    api_login(client, user)
    body = client.get("/api/v1/me/expert-application").json()
    assert body["status"] == "rejected"
    assert "transcript" in body["application"]["rejection_reason"]

    response = client.post("/api/v1/me/expert-application/submit")
    assert response.status_code == 200
    assert response.json()["status"] == "submitted"


# --- own expert profile ------------------------------------------------------


def test_expert_profile_owner_view_and_visibility_toggle(client, django_user_model, admin):
    user = make_expert(django_user_model, "prof@demo.local", "Profile Owner")
    api_login(client, user)
    body = client.get("/api/v1/me/expert-profile").json()
    assert body["display_name"] == "Profile Owner"
    assert "credentials" not in body and "email" not in body

    import json

    response = client.patch(
        "/api/v1/me/expert-profile",
        json.dumps({"availability": "paused", "is_public": False}),
        content_type="application/json",
    )
    assert response.json()["availability"] == "paused"
    assert (
        client.get(f"/api/v1/experts/{body['slug']}").status_code == 404
    )  # opted out of directory


def test_non_expert_has_no_expert_profile(client, django_user_model):
    user = django_user_model.objects.create_user(
        email="plain@demo.local", password=PASSWORD, name="P"
    )
    user.mark_email_verified()
    api_login(client, user)
    response = client.get("/api/v1/me/expert-profile")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "no_profile"


def test_apply_info_is_public(client):
    response = client.get("/api/v1/experts/apply-info")
    assert response.status_code == 200
    body = response.json()
    assert body["requirements"]["credential"]["minimum_files"] == 1
    assert "taxonomy" in body
