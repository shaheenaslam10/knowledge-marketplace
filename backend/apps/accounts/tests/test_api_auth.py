"""End-to-end auth API tests: register/verify/login/refresh/logout/password flows,
envelope contracts, enumeration protection, throttling, WS compatibility."""

import pytest
from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache

User = get_user_model()

PASSWORD = "long-password-123"


@pytest.fixture
def user(db):
    return User.objects.create_user(email="priya@demo.local", password=PASSWORD, name="Priya")


@pytest.fixture
def verified_user(user):
    user.mark_email_verified()
    return user


def auth_client(client, user):
    """Login via API and keep the httpOnly cookies on the client."""
    response = client.post(
        "/api/v1/auth/token",
        {"email": user.email, "password": PASSWORD},
        content_type="application/json",
    )
    assert response.status_code == 200
    return client


class TestRegistration:
    def test_register_creates_account_and_queues_email(self, client, db):
        response = client.post(
            "/api/v1/auth/register",
            {"email": "New@Example.com", "name": "New User", "password": "strong-pass-123"},
            content_type="application/json",
        )
        assert response.status_code == 201
        body = response.json()
        assert body["user"]["email"] == "new@example.com"
        assert body["verification_required"] is True
        assert "password" not in body["user"]
        # tokens are cookie-only — never in the body
        assert "access" not in body and "refresh" not in body
        assert "hm_access" in response.cookies and "hm_refresh" in response.cookies
        assert len(mail.outbox) == 1 and "verify" in mail.outbox[0].subject.lower()

    def test_register_is_enumeration_safe(self, client, db):
        User.objects.create_user(
            email="taken@example.com", password="existing-pass-123", name="Taken"
        )
        response = client.post(
            "/api/v1/auth/register",
            {"email": "taken@example.com", "name": "Impostor", "password": "strong-pass-123"},
            content_type="application/json",
        )
        assert response.status_code == 201  # generic success — no oracle
        assert User.objects.filter(email="taken@example.com").count() == 1
        assert User.objects.get(email="taken@example.com").name == "Taken"  # original untouched

    def test_register_validates_password_length(self, client, db):
        response = client.post(
            "/api/v1/auth/register",
            {"email": "short@example.com", "name": "S", "password": "short"},
            content_type="application/json",
        )
        assert response.status_code == 400
        body = response.json()
        assert body["error"]["code"] == "validation_error"
        assert "password" in body["error"]["details"]

    def test_register_auto_login_token_works(self, client, db):
        client.post(
            "/api/v1/auth/register",
            {"email": "auto@example.com", "name": "Auto", "password": "strong-pass-123"},
            content_type="application/json",
        )
        me = client.get("/api/v1/me")
        assert me.status_code == 200
        assert me.json()["user"]["email"] == "auto@example.com"


class TestLoginLogout:
    def test_login_sets_cookies_and_roles(self, client, verified_user):
        response = client.post(
            "/api/v1/auth/token",
            {"email": verified_user.email, "password": PASSWORD},
            content_type="application/json",
        )
        assert response.status_code == 200
        payload = response.json()["user"]
        assert payload["roles"]["student"] is True
        assert payload["email_verified"] is True

    def test_invalid_credentials_generic(self, client, verified_user):
        response = client.post(
            "/api/v1/auth/token",
            {"email": verified_user.email, "password": "wrong-password"},
            content_type="application/json",
        )
        assert response.status_code == 401
        assert response.json()["error"]["code"] == "invalid_credentials"

    def test_login_records_ip(self, client, verified_user):
        client.post(
            "/api/v1/auth/token",
            {"email": verified_user.email, "password": PASSWORD},
            content_type="application/json",
        )
        verified_user.refresh_from_db()
        assert verified_user.last_login_ip == "127.0.0.1"

    def test_logout_blacklists_refresh_and_clears_cookies(self, client, verified_user):
        auth_client(client, verified_user)
        refresh = client.cookies["hm_refresh"].value
        response = client.post("/api/v1/auth/logout", content_type="application/json")
        assert response.status_code == 200
        # rotated refresh is now blacklisted → reuse fails
        reuse = client.post(
            "/api/v1/auth/token/refresh", {"refresh": refresh}, content_type="application/json"
        )
        assert reuse.status_code == 401
        # cookies cleared
        assert client.cookies["hm_access"].value == ""


