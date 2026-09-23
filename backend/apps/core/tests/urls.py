"""Test-only URLconf: a view that raises configured exception kinds,
used to verify the error envelope through the real DRF handling path."""

from django.urls import path
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.core.exceptions import ConflictError, DomainError


@api_view(["GET"])
@permission_classes([AllowAny])
def explode(request):
    kind = request.query_params.get("kind")
    if kind == "domain":
        raise DomainError("boom", code="custom_code", details={"field": "x"})
    if kind == "conflict":
        raise ConflictError("already accepted")
    if kind == "validation":
        raise ValidationError({"amount": ["must be positive"]})
    if kind == "unhandled":
        raise RuntimeError("kaboom")
    if kind == "throttled":
        from rest_framework.exceptions import Throttled

        raise Throttled()
    return Response({"ok": True})


urlpatterns = [
    path("explode", explode),
]
