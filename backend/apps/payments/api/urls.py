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
]
