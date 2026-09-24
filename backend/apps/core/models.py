"""Shared abstract base models (core = shared kernel, imports no domain apps)."""

from decimal import Decimal

from django.db import models


class TimeStampedModel(models.Model):
    """created_at/updated_at audit timestamps (docs/architecture/database.md)."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class PlatformConfig(TimeStampedModel):
    """Singleton row (pk=1) — platform money/operational configuration
    (docs/architecture/database.md §payments, planned since Phase 0; built in
    Phase 10). Mutable only through `apps.portal.services.update_config`,
    which validates and audits before/after values. Constants in
    `apps/payments.config` remain the seeded defaults / fallbacks."""

    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    open_commission_rate = models.DecimalField(
        max_digits=5, decimal_places=4, default=Decimal("0.1500")
    )
    managed_commission_rate = models.DecimalField(
        max_digits=5, decimal_places=4, default=Decimal("0.2000")
    )
    min_offer_minor = models.BigIntegerField(default=500)  # BR-18 offer floor
    payout_min_minor = models.BigIntegerField(default=1000)  # BR-30 roll-forward floor
    dispute_window_days = models.PositiveSmallIntegerField(default=7)  # BR-40
    default_currency = models.CharField(max_length=3, default="USD")

    class Meta:
        verbose_name = "Platform configuration"
        verbose_name_plural = "Platform configuration"

    def __str__(self) -> str:
        return "PlatformConfig (singleton)"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls) -> "PlatformConfig":
        config, _created = cls.objects.get_or_create(pk=1)
        return config
