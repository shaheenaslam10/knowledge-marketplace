from django.urls import path

from apps.bidding.api import views

urlpatterns = [
    path("requests/<uuid:request_id>/offers", views.OfferCreateView.as_view(), name="offer-create"),
    path("me/offers", views.MyOfferListView.as_view(), name="my-offers"),
    path("me/offers/<uuid:pk>", views.MyOfferDetailView.as_view(), name="my-offer-detail"),
    path(
        "me/offers/<uuid:pk>/withdraw",
        views.MyOfferWithdrawView.as_view(),
        name="my-offer-withdraw",
    ),
    path(
        "me/offers/<uuid:pk>/resubmit",
        views.MyOfferResubmitView.as_view(),
        name="my-offer-resubmit",
    ),
    path(
        "me/requests/<uuid:request_id>/offers",
        views.RequestOfferListView.as_view(),
        name="request-offers",
    ),
    path(
        "me/requests/<uuid:request_id>/offers/<uuid:offer_id>/accept",
        views.OfferAcceptView.as_view(),
        name="offer-accept",
    ),
    path(
        "me/requests/<uuid:request_id>/offers/<uuid:offer_id>/decline",
        views.OfferDeclineView.as_view(),
        name="offer-decline",
    ),
]
