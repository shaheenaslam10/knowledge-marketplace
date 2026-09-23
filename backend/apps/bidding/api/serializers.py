"""Offer API serializers (thin — rules live in services)."""

from rest_framework import serializers

from apps.bidding.models import Offer
from apps.core.money import to_major
from apps.service_requests.api.serializers import ExpertCardSerializer


class OfferWriteSerializer(serializers.Serializer):
    amount = serializers.IntegerField(min_value=1)
    currency = serializers.CharField(default="USD")
    timeline_text = serializers.CharField(max_length=200)
    message = serializers.CharField()


class OfferSerializer(serializers.ModelSerializer):
    amount_display = serializers.SerializerMethodField()
    net_preview = serializers.SerializerMethodField()

    class Meta:
        model = Offer
        fields = [
            "id",
            "request",
            "amount",
            "amount_display",
            "currency",
            "timeline_text",
            "message",
            "status",
            "responded_at",
            "response_reason",
            "created_at",
            "net_preview",
        ]

    def get_amount_display(self, obj) -> float:
        return to_major(obj.amount, obj.currency)

    def get_net_preview(self, obj):
        from apps.bidding.services import net_preview

        return net_preview(obj.amount)


class OfferForStudentSerializer(OfferSerializer):
    """Student view of an offer on their own request — expert public card only."""

    expert = serializers.SerializerMethodField()

    class Meta(OfferSerializer.Meta):
        fields = [*OfferSerializer.Meta.fields, "expert"]

    def get_expert(self, obj):
        from apps.experts.models import ExpertProfile

        profile = ExpertProfile.objects.filter(pk=obj.expert_id).first()
        if profile is None:  # deleted/deactivated expert — never leak raw ids
            return None
        return ExpertCardSerializer(
            {
                "display_name": profile.display_name,
                "slug": profile.slug,
                "headline": profile.headline,
                "rating_avg": float(profile.rating_avg) if profile.rating_avg is not None else None,
                "reviews_count": profile.rating_count,
            }
        ).data
