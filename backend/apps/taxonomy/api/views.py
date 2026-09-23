"""Public taxonomy list (directory filters, application forms, interests)."""

from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.taxonomy.services import list_terms

from .serializers import TaxonomyListResponseSerializer, TaxonomyTermSerializer


class TaxonomyListView(APIView):
    """`GET /api/v1/taxonomy/terms?kind=subject&parent=&q=` — public reference data."""

    permission_classes = [AllowAny]

    @extend_schema(
        responses={200: TaxonomyListResponseSerializer},
        description="Public taxonomy terms. Filter by kind (category|subject|skill|tag), "
        "parent id, or a case-insensitive name/description search.",
    )
    def get(self, request):
        terms = list_terms(
            kind=request.query_params.get("kind") or None,
            parent_id=request.query_params.get("parent") or None,
            q=request.query_params.get("q") or None,
        )
        return Response({"terms": TaxonomyTermSerializer(terms, many=True).data})