class TestRefresh:
    def test_refresh_rotates_and_blacklists(self, client, verified_user):
        auth_client(client, verified_user)
        old_refresh = client.cookies["hm_refresh"].value
        response = client.post("/api/v1/auth/token/refresh", content_type="application/json")
        assert response.status_code == 200
        new_refresh = response.cookies["hm_refresh"].value
        assert new_refresh != old_refresh
        # old refresh reused (body, cookie dropped — cookie-first policy) → 401
        del client.cookies["hm_refresh"]
        response = client.post(
            "/api/v1/auth/token/refresh", {"refresh": old_refresh}, content_type="application/json"
        )
        assert response.status_code == 401
        assert response.json()["error"]["code"] == "token_invalid"

    def test_refresh_requires_token(self, client, db):
        response = client.post("/api/v1/auth/token/refresh", content_type="application/json")
        assert response.status_code == 401

    def test_refresh_rejects_inactive_user(self, client, verified_user):
        auth_client(client, verified_user)
        verified_user.is_active = False
        verified_user.save()
        response = client.post("/api/v1/auth/token/refresh", content_type="application/json")
        assert response.status_code == 401


class TestMeAndAccountState:
    def test_me_requires_authentication(self, client, db):
        response = client.get("/api/v1/me")
        assert response.status_code == 401
        assert response.json()["error"]["code"] == "not_authenticated"

    def test_me_returns_profile_and_roles(self, client, verified_user):
        auth_client(client, verified_user)
        response = client.get("/api/v1/me")
        assert response.status_code == 200
        assert response.json()["user"]["email"] == verified_user.email

    def test_patch_me_is_owner_scoped(self, client, verified_user):
        auth_client(client, verified_user)
        response = client.patch(
            "/api/v1/me",
            {"name": "Priya P.", "timezone": "Asia/Karachi"},
            content_type="application/json",
        )
        assert response.status_code == 200
        assert response.json()["user"]["name"] == "Priya P."
        verified_user.refresh_from_db()
        assert verified_user.timezone == "Asia/Karachi"

    def test_access_token_rejected_after_deactivation(self, client, verified_user):
        auth_client(client, verified_user)
        verified_user.is_active = False
        verified_user.save()
        response = client.get("/api/v1/me")
        assert response.status_code == 401  # per-request is_active enforcement

    def test_deactivate_self(self, client, verified_user):
        auth_client(client, verified_user)
        response = client.post("/api/v1/me/deactivate", content_type="application/json")
        assert response.status_code == 200
        verified_user.refresh_from_db()
        assert verified_user.is_active is False
        # refresh no longer usable
        response = client.post("/api/v1/auth/token/refresh", content_type="application/json")
        assert response.status_code in (401, 400)


class TestEmailVerification:
    def test_verify_with_token_from_email(self, client, db):
        response = client.post(
            "/api/v1/auth/register",
            {"email": "verify@example.com", "name": "Verify", "password": "strong-pass-123"},
            content_type="application/json",
        )
        # the console/locmem backend captured the email; extract the token from the link
        body = mail.outbox[0].body
        token = body.split("token=")[1].split("\n")[0].strip()
        response = client.post(
            "/api/v1/auth/verify-email", {"token": token}, content_type="application/json"
        )
        assert response.status_code == 200
        assert User.objects.get(email="verify@example.com").is_verified

    def test_verify_with_invalid_token(self, client, db):
        response = client.post(
            "/api/v1/auth/verify-email", {"token": "junk"}, content_type="application/json"
        )
        assert response.status_code == 400
        assert response.json()["error"]["code"] == "verification_failed"

    def test_resend_requires_auth(self, client, user):
        response = client.post("/api/v1/auth/resend-verification", content_type="application/json")
        assert response.status_code == 401
        auth_client(client, user)
        response = client.post("/api/v1/auth/resend-verification", content_type="application/json")
        assert response.status_code == 200
        assert len(mail.outbox) == 1  # verification email re-sent


