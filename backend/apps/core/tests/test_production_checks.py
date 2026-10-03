"""Phase 12: the production safety checks must actually catch the mistakes.

A check suite that is never exercised is decoration. Each test here asserts a
specific misconfiguration is refused, and the first test asserts the whole
suite stays silent outside a deployment so local/CI runs are unaffected.
"""

from __future__ import annotations

import pytest
from django.core.checks import Error
from django.test import override_settings

from apps.core.checks import check_production_safety

SAFE = dict(
    DEPLOY_ENV="production",
    SECRET_KEY="x" * 64,
    DEBUG=False,
    ALLOWED_HOSTS=["api.example.com"],
    COOKIE_SECURE=True,
    SESSION_COOKIE_SECURE=True,
    CSRF_COOKIE_SECURE=True,
    FRONTEND_URL="https://app.example.com",
    BACKEND_URL="https://api.example.com",
    SECURITY_HEADERS_CSP_REPORT_ONLY=False,
    PAYMENT_DEV_SELF_CONFIRM=False,
    PAYMENT_GATEWAY="manual",
    MANUAL_WEBHOOK_SECRET="a-real-random-secret",
    MANUAL_PAYMENT_INSTRUCTIONS="Transfer to the platform account.",
    EMAIL_BACKEND_MODE="brevo",
    FILE_STORAGE="r2",
    ADMIN_URL="ops-8fj2/",
)


def ids(result) -> set[str]:
    return {issue.id for issue in result}


def run(**overrides):
    with override_settings(**{**SAFE, **overrides}):
        return check_production_safety(None)


class TestInertOutsideDeployments:
    @pytest.mark.parametrize("env_name", ["local", "ci", ""])
    def test_no_findings_when_not_deployed(self, env_name):
        # Everything is wrong on purpose; DEPLOY_ENV says this is not a deployment.
        result = run(
            DEPLOY_ENV=env_name,
            SECRET_KEY="dev-only-insecure-key-change-me",
            DEBUG=True,
            COOKIE_SECURE=False,
            EMAIL_BACKEND_MODE="console",
        )
        assert result == []

    def test_a_clean_production_config_passes(self):
        assert run() == []

    def test_staging_is_also_checked(self):
        assert run(DEPLOY_ENV="staging", DEBUG=True) != []


class TestSecrets:
    def test_dev_secret_key_is_an_error(self):
        result = run(SECRET_KEY="dev-only-insecure-key-change-me")
        assert "hem.E001" in ids(result)
        assert all(isinstance(i, Error) for i in result)

    def test_short_secret_key_warns(self):
        assert "hem.W001" in ids(run(SECRET_KEY="short-but-not-the-default"))


class TestTransportAndHosts:
    def test_debug_true_is_an_error(self):
        assert "hem.E002" in ids(run(DEBUG=True))

    def test_wildcard_allowed_hosts_is_an_error(self):
        assert "hem.E003" in ids(run(ALLOWED_HOSTS=["*"]))

    def test_empty_allowed_hosts_is_an_error(self):
        assert "hem.E004" in ids(run(ALLOWED_HOSTS=[]))

    def test_insecure_auth_cookie_is_an_error(self):
        assert "hem.E005" in ids(run(COOKIE_SECURE=False))

    def test_insecure_session_or_csrf_cookie_is_an_error(self):
        assert "hem.E006" in ids(run(SESSION_COOKIE_SECURE=False))
        assert "hem.E006" in ids(run(CSRF_COOKIE_SECURE=False))

    def test_plaintext_origin_warns(self):
        assert "hem.W002" in ids(run(FRONTEND_URL="http://app.example.com"))


class TestContentSecurityPolicy:
    def test_report_only_csp_warns(self):
        assert "hem.W003" in ids(run(SECURITY_HEADERS_CSP_REPORT_ONLY=True))


class TestPayments:
    def test_dev_self_confirm_is_an_error(self):
        """The single worst one: a student could mark their own payment received."""
        result = run(PAYMENT_DEV_SELF_CONFIRM=True)
        assert "hem.E007" in ids(result)

    def test_default_manual_webhook_secret_is_an_error(self):
        assert "hem.E008" in ids(run(MANUAL_WEBHOOK_SECRET="dev-only-webhook-secret"))

    def test_empty_manual_instructions_warn(self):
        assert "hem.W004" in ids(run(MANUAL_PAYMENT_INSTRUCTIONS="   "))

    def test_stripe_without_credentials_is_an_error(self):
        result = run(PAYMENT_GATEWAY="stripe", STRIPE_SECRET_KEY="", STRIPE_WEBHOOK_SECRET="")
        assert "hem.E009" in ids(result)

    def test_stripe_with_credentials_passes(self):
        result = run(
            PAYMENT_GATEWAY="stripe",
            STRIPE_SECRET_KEY="sk_live_x",
            STRIPE_WEBHOOK_SECRET="whsec_x",
        )
        assert "hem.E009" not in ids(result)

    def test_manual_secret_check_does_not_apply_to_stripe(self):
        result = run(
            PAYMENT_GATEWAY="stripe",
            STRIPE_SECRET_KEY="sk_live_x",
            STRIPE_WEBHOOK_SECRET="whsec_x",
            MANUAL_WEBHOOK_SECRET="dev-only-webhook-secret",
        )
        assert "hem.E008" not in ids(result)


class TestEmailAndStorage:
    def test_console_email_is_an_error(self):
        """Console email in production means nobody can verify or reset."""
        assert "hem.E010" in ids(run(EMAIL_BACKEND_MODE="console"))

    def test_local_storage_is_an_error_in_production(self):
        assert "hem.E011" in ids(run(FILE_STORAGE="local"))

    def test_local_storage_is_only_a_warning_in_staging(self):
        result = run(DEPLOY_ENV="staging", FILE_STORAGE="local")
        assert "hem.W005" in ids(result)
        assert "hem.E011" not in ids(result)


class TestAdminSurface:
    def test_default_admin_url_warns(self):
        assert "hem.W006" in ids(run(ADMIN_URL="admin/"))


class TestSeedGuard:
    def test_seed_allowed_in_production_is_an_error(self):
        assert "hem.E012" in ids(run(SEED_ALLOWED=True))
