"""ASGI entrypoint — HTTP + WebSocket in one process (uvicorn in docker/prod,
daphne via runserver in dev).

Origin policy: browsers always send Origin on WS handshakes; we allow the
frontend/API origins configured via env (FRONTEND_URL, CORS_ALLOWED_ORIGINS,
CSRF_TRUSTED_ORIGINS) — channels' AllowedHostsOriginValidator only knows
ALLOWED_HOSTS, which would reject our documented cross-subdomain deployment
(app.example.com → api.example.com). Missing Origin is rejected (strict).

NOTE (documented constraint): the channel layer is in-memory, therefore exactly
ONE ASGI process may run per deployment until scale-out swaps in the Redis
channel layer — docs/architecture/realtime.md.
"""

import os

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import OriginValidator
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")

django_asgi_app = get_asgi_application()

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
    # dev convenience: allow the http/https twin of each configured origin
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
        "websocket": AuthMiddlewareStack(
            OriginValidator(URLRouter(websocket_urlpatterns), _allowed_ws_origins())
        ),
    }
)
