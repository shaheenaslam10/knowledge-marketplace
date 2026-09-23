"""Root URL configuration.

Layout (docs/architecture/api.md):
  /healthz /readyz        infrastructure probes (root level, no versioning)
  /api/v1/                versioned REST API (config.api.router)
  /api/schema/            OpenAPI 3 contract + Swagger/Redoc UIs
  /<ADMIN_URL>/           Django admin back office (obfuscated in prod)
"""

from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

from apps.core.views import healthz, not_found, readyz
from config import api

handler404 = not_found

urlpatterns = [
    path(settings.ADMIN_URL, admin.site.urls),
    path("healthz", healthz, name="health"),
    path("readyz", readyz, name="readiness"),
    path("api/v1/", include(api.urls_v1)),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/schema/swagger-ui",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path("api/schema/redoc", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]
