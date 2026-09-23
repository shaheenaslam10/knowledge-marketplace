"""Expert-facing assignment endpoints — ownership + eligibility in services."""

from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.assignments import services
from apps.assignments.api.serializers import DirectAssignmentSerializer, PoolInvitationSerializer
from apps.assignments.models import DirectAssignment, PoolInvitation


class MyInvitationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        invitations = PoolInvitation.objects.filter(expert=request.user).select_related(
            "request__subject"
        )
        return Response({"results": PoolInvitationSerializer(invitations, many=True).data})


class MyAssignmentListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        assignments = DirectAssignment.objects.filter(expert=request.user).select_related(
            "request__subject"
        )
        return Response({"results": DirectAssignmentSerializer(assignments, many=True).data})


class _OwnedInvitationView(APIView):
    permission_classes = [IsAuthenticated]

    def _invitation(self, request, pk) -> PoolInvitation:
        return get_object_or_404(
            PoolInvitation.objects.select_related("request"), pk=pk, expert=request.user
        )


class InvitationAcceptView(_OwnedInvitationView):
    def post(self, request, pk):
        expected = request.data.get("expected_amount")
        invitation, order = services.accept_invitation(
            request.user,
            self._invitation(request, pk),
            expected_amount=int(expected) if expected is not None else None,
        )
        return Response(
            {
                "invitation": PoolInvitationSerializer(invitation).data,
                "order": {
                    "id": str(order.pk),
                    "number": order.number,
                    "status": order.status,
                    "amount_display": order.amount / 100,
                    "source": order.source,
                },
            }
        )


class InvitationDeclineView(_OwnedInvitationView):
    def post(self, request, pk):
        invitation = services.decline_invitation(
            request.user, self._invitation(request, pk), reason=request.data.get("reason", "")
        )
        return Response(PoolInvitationSerializer(invitation).data)


class _OwnedAssignmentView(APIView):
    permission_classes = [IsAuthenticated]

    def _assignment(self, request, pk) -> DirectAssignment:
        return get_object_or_404(
            DirectAssignment.objects.select_related("request"), pk=pk, expert=request.user
        )


class AssignmentAcceptView(_OwnedAssignmentView):
    def post(self, request, pk):
        assignment, order = services.accept_direct(request.user, self._assignment(request, pk))
        return Response(
            {
                "assignment": DirectAssignmentSerializer(assignment).data,
                "order": {
                    "id": str(order.pk),
                    "number": order.number,
                    "status": order.status,
                    "amount_display": order.amount / 100,
                    "source": order.source,
                },
            }
        )


class AssignmentDeclineView(_OwnedAssignmentView):
    def post(self, request, pk):
        assignment = services.decline_direct(
            request.user, self._assignment(request, pk), reason=request.data.get("reason", "")
        )
        return Response(DirectAssignmentSerializer(assignment).data)
