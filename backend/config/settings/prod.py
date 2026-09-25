"""Production settings — fail-closed, secure defaults.

Secrets/hosts come from the environment; missing critical values raise at boot
rather than degrade silently. Deploy architecture: docs/architecture/deployment.md
"""

from .base import *

DEBUG = False

_required = ["SECRET_KEY", "ALLOWED_HOSTS", "DATABASE_URL"]
_missing = [k for k in _required if not env.str(k, default="")]
if _missing:
    raise RuntimeError(f"Missing required production env vars: {', '.join(_missing)}")

SECRET_KEY = env.str("SECRET_KEY")
ALLOWED_HOSTS = [h.strip() for h in env.str("ALLOWED_HOSTS").split(",") if h.strip()]
CSRF_TRUSTED_ORIGINS = [
    o.strip()
    for o in env.str("CSRF_TRUSTED_ORIGINS", default=f"{FRONTEND_URL},{BACKEND_URL}").split(",")
    if o.strip()
]

# TLS is terminated by the reverse proxy (Caddy) — docs/architecture/deployment.md
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=True)
SECURE_HSTS_SECONDS = env.int("SECURE_HSTS_SECONDS", default=31536000)
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
COOKIE_SECURE = env.bool("COOKIE_SECURE", default=True)  # auth cookies (audit F-1)
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
SECURE_CROSS_ORIGIN_OPENER_POLICY = "same-origin"

# Security headers (audit F-2): CSP report-only first (env flips to enforce
# after the Phase 12 pre-launch sweep); admin path exempted (inline handlers).
SECURITY_HEADERS_CSP = env.str(
    "CSP",
    default=(
        "default-src 'self'; img-src 'self' data:; font-src 'self' data:; "
        "style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; "
        "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'"
    ),
)
SECURITY_HEADERS_CSP_REPORT_ONLY = env.bool("CSP_REPORT_ONLY", default=True)
SECURITY_HEADERS_PERMISSIONS_POLICY = env.str(
    "PERMISSIONS_POLICY",
    default="camera=(), microphone=(), geolocation=(), payment=(), usb=()",
)

MIDDLEWARE = MIDDLEWARE + ["apps.core.middleware.SecurityHeadersMiddleware"]

LOGGING = {
    **LOGGING,
    "handlers": {
        **LOGGING["handlers"],
        "console_json": {
            "class": "logging.StreamHandler",
            "filters": ["request_id"],
            "formatter": "json",
        },
    },
    "root": {"handlers": ["console_json"], "level": env.str("LOG_LEVEL", default="INFO")},
}

# Static files with manifest storage (collectstatic runs at deploy).
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.ManifestStaticFilesStorage"},
}
