"""Money utilities — the correctness backbone for all platform amounts."""

import pytest

from apps.core.money import allocate, exponent_for, format_money, to_major


class TestFormatting:
    def test_usd_two_decimals(self):
        assert format_money(1234, "USD") == "12.34 USD"

    def test_zero_and_negative(self):
        assert format_money(0, "USD") == "0.00 USD"
        assert format_money(-990, "USD") == "-9.90 USD"

    def test_thousands_separator(self):
        assert format_money(1234567, "USD") == "12,345.67 USD"

    def test_zero_decimal_currency(self):
        assert format_money(500, "JPY") == "500 JPY"

    def test_case_insensitive_currency(self):
        assert format_money(100, "usd") == "1.00 USD"


class TestExponents:
    def test_known_zero_decimal(self):
        assert exponent_for("JPY") == 0

    def test_default_two(self):
        assert exponent_for("USD") == 2
        assert exponent_for("PKR") == 2


class TestToMajor:
    def test_conversion(self):
        assert to_major(1099, "USD") == 10.99
        assert to_major(500, "JPY") == 500.0


class TestAllocate:
    def test_exact_split(self):
        assert allocate(1000, [1, 1]) == [500, 500]

    def test_largest_remainder_no_lost_units(self):
        parts = allocate(100, [1, 1, 1])
        assert sum(parts) == 100
        assert parts == [34, 33, 33]

    def test_commission_split_sums_exactly(self):
        # $100 order, 15% commission snapshot — parts must sum to the order amount.
        parts = allocate(10_000, [15, 85])
        assert parts == [1500, 8500]
        assert sum(parts) == 10_000

    def test_awkward_total(self):
        for total in range(0, 251):
            assert sum(allocate(total, [15, 20, 65])) == total

    def test_invalid_weights_rejected(self):
        with pytest.raises(ValueError):
            allocate(100, [])
        with pytest.raises(ValueError):
            allocate(100, [0, 0])
        with pytest.raises(ValueError):
            allocate(-1, [1])
