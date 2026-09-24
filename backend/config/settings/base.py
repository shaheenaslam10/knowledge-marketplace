"""Base settings — shared across environments.

Environment selection: DJANGO_SETTINGS_MODULE (see settings/{dev,test,prod}.py).
All deployment-specific values come from environment variables (12-factor).
Canonical variable list: /.env.example and docs/architecture/environments.md
(CI checks that the two stay in sync — scripts/check_env_docs.py).
"""

from datetime import timedelta
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent.parent  # backend/

# Local dev convenience: load ../.env (repo root) if present. Existing process
# environment always wins (overwrite=False), so Docker/systemd env is authoritative.
env = environ.Env()
environ.Env.read_env(BASE_DIR.parent / ".env", overwrite=False)

# --- Core Django ---
SECRET_KEY = env.str("SECRET_KEY", default="dev-only-insecure-key-change-me")
DEBUG = env.bool("DEBUG", default=False)
ALLOWED_HOSTS = [
    h.strip()
    for h in env.str("ALLOWED_HOSTS", default="localhost,127.0.0.1").split(",")
    if h.strip()
]
APP_VERSION = env.str("APP_VERSION", default="0.1.0")

# --- Applications ---
# NOTE: `accounts` (custom user) lands in Phase 2; until then Django's default
# user model is used deliberately — swapping AUTH_USER_MODEL must happen before
# the first real migration, which Phase 2 guarantees.
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]
THIRD_PARTY_APPS = [
    "rest_framework",
    "django_filters",
    "drf_spectacular",
    "corsheaders",
    "channels",
    "django_q",  # database-backed task queue (ORM broker) + scheduler admin
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",  # refresh rotation + logout invalidation
]
LOCAL_APPS = [
    "apps.core",
    "apps.audit",  # sidecar: append-only audit log (Phase 3)
    "apps.files",  # sidecar: attachments + secure access (Phase 3)
    "apps.taxonomy",  # shared subjects/skills/categories (Phase 3)
    "apps.accounts",  # Phase 2: custom user, auth, roles, StudentProfile
    "apps.experts",  # Phase 3: application, profile, directory
    "apps.service_requests",  # Phase 4: student briefs + lifecycle
    "apps.assignments",  # Phase 5: managed pool invitations + direct assignments
    "apps.bidding",  # Phase 4: offers + transactional selection
    "apps.orders",  # Phase 4: order anchor (awaiting_payment only)
    "apps.payments",  # Phase 1: gateway interface only
    "apps.messaging",  # Phase 8: threads, receipts, WS transport
    "apps.reviews",  # Phase 9: reviews + weighted reputation
    "apps.disputes",  # Phase 9: dispute lifecycle + payout freeze
    "apps.notifications",  # Phase 8: inbox, preferences, fan-out
    "apps.seed",  # top layer: demo data (accounts cannot import domain apps)
]
INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# Custom user (ADR-0001): email-based, single identity, roles as state.
AUTH_USER_MODEL = "accounts.User"

# Argon2id first (docs/architecture/security.md); others for legacy fallback only.
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher",
    "django.contrib.auth.hashers.ScryptPasswordHasher",
]

# --- JWT sessions (ADR-0004 / docs/architecture/authentication.md) ---
# Tokens travel ONLY in httpOnly cookies (hm_access / hm_refresh) set by the
# auth views; the browser never sees them in JS-readable storage.
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=env.int("JWT_ACCESS_MINUTES", default=15)),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=env.int("JWT_REFRESH_DAYS", default=7)),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# --- Middleware ---
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "apps.core.middleware.RequestIDMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# --- Database (PostgreSQL only — the single source of truth) ---
DATABASES = {
    "default": env.db(
        "DATABASE_URL",
        default="postgres://hem:hem@127.0.0.1:5432/hem",
    ),
}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- Internationalization ---
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# --- Static / media ---
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "django-static"
MEDIA_ROOT = env.str("MEDIA_ROOT", default=str(BASE_DIR.parent / "var" / "media"))

