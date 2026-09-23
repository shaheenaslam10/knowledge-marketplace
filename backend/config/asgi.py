"""ASGI entrypoint — HTTP + WebSocket in one process (uvicorn in docker/prod,
daphne via runserver in dev).

WS auth: JWTAuthMiddlewareStack authenticates scopes from the `hm_access`
cookie (Phase 2 — we deliberately don't use session-based AuthMiddlewareStack,
see apps/accounts/ws.py). Origins validated against FRONTEND_URL /
CORS_ALLOWED_ORIGINS / CSRF_TRUSTED_ORIGINS — channels' built-in validator only
knows ALLOWED_HOSTS, which would break the documented cross-subdomain deploy.
Missing/foreign Origin is rejected (strict).

NOTE (documented constraint): the channel layer is in-memory, therefore exactly
ONE ASGI process may run per deployment until scale-out swaps in the Redis
channel layer — docs/architecture/realtime.md.
"""

import os

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import OriginValidator
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")

django_asgi_app = get_asgi_application()

from apps.accounts.ws import JWTAuthMiddlewareStack  # noqa: E402 (after django setup)
from config.routing import websocket_urlpatterns  # noqa: E402 (after django setup)


def _allowed_ws_origins() -> list[str]:
    from django.conf import settings

    origins = {
        settings.FRONTEND_URL,
        settings.BACKEND_URL,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    }
    origins.update(settings.CORS_ALLOWED_ORIGINS)
    origins.update(settings.CSRF_TRUSTED_ORIGINS)
    # allow the http/https twin of each configured origin (dev/parity)
    twins = {
        o.replace("https://", "http://", 1)
        if o.startswith("https://")
        else o.replace("http://", "https://", 1)
        for o in origins
    }
    return sorted({o for o in origins | twins if o})


application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": OriginValidator(
            JWTAuthMiddlewareStack(URLRouter(websocket_urlpatterns)), _allowed_ws_origins()
        ),
    }
)
