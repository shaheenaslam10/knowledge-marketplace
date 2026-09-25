"""ServiceRequest API tests — ownership, IDOR, filters, pagination, envelopes."""

import json

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.experts.tests.test_api import PASSWORD, api_login, make_expert
from apps.files.services import store_upload
from apps.taxonomy.services import ensure_term

pytestmark = pytest.mark.django_db

PDF = SimpleUploadedFile("brief.pdf", b"%PDF-1.4\n" + b"x" * 64)


@pytest.fixture
def student(django_user_model):
    user = django_user_model.objects.create_user(
        email="api-student@demo.local", password=PASSWORD, name="S"
    )
    user.mark_email_verified()
    return user


@pytest.fixture
def subject():
    return ensure_term(kind="subject", name="Physics")[0]


@pytest.fixture
def request_payload(subject):
    return {
        "category": "tutoring",
        "title": "Mechanics help",
        "description": "Struggling with rotational dynamics; need weekly sessions.",
        "subject_id": str(subject.pk),
        "budget_min": 2000,
        "budget_max": 9000,
        "deadline": "2030-01-15",
        "skill_ids": [],
    }


def _publish(client, req_id):
    return client.post(
        f"/api/v1/me/requests/{req_id}/publish",
        json.dumps({"attested": True}),
        content_type="application/json",
    )


def test_create_requires_auth(client):
    response = client.post("/api/v1/me/requests", {}, content_type="application/json")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "not_authenticated"


def test_create_draft_and_publish_flow(client, student, request_payload):
    api_login(client, student)
    response = client.post("/api/v1/me/requests", request_payload, content_type="application/json")
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "draft"
    assert body["student_view"] is True

    response = _publish(client, body["id"])
    assert response.status_code == 200
    assert response.json()["status"] == "open"
    assert response.json()["expires_at"] is not None


def test_create_with_managed_mode_persists_and_publishes_in_review(
    client, student, request_payload
):
    """API-level regression: the view-layer payload allowlist dropped `mode`, so a
    managed request was silently created as open (BR-06/BR-19 managed funnel)."""
    api_login(client, student)
    response = client.post(
        "/api/v1/me/requests",
        {**request_payload, "mode": "managed"},
        content_type="application/json",
    )
    assert response.status_code == 201
    assert response.json()["mode"] == "managed"

    response = _publish(client, response.json()["id"])
    assert response.status_code == 200
    assert response.json()["status"] == "in_review"


def test_owner_scoping_is_idor_safe(client, student, django_user_model, request_payload, subject):
    stranger = django_user_model.objects.create_user(
        email="stranger@demo.local", password=PASSWORD, name="X"
    )
    api_login(client, student)
    req_id = client.post(
        "/api/v1/me/requests", request_payload, content_type="application/json"
    ).json()["id"]

    stranger_client = client
    api_login(stranger_client, stranger)
    assert stranger_client.get(f"/api/v1/me/requests/{req_id}").status_code == 404
    assert stranger_client.get(f"/api/v1/me/requests/{req_id}/offers").status_code == 404
    assert (
        stranger_client.post(
            f"/api/v1/me/requests/{req_id}/publish",
            json.dumps({"attested": True}),
            content_type="application/json",
        ).status_code
        == 404
    )
    response = stranger_client.get(f"/api/v1/requests/{req_id}")
    assert response.status_code == 403  # not owner, not an eligible expert
    assert response.json()["error"]["code"] == "permission_denied"


def test_patch_draft_only_with_json(client, student, request_payload):
    api_login(client, student)
    req_id = client.post(
        "/api/v1/me/requests", request_payload, content_type="application/json"
    ).json()["id"]
    response = client.patch(
        f"/api/v1/me/requests/{req_id}",
        json.dumps({"title": "Updated title"}),
        content_type="application/json",
    )
    assert response.status_code == 200
    assert response.json()["title"] == "Updated title"
    _publish(client, req_id)
    response = client.patch(
        f"/api/v1/me/requests/{req_id}",
        json.dumps({"title": "Locked?"}),
        content_type="application/json",
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "request_locked"


def test_attachments_validation_and_metadata(client, student, request_payload, subject):
    api_login(client, student)
    attachment, _ = store_upload(student, purpose="request_brief", uploaded_file=PDF)
    payload = {**request_payload, "attachment_ids": [str(attachment.pk)]}
    body = client.post("/api/v1/me/requests", payload, content_type="application/json").json()
    assert [a["original_name"] for a in body["attachments"]] == ["brief.pdf"]

    # someone else's attachment id is refused
    from django.contrib.auth import get_user_model

    intruder = get_user_model().objects.create_user(
        email="intruder@demo.local", password=PASSWORD, name="I"
    )
    intruder_attach, _ = store_upload(intruder, purpose="request_brief", uploaded_file=PDF)
    payload = {**request_payload, "attachment_ids": [str(intruder_attach.pk)]}
    response = client.post("/api/v1/me/requests", payload, content_type="application/json")
    assert response.status_code == 400


def test_expert_feed_filters_and_pagination(
    client, student, django_user_model, request_payload, subject
):
    api_login(client, student)
    for title in ["Calculus series", "Linear algebra", "Probability puzzles"]:
        payload = {**request_payload, "title": title}
        req_id = client.post(
            "/api/v1/me/requests", payload, content_type="application/json"
        ).json()["id"]
        _publish(client, req_id)

    expert = make_expert(django_user_model, "feed@demo.local", "Feed Expert")
    api_login(client, expert)
    response = client.get("/api/v1/requests")
    assert response.status_code == 200
    assert len(response.json()["results"]) == 3
    response = client.get("/api/v1/requests?q=algebra")
    assert [r["title"] for r in response.json()["results"]] == ["Linear algebra"]
    response = client.get("/api/v1/requests?subject=physics")
    assert len(response.json()["results"]) == 3
    response = client.get("/api/v1/requests?subject=nonexistent")
    assert response.json()["results"] == []


def test_feed_requires_expert_role(client, student, request_payload):
    api_login(client, student)
    response = client.get("/api/v1/requests")
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "permission_denied"


def test_matched_request_hidden_from_other_experts(
    client, student, django_user_model, request_payload
):
    api_login(client, student)
    req_id = client.post(
        "/api/v1/me/requests", request_payload, content_type="application/json"
    ).json()["id"]
    _publish(client, req_id)
    selected = make_expert(django_user_model, "sel@demo.local", "Selected Expert")
    outsider = make_expert(django_user_model, "out@demo.local", "Outsider Expert")

    api_login(client, selected)
    offer_id = client.post(
        f"/api/v1/requests/{req_id}/offers",
        {"amount": 5000, "timeline_text": "2 weeks", "message": "Can do"},
        content_type="application/json",
    ).json()["id"]
    api_login(client, student)
    client.post(
        f"/api/v1/me/requests/{req_id}/offers/{offer_id}/accept",
        "{}",
        content_type="application/json",
    )

    api_login(client, outsider)
    assert client.get(f"/api/v1/requests/{req_id}").status_code == 403
    response = client.get("/api/v1/requests")
    assert response.json()["results"] == []

    api_login(client, selected)
    assert (
        client.get(f"/api/v1/requests/{req_id}").status_code == 200
    )  # selected expert keeps access
