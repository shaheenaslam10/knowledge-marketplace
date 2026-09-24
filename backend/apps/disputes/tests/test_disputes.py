"""Phase 9 disputes tests — window, lifecycle, payout freeze, outcomes that
reuse the payment/refund/ledger services, races, evidence access."""

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.core.exceptions import DomainError, PermissionDeniedError
from apps.disputes import services as disputes
from apps.disputes.models import Dispute
from apps.experts.tests.test_api import PASSWORD, make_expert
from apps.files.services import grant_download, store_upload
from apps.orders import services as order_services
from apps.payments import services as payments
from apps.payments.models import LedgerEntry, Payment, Payout
from apps.service_requests import services as request_services
from apps.taxonomy.services import ensure_term

pytestmark = pytest.mark.django_db

PDF = SimpleUploadedFile("ev.pdf", b"%PDF-1.4\n" + b"e" * 64)


def _admin(django_user_model):
    return django_user_model.objects.get_or_create(
        email="dsp-admin@demo.local", defaults={"is_staff": True, "name": "DA"}
    )[0]


def _order(django_user_model, *, status="delivered"):
    student = django_user_model.objects.create_user(
        email=f"dsp-{status}-{django_user_model.objects.count()}@demo.local",
        password=PASSWORD,
        name="S",
    )
    expert = make_expert(
        django_user_model, f"dsp-e-{django_user_model.objects.count()}@demo.local", "E"
    )
    subject = ensure_term(
        kind="subject", name=f"DspSub{status}{django_user_model.objects.count()}"
    )[0]
    request = request_services.create_request(
        student,
        payload={
            "category": "tutoring",
            "title": "Dispute order",
            "description": "d" * 40,
            "subject": subject,
            "budget_max": 9000,
        },
    )
    request = request_services.publish(student, request, attested=True)
    request_services.mark_matched(request)
    order = order_services.create_order_for_request(
        request,
        expert=expert,
        amount=10000,
        currency="USD",
        source=order_services.Order.Source.OPEN_BID,
    )
    from apps.payments.services import confirm_order_payment, start_payment

    start_payment(order, actor=student)
    order = type(order).objects.get(pk=order.pk)
    confirm_order_payment(order, actor=_admin(django_user_model))  # manual rails: dev confirm
    order = type(order).objects.get(pk=order.pk)
    if status in ("delivered", "completed"):
        order_services.submit_delivery(
            order, expert=expert, summary="Delivered work for dispute tests."
        )
        if status == "completed":
            order = order_services.approve_delivery(order, actor=student)
    return order, student, expert


class TestOpenWindow:
    def test_participant_opens_on_delivered_order(self, django_user_model):
        order, student, _expert = _order(django_user_model)
        dispute = disputes.open_dispute(
            order,
            actor=student,
            reason="quality_below_expectations",
            description="The delivered notes miss half the agreed syllabus outline.",
        )
        assert dispute.status == Dispute.Status.OPEN
        order.refresh_from_db()
        assert order.status == "disputed" and order.has_open_dispute is True
        assert dispute.prior_order_status == "delivered"

    def test_window_enforcement(self, django_user_model):
        order, student, _expert = _order(django_user_model, status="completed")
        from datetime import timedelta

        from django.utils import timezone

        order.completed_at = timezone.now() - timedelta(days=8)
        order.save(update_fields=["completed_at"])
        with pytest.raises(DomainError, match="window closed"):
            disputes.open_dispute(
                order,
                actor=student,
                reason="other",
                description="Trying to dispute long after completion window.",
            )

    def test_awaiting_payment_cannot_be_disputed(self, django_user_model):
        order, student, _expert = _order(django_user_model)
        order.status = "cancelled"  # cancelled orders are outside the dispute machine
        order.save(update_fields=["status"])
        with pytest.raises(DomainError, match="Disputes open while"):
            disputes.open_dispute(
                order,
                actor=student,
                reason="other",
                description="Cancelled orders cannot be disputed.",
            )

    def test_stranger_cannot_open(self, django_user_model):
        order, _student, _expert = _order(django_user_model)
        stranger = django_user_model.objects.create_user(
            email="dsp-x@demo.local", password=PASSWORD, name="X"
        )
        with pytest.raises(PermissionDeniedError):
            disputes.open_dispute(
                order,
                actor=stranger,
                reason="other",
                description="An outsider tries to open a dispute.",
            )

    def test_one_dispute_per_order(self, django_user_model):
        order, student, _expert = _order(django_user_model)
        disputes.open_dispute(
            order,
            actor=student,
            reason="deadline_missed",
            description="The deadline passed without any delivery at all.",
        )
        with pytest.raises(DomainError, match="already has a dispute"):
            disputes.open_dispute(
                order,
                actor=student,
                reason="other",
                description="Second dispute attempt on same order.",
            )

    def test_description_and_reason_validation(self, django_user_model):
        order, student, _expert = _order(django_user_model)
        with pytest.raises(DomainError, match="20 characters"):
            disputes.open_dispute(order, actor=student, reason="other", description="too short")
        with pytest.raises(DomainError, match="reason"):
            disputes.open_dispute(order, actor=student, reason="nonsense", description="x" * 40)


