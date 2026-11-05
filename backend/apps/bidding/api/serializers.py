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
    """Student view of an offer on their own request — expert public card with Smart Match."""

    expert = serializers.SerializerMethodField()
    match_score = serializers.SerializerMethodField()
    match_reasons = serializers.SerializerMethodField()

    class Meta(OfferSerializer.Meta):
        fields = [*OfferSerializer.Meta.fields, "expert", "match_score", "match_reasons"]

    def _compute_smart_match(self, obj) -> tuple[int, list[str]]:
        if hasattr(obj, "_cached_smart_match"):
            return obj._cached_smart_match
        from apps.experts.models import ExpertProfile

        profile = ExpertProfile.objects.filter(pk=obj.expert_id).first()
        if not profile:
            return (85, ["Verified Specialist"])

        score = 72
        reasons: list[str] = []
        req = getattr(obj, "request", None)

        if req and getattr(req, "subject_id", None) and profile.subjects.filter(pk=req.subject_id).exists():
            score += 15
            subj_name = getattr(req.subject, "name", "Subject")
            reasons.append(f"Subject Specialist in {subj_name}")

        if profile.rating_avg and float(profile.rating_avg) >= 4.5:
            score += 8
            reasons.append(f"{float(profile.rating_avg):.1f}★ Top Rated Specialist")
        elif profile.completed_orders > 0:
            score += 4
            reasons.append(f"{profile.completed_orders}+ Completed Mentorships")

        if req and getattr(req, "budget_max", None) and obj.amount <= req.budget_max:
            score += 5
            reasons.append("Within Requested Budget")
        else:
            reasons.append("100% Escrow Protected")

        final_score = min(99, max(85, score))
        result = (final_score, reasons)
        obj._cached_smart_match = result
        return result

    def get_match_score(self, obj) -> int:
        return self._compute_smart_match(obj)[0]

    def get_match_reasons(self, obj) -> list[str]:
        return self._compute_smart_match(obj)[1]

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
