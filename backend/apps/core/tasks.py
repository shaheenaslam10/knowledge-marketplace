"""Phase 1 task examples — thin wrappers proving the DB-backed pipeline.

Real jobs arrive with their domains (docs/architecture/background-jobs.md).
Rules: tasks are small, idempotent, and delegate to service layers.
"""

from __future__ import annotations

import os

from django_q.tasks import async_task


def smoke_task(payload: str) -> dict:
    """Executed by the worker; used by `manage.py worker_smoke` and CI."""
    return {"echo": payload, "worker_pid": os.getpid()}


def enqueue_smoke(payload: str = "hello") -> str:
    """Enqueue from request/management code. Returns the task id."""
    return async_task("apps.core.tasks.smoke_task", payload, task_name="core.smoke")
