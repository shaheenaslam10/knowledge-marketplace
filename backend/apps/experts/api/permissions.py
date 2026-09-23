"""Reusable expert permission classes (server-side enforcement only)."""

from rest_framework.permissions import BasePermission


class IsApprovedExpert(BasePermission):
    """Role check via the registry — approved AND not suspended (BR-03/BR-04)."""

    message = "An approved expert account is required for this action."

    def has_permission(self, request, view) -> bool:
        from apps.accounts.services import user_has_role

        user = request.user
        return bool(user and user.is_authenticated and user_has_role(user, "expert"))


class HasExpertApplication(BasePermission):
    message = "You have not started an expert application yet."

    def has_permission(self, request, view) -> bool:
        return bool(request.user and request.user.is_authenticated) and hasattr(
            request.user, "expert_application"
        )
