"""Student onboarding surface — `GET/PATCH /api/v1/me/student-profile`.

Self-service by design (role-onboarding decision): a student never needs admin
approval; this endpoint lazily creates the profile on first save.
"""

from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.api.student_serializers import StudentProfileSerializer
from apps.accounts.models import StudentProfile
from apps.taxonomy.models import TaxonomyTerm


class StudentProfileResponseSerializer(serializers.Serializer):
    profile = StudentProfileSerializer(allow_null=True)


class StudentProfileView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: StudentProfileResponseSerializer},
        description="The caller's student profile; `null` until onboarding is completed "
        "(students are never approval-gated).",
    )
    def get(self, request):
        profile = StudentProfile.objects.filter(user=request.user).first()
        return Response({"profile": StudentProfileSerializer(profile).data if profile else None})

    @extend_schema(
        request=StudentProfileSerializer,
        responses={200: StudentProfileResponseSerializer},
        description="Creates or updates the caller's student profile (idempotent onboarding). "
        "Interest ids must reference active taxonomy terms of kind subject/skill.",
    )
    def patch(self, request):
        serializer = StudentProfileSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)
        interest_ids = data.pop("interest_ids", None)
        profile, _ = StudentProfile.objects.get_or_create(user=request.user)
        for field in ("display_name", "bio"):
            if field in data:
                setattr(profile, field, data[field])
        profile.save()
        if interest_ids is not None:
            profile.interests.set(TaxonomyTerm.objects.filter(id__in=interest_ids))
        return Response({"profile": StudentProfileSerializer(profile).data})
