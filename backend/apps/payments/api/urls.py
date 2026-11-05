from django.urls import path

from apps.payments.api import views

urlpatterns = [
    path(
        "payments/webhooks/<str:provider>",
        views.WebhookIngestView.as_view(),
        name="payment-webhook",
    ),
    path("me/earnings", views.MyEarningsView.as_view(), name="my-earnings"),
    path("me/payouts", views.MyPayoutListView.as_view(), name="my-payouts"),
    path("me/expert/earnings", views.SpecialistEarningsView.as_view(), name="specialist-earnings"),
    path("me/expert/earnings/", views.SpecialistEarningsView.as_view(), name="specialist-earnings-slash"),
    path("me/expert/payouts/request", views.SpecialistPayoutRequestView.as_view(), name="specialist-payout-request"),
    path("me/expert/payouts/request/", views.SpecialistPayoutRequestView.as_view(), name="specialist-payout-request-slash"),
]
