"""WSGI entrypoint (kept for tooling that requires it; runtime uses asgi.py)."""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")

application = get_wsgi_application()
