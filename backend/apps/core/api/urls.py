from django.urls import path

from apps.core.api.views import PublicPricingView

urlpatterns = [
    path("platform/pricing", PublicPricingView.as_view(), name="platform-pricing"),
]
