"""DomainError → uniform error envelope, through the real DRF exception path.

Envelope contract: {"error": {"code", "message", "details"}} (docs/architecture/backend.md)
"""

import pytest
from django.test import Client
from rest_framework.exceptions import ValidationError

from apps.core.exceptions import ConflictError, DomainError, drf_exception_handler


@pytest.fixture
def client(settings):
    settings.ROOT_URLCONF = "apps.core.tests.urls"
    return Client(raise_request_exception=False)


def test_ok_path_unwrapped(client):
    response = client.get("/explode")
    assert response.status_code == 200
    assert response.json() == {"ok": True}


def test_domain_error_becomes_envelope(client):
    response = client.get("/explode?kind=domain")
    assert response.status_code == 400
    assert response.json() == {
        "error": {"code": "custom_code", "message": "boom", "details": {"field": "x"}}
    }


def test_conflict_error_maps_to_409(client):
    response = client.get("/explode?kind=conflict")
    assert response.status_code == 409
    body = response.json()["error"]
    assert body["code"] == "conflict"
    assert body["message"] == "already accepted"


def test_validation_error_flattens_field_errors(client):
    response = client.get("/explode?kind=validation")
    assert response.status_code == 400
    body = response.json()["error"]
    assert body["code"] == "validation_error"
    assert body["details"] == {"amount": ["must be positive"]}


def test_throttled_maps_code(client):
    response = client.get("/explode?kind=throttled")
    assert response.status_code == 429
    assert response.json()["error"]["code"] == "throttled"


def test_unhandled_exception_never_leaks_details(client, caplog):
    with caplog.at_level("ERROR"):
        response = client.get("/explode?kind=unhandled")
    assert response.status_code == 500
    # Guarantee: no internal details leak into the response body.
    assert "kaboom" not in response.content.decode()


def test_domain_error_defaults():
    error = DomainError()
    assert error.code == "domain_error"
    assert error.status_code == 400
    assert drf_exception_handler is not None  # wired in REST_FRAMEWORK


def test_validation_error_is_importable_stable_contract():
    # Frontend relies on code values; keep them stable & documented.
    assert ConflictError.status_code == 409
    assert ValidationError.status_code == 400
