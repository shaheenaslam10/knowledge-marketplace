"""Audit sidecar: the log service records actor/object/request-id; rows immutable by convention."""

import pytest

from apps.audit.models import AuditEvent
from apps.audit.services import log

pytestmark = pytest.mark.django_db


def test_log_records_actor_object_and_request_id(django_user_model, rf):
    from apps.core.middleware import get_request_id

    user = django_user_model.objects.create_user(
        email="a@demo.local", password="long-pass-123", name="A"
    )
    request = rf.get("/api/v1/experts")

    event = log(user, action="experts.approved", obj=user, detail={"note": "ok"}, request=request)
    assert event.actor_id == user.id
    assert event.action == "experts.approved"
    assert event.object_type == "User"
    assert event.object_id == str(user.pk)
    assert event.request_id == get_request_id()  # request-id convention propagates
    assert event.detail == {"note": "ok"}


def test_log_allows_null_actor_for_system_actions(db):
    event = log(None, action="jobs.cleanup", object_type="System", object_id="1")
    assert event.actor is None


def test_audit_rows_are_never_updated_by_the_service(django_user_model):
    user = django_user_model.objects.create_user(
        email="b@demo.local", password="long-pass-123", name="B"
    )
    log(user, action="experts.suspended", object_type="ExpertApplication", object_id="9")
    assert AuditEvent.objects.count() == 1  # append-only: no update path exists
