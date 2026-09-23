"""Student onboarding — self-service profile (no approval), owner-scoped by /me."""

import pytest

pytestmark = pytest.mark.django_db

PASSWORD = "long-pass-123"


def api_login(client, user):
    response = client.post(
        "/api/v1/auth/token",
        {"email": user.email, "password": PASSWORD},
        content_type="application/json",
    )
    assert response.status_code == 200
    return client


def test_profile_null_until_onboarding_then_upsert(client, django_user_model):
    user = django_user_model.objects.create_user(
        email="stu@demo.local", password=PASSWORD, name="S"
    )
    user.mark_email_verified()
    api_login(client, user)

    response = client.get("/api/v1/me/student-profile")
    assert response.status_code == 200
    assert response.json() == {"profile": None}  # students are never approval-gated

    from apps.taxonomy.services import ensure_term

    subject, _ = ensure_term(kind="subject", name="Python")
    response = client.patch(
        "/api/v1/me/student-profile",
        {"display_name": "Stu", "bio": "Learning Linux.", "interest_ids": [subject.id]},
        content_type="application/json",
    )
    assert response.status_code == 200
    body = response.json()["profile"]
    assert body["display_name"] == "Stu"
    assert [i["slug"] for i in body["interests"]] == ["python"]

    # PATCH again → update, not duplicate
    response = client.patch(
        "/api/v1/me/student-profile", {"bio": "Learning Rust."}, content_type="application/json"
    )
    assert response.json()["profile"]["bio"] == "Learning Rust."
    assert response.json()["profile"]["display_name"] == "Stu"


def test_unknown_interest_terms_rejected(client, django_user_model):
    user = django_user_model.objects.create_user(
        email="stu2@demo.local", password=PASSWORD, name="S2"
    )
    user.mark_email_verified()
    api_login(client, user)
    response = client.patch(
        "/api/v1/me/student-profile", {"interest_ids": [99999]}, content_type="application/json"
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "validation_error"


def test_anonymous_cannot_read_or_write(client):
    assert client.get("/api/v1/me/student-profile").status_code == 401
    assert (
        client.patch("/api/v1/me/student-profile", {}, content_type="application/json").status_code
        == 401
    )