# --- Storage backend (local default in dev/CI; R2/S3-compatible in staging/prod) ---
# docs/architecture/files-storage.md: switching is an env change, zero code.
FILE_STORAGE = env.str("FILE_STORAGE", default="local")
R2_PRESIGN_TTL_SECONDS = env.int("R2_PRESIGN_TTL_SECONDS", default=300)


def build_storages(settings_module) -> dict:
    """Storage map by FILE_STORAGE env — local FileSystemStorage (default) or
    a private R2/S3 bucket via django-storages (presign s3v4, path style)."""
    storages = {
        "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
        "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
    }
    if settings_module.FILE_STORAGE == "r2":
        storages["default"] = {
            "BACKEND": "storages.backends.s3.S3Storage",
            "OPTIONS": {
                "bucket_name": settings_module.R2_BUCKET,
                "endpoint_url": getattr(
                    settings_module,
                    "R2_ENDPOINT_URL",
                    f"https://{settings_module.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
                ),
                "access_key": settings_module.R2_ACCESS_KEY,
                "secret_key": settings_module.R2_SECRET_KEY,
                "region_name": getattr(settings_module, "R2_REGION", "auto"),
                "config": {"signature_version": "s3v4", "s3": {"addressing_style": "path"}},
                "default_acl": "private",
                "file_overwrite": False,
            },
        }
    return storages


class _R2SettingsProbe:
    """Reads just the storage-related envs for build_storages()."""

    R2_ENDPOINT_URL = env.str("R2_ENDPOINT_URL", default=None)
    R2_REGION = env.str("R2_REGION", default="auto")
    FILE_STORAGE = FILE_STORAGE
    R2_BUCKET = env.str("R2_BUCKET", default="")
    R2_ACCOUNT_ID = env.str("R2_ACCOUNT_ID", default="")
    R2_ACCESS_KEY = env.str("R2_ACCESS_KEY", default="")
    R2_SECRET_KEY = env.str("R2_SECRET_KEY", default="")


STORAGES = build_storages(_R2SettingsProbe)

# --- URLs & security ---
ADMIN_URL = env.str("ADMIN_URL", default="admin/")
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 10},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]
# Password reset links stay valid for 3 days (docs/architecture/authentication.md).
PASSWORD_RESET_TIMEOUT = 60 * 60 * 24 * 3

X_FRAME_OPTIONS = "DENY"
SECURE_CONTENT_TYPE_NOSNIFF = True
SESSION_COOKIE_HTTPONLY = True

# --- CORS / origins ---
FRONTEND_URL = env.str("FRONTEND_URL", default="http://localhost:3000")
BACKEND_URL = env.str("BACKEND_URL", default="http://localhost:8000")
CORS_ALLOWED_ORIGINS = [
    o.strip() for o in env.str("CORS_ALLOWED_ORIGINS", default=FRONTEND_URL).split(",") if o.strip()
]
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = [
    o.strip()
    for o in env.str("CSRF_TRUSTED_ORIGINS", default=f"{FRONTEND_URL},{BACKEND_URL}").split(",")
    if o.strip()
]

# --- DRF ---
REST_FRAMEWORK = {
    # Deny-by-default: endpoints opt into AllowAny explicitly (docs/product/user-roles.md).
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    # Cookie-first for the browser; Bearer still accepted (scripts/tests).
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "apps.accounts.authentication.CookieJWTAuthentication",
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "apps.core.exceptions.drf_exception_handler",
    "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.DefaultCursorPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
        "rest_framework.throttling.ScopedRateThrottle",  # applies where a view sets throttle_scope (auth)
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": env.str("THROTTLE_ANON", default="30/min"),
        "user": env.str("THROTTLE_USER", default="120/min"),
        "auth": env.str("THROTTLE_AUTH", default="10/min"),  # login/register/reset/refresh guard
    },
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
        "rest_framework.parsers.MultiPartParser",
        "rest_framework.parsers.FormParser",
    ],
}