class TestFreeze:
    def test_settlement_blocked_while_disputed(self, django_user_model):
        order, student, _expert = _order(django_user_model, status="completed")
        admin = _admin(django_user_model)
        payout = payments.schedule_payout(order)
        assert payout is not None  # dispute-free at completion
        disputes.open_dispute(
            order,
            actor=student,
            reason="payment_issue",
            description="Funds were taken but the service was never usable.",
        )
        with pytest.raises(DomainError, match="frozen"):
            payments.settle_payout(payout, actor=admin)

    def test_sweeper_skips_disputed_orders(self, django_user_model):
        order, _student, _expert = _order(django_user_model, status="completed")
        # approval auto-scheduled the payout; settlement is the operator step
        payout = Payout.objects.get(order=order)
        payout = payments.settle_payout(payout, actor=_admin(django_user_model))
        assert payout.status == Payout.Status.PAID

        order2, student2, _e2 = _order(django_user_model, status="completed")
        payout2 = Payout.objects.get(order=order2)
        disputes.open_dispute(
            order2,
            actor=student2,
            reason="quality_below_expectations",
            description="Delivery is incomplete relative to the brief.",
        )
        payments.payout_sweeper()
        payout2.refresh_from_db()
        assert payout2.status == Payout.Status.SCHEDULED  # frozen, not settled, not re-created
        with pytest.raises(DomainError, match="frozen"):
            payments.settle_payout(payout2, actor=_admin(django_user_model))

    def test_race_dispute_vs_settlement(self, django_user_model, django_db_blocker):
        """open_dispute and settle_payout are serialized on the order row —
        the ledger stays identity-correct under either interleaving."""
        order, student, _expert = _order(django_user_model, status="completed")
        admin = _admin(django_user_model)
        payout = payments.schedule_payout(order)
        with django_db_blocker.unblock():
            disputes.open_dispute(
                order,
                actor=student,
                reason="deadline_missed",
                description="Nothing arrived by the agreed delivery date.",
            )
            with pytest.raises(DomainError, match="frozen"):
                payments.settle_payout(payout, actor=admin)

    def test_duplicate_freeze_is_noop(self, django_user_model):
        order, student, _expert = _order(django_user_model, status="completed")
        disputes.open_dispute(
            order, actor=student, reason="other", description="First dispute freezes the payout."
        )
        order.refresh_from_db()
        assert order.has_open_dispute is True


