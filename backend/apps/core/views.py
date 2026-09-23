"""Infrastructure probes (docs/architecture/api.md — health endpoints).

- GET /healthz  — process alive + database reachable (used by LB/uptime monitors)
- GET /readyz   — migrations applied (used by deploy orchestration)

Plain Django views on purpose: probes must not depend on DRF internals.
"""

import logging

from django.db import connection
from django.http import JsonResponse

logger = logging.getLogger(__name__)


def _db_ok() -> bool:
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        return True
    except Exception:
        logger.warning("health probe: database unreachable", exc_info=True)
        return False


def healthz(request):
    db = _db_ok()
    return JsonResponse(
        {"status": "ok" if db else "degraded", "database": db},
        status=200 if db else 503,
    )


def readyz(request):
    try:
        from django.db.migrations.executor import MigrationExecutor

        executor = MigrationExecutor(connection)
        plan = executor.migration_plan(executor.loader.graph.leaf_nodes())
        ready = not plan
    except Exception:
        logger.warning("readiness probe failed", exc_info=True)
        ready = False
    return JsonResponse(
        {"status": "ready" if ready else "not_ready"},
        status=200 if ready else 503,
    )


def not_found(request, exception=None):
    """handler404: JSON envelope for unmatched /api/* paths, default page otherwise."""
    if request.path.startswith("/api/"):
        from apps.core.exceptions import _envelope

        return JsonResponse(_envelope("not_found", "Endpoint not found."), status=404)
    from django.views.defaults import page_not_found

    return page_not_found(request, exception)
