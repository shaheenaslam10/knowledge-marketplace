"""Test-only URLconf: the real API + admin PLUS permission-guarded probe views
used by the authorization tests (everything reachable in one urlconf)."""

from django.contrib import admin
from django.urls import include, path
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdmin, IsExpert, IsSupport, IsVerified
from config.api import urls_v1 as config_api_urls_v1


def _probe(permission):
    class Probe(APIView):
        permission_classes = [permission]

        def get(self, request):
            return Response({"ok": True, "user_id": request.user.id})

    return Probe.as_view()


probe_urlpatterns = [
    path("probe/authenticated", _probe(IsAuthenticated)),
    path("probe/admin", _probe(IsAdmin)),
    path("probe/support", _probe(IsSupport)),
    path("probe/expert", _probe(IsExpert)),
    path("probe/verified", _probe(IsVerified)),
]

urlpatterns = [
    *probe_urlpatterns,
    path("api/v1/", include(config_api_urls_v1)),
    path("admin/", admin.site.urls),
]
