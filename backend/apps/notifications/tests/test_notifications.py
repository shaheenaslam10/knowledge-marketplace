"""Phase 8 notifications tests — funnel, delivery, preferences, idempotency."""

import pytest
from django.core import mail

from apps.notifications.models import Notification
from apps.notifications.services import (
    email_enabled,
    notify,
    notify_many,
    preferences_for,
    set_preference,
    unread_count,
)

pytestmark = pytest.mark.django_db


@pytest.fixture
def user(django_user_model):
    u = django_user_model.objects.create_user(email="ntf@demo.local", password=PASSWORD, name="N")
    u.mark_email_verified()
    return u


PASSWORD = "long-pass-123"


def _api_login(client, user) -> None:
    response = client.post("/api/v1/auth/token", {"email": user.email, "password": PASSWORD})
    assert response.status_code == 200


class TestFunnel:
    def test_notify_creates_row_and_delivers(self, user, settings):
        settings.Q_CLUSTER = {**settings.Q_CLUSTER, "sync": True}
        notification = notify(
            user, "order_delivered", title="Delivery ready", body="Review it", url="/orders/1"
        )
        assert Notification.objects.filter(pk=notification.pk).exists()
        # sync mode executed deliver inline: email sent (default preference on)
        assert len(mail.outbox) >= 1
        notification.refresh_from_db()
        assert notification.emailed_at is not None

    def test_notify_many_and_unread_count(self, django_user_model, settings):
        settings.Q_CLUSTER = {**settings.Q_CLUSTER, "sync": True}
        a = django_user_model.objects.create_user(
            email="ntf-a@demo.local", password=PASSWORD, name="A"
        )
        b = django_user_model.objects.create_user(
            email="ntf-b@demo.local", password=PASSWORD, name="B"
        )
        notify_many([a, b], "offer_accepted", title="Accepted")
        assert unread_count(a) == 1 and unread_count(b) == 1

    def test_notify_requires_recipient(self):
        with pytest.raises(ValueError):
            notify(None, "order_delivered", title="x")


class TestPreferences:
    def test_default_email_on_and_mutable(self, user, settings):
        settings.Q_CLUSTER = {**settings.Q_CLUSTER, "sync": True}
        assert email_enabled(user.id, "order_delivered") is True
        set_preference(user, "orders", email_enabled=False)
        assert email_enabled(user.id, "order_delivered") is False
        mail.outbox.clear()
        notify(user, "order_delivered", title="Should not email")
        assert len(mail.outbox) == 0  # row created, email suppressed
        assert Notification.objects.filter(recipient=user, type="order_delivered").exists()

    def test_account_email_cannot_be_muted(self, user):
        from apps.core.exceptions import DomainError

        with pytest.raises(DomainError):
            set_preference(user, "account", email_enabled=False)
        assert email_enabled(user.id, "account_verify_email") is True

    def test_preferences_api_shape(self, user):
        prefs = preferences_for(user)
        categories = {p["category"] for p in prefs}
        assert "account" not in categories and "orders" in categories
        assert all(p["email_enabled"] is True for p in prefs)


class TestUnsubscribeToken:
    def test_token_roundtrip(self, user):
        from apps.notifications.models import resolve_unsubscribe_token, unsubscribe_token

        token = unsubscribe_token(user.id, "orders")
        resolved = resolve_unsubscribe_token(token)
        assert resolved == (user.id, "orders")
        assert resolve_unsubscribe_token("tampered") is None


class TestNotificationAPI:
    def test_list_read_and_read_all(self, client, user, settings):
        settings.Q_CLUSTER = {**settings.Q_CLUSTER, "sync": True}
        notify(user, "order_delivered", title="T1", url="/orders/1")
        notify(user, "offer_accepted", title="T2", url="/requests/x")
        _api_login(client, user)
        listing = client.get("/api/v1/me/notifications")
        body = listing.json()
        assert body["unread"] == 2 and len(body["results"]) == 2
        first_id = body["results"][0]["id"]
        marked = client.post(f"/api/v1/me/notifications/{first_id}/read")
        assert marked.json()["unread"] == 1
        cleared = client.post("/api/v1/me/notifications/read-all")
        assert cleared.status_code == 200
        assert client.get("/api/v1/me/notifications").json()["unread"] == 0

    def test_preferences_get_put(self, client, user):
        _api_login(client, user)
        current = client.get("/api/v1/me/notification-preferences").json()["results"]
        assert current
        response = client.put(
            "/api/v1/me/notification-preferences",
            data='{"category": "messages", "email_enabled": false}',
            content_type="application/json",
        )
        assert response.status_code == 200 and response.json()["email_enabled"] is False

    def test_stranger_notifications_isolated(self, client, user, django_user_model, settings):
        settings.Q_CLUSTER = {**settings.Q_CLUSTER, "sync": True}
        other = django_user_model.objects.create_user(
            email="ntf-o@demo.local", password=PASSWORD, name="O"
        )
        notify(other, "order_delivered", title="Not yours")
        _api_login(client, user)
        assert client.get("/api/v1/me/notifications").json()["unread"] == 0
