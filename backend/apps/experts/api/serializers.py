"""Experts API representation.

Two views of the world, kept apart:
- `MyExpertApplicationSerializer` — the applicant's OWN view (full detail incl.
  review note/rejection reason). Never served publicly.
- `PublicExpertSerializer` / `PublicExpertDetailSerializer` — directory output;
  NEVER private fields (credentials, notes, reviewer, emails, audit data).
"""

from rest_framework import serializers

from apps.experts.models import ExpertApplication, ExpertProfile


class TaxonomyRefSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    kind = serializers.CharField(read_only=True)
    name = serializers.CharField(read_only=True)
    slug = serializers.CharField(read_only=True)


class AttachmentRefSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    original_name = serializers.CharField(read_only=True)
    content_type = serializers.CharField(read_only=True)
    size = serializers.IntegerField(read_only=True)


class MyExpertApplicationSerializer(serializers.ModelSerializer):
    status = serializers.CharField(read_only=True)
    subjects = TaxonomyRefSerializer(many=True, read_only=True)
    skills = TaxonomyRefSerializer(many=True, read_only=True)
    credentials = AttachmentRefSerializer(many=True, read_only=True)
    rejection_reason = serializers.CharField(read_only=True, required=False, allow_blank=True)

    class Meta:
        model = ExpertApplication
        fields = [
            "status",
            "display_name",
            "headline",
            "bio",
            "expertise_summary",
            "experience_years",
            "qualifications",
            "languages",
            "timezone",
            "availability_note",
            "subjects",
            "skills",
            "credentials",
            "certified_18_plus",
            "integrity_acknowledged",
            "rejection_reason",
            "review_note",
            "submitted_at",
            "reviewed_at",
            "resubmission_count",
        ]
        read_only_fields = [
            f
            for f in fields
            if f
            not in {
                "display_name",
                "headline",
                "bio",
                "expertise_summary",
                "experience_years",
                "qualifications",
                "languages",
                "timezone",
                "availability_note",
                "certified_18_plus",
                "integrity_acknowledged",
            }
        ]


class PublicExpertSerializer(serializers.ModelSerializer):
    """Directory card + detail. No email, no credentials, no review data."""

    subjects = TaxonomyRefSerializer(many=True, read_only=True)
    skills = TaxonomyRefSerializer(many=True, read_only=True)
    availability = serializers.CharField(read_only=True)

    class Meta:
        model = ExpertProfile
        fields = [
            "slug",
            "display_name",
            "headline",
            "bio",
            "expertise_summary",
            "experience_years",
            "qualifications",
            "languages",
            "timezone",
            "availability",
            "subjects",
            "skills",
            "rating_avg",
            "rating_count",
            "completed_orders",
            "approved_at",
        ]
        read_only_fields = fields


class ExpertApplicationSubmitResponseSerializer(serializers.Serializer):
    detail = serializers.CharField()
    status = serializers.CharField()


class ExpertApplicationActionResponseSerializer(serializers.Serializer):
    detail = serializers.CharField()
    status = serializers.CharField()