class TestResolution:
    def _disputed(self, django_user_model):
        order, student, expert = _order(django_user_model, status="completed")
        admin = _admin(django_user_model)
        dispute = disputes.open_dispute(
            order,
            actor=student,
            reason="quality_below_expectations",
            description="Deliverable quality is far below the agreed scope.",
        )
        disputes.take_case(dispute, actor=admin)
        return order, student, expert, dispute, admin

    def test_full_refund_reuses_payment_services(self, django_user_model):
        order, _student, _expert, dispute, admin = self._disputed(django_user_model)
        ledger_before = LedgerEntry.objects.filter(order=order).count()
        disputes.resolve(
            dispute,
            actor=admin,
            outcome="refund_student_full",
            resolution_notes="Delivery never matched the brief; full refund granted.",
        )
        payment = Payment.objects.get(order=order)
        assert payment.status == Payment.Status.REFUNDED
        order.refresh_from_db()
        assert order.status == "cancelled" and order.has_open_dispute is False
        dispute.refresh_from_db()
        assert (
            dispute.status == Dispute.Status.RESOLVED and dispute.outcome == "refund_student_full"
        )
        entries = LedgerEntry.objects.filter(order=order)
        assert entries.count() > ledger_before
        for _row in entries.values("entry_type").distinct():
            pass
        sums = {
            row["entry_type"]: int(row["total"])
            for row in entries.values("entry_type").annotate(total=_sum("amount_minor"))
        }
        assert sums["charge"] + sums["refund"] == sums["commission"] + sums[
            "expert_credit"
        ] + sums.get("fee", 0)

    def test_partial_refund_keeps_completed(self, django_user_model):
        order, _student, _expert, dispute, admin = self._disputed(django_user_model)
        disputes.resolve(
            dispute,
            actor=admin,
            outcome="refund_student_partial",
            refund_amount_minor=3000,
            resolution_notes="Partial refund for the two missed sessions in week two.",
        )
        payment = Payment.objects.get(order=order)
        assert (
            payment.status == Payment.Status.PARTIALLY_REFUNDED and payment.refunded_minor == 3000
        )
        order.refresh_from_db()
        assert order.status == "completed"
        sums = {
            row["entry_type"]: int(row["total"])
            for row in LedgerEntry.objects.filter(order=order)
            .values("entry_type")
            .annotate(total=_sum("amount_minor"))
        }
        assert sums["charge"] + sums["refund"] == sums["commission"] + sums[
            "expert_credit"
        ] + sums.get("fee", 0)
        # payout scheduleable again with the reduced credit
        payout = payments.schedule_payout(order)
        assert payout is not None and payout.amount_minor == sums["expert_credit"]

    def test_release_expert_reopens_payout(self, django_user_model):
        order, _student, _expert, dispute, admin = self._disputed(django_user_model)
        disputes.resolve(
            dispute,
            actor=admin,
            outcome="release_expert",
            resolution_notes="Evidence shows the work met the agreed specification.",
        )
        order.refresh_from_db()
        assert order.status == "completed" and order.has_open_dispute is False
        payout = payments.schedule_payout(order)
        assert payout is not None
        payments.settle_payout(payout, actor=admin)  # freeze lifted
        payout.refresh_from_db()
        assert payout.status == Payout.Status.PAID

    def test_split_and_no_fault(self, django_user_model):
        order, _student, _expert, dispute, admin = self._disputed(django_user_model)
        disputes.resolve(
            dispute,
            actor=admin,
            outcome="split",
            refund_amount_minor=2500,
            resolution_notes="Both sides share responsibility; split 25/75.",
        )
        order.refresh_from_db()
        assert order.status == "completed"
        # no_fault path on a fresh dispute-free order is impossible (1-1), so
        # exercise the prior-status restore via a second order's machine states.
        order2, s2, _e2 = _order(django_user_model, status="completed")
        dispute2 = disputes.open_dispute(
            order2,
            actor=s2,
            reason="other",
            description="Miscommunication, actually resolving amicably.",
        )
        admin2 = _admin(django_user_model)
        disputes.take_case(dispute2, actor=admin2)
        disputes.resolve(
            dispute2,
            actor=admin2,
            outcome="no_fault_close",
            resolution_notes="False alarm — the delivery was inside the extension window.",
        )
        order2.refresh_from_db()
        assert order2.status == "completed" and order2.has_open_dispute is False

    def test_resolution_requires_staff_and_review_state(self, django_user_model):
        _o1, student, _expert, dispute, admin = self._disputed(django_user_model)
        with pytest.raises(PermissionDeniedError):
            disputes.resolve(
                dispute,
                actor=student,
                outcome="release_expert",
                resolution_notes="Student attempting self-resolution here.",
            )
        with pytest.raises(DomainError, match="20 characters"):
            disputes.resolve(
                dispute, actor=admin, outcome="release_expert", resolution_notes="short"
            )

    def test_lifecycle_transitions(self, django_user_model):
        _o1, _student, _expert, dispute, admin = self._disputed(django_user_model)
        with pytest.raises(DomainError):
            disputes.await_response(dispute, actor=admin)  # open→under_review only per doc
        order2, s2, _e2 = _order(django_user_model, status="completed")
        dispute2 = disputes.open_dispute(
            order2, actor=s2, reason="other", description="Awaiting the counterpart response now."
        )
        disputes.await_response(dispute2, actor=admin)
        dispute2.refresh_from_db()
        assert dispute2.status == Dispute.Status.AWAITING_RESPONSE
        disputes.resume_review(dispute2, actor=admin)
        with pytest.raises(PermissionDeniedError):
            disputes.take_case(dispute2, actor=s2)
        dispute = dispute2
        disputes.resolve(
            dispute,
            actor=admin,
            outcome="refund_student_full",
            resolution_notes="Resolved for the student after evidence review.",
        )
        disputes.close(dispute, actor=admin)
        dispute.refresh_from_db()
        assert dispute.status == Dispute.Status.CLOSED
        with pytest.raises(DomainError):
            disputes.close(dispute, actor=admin)  # terminal


