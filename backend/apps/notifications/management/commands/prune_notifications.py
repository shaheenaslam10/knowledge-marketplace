"""Prune notifications older than N days (default 90) — housekeeping job.

Run via cron/q2 schedule in production; safe to re-run (idempotent by age).
Read receipts (MessageReceipt) are pruned separately by messaging.
"""

from __future__ import annotations

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = "Delete notifications older than the given number of days (default 90)."

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=90)

    def handle(self, *args, **options):
        from apps.notifications.models import Notification

        cutoff = timezone.now() - timedelta(days=options["days"])
        deleted, _ = Notification.objects.filter(created_at__lt=cutoff).delete()
        self.stdout.write(
            self.style.SUCCESS(f"pruned {deleted} notifications older than {cutoff.isoformat()}")
        )
