"""Student-profile API — self-service onboarding (no approval gate, BR-01/BR-03)."""

from rest_framework import serializers

from apps.accounts.models import StudentProfile


class StudentProfileSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    bio = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    interest_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        default=None,
        max_length=30,
        write_only=True,
    )
    interests = serializers.SerializerMethodField()

    class Meta:
        model = StudentProfile
        fields = ["display_name", "bio", "interests", "interest_ids", "created_at", "updated_at"]
        read_only_fields = ["created_at", "updated_at"]

    def get_interests(self, obj) -> list:
        return [
            {"id": t.id, "name": t.name, "slug": t.slug, "kind": t.kind}
            for t in obj.interests.all()
        ]

    def validate_interest_ids(self, value):
        if not value:
            return []
        from apps.taxonomy.models import TaxonomyTerm

        terms = TaxonomyTerm.objects.filter(
            id__in=value, is_active=True, kind__in=["subject", "skill"]
        )
        if terms.count() != len(set(value)):
            raise serializers.ValidationError("Unknown interest terms.")
        return value
