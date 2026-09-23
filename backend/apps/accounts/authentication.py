"""JWT authentication — cookie-first for the browser, Bearer for scripts/tests.

- `CookieJWTAuthentication` reads the httpOnly `hm_access` cookie set at login.
- Every subclass enforces `user.is_active` **per request** (SimpleJWT only checks
  it at token issuance by default) so deactivated accounts are cut off within
  the access-token lifetime — docs/architecture/authentication.md.
"""

from __future__ import annotations

from typing import Any

from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken

ACCESS_COOKIE = "hm_access"
REFRESH_COOKIE = "hm_refresh"


class ActiveUserJWTAuthentication(JWTAuthentication):
    """JWTAuthentication that also rejects deactivated/deleted users per request."""

    def get_user(self, validated_token) -> Any:
        user = super().get_user(validated_token)
        if not user.is_active:
            raise AuthenticationFailed("User account is disabled.", code="user_inactive")
        return user


class CookieJWTAuthentication(ActiveUserJWTAuthentication):
    """Reads the access token from the auth cookie (browser flows)."""

    def authenticate(self, request):
        raw = request.COOKIES.get(ACCESS_COOKIE)
        if not raw:
            return None  # fall through to the next authenticator (Bearer)
        try:
            validated = self.get_validated_token(raw)
        except InvalidToken:
            raise  # invalid-but-present cookie = hard 401 (stale sessions surface)
        return self.get_user(validated), validated


def get_raw_refresh_token(request) -> str | None:
    """Refresh token from cookie first, then JSON body (scripts/tests)."""
    return request.COOKIES.get(REFRESH_COOKIE) or (request.data or {}).get("refresh")
