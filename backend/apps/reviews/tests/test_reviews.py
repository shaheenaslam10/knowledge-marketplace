"""Phase 9 reviews tests — eligibility, edit/reply rules, weighted aggregate."""

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.bidding import services as bidding  # noqa: F401  (layer sanity)
from apps.core.exceptions import DomainError, PermissionDeniedError
from apps.experts.tests.test_api import PASSWORD, api_login, make_expert
from apps.orders import services as order_services
from apps.reviews import services as reviews
from apps.reviews.models import Review
from apps.service_requests import services as request_services
from apps.taxonomy.services import ensure_term

pytestmark = pytest.mark.django_db

PDF = SimpleUploadedFile("r.pdf", b"%PDF-1.4\n" + b"r" * 64)


@pytest.fixture
def users(django_user_model):
    student = django_user_model.objects.create_user(
        email="rev-s@demo.local", password=PASSWORD, name="S"
    )
    expert = make_expert(django_user_model, "rev-e@demo.local", "E")
    return student, expert


@pytest.fixture
def completed_order(users, django_user_model, admin_user):
    """admin_user fixture: is_staff user for the payment seam."""
    student, expert = users
    subject = ensure_term(kind="subject", name="RevSub")[0]
    request = request_services.create_request(
        student,
        payload={
            "category": "tutoring",
            "title": "Review order",
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
        amount=7000,
        currency="USD",
        source=order_services.Order.Source.OPEN_BID,
    )
    order = order_services.mark_paid(order, actor=admin_user, via="manual")
    order_services.submit_delivery(
        order, expert=expert, summary="All sessions completed with notes for the student."
    )
    return order_services.approve_delivery(order, actor=student)


class TestEligibility:
    def test_student_reviews_completed_order(self, users, completed_order):
        student, expert = users
        review = reviews.submit_review(
            completed_order,
            actor=student,
            rating=5,
            body="Fantastic structured sessions throughout.",
        )
        assert review.status == Review.Status.PUBLISHED
        assert review.expert_id == expert.id

    def test_only_order_student_can_review(self, users, completed_order, django_user_model):
        stranger = django_user_model.objects.create_user(
            email="rev-x@demo.local", password=PASSWORD, name="X"
        )
        with pytest.raises(PermissionDeniedError):
            reviews.submit_review(
                completed_order,
                actor=stranger,
                rating=5,
                body="Completely unauthorized review text.",
            )

    def test_non_completed_order_rejected(self, users, django_user_model, admin_user):
        student, expert = users
        subject = ensure_term(kind="subject", name="RevSub2")[0]
        request = request_services.create_request(
            student,
            payload={
                "category": "tutoring",
                "title": "T",
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
            amount=7000,
            currency="USD",
            source=order_services.Order.Source.OPEN_BID,
        )
        with pytest.raises(DomainError, match="completed"):
            reviews.submit_review(
                order, actor=student, rating=4, body="Too early to review this one."
            )

    def test_one_review_per_order(self, users, completed_order):
        student, _ = users
        reviews.submit_review(
            completed_order, actor=student, rating=4, body="Good overall experience."
        )
        with pytest.raises(DomainError, match="already"):
            reviews.submit_review(
                completed_order, actor=student, rating=2, body="Trying to review again."
            )

    def test_rating_validation(self, users, completed_order):
        student, _ = users
        with pytest.raises(DomainError, match="between 1 and 5"):
            reviews.submit_review(
                completed_order, actor=student, rating=6, body="Rating out of range here."
            )
        with pytest.raises(DomainError, match="20 characters"):
            reviews.submit_review(completed_order, actor=student, rating=4, body="short")


class TestEditAndReply:
    def test_author_edits_until_reply(self, users, completed_order):
        student, expert = users
        review = reviews.submit_review(
            completed_order, actor=student, rating=3, body="Initial average experience."
        )
        reviews.edit_review(
            review, actor=student, rating=4, body="Improved after the first session honestly."
        )
        review.refresh_from_db()
        assert review.rating == 4 and review.edited_at is not None
        with pytest.raises(PermissionDeniedError):
            reviews.edit_review(review, actor=expert, rating=1, body="Expert cannot edit reviews.")

    def test_edit_locked_after_reply(self, users, completed_order):
        student, expert = users
        review = reviews.submit_review(
            completed_order, actor=student, rating=4, body="Solid work overall throughout."
        )
        reviews.reply_to_review(
            review, actor=expert, reply="Thanks! It was a pleasure working together."
        )
        with pytest.raises(DomainError, match="expert reply"):
            reviews.edit_review(
                review, actor=student, rating=5, body="Trying to change after reply."
            )

    def test_expert_replies_once(self, users, completed_order):
        student, expert = users
        review = reviews.submit_review(
            completed_order, actor=student, rating=4, body="Very good sessions, clear notes."
        )
        reviews.reply_to_review(
            review, actor=expert, reply="Thank you for the thoughtful feedback!"
        )
        with pytest.raises(DomainError, match="already"):
            reviews.reply_to_review(review, actor=expert, reply="Second reply attempt here.")
        with pytest.raises(PermissionDeniedError):
            reviews.reply_to_review(review, actor=student, reply="Student cannot reply to self.")


class TestWeightedAggregate:
    def test_zero_reviews(self, users):
        _, expert = users
        assert reviews.weighted_aggregate(expert.id) == (None, 0)

    def test_recency_weighting(self, users, django_user_model):
        from django.utils import timezone

        student = django_user_model.objects.create_user(
            email="rev-s2@demo.local", password=PASSWORD, name="S2"
        )
        student2 = django_user_model.objects.create_user(
            email="rev-s3@demo.local", password=PASSWORD, name="S3"
        )
        _, expert = users
        old = Review.objects.create(
            order=None if False else _order_for(django_user_model, student, expert, "WA1"),
            author=student,
            expert=expert,
            rating=5,
            body="Five stars long ago review text.",
        )
        Review.objects.filter(pk=old.pk).update(
            created_at=timezone.now() - timezone.timedelta(days=730)
        )
        _order_for(django_user_model, student2, expert, "WA2")  # ensure distinct completed order
        recent_order = _order_for(django_user_model, student2, expert, "WA2")
        Review.objects.create(
            order=recent_order,
            author=student2,
            expert=expert,
            rating=1,
            body="One star recent review text.",
        )
        # old 5★ (2y → weight .25) vs recent 1★ (weight 1): recent dominates
        avg, count = reviews.weighted_aggregate(expert.id)
        assert count == 2
        assert avg < 2.5  # recent review pulls far more weight

    def test_hidden_reviews_excluded_and_profile_updated(self, users, completed_order, admin_user):
        student, expert = users
        review = reviews.submit_review(
            completed_order, actor=student, rating=2, body="Mediocre at best overall."
        )
        from apps.experts.models import ExpertProfile

        profile = ExpertProfile.objects.get(pk=expert.id)
        profile.refresh_from_db()
        assert profile.rating_count == 1 and float(profile.rating_avg) == 2.0
        reviews.set_hidden(review, actor=admin_user, hidden=True)
        profile.refresh_from_db()
        assert profile.rating_count == 0 and profile.rating_avg is None
        assert reviews.weighted_aggregate(expert.id) == (None, 0)

    def test_only_published_count_public_endpoint(self, client, users, completed_order):
        student, expert = users
        reviews.submit_review(
            completed_order,
            actor=student,
            rating=5,
            body="Outstanding service, highly recommended.",
        )
        api_login(client, student)  # public endpoint needs no auth
        from django.test import Client

        anon = Client()
        response = anon.get(f"/api/v1/experts/{expert.expert_profile.slug}/reviews")
        assert response.status_code == 200
        body = response.json()
        assert body["rating_count"] == 1 and body["rating_avg"] == 5.0
        assert body["results"][0]["rating"] == 5

    def test_reply_rest_and_private_student_rating(self, client, users, completed_order):
        student, expert = users
        review = reviews.submit_review(
            completed_order, actor=student, rating=4, body="Very professional delivery."
        )
        api_login(client, expert)
        response = client.post(
            f"/api/v1/reviews/{review.pk}/reply",
            data='{"reply": "Thank you! Great communication as well.", "rating_of_student": 5}',
            content_type="application/json",
        )
        assert response.status_code == 200 and response.json()["expert_reply"]
        review.refresh_from_db()
        assert review.expert_rating_of_student == 5  # stored but never serialized publicly
        payload = response.json()
        assert "expert_rating_of_student" not in payload


def _order_for(django_user_model, student, expert, suffix):
    request = request_services.create_request(
        student,
        payload={
            "category": "tutoring",
            "title": f"WA {suffix}",
            "description": "d" * 40,
            "subject": ensure_term(kind="subject", name=f"RevSubWA{suffix}")[0],
            "budget_max": 9000,
        },
    )
    request = request_services.publish(student, request, attested=True)
    request_services.mark_matched(request)
    order = order_services.create_order_for_request(
        request,
        expert=expert,
        amount=7000,
        currency="USD",
        source=order_services.Order.Source.OPEN_BID,
    )
    order = order_services.mark_paid(order, actor=_admin(django_user_model), via="manual")
    order_services.submit_delivery(order, expert=expert, summary="Completed delivery summary text.")
    return order_services.approve_delivery(order, actor=student)


def _admin(django_user_model):
    return django_user_model.objects.get_or_create(
        email="rev-admin@demo.local", defaults={"is_staff": True, "name": "RA"}
    )[0]
