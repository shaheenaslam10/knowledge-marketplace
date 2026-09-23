"""Seed/demo data (idempotent).

Creates clearly-labeled demo accounts for every role the platform supports:
admin/owner, student, and an expert-candidate (expert *approval* is a Phase 3
workflow — the account exists so it can be wired then).

NEVER use real credentials here. Passwords come from env with demo-only
defaults and are refused outside dev/test unless --force is passed
(disposable local environments only).
"""

from __future__ import annotations

import os

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

DEMO_PASSWORD_ENV = "DJANGO_SEED_DEMO_PASSWORD"
DEFAULT_DEMO_PASSWORD = "demo-password-1234"


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

        from apps.accounts.services import ensure_staff_groups

        ensure_staff_groups()
        User = get_user_model()
        admin_password = os.environ.get("DJANGO_SEED_ADMIN_PASSWORD", "admin-demo-1234")
        demo_password = os.environ.get(DEMO_PASSWORD_ENV, DEFAULT_DEMO_PASSWORD)

        admin, created = User.objects.get_or_create(
            email="admin@demo.local",
            defaults={
                "name": "Platform Admin",
                "is_staff": True,
                "is_superuser": True,
            },
        )
        if created or not admin.has_usable_password():
            admin.set_password(admin_password)
            admin.save()
        if not admin.is_verified:
            admin.mark_email_verified()

        student, created = User.objects.get_or_create(
            email="student@demo.local",
            defaults={"name": "Demo Student"},
        )
        if created or not student.has_usable_password():
            student.set_password(demo_password)
            student.save()
        if not student.is_verified:
            student.mark_email_verified()

        expert_candidate, created = User.objects.get_or_create(
            email="expert@demo.local",
            defaults={"name": "Demo Expert (pending profile — Phase 3)"},
        )
        if created or not expert_candidate.has_usable_password():
            expert_candidate.set_password(demo_password)
            expert_candidate.save()
        if not expert_candidate.is_verified:
            expert_candidate.mark_email_verified()

        self.stdout.write(self.style.SUCCESS("Seed complete:"))
        self.stdout.write(
            "  Admin console : http://localhost:8000/admin/  (admin@demo.local / DJANGO_SEED_ADMIN_PASSWORD)"
        )
        self.stdout.write("  Student demo  : student@demo.local / (DJANGO_SEED_DEMO_PASSWORD)")
        self.stdout.write(
            "  Expert demo   : expert@demo.local / (DJANGO_SEED_DEMO_PASSWORD) — approval lands in Phase 3"
        )
        self.stdout.write(
            f"  Demo password default: {DEFAULT_DEMO_PASSWORD} (demo-only — never production credentials)"
        )
        self.stdout.write(
            "  Next steps    : domain demo data arrives with Phases 3+ (docs/process/roadmap-phases.md)"
        )
