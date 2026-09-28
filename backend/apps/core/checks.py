"""Production safety checks (Phase 12).

Runs through Django's system-check framework under the `production` tag, so a
deploy can gate on `manage.py check --tag production --fail-level WARNING`
before it swaps traffic. The point is narrow and deliberate: catch the
configuration mistakes that are individually survivable in development and
individually catastrophic in production — a dev secret key, console email, a
self-confirm payment affordance, cookies without Secure, files on ephemeral
container disk.

These checks are inert unless `DEPLOY_ENV` says the process is a real
deployment (`staging` or `production`). `prod.py` is loaded by both, so the
settings module alone cannot tell them apart — see ADR-0016.

Severity contract:
- Error   -> refuses to deploy. A real security or data-loss defect.
- Warning -> refuses to deploy under `--fail-level WARNING` (what deploy.sh
             uses), but stays overridable for a deliberate staging setup.
"""

from __future__ import annotations

from django.conf import settings
from django.core.checks import Error, Warning, register

# Values shipped as development defaults. If any of these reach a deployment,
# the deployment is misconfigured — they are public in this repository.
DEV_SECRET_KEY = "dev-only-insecure-key-change-me"
DEV_WEBHOOK_SECRET = "dev-only-webhook-secret"
MIN_SECRET_KEY_LENGTH = 50


def _is_deployed() -> bool:
    return getattr(settings, "DEPLOY_ENV", "local") in getattr(
        settings, "DEPLOYED_ENVIRONMENTS", ("staging", "production")
    )


def _is_production() -> bool:
    return getattr(settings, "DEPLOY_ENV", "local") == "production"


@register("production")
def check_production_safety(app_configs, **kwargs):
    if not _is_deployed():
        return []

    issues: list[Error | Warning] = []
    env_name = settings.DEPLOY_ENV

    # --- Secrets -----------------------------------------------------------
    secret = getattr(settings, "SECRET_KEY", "")
    if secret == DEV_SECRET_KEY:
        issues.append(
            Error(
                "SECRET_KEY is the development default.",
                hint='Generate one: python -c "import secrets; print(secrets.token_urlsafe(64))"',
                id="hem.E001",
            )
        )
    elif len(secret) < MIN_SECRET_KEY_LENGTH:
        issues.append(
            Warning(
                f"SECRET_KEY is shorter than {MIN_SECRET_KEY_LENGTH} characters.",
                hint="Sessions, password-reset and verification tokens are signed with it.",
                id="hem.W001",
            )
        )

    # --- Debug / hosts -----------------------------------------------------
    if getattr(settings, "DEBUG", False):
        issues.append(
            Error(
                "DEBUG is True in a deployed environment.",
                hint="DEBUG leaks settings and stack traces. Set DEBUG=False.",
                id="hem.E002",
            )
        )

    hosts = list(getattr(settings, "ALLOWED_HOSTS", []))
    if "*" in hosts:
        issues.append(
            Error(
                "ALLOWED_HOSTS contains '*'.",
                hint="List the real hostnames; a wildcard enables Host-header attacks.",
                id="hem.E003",
            )
        )
    if not hosts:
        issues.append(Error("ALLOWED_HOSTS is empty.", id="hem.E004"))

    # --- Transport / cookies ----------------------------------------------
    if not getattr(settings, "COOKIE_SECURE", False):
        issues.append(
            Error(
                "COOKIE_SECURE is False: JWT auth cookies would be sent over plaintext HTTP.",
                hint="Set COOKIE_SECURE=True (audit F-1).",
                id="hem.E005",
            )
        )
    for name in ("SESSION_COOKIE_SECURE", "CSRF_COOKIE_SECURE"):
        if not getattr(settings, name, False):
            issues.append(Error(f"{name} is False in a deployed environment.", id="hem.E006"))

    for name in ("FRONTEND_URL", "BACKEND_URL"):
        value = getattr(settings, name, "") or ""
        if value and not value.startswith("https://"):
            issues.append(
                Warning(
                    f"{name} is not https ({value!r}).",
                    hint="Cross-origin cookies require HTTPS on both ends.",
                    id="hem.W002",
                )
            )

    # --- Content-Security-Policy (audit F-2) -------------------------------
    if getattr(settings, "SECURITY_HEADERS_CSP_REPORT_ONLY", True):
        issues.append(
            Warning(
                "CSP is report-only: violations are recorded but nothing is blocked.",
                hint="Unset CSP_REPORT_ONLY once the canary is clean (ADR-0017).",
                id="hem.W003",
            )
        )

    # --- Payments ----------------------------------------------------------
    if getattr(settings, "PAYMENT_DEV_SELF_CONFIRM", False):
        issues.append(
            Error(
                "PAYMENT_DEV_SELF_CONFIRM is enabled: students could mark their own "
                "payments as received without any money moving.",
                hint="This is a development affordance only. Unset PAYMENT_DEV_SELF_CONFIRM.",
                id="hem.E007",
            )
        )

    gateway = getattr(settings, "PAYMENT_GATEWAY", "manual")
    if gateway == "manual":
        if getattr(settings, "MANUAL_WEBHOOK_SECRET", "") == DEV_WEBHOOK_SECRET:
            issues.append(
                Error(
                    "MANUAL_WEBHOOK_SECRET is the development default; simulated payment "
                    "webhooks could be forged by anyone reading this repository.",
                    hint="Set a random MANUAL_WEBHOOK_SECRET.",
                    id="hem.E008",
                )
            )
        if not (getattr(settings, "MANUAL_PAYMENT_INSTRUCTIONS", "") or "").strip():
            issues.append(
                Warning(
                    "MANUAL_PAYMENT_INSTRUCTIONS is empty: students on manual rails are "
                    "shown no way to actually pay.",
                    id="hem.W004",
                )
            )
    elif gateway == "stripe":
        missing = [
            name
            for name in ("STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET")
            if not getattr(settings, name, "")
        ]
        if missing:
            issues.append(
                Error(
                    f"PAYMENT_GATEWAY=stripe but {', '.join(missing)} not set.",
                    hint="Complete the activation checklist in docs/workflows/payments.md first.",
                    id="hem.E009",
                )
            )

    # --- Email -------------------------------------------------------------
    if getattr(settings, "EMAIL_BACKEND_MODE", "console") == "console":
        issues.append(
            Error(
                "EMAIL_BACKEND_MODE=console: verification, password-reset and notification "
                "mail would be printed to the log instead of delivered, locking users out.",
                hint="Use smtp or brevo.",
                id="hem.E010",
            )
        )

    # --- Storage -----------------------------------------------------------
    if getattr(settings, "FILE_STORAGE", "local") == "local":
        issues.append(
            (Error if _is_production() else Warning)(
                "FILE_STORAGE=local: uploads and deliveries live on the container filesystem "
                "and are lost on the next redeploy.",
                hint="Set FILE_STORAGE=r2 with the bucket credentials (ADR-0006).",
                id="hem.E011" if _is_production() else "hem.W005",
            )
        )

    # --- Admin surface -----------------------------------------------------
    if getattr(settings, "ADMIN_URL", "admin/") == "admin/":
        issues.append(
            Warning(
                "ADMIN_URL is the default 'admin/'.",
                hint="An unguessable path removes the bulk of automated admin probing.",
                id="hem.W006",
            )
        )

    # --- Environment coherence --------------------------------------------
    if env_name == "production" and getattr(settings, "SEED_ALLOWED", False):
        issues.append(Error("SEED_ALLOWED must never be set in production.", id="hem.E012"))

    return issues
