"""Taxonomy API representation."""

from rest_framework import serializers

from apps.taxonomy.models import TaxonomyTerm


class TaxonomyTermSerializer(serializers.ModelSerializer):
    parent = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = TaxonomyTerm
        fields = ["id", "kind", "name", "slug", "description", "parent"]
        read_only_fields = fields


class TaxonomyListResponseSerializer(serializers.Serializer):
    terms = TaxonomyTermSerializer(many=True)
