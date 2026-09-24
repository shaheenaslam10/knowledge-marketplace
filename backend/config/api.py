"""API versioning foundation.

v1 is the first and only version. Rules (docs/architecture/api.md):
- additive changes any time; breaking changes require /api/v2 plus a deprecation window
- domain routers get mounted here by their owning apps in later phases
"""

from django.conf import settings
from django.urls import include, path
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.api import views
from apps.core.middleware import get_request_id


class ApiRootView(APIView):
    """Directory of the current API version (also a smoke-check surface)."""

    permission_classes = [AllowAny]  # public index; everything else defaults to IsAuthenticated
    schema_exclude = True  # noise in the schema; the real contract is the endpoints

    def get(self, request, *args, **kwargs):
        return Response(
            {
                "name": "Hybrid Expert Marketplace API",
                "version": settings.APP_VERSION,
                "request_id": get_request_id(),
                "endpoints": {
                    "schema": request.build_absolute_uri("/api/schema/"),
                    "health": request.build_absolute_uri("/healthz"),
                },
                "note": "Domain resources land with their phases (docs/process/roadmap-phases.md).",
            }
        )


urlpatterns = [
    path("", ApiRootView.as_view(), name="api-root"),
    path("auth/", include("apps.accounts.api.urls")),
    path("me", views.MeView.as_view(), name="me"),  # no include: avoids APPEND_SLASH on /me
    path("me/deactivate", views.DeactivateView.as_view(), name="me-deactivate"),
    # Phase 3 — profiles, experts, taxonomy, files
    path("me/", include("apps.accounts.api.me_urls")),  # student-profile (sub-path only)
    path("", include("apps.taxonomy.api.urls")),
    path("", include("apps.files.api.urls")),
    path("", include("apps.experts.api.urls")),
    path("", include("apps.service_requests.api.urls")),
    path("", include("apps.bidding.api.urls")),
    path("", include("apps.assignments.api.urls")),
    path("", include("apps.orders.api.urls")),
    path("", include("apps.payments.api.urls")),
    path("", include("apps.messaging.api.urls")),
    path("", include("apps.messaging.api.urls_message_reports")),  # Phase 9 (BR-34)
    path("", include("apps.reviews.api.urls")),  # Phase 9
    path("", include("apps.disputes.api.urls")),  # Phase 9
    path("", include("apps.notifications.api.urls")),
]
urls_v1 = urlpatterns
