"""Experts API — directory (public), application (owner), expert profile (owner).

Thin views: authn/authz → services. Business rules never live here.
"""

from django.core import exceptions as django_exceptions
from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.exceptions import DomainError
from apps.core.pagination import DefaultCursorPagination
from apps.experts.api.serializers import (
    ExpertApplicationSubmitResponseSerializer,
    MyExpertApplicationSerializer,
    PublicExpertSerializer,
)
from apps.experts.services import (
    apply as apply_service,
)
from apps.experts.services import (
    directory_queryset,
    get_application_for,
    get_public_expert,
    submit_application,
    update_application,
    update_expert_profile,
)

from .serializers import TaxonomyRefSerializer

# ---------------------------------------------------------------------------
# Application input — multipart form fields (drf-spectacular contract)
# ---------------------------------------------------------------------------


class ExpertApplicationInputSerializer(serializers.Serializer):
    display_name = serializers.CharField(max_length=150)
    headline = serializers.CharField(max_length=120)
    bio = serializers.CharField(max_length=2000)
    expertise_summary = serializers.CharField(max_length=500)
    experience_years = serializers.IntegerField(
        min_value=0, max_value=60, required=False, default=0
    )
    qualifications = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    languages = serializers.CharField(max_length=200, required=False, allow_blank=True)
    timezone = serializers.CharField(max_length=63, required=False, default="UTC")
    availability_note = serializers.CharField(max_length=300, required=False, allow_blank=True)
    subject_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False, default=list, max_length=20
    )
    skill_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False, default=list, max_length=30
    )
    certified_18_plus = serializers.BooleanField()
    integrity_acknowledged = serializers.BooleanField()


def AvailabilityChoices():
    from apps.experts.models import ExpertProfile

    return ExpertProfile.Availability.choices


class ExpertProfileUpdateSerializer(serializers.Serializer):
    display_name = serializers.CharField(max_length=150, required=False)
    headline = serializers.CharField(max_length=120, required=False)
    bio = serializers.CharField(max_length=2000, required=False)
    expertise_summary = serializers.CharField(max_length=500, required=False)
    experience_years = serializers.IntegerField(min_value=0, max_value=60, required=False)
    qualifications = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    languages = serializers.CharField(max_length=200, required=False, allow_blank=True)
    timezone = serializers.CharField(max_length=63, required=False)
    availability = serializers.ChoiceField(choices=AvailabilityChoices(), required=False)
    is_public = serializers.BooleanField(required=False)
    subject_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False, max_length=20
    )
    skill_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False, max_length=30
    )


class ExpertDirectoryPagination(DefaultCursorPagination):
    ordering = ["-rating_avg", "-approved_at", "-pk"]


def _taxonomy_ids(request, key: str) -> list[int]:
    raw = (
        request.data.getlist(key)
        if hasattr(request.data, "getlist")
        else request.data.get(key) or []
    )
    ids = []
    for value in raw:
        try:
            ids.append(int(value))
        except (TypeError, ValueError):
            raise DomainError(f"Invalid {key} entry.", code="validation_error") from None
    return ids


def _application_data_from_request(request, *, partial: bool = False) -> tuple[dict, list]:
    from apps.taxonomy.models import TaxonomyTerm

    serializer = ExpertApplicationInputSerializer(data=request.data, partial=partial)
    serializer.is_valid(raise_exception=True)
    data = dict(serializer.validated_data)
    subject_ids = data.pop("subject_ids", [])
    skill_ids = data.pop("skill_ids", [])

    def resolve_terms(ids: list[int], kinds: tuple[str, ...]):
        terms = TaxonomyTerm.objects.filter(id__in=ids, is_active=True, kind__in=kinds)
        found = {t.id for t in terms}
        unknown = [i for i in ids if i not in found]
        if unknown:
            raise DomainError(
                "Unknown taxonomy terms.", code="validation_error", details={"ids": unknown}
            )
        return list(terms)

    payload = {
        "subjects": resolve_terms(subject_ids, ("subject", "category")),
        "skills": resolve_terms(skill_ids, ("skill",)),
    }
    if hasattr(request.data, "getlist"):
        # multipart/form-data: repeated fields arrive as a list
        credential_ids = request.data.getlist("credential_ids")
    else:
        raw_ids = request.data.get("credential_ids")
        if isinstance(raw_ids, (list, tuple)):
            credential_ids = list(raw_ids)  # JSON body: {"credential_ids": ["<uuid>", …]}
        elif raw_ids:
            credential_ids = [raw_ids]
        else:
            credential_ids = []
    credential_ids = [c for c in (credential_ids or []) if c]
    # Credentials are uploaded FIRST via POST /files (upload-first contract),
    # then referenced here — this endpoint validates ownership.
    from apps.files.models import Attachment

    if credential_ids:
        try:
            credentials = Attachment.objects.filter(id__in=credential_ids, uploader=request.user)
            matched = credentials.count()
        except (django_exceptions.ValidationError, ValueError):
            # malformed ids (not UUIDs) must be a 400 envelope, never a 500
            raise DomainError(
                "Invalid credential reference (files must be your own uploads).",
                code="validation_error",
            ) from None
        if matched != len(set(credential_ids)):
            raise DomainError(
                "Invalid credential reference (files must be your own uploads).",
                code="validation_error",
            )
        payload["credential_attachments"] = list(credentials)
    return data, payload


