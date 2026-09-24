from django.urls import path

from apps.disputes.api import views

urlpatterns = [
    path(
        "me/orders/<int:order_id>/dispute", views.OrderDisputeView.as_view(), name="order-dispute"
    ),
    path("me/disputes/<uuid:dispute_id>", views.MyDisputeDetailView.as_view(), name="my-dispute"),
    path(
        "me/disputes/<uuid:dispute_id>/evidence",
        views.DisputeEvidenceView.as_view(),
        name="dispute-evidence",
    ),
]
