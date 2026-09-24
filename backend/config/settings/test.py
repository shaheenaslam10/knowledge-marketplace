"""Test settings.

Tests run against a real PostgreSQL instance (same engine as production —
no sqlite divergence). DATABASE_URL points at the test database; pytest-django
creates/destroys the schema per session.
"""

from .base import *

DEBUG = False

DATABASES = {
    "default": env.db(
        "DATABASE_URL",
        default="postgres://hem:hem@127.0.0.1:5432/hem_test",
    )
}

# django-q2 synchronous mode: enqueued tasks execute inline in tests.
Q_CLUSTER = {**Q_CLUSTER, "sync": True, "workers": 0}

# Fast password hashing for tests only.
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

# Deterministic throttling in tests (rate-limit behaviour has its own dedicated tests later).
REST_FRAMEWORK = {
    **REST_FRAMEWORK,
    "DEFAULT_THROTTLE_CLASSES": [],
}

EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

LOGGING = {**LOGGING, "root": {**LOGGING["root"], "level": "WARNING"}}

# Payment self-confirmation is a dev-only affordance; tests opt in explicitly.
PAYMENT_DEV_SELF_CONFIRM = False
