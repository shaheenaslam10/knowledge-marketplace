"""Development settings (default for manage.py)."""

from .base import *

DEBUG = env.bool("DEBUG", default=True)

ALLOWED_HOSTS = list(
    dict.fromkeys([*ALLOWED_HOSTS, "localhost", "127.0.0.1", "0.0.0.0", "backend", "testserver"])
)

# daphne must come before staticfiles so `runserver` serves ASGI (WebSockets work).
INSTALLED_APPS = ["daphne", *INSTALLED_APPS]

# Browsable API is useful in dev.
REST_FRAMEWORK = {
    **REST_FRAMEWORK,
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ],
}

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Relaxed dev-only password rules (seed/demo accounts).
AUTH_PASSWORD_VALIDATORS = []

# Manual-gateway dev self-confirm ("the transfer arrived") — NEVER production.
PAYMENT_DEV_SELF_CONFIRM = env.bool("PAYMENT_DEV_SELF_CONFIRM", default=True)