# --- OpenAPI (contract source of truth for the frontend client) ---
SPECTACULAR_SETTINGS = {
    "TITLE": "Hybrid Expert Marketplace API",
    "VERSION": APP_VERSION,
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
    "SCHEMA_PATH_PREFIX": "/api/v1",
}

# --- Realtime foundation (Django Channels) ---
# In-memory channel layer is valid ONLY while a single ASGI process runs
# (documented constraint). Scale-out = swap to the Redis layer, settings-only.
CHANNEL_LAYERS = {"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}}

# --- Background jobs: django-q2 with the ORM (Postgres) broker. No Redis. ---
Q_CLUSTER = {
    "name": "hem",
    "workers": env.int("WORKERS", default=4),
    "timeout": env.int("Q_TIMEOUT", default=300),
    # django-q2 requires retry > timeout (retry = when a stuck task is re-queued).
    "retry": env.int("Q_RETRY", default=360),
    "max_attempts": env.int("Q_MAX_ATTEMPTS", default=3),
    "recycle": 500,
    "broker_class": "django_q.brokers.orm.ORM",
    "orm": "default",
    "admin": True,
    "catch_up": False,
}

# --- Email (ADR-0011 adapter: console dev / SMTP / Brevo API — no new deps) ---
EMAIL_BACKEND_MODE = env.str("EMAIL_BACKEND_MODE", default="console")  # console|smtp|brevo
EMAIL_HOST = env.str("EMAIL_HOST", default="")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_HOST_USER = env.str("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env.str("EMAIL_HOST_PASSWORD", default="")
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
BREVO_API_KEY = env.str("BREVO_API_KEY", default="")
if EMAIL_BACKEND_MODE == "smtp":
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
elif EMAIL_BACKEND_MODE == "brevo":
    EMAIL_BACKEND = "config.email_backend.BrevoEmailBackend"
else:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
DEFAULT_FROM_EMAIL = env.str("DEFAULT_FROM_EMAIL", default="no-reply@localhost")

# --- Payments (ADR-0005: interface Phase 1, domain shipped Phase 7 — see apps/payments + docs/workflows/payments.md) ---
PAYMENT_GATEWAY = env.str("PAYMENT_GATEWAY", default="manual")
MANUAL_PAYMENT_INSTRUCTIONS = env.str(
    "MANUAL_PAYMENT_INSTRUCTIONS",
    default=(
        "Transfer the exact amount to the platform account; then submit the payment reference "
        "on the order page. An operator confirms receipt before work starts."
    ),
)
MANUAL_WEBHOOK_SECRET = env.str(
    "MANUAL_WEBHOOK_SECRET", default="dev-only-webhook-secret"
)  # simulated webhooks only

STRIPE_SECRET_KEY = env.str("STRIPE_SECRET_KEY", default="")  # unused until StripeGateway activates
STRIPE_WEBHOOK_SECRET = env.str("STRIPE_WEBHOOK_SECRET", default="")
STRIPE_API_COUNTRY = env.str("STRIPE_API_COUNTRY", default="US")

# --- Feature flags ---
FEATURE_MANAGED_SERVICE = env.bool("FEATURE_MANAGED_SERVICE", default=True)

# --- Logging (structured; request-id correlated; see docs/architecture/observability.md) ---
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "filters": {
        "request_id": {"()": "apps.core.middleware.RequestIDFilter"},
    },
    "formatters": {
        "json": {
            "()": "pythonjsonlogger.json.JsonFormatter",
            "format": "%(asctime)s %(levelname)s %(name)s %(message)s",
            "rename_fields": {"asctime": "ts", "levelname": "level", "name": "logger"},
        },
        "plain": {"format": "%(asctime)s %(levelname)-7s %(name)s %(message)s"},
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "filters": ["request_id"],
            "formatter": "plain",
        },
    },
    "root": {"handlers": ["console"], "level": env.str("LOG_LEVEL", default="INFO")},
    "loggers": {
        "django.db.backends": {"level": "WARNING", "propagate": True},
        "django_q": {"level": "INFO", "propagate": True},
    },
}