class TestPasswordResetAndChange:
    def test_reset_request_is_enumeration_safe(self, client, verified_user):
        response = client.post(
            "/api/v1/auth/password/reset",
            {"email": "ghost@nowhere.io"},
            content_type="application/json",
        )
        assert response.status_code == 200
        assert len(mail.outbox) == 0
        response = client.post(
            "/api/v1/auth/password/reset",
            {"email": verified_user.email},
            content_type="application/json",
        )
        assert response.status_code == 200
        assert len(mail.outbox) == 1
        # identical generic payload whether or not the account exists
        missing = client.post(
            "/api/v1/auth/password/reset",
            {"email": "ghost@nowhere.io"},
            content_type="application/json",
        )
        assert response.json() == missing.json()

    def test_reset_confirm_flow(self, client, verified_user):
        auth_client(client, verified_user)
        old_refresh = client.cookies["hm_refresh"].value
        from apps.accounts.services import password_reset_context

        ctx = password_reset_context(verified_user)
        response = client.post(
            "/api/v1/auth/password/reset/confirm",
            {"uid": ctx["uidb64"], "token": ctx["token"], "password": "brand-new-pass-99"},
            content_type="application/json",
        )
        assert response.status_code == 200
        verified_user.refresh_from_db()
        assert verified_user.check_password("brand-new-pass-99")
        # all sessions were killed: pre-reset refresh must be dead
        response = client.post(
            "/api/v1/auth/token/refresh", {"refresh": old_refresh}, content_type="application/json"
        )
        assert response.status_code == 401
        # reset token is single-use
        response = client.post(
            "/api/v1/auth/password/reset/confirm",
            {"uid": ctx["uidb64"], "token": ctx["token"], "password": "another-pass-1234"},
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_reset_confirm_rejects_weak_password(self, client, verified_user):
        from apps.accounts.services import password_reset_context

        ctx = password_reset_context(verified_user)
        response = client.post(
            "/api/v1/auth/password/reset/confirm",
            {"uid": ctx["uidb64"], "token": ctx["token"], "password": "short"},
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_password_change_kills_sessions(self, client, verified_user):
        auth_client(client, verified_user)
        old_refresh = client.cookies["hm_refresh"].value
        wrong = client.post(
            "/api/v1/auth/password/change",
            {"current_password": "nope-wrong-pass", "password": "changed-pass-99"},
            content_type="application/json",
        )
        assert wrong.status_code == 400
        good = client.post(
            "/api/v1/auth/password/change",
            {"current_password": PASSWORD, "password": "changed-pass-99"},
            content_type="application/json",
        )
        assert good.status_code == 200
        verified_user.refresh_from_db()
        assert verified_user.check_password("changed-pass-99")
        response = client.post(
            "/api/v1/auth/token/refresh", {"refresh": old_refresh}, content_type="application/json"
        )
        assert response.status_code == 401


class TestThrottling:
    def test_auth_scope_rate_limit(self, client, db, monkeypatch):
        """The `auth` throttle scope fires on the auth endpoints.

        DRF binds both `APIView.throttle_classes` and
        `SimpleRateThrottle.THROTTLE_RATES` at import time, so we patch the
        views and the rate table directly instead of override_settings.
        """
        from rest_framework.throttling import ScopedRateThrottle, SimpleRateThrottle

        from apps.accounts.api import views as auth_views

        for view in (
            auth_views.RegisterView,
            auth_views.LoginView,
            auth_views.RefreshView,
            auth_views.LogoutView,
            auth_views.VerifyEmailView,
            auth_views.ResendVerificationView,
            auth_views.PasswordResetRequestView,
            auth_views.PasswordResetConfirmView,
            auth_views.PasswordChangeView,
        ):
            monkeypatch.setattr(view, "throttle_classes", [ScopedRateThrottle])
        monkeypatch.setitem(SimpleRateThrottle.THROTTLE_RATES, "auth", "3/min")

        cache.clear()
        codes = []
        for i in range(5):
            response = client.post(
                "/api/v1/auth/token",
                {"email": f"u{i}@x.io", "password": "irrelevant-pass"},
                content_type="application/json",
            )
            codes.append(response.status_code)
        assert 429 in codes
        assert codes[-1] == 429  # stays throttled