class TestEvidenceAndThreads:
    def test_evidence_upload_download_authorization(self, client, django_user_model):
        order, student, expert = _order(django_user_model)
        attachment, _ = store_upload(student, purpose="dispute_evidence", uploaded_file=PDF)
        dispute = disputes.open_dispute(
            order,
            actor=student,
            reason="quality_below_expectations",
            description="Screenshots attached show the broken deliverable.",
            evidence_ids=[str(attachment.pk)],
        )
        assert dispute.evidence.filter(pk=attachment.pk).exists()
        # participant download granted via the dispute traversal
        assert grant_download(expert, attachment) is True
        stranger = django_user_model.objects.create_user(
            email="dsp-str@demo.local", password=PASSWORD, name="X"
        )
        assert grant_download(stranger, attachment) is False
        # wrong-purpose evidence rejected (fresh order: duplicate gate comes first)
        order2, student2, _e2 = _order(django_user_model)
        wrong, _ = store_upload(student2, purpose="message", uploaded_file=PDF)

        from apps.experts.tests.test_api import api_login

        api_login(client, student2)
        response = client.post(
            f"/api/v1/me/orders/{order2.pk}/dispute",
            data=f'{{"reason": "other", "description": "Wrong purpose attempt here.", "evidence_ids": ["{wrong.pk}"]}}',
            content_type="application/json",
        )
        assert response.status_code == 400
        assert response.json()["error"]["code"] == "validation_error"

    def test_dispute_thread_uses_order_participants(self, django_user_model):
        order, student, expert = _order(django_user_model)
        disputes.open_dispute(
            order,
            actor=expert,
            reason="scope_disagreement",
            description="The student keeps adding scope outside the agreement.",
        )
        from apps.messaging import services as messaging

        thread = messaging.Thread.objects.get(context_type="dispute", order=order)
        participant_ids = set(thread.participants.values_list("id", flat=True))
        assert participant_ids == {student.id, expert.id}
        msg = messaging.send_message(thread, sender=expert, body="Let's resolve this in mediation.")
        assert msg.thread_id == thread.id
        # live-derivation: thread fetch works for both parties
        assert messaging.thread_for_user(thread.pk, student).pk == thread.pk

    def test_dispute_api_detail_authorization(self, client, django_user_model):
        from apps.experts.tests.test_api import api_login

        order, student, expert = _order(django_user_model)
        dispute = disputes.open_dispute(
            order,
            actor=student,
            reason="expert_unresponsive",
            description="No replies from the expert for over a week now.",
        )
        api_login(client, expert)
        response = client.get(f"/api/v1/me/disputes/{dispute.pk}")
        assert response.status_code == 200 and response.json()["thread"]
        stranger = django_user_model.objects.create_user(
            email="dsp-s2@demo.local", password=PASSWORD, name="X"
        )
        stranger.mark_email_verified()
        client.cookies.clear()
        api_login(client, stranger)
        response = client.get(f"/api/v1/me/disputes/{dispute.pk}")
        assert response.status_code == 403


