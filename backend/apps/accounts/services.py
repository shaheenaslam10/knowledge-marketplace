"""Accounts service layer — roles registry, email-verification tokens, account state.

ALL business rules for identity live here; views/tasks/admin call these.
"""

from __future__ import annotations

import logging
from collections.abc import Callable

from django.conf import settings
from django.contrib.auth.models import Group
from django.core import signing

from apps.accounts.models import User

logger = logging.getLogger(__name__)

VERIFICATION_SALT = "accounts.email_verification"
VERIFICATION_TTL_SECONDS = 60 * 60 * 24  # 24h (docs/architecture/authentication.md)

# --- Role-provider registry (ADR-0001 extensibility seam) -------------------
# Domain apps register callables (Phase 3: experts registers "expert").
# accounts must not import domain apps; they plug in from their AppConfig.
RoleProvider = Callable[[User], bool]
_ROLE_PROVIDERS: dict[str, RoleProvider] = {}


def register_role_provider(role: str, provider: RoleProvider) -> None:
    _ROLE_PROVIDERS[role] = provider
    logger.debug("role provider registered: %s", role)


def in_group(user: User, name: str) -> bool:
    return user.groups.filter(name=name).exists()


def get_roles(user: User) -> dict[str, bool]:
    """Canonical role view consumed by the API + frontend navigation.
    `expert` is a stable contract slot (False until Phase 3's provider registers)."""
    roles = {
        "student": True,  # every account is a student (BR-01)
        "verified": user.is_verified,
        "staff": user.is_staff,
        "support": user.is_staff and in_group(user, "support"),
        "admin": user.is_staff and (user.is_superuser or in_group(user, "admin")),
        "expert": False,  # providers may override (Phase 3: approved ExpertProfile)
    }
    for role, provider in _ROLE_PROVIDERS.items():
        try:
            roles[role] = bool(provider(user))
        except Exception:
            logger.exception("role provider %s failed", role)
            roles[role] = False
    return roles


def user_has_role(user: User, role: str) -> bool:
    return bool(get_roles(user).get(role))


def ensure_staff_groups() -> None:
    """Idempotently create the staff groups used by the authorization matrix."""
    Group.objects.get_or_create(name="support")
    Group.objects.get_or_create(name="admin")


# --- Email verification ------------------------------------------------------
def issue_verification_token(user: User) -> str:
    """Signed, time-limited token; bound to the verification state so it is
    single-use (after verification the token no longer matches)."""
    return signing.dumps(
        {"uid": user.pk, "verified": user.email_verified_at is not None},
        salt=VERIFICATION_SALT,
    )


def verify_email_with_token(token: str) -> tuple[bool, str]:
    """Returns (success, message). Idempotent for already-verified users."""
    try:
        data = signing.loads(token, salt=VERIFICATION_SALT, max_age=VERIFICATION_TTL_SECONDS)
    except signing.SignatureExpired:
        return False, "This verification link has expired. Request a new one."
    except signing.BadSignature:
        return False, "This verification link is invalid."
    try:
        user = User.objects.get(pk=data["uid"])
    except User.DoesNotExist:
        return False, "This verification link is invalid."
    if user.is_verified:
        return True, "Email is already verified."
    if data.get("verified") != (user.email_verified_at is not None):
        return False, "This verification link is no longer valid."
    user.mark_email_verified()
    return True, "Email verified. Welcome aboard!"


def deactivate(user: User) -> None:
    """Soft self-deactivation. Reactivation is an admin action (audited via admin LogEntry)."""
    from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

    user.is_active = False
    user.save(update_fields=["is_active", "updated_at"])
    for outstanding in OutstandingToken.objects.filter(user=user):
        BlacklistedToken.objects.get_or_create(token=outstanding)


def verification_url(user: User) -> str:
    token = issue_verification_token(user)
    return f"{settings.FRONTEND_URL}/verify-email?token={token}"


def password_reset_context(user: User) -> dict[str, str]:
    """uid + token for the reset link (Django's default single-use generator —
    invalidated automatically because the password hash changes on reset)."""
    from django.contrib.auth.tokens import default_token_generator
    from django.utils.encoding import force_bytes
    from django.utils.http import urlsafe_base64_encode

    token = default_token_generator.make_token(user)
    uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
    return {
        "uidb64": uidb64,
        "token": token,
        "url": f"{settings.FRONTEND_URL}/reset-password/confirm?uid={uidb64}&token={token}",
    }
