"""DRF permission classes implementing the authorization matrix
(docs/product/user-roles.md). Enforced server-side; the frontend mirrors
them for UX only.
"""

from __future__ import annotations

from rest_framework.permissions import BasePermission

from apps.accounts.services import in_group, user_has_role


class IsAdmin(BasePermission):
    """Admin/owner: is_staff + (superuser OR the `admin` group)."""

    message = "Admin privileges required."

    def has_permission(self, request, view) -> bool:
        user = request.user
        if not (user and user.is_authenticated and user.is_staff):
            return False
        return user.is_superuser or in_group(user, "admin")


class IsSupport(BasePermission):
    """Support/moderation staff (future roles join as groups, same pattern)."""

    message = "Support staff privileges required."

    def has_permission(self, request, view) -> bool:
        user = request.user
        return bool(user and user.is_authenticated and user.is_staff and in_group(user, "support"))


class IsExpert(BasePermission):
    """Approved experts. The check itself is provided by the role registry —
    `experts` registers its provider in Phase 3 (ADR-0001 seam)."""

    message = "Approved expert account required."

    def has_permission(self, request, view) -> bool:
        user = request.user
        return bool(user and user.is_authenticated and user_has_role(user, "expert"))


class IsVerified(BasePermission):
    """Email-verified accounts only (BR-01: required for posting/offers/messaging)."""

    message = "Verify your email address to perform this action."

    def has_permission(self, request, view) -> bool:
        user = request.user
        return bool(user and user.is_authenticated and user.is_verified)
