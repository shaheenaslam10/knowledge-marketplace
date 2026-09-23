"""End-to-end worker check: enqueue a task, wait for the qcluster to process it.

Usage:  python manage.py worker_smoke [--timeout 20]
Exit code 0 = a worker processed the task; 1 = timed out (worker not running?).
"""

from __future__ import annotations

import json
import time
import uuid

from django.core.management.base import BaseCommand
from django_q.tasks import async_task, result


class Command(BaseCommand):
    help = "Enqueue a smoke task and wait for a worker to process it."

    def add_arguments(self, parser):
        parser.add_argument("--timeout", type=int, default=20)

    def handle(self, *args, **options):
        payload = f"smoke-{uuid.uuid4().hex[:8]}"
        task_id = async_task("apps.core.tasks.smoke_task", payload, task_name="core.smoke")
        self.stdout.write(f"enqueued task_id={task_id}")

        deadline = time.monotonic() + options["timeout"]
        while time.monotonic() < deadline:
            res = result(task_id)
            if res is not None:
                if res.get("echo") != payload:
                    self.stderr.write(json.dumps(res))
                    raise SystemExit(1)
                self.stdout.write(self.style.SUCCESS(f"worker OK: {json.dumps(res)}"))
                return
            time.sleep(0.5)
        raise SystemExit(
            self.style.ERROR(
                f"worker_smoke: no result within {options['timeout']}s — is qcluster running?"
            )
        )
