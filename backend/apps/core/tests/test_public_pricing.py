"""`/api/v1/platform/pricing` — the only public disclosure of what we charge.

A marketplace that takes 15-20% must say so before someone signs up. These
tests pin that the endpoint is anonymous, that it reports the *live*
PlatformConfig values rather than hard-coded copy, and that it does not leak
operational configuration.
"""

from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.core.models import PlatformConfig

pytestmark = pytest.mark.django_db

URL = "/api/v1/platform/pricing"


def _get():
    return APIClient().get(URL)


def test_is_public_no_auth_required():
    assert _get().status_code == 200


def test_reports_the_documented_default_rates():
    body = _get().json()
    assert body["commission"]["open_bid"]["percent"] == "15"  # BR-17
    assert body["commission"]["managed"]["percent"] == "20"


def test_tracks_platformconfig_instead_of_hardcoding():
    """The whole reason this endpoint exists: change the config, the public
    page changes with it. Hard-coded marketing copy would silently lie."""
    config = PlatformConfig.load()
    config.open_commission_rate = Decimal("0.1250")
    config.managed_commission_rate = Decimal("0.1750")
    config.save(update_fields=["open_commission_rate", "managed_commission_rate"])

    body = _get().json()
    assert body["commission"]["open_bid"]["percent"] == "12.5"
    assert body["commission"]["managed"]["percent"] == "17.5"


def test_exposes_money_floors_for_both_sides():
    body = _get().json()
    assert body["min_offer"]["minor"] == 500  # BR-18
    assert body["payout_min"]["minor"] == 1000  # BR-30
    assert body["dispute_window_days"] == 7  # BR-40


def test_display_amounts_are_formatted_strings_not_bare_floats():
    """The page renders `display` verbatim; a float would print "5" not "5.00"."""
    body = _get().json()
    assert body["min_offer"]["display"] == "5.00 USD"
    assert body["payout_min"]["display"] == "10.00 USD"


def test_does_not_leak_operational_config():
    body = _get().json()
    forbidden = {"secret", "key", "token", "password", "webhook", "email", "gateway"}
    flat = str(body).lower()
    for word in forbidden:
        assert word not in flat, f"public pricing payload leaks '{word}'"


def test_route_is_reversible():
    assert reverse("platform-pricing") == URL
