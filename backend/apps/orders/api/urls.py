from django.urls import path

from apps.orders.api import views

urlpatterns = [
    path("me/orders", views.MyOrderListView.as_view(), name="my-orders"),
    path("me/orders/<int:pk>", views.MyOrderDetailView.as_view(), name="my-order-detail"),
    path("me/orders/<int:pk>/deliveries", views.OrderDeliverView.as_view(), name="order-deliver"),
    path("me/orders/<int:pk>/approve", views.OrderApproveView.as_view(), name="order-approve"),
    path(
        "me/orders/<int:pk>/request-revision",
        views.OrderRevisionView.as_view(),
        name="order-revision",
    ),
    path("me/orders/<int:pk>/cancel", views.OrderCancelView.as_view(), name="order-cancel"),
    path("me/orders/<int:pk>/pay", views.OrderPayView.as_view(), name="order-pay"),
    path(
        "me/orders/<int:pk>/payment/confirm",
        views.OrderPaymentConfirmView.as_view(),
        name="order-payment-confirm",
    ),
    path(
        "me/orders/<int:pk>/deadline-proposal",
        views.OrderDeadlineProposalView.as_view(),
        name="order-deadline-proposal",
    ),
    path(
        "me/orders/<int:pk>/deadline-proposal/respond",
        views.OrderDeadlineProposalRespondView.as_view(),
        name="order-deadline-proposal-respond",
    ),
    path(
        "me/orders/<int:pk>/live-session",
        views.OrderLiveSessionView.as_view(),
        name="order-live-session",
    ),
    path(
        "me/orders/<int:pk>/live-session/end",
        views.OrderLiveSessionEndView.as_view(),
        name="order-live-session-end",
    ),
    path(
        "me/orders/<int:pk>/live-session/ics",
        views.OrderLiveSessionIcsView.as_view(),
        name="order-live-session-ics",
    ),
    # Aliases
    path(
        "orders/<int:pk>/deadline-proposals/",
        views.OrderDeadlineProposalView.as_view(),
        name="orders-deadline-proposals-alias",
    ),
    path(
        "orders/<int:pk>/deadline-proposals/respond/",
        views.OrderDeadlineProposalRespondView.as_view(),
        name="orders-deadline-proposals-respond-alias",
    ),
    path(
        "orders/<int:pk>/deadline-proposals/<int:proposal_id>/respond/",
        views.OrderDeadlineProposalRespondView.as_view(),
        name="orders-deadline-proposal-id-respond-alias",
    ),
    path(
        "orders/<int:pk>/live-session/",
        views.OrderLiveSessionView.as_view(),
        name="orders-live-session-alias",
    ),
    path(
        "orders/<int:pk>/live-session/end/",
        views.OrderLiveSessionEndView.as_view(),
        name="orders-live-session-end-alias",
    ),
    path(
        "orders/<int:pk>/live-session/ics/",
        views.OrderLiveSessionIcsView.as_view(),
        name="orders-live-session-ics-alias",
    ),
    # Sprint 5: Direct 1:1 Instant Consultation Speed-Booking & Student Vault
    path("experts/<slug:slug>/book-session", views.BookExpertSessionView.as_view(), name="expert-book-session"),
    path("experts/<slug:slug>/book-session/", views.BookExpertSessionView.as_view(), name="expert-book-session-slash"),
    path("me/vault", views.StudentVaultView.as_view(), name="my-vault"),
    path("me/vault/", views.StudentVaultView.as_view(), name="my-vault-slash"),]
