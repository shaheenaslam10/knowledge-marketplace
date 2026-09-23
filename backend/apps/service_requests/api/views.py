"""ServiceRequest API views — thin; authorization + rules live in services."""

from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.exceptions import PermissionDeniedError
from apps.core.pagination import DefaultCursorPagination
from apps.service_requests import services
from apps.service_requests.api.serializers import ServiceRequestSerializer
from apps.service_requests.models import ServiceRequest


def _write_payload(data: dict) -> dict:
    payload = dict(data)
    if "subject_id" in payload:  # serializer-style alias from the API contract
        payload["subject"] = payload.pop("subject_id")
    return {
        field: payload[field]
        for field in (
            "category",
            "title",
            "description",
            "subject",
            "pricing_type",
            "budget_min",
            "budget_max",
            "currency",
            "deadline",
            "preferred_schedule",
        )
        if field in payload
    }


class MyRequestListCreateView(generics.ListCreateAPIView):
    serializer_class = ServiceRequestSerializer
    pagination_class = DefaultCursorPagination

    def get_queryset(self):
        qs = ServiceRequest.objects.filter(student=self.request.user).prefetch_related(
            "skills", "attachments"
        )
        status_filter = self.request.query_params.get("status")
        return qs.filter(status=status_filter) if status_filter else qs

    def post(self, request, *args, **kwargs):
        payload = _write_payload(request.data)
        obj = services.create_request(
            request.user,
            payload=payload,
            skill_ids=request.data.get("skill_ids"),
            attachment_ids=request.data.get("attachment_ids"),
        )
        return Response(
            ServiceRequestSerializer(obj, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class MyRequestDetailView(APIView):
    def get(self, request, pk):
        obj = get_object_or_404(ServiceRequest, pk=pk, student=request.user)
        return Response(ServiceRequestSerializer(obj, context={"request": request}).data)

    def patch(self, request, pk):
        obj = ServiceRequest.objects.get(pk=pk, student=request.user)
        payload = _write_payload(request.data)
        obj = services.update_draft(
            request.user,
            obj,
            payload=payload,
            skill_ids=request.data.get("skill_ids"),
            attachment_ids=request.data.get("attachment_ids"),
        )
        return Response(ServiceRequestSerializer(obj, context={"request": request}).data)


class _MyRequestActionView(APIView):
    def _owned(self, request, pk) -> ServiceRequest:
        return get_object_or_404(ServiceRequest, pk=pk, student=request.user)


class MyRequestPublishView(_MyRequestActionView):
    def post(self, request, pk):
        obj = services.publish(
            request.user, self._owned(request, pk), attested=bool(request.data.get("attested"))
        )
        return Response(ServiceRequestSerializer(obj, context={"request": request}).data)


class MyRequestCancelView(_MyRequestActionView):
    def post(self, request, pk):
        obj = services.cancel(
            request.user, self._owned(request, pk), reason=request.data.get("reason", "")
        )
        return Response(ServiceRequestSerializer(obj, context={"request": request}).data)


class MyRequestReopenView(_MyRequestActionView):
    def post(self, request, pk):
        obj = services.reopen(request.user, self._owned(request, pk))
        return Response(ServiceRequestSerializer(obj, context={"request": request}).data)


class RequestFeedView(generics.ListAPIView):
    """Expert opportunity feed — eligible open requests, PostgreSQL filters only."""

    serializer_class = ServiceRequestSerializer
    pagination_class = DefaultCursorPagination
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not services.expert_is_eligible(user):
            raise PermissionDeniedError(
                "Only approved, available experts can browse opportunities."
            )
        qs = services.visible_queryset(user).select_related("subject").prefetch_related("skills")
        params = self.request.query_params
        if subject := params.get("subject"):
            qs = qs.filter(subject__slug=subject)
        if skill := params.get("skill"):
            qs = qs.filter(skills__slug=skill).distinct()
        if category := params.get("category"):
            qs = qs.filter(category=category)
        if pricing := params.get("pricing_type"):
            qs = qs.filter(pricing_type=pricing)
        if deadline := params.get("deadline_before"):
            qs = qs.filter(deadline__lte=deadline)
        if budget_min := params.get("budget_min"):
            qs = qs.filter(budget_max__gte=budget_min)  # expert's floor fits the student's ceiling
        if q := params.get("q"):
            from django.db.models import Q

            qs = qs.filter(Q(title__icontains=q) | Q(description__icontains=q))
        return qs


class RequestDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        obj = (
            ServiceRequest.objects.select_related("subject")
            .prefetch_related("skills", "attachments")
            .get(pk=pk)
        )
        if not services.user_can_view(request.user, obj):
            raise PermissionDeniedError("You do not have access to this request.")
        if obj.student_id != request.user.id and obj.is_open_for_offers:
            from django.db.models import F

            ServiceRequest.objects.filter(pk=obj.pk).update(view_count=F("view_count") + 1)
            obj.refresh_from_db(fields=["view_count"])
        return Response(ServiceRequestSerializer(obj, context={"request": request}).data)
