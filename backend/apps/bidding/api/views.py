"""Offer API views — thin; authorization + rules live in services."""

from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.bidding import services
from apps.bidding.api.serializers import (
    OfferForStudentSerializer,
    OfferSerializer,
    OfferWriteSerializer,
)
from apps.bidding.models import Offer
from apps.core.pagination import DefaultCursorPagination
from apps.service_requests.api.serializers import ServiceRequestSerializer
from apps.service_requests.models import ServiceRequest


class OfferCreateView(APIView):
    """POST /requests/{request_id}/offers — expert submits (BR-15)."""

    permission_classes = [IsAuthenticated]

    def post(self, request, request_id):
        service_request = get_object_or_404(ServiceRequest, pk=request_id)
        payload = OfferWriteSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        offer = services.submit(request.user, service_request, payload=payload.validated_data)
        return Response(OfferSerializer(offer).data, status=status.HTTP_201_CREATED)


class MyOfferListView(generics.ListAPIView):
    """GET /me/offers — expert's own offers across requests."""

    serializer_class = OfferSerializer
    pagination_class = DefaultCursorPagination

    def get_queryset(self):
        return Offer.objects.filter(expert=self.request.user).select_related("request")


class _MyOfferView(APIView):
    permission_classes = [IsAuthenticated]

    def _offer(self, request, pk) -> Offer:
        return get_object_or_404(Offer.objects.select_related("request"), pk=pk)


class MyOfferDetailView(_MyOfferView):
    """PATCH /me/offers/{id} — edit while pending (BR-15)."""

    def patch(self, request, pk):
        offer = self._offer(request, pk)
        allowed = {
            f: request.data[f]
            for f in ("amount", "currency", "timeline_text", "message")
            if f in request.data
        }
        offer = services.update_offer(request.user, offer, payload=allowed)
        return Response(OfferSerializer(offer).data)


class MyOfferWithdrawView(_MyOfferView):
    def post(self, request, pk):
        offer = services.withdraw(request.user, self._offer(request, pk))
        return Response(OfferSerializer(offer).data)


class MyOfferResubmitView(_MyOfferView):
    def post(self, request, pk):
        offer = services.resubmit(request.user, self._offer(request, pk))
        return Response(OfferSerializer(offer).data)


class RequestOfferListView(APIView):
    """GET /me/requests/{id}/offers — owner sees offers with expert cards."""

    permission_classes = [IsAuthenticated]

    def get(self, request, request_id):
        service_request = get_object_or_404(ServiceRequest, pk=request_id, student=request.user)
        offers = service_request.offers.select_related("request").prefetch_related(
            "expert__expert_profile"
        )
        return Response(
            {
                "count": offers.count(),
                "results": OfferForStudentSerializer(
                    [
                        o
                        for o in offers
                        if o.status != Offer.Status.DECLINED or o.response_reason == ""
                    ],
                    many=True,
                ).data,
            }
        )


class _StudentOfferActionView(APIView):
    permission_classes = [IsAuthenticated]

    def _offer(self, request, request_id, offer_id) -> Offer:
        return get_object_or_404(
            Offer.objects.select_related("request"), pk=offer_id, request_id=request_id
        )


class OfferAcceptView(_StudentOfferActionView):
    """POST /me/requests/{id}/offers/{offer_id}/accept — the selection."""

    def post(self, request, request_id, offer_id):
        offer, order = services.accept(request.user, self._offer(request, request_id, offer_id))
        return Response(
            {
                "offer": OfferForStudentSerializer(offer).data,
                "order": {
                    "id": str(order.pk),
                    "number": order.number,
                    "status": order.status,
                    "amount_display": order.amount / 100,
                    "expert": order.expert_name,
                },
                "request": ServiceRequestSerializer(
                    offer.request, context={"request": request}
                ).data,
            }
        )


class OfferDeclineView(_StudentOfferActionView):
    def post(self, request, request_id, offer_id):
        offer = services.decline(
            request.user,
            self._offer(request, request_id, offer_id),
            reason=request.data.get("reason", ""),
        )
        return Response(OfferForStudentSerializer(offer).data)
