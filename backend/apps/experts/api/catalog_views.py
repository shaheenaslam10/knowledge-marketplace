"""Catalog API views — public product listing, detail, purchase, and specialist publisher."""

from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.pagination import DefaultCursorPagination
from apps.experts import catalog_services as svc
from apps.experts.models import KnowledgeProduct, KnowledgePurchase

# ---------------------------------------------------------------------------
# Serializers
# ---------------------------------------------------------------------------


class KnowledgeProductSerializer(serializers.ModelSerializer):
    expert_slug = serializers.CharField(source="expert.slug", read_only=True)
    expert_name = serializers.CharField(source="expert.display_name", read_only=True)
    subject_slug = serializers.CharField(source="subject.slug", read_only=True, default=None)
    subject_name = serializers.CharField(source="subject.name", read_only=True, default=None)
    price_display = serializers.SerializerMethodField()

    class Meta:
        model = KnowledgeProduct
        fields = [
            "id",
            "slug",
            "title",
            "summary",
            "description",
            "product_type",
            "price_minor",
            "price_display",
            "currency",
            "status",
            "expert_slug",
            "expert_name",
            "subject_slug",
            "subject_name",
            "sales_count",
            "max_seats",
            "enrolled_count",
            "cohort_scheduled_at",
            "live_room_code",
            "published_at",
            "created_at",
        ]

    def get_price_display(self, obj: KnowledgeProduct) -> str:
        dollars = obj.price_minor / 100
        return f"${dollars:.2f}"


class KnowledgePurchaseSerializer(serializers.ModelSerializer):
    product = KnowledgeProductSerializer(read_only=True)
    can_download = serializers.SerializerMethodField()

    class Meta:
        model = KnowledgePurchase
        fields = ["id", "product", "amount_minor", "currency", "download_count", "created_at", "can_download"]

    def get_can_download(self, obj: KnowledgePurchase) -> bool:
        return obj.product.file_id is not None


class PublishProductInputSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200)
    summary = serializers.CharField(max_length=500)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    product_type = serializers.ChoiceField(choices=KnowledgeProduct.ProductType.choices)
    price_minor = serializers.IntegerField(min_value=100)
    currency = serializers.CharField(max_length=3, default="USD", required=False)
    subject_id = serializers.IntegerField(required=False, allow_null=True)
    file_id = serializers.UUIDField(required=False, allow_null=True)
    cover_image_id = serializers.UUIDField(required=False, allow_null=True)


class UpdateProductInputSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200, required=False)
    summary = serializers.CharField(max_length=500, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    price_minor = serializers.IntegerField(min_value=100, required=False)
    currency = serializers.CharField(max_length=3, required=False)
    subject_id = serializers.IntegerField(required=False, allow_null=True)
    file_id = serializers.UUIDField(required=False, allow_null=True)
    cover_image_id = serializers.UUIDField(required=False, allow_null=True)
    publish = serializers.BooleanField(required=False, default=False)


# ---------------------------------------------------------------------------
# Public catalog views
# ---------------------------------------------------------------------------


class CatalogListView(APIView):
    """`GET /api/v1/catalog` — public paginated catalog of published products."""

    permission_classes = [AllowAny]

    @extend_schema(
        responses={200: KnowledgeProductSerializer(many=True)},
        description="Public catalog of published knowledge products. "
        "Filters: `q` (FTS search), `subject` (slug), `type` (product_type), "
        "`page_size`. Cursor-paginated.",
    )
    def get(self, request):
        q = request.query_params.get("q")
        subject_slug = request.query_params.get("subject")
        product_type = request.query_params.get("type")
        qs = svc.search_catalog(q=q, subject_slug=subject_slug, product_type=product_type)

        paginator = DefaultCursorPagination()
        paginator.ordering = ["-published_at", "-created_at"]
        page = paginator.paginate_queryset(qs, request)
        return paginator.get_paginated_response(KnowledgeProductSerializer(page, many=True).data)


class CatalogDetailView(APIView):
    """`GET /api/v1/catalog/{slug}` — public product detail."""

    permission_classes = [AllowAny]

    @extend_schema(responses={200: KnowledgeProductSerializer, 404: None})
    def get(self, request, slug: str):
        product = svc.get_product_by_slug(slug)
        data = KnowledgeProductSerializer(product).data
        # Add purchase flag if authenticated
        if request.user and request.user.is_authenticated:
            data["already_purchased"] = svc.has_purchased(request.user, product)
        else:
            data["already_purchased"] = False
        return Response(data)


class CatalogPurchaseView(APIView):
    """`POST /api/v1/catalog/{slug}/purchase` — instant purchase of a knowledge product."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=None,
        responses={201: KnowledgePurchaseSerializer, 400: None, 404: None},
        description="Purchase the product. Creates three ledger entries atomically "
        "(charge, commission, expert_credit). Returns the KnowledgePurchase record.",
    )
    def post(self, request, slug: str):
        product = svc.get_product_by_slug(slug)
        purchase = svc.purchase_knowledge_product(product, buyer=request.user)
        return Response(KnowledgePurchaseSerializer(purchase).data, status=status.HTTP_201_CREATED)


class MyCatalogPurchasesView(APIView):
    """`GET /api/v1/me/catalog-purchases` — buyer's purchase history."""

    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: KnowledgePurchaseSerializer(many=True)})
    def get(self, request):
        purchases = svc.get_my_purchases(request.user)
        return Response(KnowledgePurchaseSerializer(purchases, many=True).data)


# ---------------------------------------------------------------------------
# Specialist publisher studio
# ---------------------------------------------------------------------------


class MyProductsView(APIView):
    """`GET/POST /api/v1/me/expert/products` — specialist's own product catalog."""

    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: KnowledgeProductSerializer(many=True)})
    def get(self, request):
        products = svc.list_my_products(request.user)
        return Response(KnowledgeProductSerializer(products, many=True).data)

    @extend_schema(
        request=PublishProductInputSerializer,
        responses={201: KnowledgeProductSerializer, 400: None, 403: None},
        description="Publish a new knowledge product. Status is set to `published` immediately.",
    )
    def post(self, request):
        ser = PublishProductInputSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        expert_profile = svc.require_expert_profile(request.user)
        product = svc.publish_product(expert_profile, dict(ser.validated_data))
        return Response(KnowledgeProductSerializer(product).data, status=status.HTTP_201_CREATED)


class MyProductDetailView(APIView):
    """`PATCH /api/v1/me/expert/products/{slug}` — update a specialist's own product."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=UpdateProductInputSerializer,
        responses={200: KnowledgeProductSerializer, 400: None, 403: None, 404: None},
    )
    def patch(self, request, slug: str):
        ser = UpdateProductInputSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        product = svc.update_product(request.user, slug, dict(ser.validated_data))
        return Response(KnowledgeProductSerializer(product).data)