# ---------------------------------------------------------------------------
# Public directory
# ---------------------------------------------------------------------------


class ExpertDirectoryView(APIView):
    """`GET /api/v1/experts` — public directory: approved experts only."""

    permission_classes = [AllowAny]

    @extend_schema(
        responses={200: PublicExpertSerializer(many=True)},
        description="Public expert directory. Only approved, non-suspended, public-visibility "
        "experts appear. Filters: `q` (name/headline/bio search), `subject` (taxonomy slug), "
        "`skill` (taxonomy slug), `rating_min`. Cursor-paginated (`cursor`, `page_size`).",
    )
    def get(self, request):
        from django.db.models import Q

        qs = directory_queryset()
        q = request.query_params.get("q")
        if q:
            qs = qs.filter(
                Q(display_name__icontains=q)
                | Q(headline__icontains=q)
                | Q(bio__icontains=q)
                | Q(expertise_summary__icontains=q)
            )
        subject = request.query_params.get("subject")
        if subject:
            qs = qs.filter(subjects__slug=subject)
        skill = request.query_params.get("skill")
        if skill:
            qs = qs.filter(skills__slug=skill)
        rating_min = request.query_params.get("rating_min")
        if rating_min:
            try:
                qs = qs.filter(rating_avg__gte=float(rating_min))
            except ValueError:
                raise DomainError("rating_min must be a number.", code="validation_error") from None
        qs = qs.distinct()
        paginator = ExpertDirectoryPagination()
        page = paginator.paginate_queryset(qs, request)
        return paginator.get_paginated_response(PublicExpertSerializer(page, many=True).data)


class ExpertPublicDetailView(APIView):
    """`GET /api/v1/experts/{slug}` — public profile (same visibility rules)."""

    permission_classes = [AllowAny]

    @extend_schema(responses={200: PublicExpertSerializer, 404: None})
    def get(self, request, slug: str):
        return Response(PublicExpertSerializer(get_public_expert(slug)).data)


# ---------------------------------------------------------------------------
# Own application + profile
# ---------------------------------------------------------------------------


