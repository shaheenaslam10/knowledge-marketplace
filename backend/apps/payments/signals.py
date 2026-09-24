"""Payments domain signals (ADR-0005 amendment).

`payment_confirmed` is emitted INSIDE the confirmation transaction. The
orders app listens (apps/orders/apps.py) and runs its own `mark_paid` state
machine — the inversion keeps apps.payments free of upward imports while the
whole path stays atomic: a failing order transition rolls the payment
confirmation back.
"""

from __future__ import annotations

import django.dispatch

# Provides: payment (payments.Payment), source (str)
payment_confirmed = django.dispatch.Signal()
