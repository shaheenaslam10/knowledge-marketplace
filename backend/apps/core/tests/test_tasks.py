"""Database-backed task pipeline (django-q2 ORM broker).

With test settings Q_CLUSTER.sync=True, async_task executes inline — here we
verify the task function contract and the sync pipeline; the *real* worker
process is proven by `manage.py worker_smoke` in CI's compose job.
"""

import pytest

from apps.core.tasks import enqueue_smoke, smoke_task


def test_smoke_task_echoes_payload():
    result = smoke_task("abc")
    assert result["echo"] == "abc"
    assert "worker_pid" in result


@pytest.mark.django_db
def test_enqueue_runs_in_sync_mode_and_returns_payload_id():
    task_id = enqueue_smoke("sync-run")
    assert task_id  # django-q2 returns an id; with sync=True the result is immediate