class MyExpertApplicationView(APIView):
    """`GET /status` of the caller's own expert application."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: MyExpertApplicationSerializer},
        description="Returns 200 with "
        '`{"application": null}` when no application exists yet (lifecycle: not_applied).',
    )
    def get(self, request):
        application = get_application_for(request.user)
        if application is None:
            return Response({"application": None, "status": "not_applied"})
        return Response(
            {
                "application": MyExpertApplicationSerializer(application).data,
                "status": application.status,
            }
        )

    @extend_schema(
        request=ExpertApplicationInputSerializer,
        responses={200: MyExpertApplicationSerializer, 403: None, 404: None},
        description="Creates (draft) or edits the caller's own application. Edits are allowed only "
        "in draft/submitted/rejected states; review locks the application. Credentials are "
        "referenced by id (upload first via POST /files, purpose=credential).",
    )
    def post(self, request):
        data, payload = _application_data_from_request(request)
        application = apply_service(
            request.user, data=data, credential_attachments=payload.get("credential_attachments")
        )
        self._set_terms(application, payload)
        return Response(
            {
                "application": MyExpertApplicationSerializer(application).data,
                "status": application.status,
            },
            status=status.HTTP_201_CREATED,
        )

    @extend_schema(
        request=ExpertApplicationInputSerializer,
        responses={200: MyExpertApplicationSerializer, 403: None, 404: None},
        description="Partial edit of the caller's own application (draft/submitted/rejected only).",
    )
    def patch(self, request):
        data, payload = _application_data_from_request(request, partial=True)
        application = update_application(
            request.user, fields=data, credential_attachments=payload.get("credential_attachments")
        )
        self._set_terms(application, payload)
        return Response(
            {
                "application": MyExpertApplicationSerializer(application).data,
                "status": application.status,
            }
        )

    @staticmethod
    def _set_terms(application, payload: dict) -> None:
        if "subjects" in payload:
            application.subjects.set(payload["subjects"])
        if "skills" in payload:
            application.skills.set(payload["skills"])


class MyApplicationSubmitView(APIView):
    """`POST /api/v1/me/expert-application/submit` — draft/rejected → submitted."""

    permission_classes = [IsAuthenticated]
    throttle_scope = "auth"  # submission is a rare, sensitive action — same guard

    @extend_schema(
        request=None,
        responses={200: ExpertApplicationSubmitResponseSerializer, 400: None, 404: None},
        description="Validates completeness + attestations (18+, integrity acknowledgment, ≥1 "
        "credential, verified email) and moves the application to `submitted`. Rejected "
        "applications may be resubmitted.",
    )
    def post(self, request):
        application = submit_application(request.user, request=request)
        return Response(
            {"detail": "Application submitted for review.", "status": application.status}
        )


class MyExpertProfileView(APIView):
    """`GET/PATCH /api/v1/me/expert-profile` — owner-only expert profile."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: PublicExpertSerializer, 404: None},
        description="The caller's own expert profile (exists only after approval).",
    )
    def get(self, request):
        from apps.experts.services import require_own_profile

        return Response(PublicExpertSerializer(require_own_profile(request.user)).data)

    @extend_schema(
        request=ExpertProfileUpdateSerializer, responses={200: PublicExpertSerializer, 404: None}
    )
    def patch(self, request):
        serializer = ExpertProfileUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)
        from apps.taxonomy.models import TaxonomyTerm

        subject_ids = data.pop("subject_ids", None)
        skill_ids = data.pop("skill_ids", None)
        profile = update_expert_profile(request.user, fields=data)
        if subject_ids is not None:
            profile.subjects.set(
                TaxonomyTerm.objects.filter(id__in=subject_ids, kind__in=["subject", "category"])
            )
        if skill_ids is not None:
            profile.skills.set(TaxonomyTerm.objects.filter(id__in=skill_ids, kind="skill"))
        return Response(PublicExpertSerializer(profile).data)


class ExpertApplyInfoResponseSerializer(serializers.Serializer):
    requirements = serializers.DictField(child=serializers.JSONField())
    taxonomy = TaxonomyRefSerializer(many=True)


class ExpertApplyInfoView(APIView):
    """`GET /api/v1/experts/apply-info` — public requirements for the apply form
    (upload contract, attestations, taxonomy ids). No personal data."""

    permission_classes = [AllowAny]

    @extend_schema(
        responses={200: ExpertApplyInfoResponseSerializer},
        description="Static requirements + reference data for the expert application form.",
    )
    def get(self, request):
        from apps.files.services import PURPOSE_RULES
        from apps.taxonomy.services import list_terms

        rule = PURPOSE_RULES["credential"]
        terms = list_terms()
        return Response(
            {
                "requirements": {
                    "credential": {
                        "max_mb": rule.max_bytes // (1024 * 1024),
                        "extensions": sorted(rule.extensions),
                        "minimum_files": 1,
                    },
                    "attestations": ["certified_18_plus", "integrity_acknowledged"],
                    "requires_verified_email": True,
                    "upload_path": "/api/v1/files (multipart, purpose=credential)",
                    "review_sla": "typically within 48 hours",
                },
                "taxonomy": TaxonomyRefSerializer(terms, many=True).data,
            }
        )


class ExpertApplyInfoResponseSerializer(serializers.Serializer):
    requirements = serializers.DictField(child=serializers.JSONField())
    taxonomy = TaxonomyRefSerializer(many=True)
