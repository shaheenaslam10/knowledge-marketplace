"""Reviews API — student submit/edit, expert reply, public list."""

from __future__ import annotations

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.exceptions import NotFoundError
from apps.orders.models import Order
from apps.reviews import services
from apps.reviews.api.serializers import review_payload
from apps.reviews.models import Review


def _get_review(review_id: str) -> Review:
    review = Review.objects.select_related("order").filter(pk=review_id).first()
    if review is None:
        raise NotFoundError("Review not found.")
    return review


class OrderReviewView(APIView):
    """POST /api/v1/me/orders/{id}/review — student submits (BR-37).
    GET — the order's review for participants (workspace embed, 404 if none)."""

    permission_classes = [IsAuthenticated]

    def _participant_order(self, request, order_id: str) -> Order | None:
        order = Order.objects.filter(pk=order_id).first()
        if order is None:
            return None
        if request.user.id != order.student_id and request.user.id != order.expert_id:
            return None
        return order

    def get(self, request, order_id: str):
        order = self._participant_order(request, order_id)
        if order is None:
            raise NotFoundError("Order not found.")
        review = Review.objects.filter(order=order).select_related("order").first()
        if review is None:
            raise NotFoundError("No review on this order yet.")
        return Response(review_payload(review))

    def post(self, request, order_id: str):
        order = Order.objects.filter(pk=order_id).first()
        if order is None:
            raise NotFoundError("Order not found.")
        data = request.data or {}
        review = services.submit_review(
            order,
            actor=request.user,
            rating=data.get("rating"),
            body=str(data.get("body", "")),
            sub_quality=data.get("sub_quality"),
            sub_communication=data.get("sub_communication"),
            sub_timeliness=data.get("sub_timeliness"),
        )
        return Response(review_payload(review), status=201)


class MyReviewEditView(APIView):
    """PATCH /api/v1/me/reviews/{id} — author edits until the expert replies."""

    permission_classes = [IsAuthenticated]

    def patch(self, request, review_id: str):
        review = _get_review(review_id)
        data = request.data or {}
        review = services.edit_review(
            review,
            actor=request.user,
            rating=data.get("rating"),
            body=data.get("body"),
            sub_quality=data.get("sub_quality"),
            sub_communication=data.get("sub_communication"),
            sub_timeliness=data.get("sub_timeliness"),
        )
        return Response(review_payload(review))


class ReviewReplyView(APIView):
    """POST /api/v1/reviews/{id}/reply — expert answers once (BR-37)."""

    permission_classes = [IsAuthenticated]

    def post(self, request, review_id: str):
        review = _get_review(review_id)
        data = request.data or {}
        review = services.reply_to_review(
            review,
            actor=request.user,
            reply=str(data.get("reply", "")),
            rating_of_student=data.get("rating_of_student"),
        )
        return Response(review_payload(review))


class ExpertPublicReviewsView(APIView):
    """GET /api/v1/experts/{slug}/reviews — published reviews (public)."""

    permission_classes = []

    def get(self, request, slug: str):
        from apps.experts.services import directory_queryset

        profile = directory_queryset().filter(slug=slug).first()
        if profile is None:
            raise NotFoundError("Expert not found.")
        reviews = services.public_reviews(profile.pk)
        rating_avg, rating_count = services.weighted_aggregate(profile.pk)
        return Response(
            {
                "rating_avg": rating_avg,
                "rating_count": rating_count,
                "results": [review_payload(r) for r in reviews],
            }
        )


class MyReceivedReviewsView(APIView):
    """GET /api/v1/me/reviews — the signed-in expert's published reviews
    (newest first) for the expert-side "Received reviews" panel."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        reviews = (
            Review.objects.filter(expert=request.user, status=Review.Status.PUBLISHED)
            .select_related("order")
            .order_by("-created_at")
        )
        return Response({"results": [review_payload(r) for r in reviews]})
