"""ServiceRequest API serializers (thin — rules live in services)."""

from rest_framework import serializers

from apps.core.money import to_major
from apps.service_requests.models import ServiceRequest


class ServiceRequestWriteSerializer(serializers.ModelSerializer):
    skill_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False, allow_empty=True
    )
    attachment_ids = serializers.ListField(
        child=serializers.UUIDField(), required=False, allow_empty=True
    )
    subject_id = serializers.UUIDField(required=False, allow_null=True)

    class Meta:
        model = ServiceRequest
        fields = [
            "category",
            "title",
            "description",
            "subject_id",
            "skill_ids",
            "pricing_type",
            "budget_min",
            "budget_max",
            "currency",
            "deadline",
            "preferred_schedule",
            "attachment_ids",
        ]

    def validate(self, attrs):
        if "subject_id" in attrs:
            attrs["subject"] = attrs.pop("subject_id")
        return attrs


class AttachmentMetaSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    original_name = serializers.CharField()
    size = serializers.IntegerField()
    content_type = serializers.CharField()


class OfferSummarySerializer(serializers.Serializer):
    """Blind-bidding summary: counts only — never other experts' identities (BR-05)."""

    offer_count = serializers.IntegerField()
    my_offer_status = serializers.CharField(allow_null=True)


class ExpertCardSerializer(serializers.Serializer):
    display_name = serializers.CharField()
    slug = serializers.CharField()
    headline = serializers.CharField()
    rating_avg = serializers.FloatField(allow_null=True)
    reviews_count = serializers.IntegerField()


class ServiceRequestSerializer(serializers.ModelSerializer):
    student_view = serializers.SerializerMethodField()
    subject = serializers.SerializerMethodField()
    skills = serializers.SerializerMethodField()
    attachments = AttachmentMetaSerializer(many=True, read_only=True)
    budget_min_display = serializers.SerializerMethodField()
    budget_max_display = serializers.SerializerMethodField()
    bidding = serializers.SerializerMethodField()

    class Meta:
        model = ServiceRequest
        fields = [
            "id",
            "mode",
            "category",
            "title",
            "description",
            "subject",
            "skills",
            "pricing_type",
            "budget_min",
            "budget_max",
            "budget_min_display",
            "budget_max_display",
            "currency",
            "deadline",
            "preferred_schedule",
            "status",
            "offer_count",
            "view_count",
            "expires_at",
            "closed_reason",
            "attachments",
            "created_at",
            "updated_at",
            "student_view",
            "bidding",
        ]

    def _is_owner(self, obj) -> bool:
        request = self.context.get("request")
        return request is not None and obj.student_id == request.user.id

    def get_student_view(self, obj) -> bool:
        return self._is_owner(obj)

    def get_subject(self, obj):
        return (
            {"id": obj.subject_id, "name": obj.subject.name, "slug": obj.subject.slug}
            if obj.subject
            else None
        )

    def get_skills(self, obj):
        return [{"id": s.id, "name": s.name, "slug": s.slug} for s in obj.skills.all()]

    def _money(self, obj, minor) -> float | None:
        return to_major(minor, obj.currency) if minor is not None else None

    def get_budget_min_display(self, obj):
        return self._money(obj, obj.budget_min)

    def get_budget_max_display(self, obj):
        return self._money(obj, obj.budget_max)

    def get_bidding(self, obj):
        """Owner: my offers exist. Expert: blind count + own offer status."""
        request = self.context.get("request")
        if request is None or request.user.is_anonymous:
            return None
        if obj.student_id == request.user.id:
            return {"offers": obj.offer_count}
        my = obj.offers.filter(expert_id=request.user.id).values_list("status", flat=True).first()
        return {"offer_count": obj.offer_count, "my_offer_status": my}


class TaxonomyLiteSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    name = serializers.CharField()
    slug = serializers.SlugField()
    kind = serializers.CharField()
