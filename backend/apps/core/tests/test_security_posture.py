"""Phase 11 security posture (audit F-1/F-2): production settings and
security-header behavior are locked by tests, not conventions.

- Settings-posture tests execute `config/settings/prod.py` for real (patched
  env) and assert the shipped defaults.
- Middleware tests exercise `SecurityHeadersMiddleware` directly.
"""

import importlib
import os
from unittest import mock

import pytest
from django.conf import Settings
from django.http import HttpResponse
from django.test import RequestFactory, override_settings

from apps.core.middleware import SecurityHeadersMiddleware

PROD_SETTINGS_MODULE = "config.settings.prod"


def _evict() -> None:
    """Drop the settings modules so the next import re-executes them."""
    import sys

    for name in ("config.settings.prod", "config.settings.base"):
        sys.modules.pop(name, None)


def _load_prod_settings(overrides: dict | None = None) -> Settings:
    """Execute the real prod settings module with minimal required env.

    sys.modules eviction forces a fresh module execution per call — env
    changes must actually re-run the settings code, not hit the import cache.
    """
    _evict()
    env = {
        "SECRET_KEY": "x" * 50,
        "ALLOWED_HOSTS": "api.example.com",
        "DATABASE_URL": "postgres://u:p@localhost:5432/db",
        "REDIS_URL": "",
        **(overrides or {}),
    }
    with mock.patch.dict(os.environ, env):
        settings = Settings(PROD_SETTINGS_MODULE)
    return settings


class TestProdSettingsPosture:
    def test_auth_cookies_are_secure_in_prod(self):
        settings = _load_prod_settings()
        assert settings.COOKIE_SECURE is True  # audit F-1
        assert settings.SESSION_COOKIE_SECURE is True
        assert settings.CSRF_COOKIE_SECURE is True
        assert settings.SESSION_COOKIE_HTTPONLY is True

    def test_transport_hardening_defaults(self):
        settings = _load_prod_settings()
        assert settings.SECURE_HSTS_SECONDS >= 31536000
        assert settings.SECURE_HSTS_INCLUDE_SUBDOMAINS is True
        assert settings.SECURE_HSTS_PRELOAD is True
        assert settings.SECURE_SSL_REDIRECT is True
        assert settings.SECURE_PROXY_SSL_HEADER == ("HTTP_X_FORWARDED_PROTO", "https")
        assert settings.SECURE_REFERRER_POLICY == "strict-origin-when-cross-origin"
        assert settings.SECURE_CROSS_ORIGIN_OPENER_POLICY == "same-origin"
        assert settings.X_FRAME_OPTIONS == "DENY"
        assert settings.SECURE_CONTENT_TYPE_NOSNIFF is True

    def test_missing_required_env_boots_fail_closed(self):
        _evict()
        with mock.patch.dict(os.environ, {"SECRET_KEY": "", "DATABASE_URL": ""}, clear=False):
            with pytest.raises(RuntimeError, match="Missing required production env"):
                Settings(PROD_SETTINGS_MODULE)

    def test_debug_off_and_admin_path_env(self):
        settings = _load_prod_settings({"ADMIN_URL": "hidden-backoffice/"})
        assert settings.DEBUG is False
        assert settings.ADMIN_URL == "hidden-backoffice/"

    def test_security_headers_middleware_is_wired_in_prod(self):
        settings = _load_prod_settings()
        assert "apps.core.middleware.SecurityHeadersMiddleware" in settings.MIDDLEWARE


class TestSecurityHeadersMiddleware:
    def _response(self, path="/api/v1/ops/kpis"):
        request = RequestFactory().get(path)
        return SecurityHeadersMiddleware(lambda req: HttpResponse("ok"))(request)

    @override_settings(
        SECURITY_HEADERS_CSP="default-src 'self'; frame-ancestors 'none'",
        SECURITY_HEADERS_CSP_REPORT_ONLY=True,
        SECURITY_HEADERS_PERMISSIONS_POLICY="camera=(), microphone=()",
        ADMIN_URL="admin/",
    )
    def test_report_only_csp_and_permissions_policy(self):
        response = self._response()
        assert (
            response["Content-Security-Policy-Report-Only"]
            == "default-src 'self'; frame-ancestors 'none'"
        )
        assert "Content-Security-Policy" not in response
        assert response["Permissions-Policy"] == "camera=(), microphone=()"

    @override_settings(
        SECURITY_HEADERS_CSP="default-src 'self'",
        SECURITY_HEADERS_CSP_REPORT_ONLY=False,
        SECURITY_HEADERS_PERMISSIONS_POLICY="camera=()",
        ADMIN_URL="admin/",
    )
    def test_enforced_csp_when_report_only_disabled(self):
        response = self._response()
        assert response["Content-Security-Policy"] == "default-src 'self'"
        assert "Content-Security-Policy-Report-Only" not in response

    @override_settings(
        SECURITY_HEADERS_CSP="default-src 'self'",
        SECURITY_HEADERS_CSP_REPORT_ONLY=False,
        SECURITY_HEADERS_PERMISSIONS_POLICY="camera=()",
        ADMIN_URL="hidden-admin/",
    )
    def test_admin_path_exempt_from_csp(self):
        # django.contrib.admin relies on inline handlers; CSP would break it.
        response = self._response("/hidden-admin/login/")
        assert "Content-Security-Policy" not in response
        assert response["Permissions-Policy"] == "camera=()"  # still applied

    @override_settings(SECURITY_HEADERS_CSP="", SECURITY_HEADERS_PERMISSIONS_POLICY="")
    def test_no_headers_when_unconfigured(self):
        response = self._response()
        assert "Content-Security-Policy" not in response
        assert "Permissions-Policy" not in response


def test_prod_settings_module_importable_standalone():
    """Guards against import-time drift (e.g. new required env without docs)."""
    module = importlib.import_module(PROD_SETTINGS_MODULE)
    assert module is not None
