"""Seed/demo data foundation (idempotent).

Phase 1 seeds only the platform operator account so `/admin` is usable right
after `docker compose up`. Domain demo data (students, experts, requests,
orders, ledger) is added by this command in later phases — see
docs/architecture/testing.md ("Test data").

Safety: refuses to run with production settings; use --force only on disposable
local environments.
"""

from __future__ import annotations

import os

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Seed demo/operational baseline data (idempotent)."

    def add_arguments(self, parser):
        parser.add_argument("--force", action="store_true", help="Allow outside dev/test settings.")

    def handle(self, *args, **options):
        if (
            "dev" not in settings.SETTINGS_MODULE
            and "test" not in settings.SETTINGS_MODULE
            and not options["force"]
        ):
            raise SystemExit(
                "Refusing to seed: not dev/test settings. Use --force on disposable environments."
            )

        User = get_user_model()
        password = os.environ.get("DJANGO_SEED_ADMIN_PASSWORD", "admin-demo-1234")
        admin, created = User.objects.get_or_create(
            username="admin",
            defaults={"email": "admin@demo.local", "is_staff": True, "is_superuser": True},
        )
        if created:
            admin.set_password(password)
            admin.save(update_fields=["password"])

        self.stdout.write(self.style.SUCCESS("Seed complete (Phase 1 baseline):"))
        self.stdout.write(
            "  Django admin : http://localhost:8000/admin/  (admin / from DJANGO_SEED_ADMIN_PASSWORD)"
        )
        self.stdout.write(
            "  Next steps   : domain demo data arrives with Phases 3+ (docs/process/roadmap-phases.md)"
        )
