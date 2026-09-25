"""Phase 11 concurrency — genuine thread races over the money/state
transitions that must stay single-shot (brief §6). Complements the
sequential lock-guard tests that already exist per app:

- bidding: cannot select two experts (sequential) → here: true concurrent
  accept of two competing offers yields exactly one order.
- payments: confirm is lock-guarded → here: two concurrent confirms produce
  one settled payment / one ledger charge set.
- payouts: settle is lock-guarded → here: concurrent double settle settles
  exactly once.
- disputes: open is transactional → here: concurrent double open yields one
  dispute.

Run under real Postgres with ``django_db(transaction=True)`` — each worker
thread uses its own connection (closed in finally).
"""

import threading

import pytest
from django.db import close_old_connections
from django.db.utils import OperationalError

from apps.bidding import services as bidding
from apps.core.exceptions import DomainError
from apps.disputes import services as disputes
from apps.disputes.models import Dispute
from apps.experts.tests.test_api import PASSWORD, make_expert
from apps.orders import services as order_services
from apps.orders.models import Order
from apps.payments import services as payments
from apps.payments.models import LedgerEntry, Payment
from apps.payments.services import confirm_order_payment, schedule_payout, settle_payout
from apps.service_requests import services as request_services
from apps.taxonomy.services import ensure_term


def _run_concurrently(*callables):
    """Run each callable in its own thread, released together by a barrier;
    return (results, errors) indexed like the callables."""
    workers = len(callables)
    barrier = threading.Barrier(workers)
    results, errors = [None] * workers, [None] * workers

    def worker(index, fn):
        close_old_connections()
        try:
            barrier.wait(timeout=10)
            results[index] = fn()
        except Exception as error:
            errors[index] = error
        finally:
            close_old_connections()

    threads = [threading.Thread(target=worker, args=(i, fn)) for i, fn in enumerate(callables)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(timeout=30)
    return results, errors


def _request_with_two_offers(django_user_model):
    """Published open-bid request with two competing offers."""
    student = django_user_model.objects.create_user(
        email=f"race-student-{django_user_model.objects.count()}@demo.local",
        password=PASSWORD,
        name="RS",
    )
    student.mark_email_verified()
    expert_a = make_expert(
        django_user_model, f"race-a-{django_user_model.objects.count()}@demo.local", "A"
    )
    expert_b = make_expert(
        django_user_model, f"race-b-{django_user_model.objects.count()}@demo.local", "B"
    )
    subject = ensure_term(kind="subject", name=f"RaceSub{django_user_model.objects.count()}")[0]
    request = request_services.create_request(
        student,
        payload={
            "category": "tutoring",
            "title": "Race",
            "description": "d" * 40,
            "subject": subject,
            "budget_max": 9000,
        },
    )
    request = request_services.publish(student, request, attested=True)
    offer_a = bidding.submit(expert_a, request, payload={"amount": 5000})
    offer_b = bidding.submit(expert_b, request, payload={"amount": 5200})
    return student, request, offer_a, offer_b


@pytest.mark.django_db(transaction=True)
class TestSelectionRace:
    def test_concurrent_offer_accepts_create_exactly_one_order(self, django_user_model):
        student, request, offer_a, offer_b = _request_with_two_offers(django_user_model)

        results, errors = _run_concurrently(
            lambda: bidding.accept(student, offer_a),
            lambda: bidding.accept(student, offer_b),
        )
        winners = [r for r in results if r is not None]
        assert len(winners) == 1, f"expected one winner, errors={errors}"
        # the loser fails cleanly (domain guard or DB deadlock resolution) —
        # never a second order, never a partial state
        assert all(isinstance(e, (DomainError, OperationalError)) for e in errors if e), errors
        request.refresh_from_db()
        assert Order.objects.filter(request=request).count() == 1


def _paid_open_order(django_user_model, *, complete=False, pay=True):
    """Paid open-bid order + its participants; ``complete`` runs delivery +
    approval so payout-capable transitions (BR-30) are unlocked."""
    student = django_user_model.objects.create_user(
        email=f"race-pay-{django_user_model.objects.count()}@demo.local",
        password=PASSWORD,
        name="RP",
    )
    student.mark_email_verified()
    expert = make_expert(
        django_user_model, f"race-exp-{django_user_model.objects.count()}@demo.local", "E"
    )
    subject = ensure_term(kind="subject", name=f"RacePay{django_user_model.objects.count()}")[0]
    request = request_services.create_request(
        student,
        payload={
            "category": "tutoring",
            "title": "Pay",
            "description": "d" * 40,
            "subject": subject,
            "budget_max": 9000,
        },
    )
    request = request_services.publish(student, request, attested=True)
    request_services.mark_matched(request)
    order = order_services.create_order_for_request(
        request, expert=expert, amount=8000, currency="USD", source=Order.Source.OPEN_BID
    )
    if pay:
        payments.start_payment(order, actor=student)
        confirm_order_payment(order, actor=None)
    if complete:
        order_services.submit_delivery(
            order, expert=expert, summary="Delivered completely, on time, as agreed."
        )
        order_services.approve_delivery(order, actor=student)
    order = type(order).objects.get(pk=order.pk)
    return order, student, expert


@pytest.mark.django_db(transaction=True)
class TestSettlementRaces:
    def test_concurrent_payment_confirmation_settles_once(self, django_user_model):
        order, student, _expert = _paid_open_order(django_user_model, pay=False)
        payments.start_payment(order, actor=student)

        results, errors = _run_concurrently(
            lambda: confirm_order_payment(order, actor=None),
            lambda: confirm_order_payment(order, actor=None),
        )
        succeeded = [r for r in results if isinstance(r, Payment)]
        order.refresh_from_db()
        assert order.status == Order.Status.ACTIVE
        charges = LedgerEntry.objects.filter(order=order, entry_type=LedgerEntry.EntryType.CHARGE)
        assert charges.count() == 1, f"ledger must hold one charge set, errors={errors}"
        # second confirm either raised or returned the same payment
        assert len(succeeded) >= 1
        if len(succeeded) == 2:
            assert succeeded[0].pk == succeeded[1].pk

    def test_concurrent_payout_settlement_marks_paid_once(self, django_user_model):
        order, _student, _expert = _paid_open_order(django_user_model, complete=True)
        payout = schedule_payout(order)
        admin = django_user_model.objects.create_user(
            email=f"race-admin-{django_user_model.objects.count()}@demo.local",
            password=PASSWORD,
            name="RA",
            is_staff=True,
            is_superuser=True,
        )

        results, _settle_errors = _run_concurrently(
            lambda: settle_payout(payout, actor=admin),
            lambda: settle_payout(payout, actor=admin),
        )
        payout.refresh_from_db()
        assert payout.status == "paid"
        paid_results = [r for r in results if r is not None]
        assert len(paid_results) >= 1
        assert all(r.pk == payout.pk for r in paid_results)

    def test_concurrent_dispute_open_creates_one_dispute(self, django_user_model):
        order, student, _expert = _paid_open_order(django_user_model, complete=True)

        results, _errors = _run_concurrently(
            *[
                lambda: disputes.open_dispute(
                    order,
                    actor=student,
                    reason="deadline_missed",
                    description="Concurrency probe: delivery missed the deadline.",
                )
            ]
            * 2
        )
        created = [r for r in results if isinstance(r, Dispute)]
        assert Dispute.objects.filter(order=order).count() == 1
        assert len(created) >= 1
        if len(created) == 2:
            assert created[0].pk == created[1].pk