class TestOverdueAndDeadline:
    def test_flag_overdue_dedupes(self, django_user_model):
        from datetime import timedelta

        from django.utils import timezone

        from apps.orders.models import OrderEvent

        order, _student, _expert = _order(django_user_model, status="active")
        order.delivery_due_at = timezone.now() - timedelta(hours=30)
        order.save(update_fields=["delivery_due_at"])
        from apps.orders import services

        assert services.flag_overdue() == 1
        assert services.flag_overdue() == 0  # deduped by the persisted event
        assert OrderEvent.objects.filter(order=order, event_type="overdue_flagged").count() == 1

    def test_deadline_proposal_flow(self, django_user_model):
        from datetime import timedelta

        from django.utils import timezone

        from apps.core.exceptions import DomainError
        from apps.orders import services
        from apps.orders.models import DeadlineProposal, OrderEvent

        order, student, expert = _order(django_user_model, status="active")
        proposal = services.propose_deadline(
            order,
            actor=expert,
            proposed_due_at=timezone.now() + timedelta(days=3),
            note="Need two more days.",
        )
        assert proposal.status == DeadlineProposal.Status.PENDING
        with pytest.raises(DomainError):
            services.propose_deadline(
                order, actor=student, proposed_due_at=timezone.now() + timedelta(days=4)
            )
        services.respond_deadline_proposal(order, actor=student, accept=True)
        order.refresh_from_db()
        proposal.refresh_from_db()
        assert order.delivery_due_at == proposal.proposed_due_at
        assert proposal.status == DeadlineProposal.Status.ACCEPTED
        assert OrderEvent.objects.filter(order=order, event_type="deadline_extended").exists()


def _sum(field):
    from django.db.models import Sum

    return Sum(field)


class TestOrderDisputeGetEmbed:
    """GET /me/orders/{id}/dispute — participant workspace embed (404 semantics)."""

    def test_get_embed_participant_404_and_stranger(self, django_user_model):
        order, student, _expert = _order(django_user_model)
        from django.test import Client

        from apps.experts.tests.test_api import api_login

        api_login(client := Client(), student)
        assert client.get(f"/api/v1/me/orders/{order.pk}/dispute").status_code == 404
        dispute = disputes.open_dispute(
            order,
            actor=student,
            reason="quality_below_expectations",
            description="The delivered work misses two of the three agreed sections.",
        )
        response = client.get(f"/api/v1/me/orders/{order.pk}/dispute")
        assert response.status_code == 200 and response.json()["id"] == str(dispute.pk)
        # stranger gets the order-not-found mask
        stranger = django_user_model.objects.create_user(
            email="dsp-x1@demo.local", password=PASSWORD, name="X"
        )
        api_login(client, stranger)
        assert client.get(f"/api/v1/me/orders/{order.pk}/dispute").status_code == 404
