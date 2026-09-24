"""Phase 8: one-click unsubscribe endpoint + prune command."""

from io import StringIO

import pytest
from django.core.management import call_command

from apps.notifications.models import Notification, unsubscribe_token
from apps.notifications.services import email_enabled, notify

pytestmark = pytest.mark.django_db


def _user(django_user_model, email="unsub@demo.local"):
    user = django_user_model.objects.create_user(email=email, password="long-pass-123", name="U")
    user.mark_email_verified()
    return user


class TestUnsubscribe:
    def test_unsubscribes_category(self, client, django_user_model, settings):
        settings.Q_CLUSTER = {**settings.Q_CLUSTER, "sync": True}
        user = _user(django_user_model)
        token = unsubscribe_token(user.id, "orders")
        response = client.get(f"/api/v1/unsubscribe?token={token}")
        assert response.status_code == 200
        assert email_enabled(user.id, "order_delivered") is False

    def test_account_token_is_protected(self, client, django_user_model):
        user = _user(django_user_model)
        token = unsubscribe_token(user.id, "account")
        response = client.get(f"/api/v1/unsubscribe?token={token}")
        assert response.status_code == 200
        assert email_enabled(user.id, "account_verify_email") is True

    def test_bad_token_rejected(self, client):
        response = client.get("/api/v1/unsubscribe?token=tampered-token")
        assert response.status_code == 400


class TestPrune:
    def test_prunes_old_notifications(self, django_user_model, settings):
        settings.Q_CLUSTER = {**settings.Q_CLUSTER, "sync": True}
        from datetime import timedelta

        from django.utils import timezone

        user = _user(django_user_model)
        old = notify(user, "order_delivered", title="old")
        Notification.objects.filter(pk=old.pk).update(
            created_at=timezone.now() - timedelta(days=120)
        )
        fresh = notify(user, "offer_accepted", title="fresh")
        out = StringIO()
        call_command("prune_notifications", days=90, stdout=out)
        assert not Notification.objects.filter(pk=old.pk).exists()
        assert Notification.objects.filter(pk=fresh.pk).exists()
        assert "pruned 1" in out.getvalue()
