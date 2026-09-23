"""Assignment API serializers (thin — rules live in services)."""

from rest_framework import serializers

from apps.core.money import to_major


class PoolInvitationSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    request = serializers.UUIDField(source="request_id")
    request_title = serializers.CharField(source="request.title")
    request_subject = serializers.CharField(
        source="request.subject.name", allow_null=True, default=None
    )
    request_budget_max = serializers.SerializerMethodField()
    quote_amount_display = serializers.SerializerMethodField()
    status = serializers.CharField()
    expected_amount = serializers.IntegerField(allow_null=True)
    decline_reason = serializers.CharField()
    expires_at = serializers.DateTimeField()
    created_at = serializers.DateTimeField()

    def get_request_budget_max(self, obj) -> float | None:
        if obj.request.budget_max is None:
            return None
        return to_major(obj.request.budget_max, obj.request.currency)

    def get_quote_amount_display(self, obj) -> float | None:
        if obj.request.quote_amount is None:
            return None
        return to_major(obj.request.quote_amount, obj.request.currency)


class DirectAssignmentSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    request = serializers.UUIDField(source="request_id")
    request_title = serializers.CharField(source="request.title")
    request_subject = serializers.CharField(
        source="request.subject.name", allow_null=True, default=None
    )
    amount_display = serializers.SerializerMethodField()
    currency = serializers.CharField()
    deadline = serializers.DateField(allow_null=True)
    scope_note = serializers.CharField()
    status = serializers.CharField()
    decline_reason = serializers.CharField()
    expires_at = serializers.DateTimeField()
    created_at = serializers.DateTimeField()

    def get_amount_display(self, obj) -> float:
        return to_major(obj.amount, obj.currency)
