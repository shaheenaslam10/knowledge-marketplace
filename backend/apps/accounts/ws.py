"""WebSocket authentication — JWT-cookie based (Phase 2).

Django's AuthMiddlewareStack authenticates via session cookies, which our
JWT-in-httpOnly-cookie design does not set. This middleware authenticates the
scope from the `hm_access` cookie instead; invalid/absent tokens yield
AnonymousUser (consumers decide whether to accept/close — never a silent auth).
"""

from __future__ import annotations

from typing import Any

from asgiref.sync import sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser

from apps.accounts.authentication import ACCESS_COOKIE


def _cookies_from_scope(scope) -> dict[str, str]:
    headers = {k.decode("latin1").lower(): v.decode("latin1") for k, v in scope.get("headers", [])}
    cookie_header = headers.get("cookie", "")
    cookies: dict[str, str] = {}
    for part in cookie_header.split(";"):
        if "=" in part:
            key, _, value = part.partition("=")
            cookies[key.strip()] = value.strip()
    return cookies


def _user_from_token(raw: str | None):
    """Sync JWT validation + user fetch (DB) — wrapped by sync_to_async."""
    if not raw:
        return AnonymousUser()
    from rest_framework_simplejwt.authentication import JWTAuthentication

    try:
        validated = JWTAuthentication().get_validated_token(raw)
        user = JWTAuthentication().get_user(validated)
    except Exception:
        return AnonymousUser()
    if not getattr(user, "is_active", False):
        return AnonymousUser()
    return user


class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        scope["user"] = scope.get("user") or AnonymousUser()
        cookies = _cookies_from_scope(scope)
        scope["user"] = await sync_to_async(_user_from_token)(cookies.get(ACCESS_COOKIE))
        return await super().__call__(scope, receive, send)


def JWTAuthMiddlewareStack(inner: Any) -> JWTAuthMiddleware:
    """Named like channels' AuthMiddlewareStack for drop-in clarity."""
    return JWTAuthMiddleware(inner)
