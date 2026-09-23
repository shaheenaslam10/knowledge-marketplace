from django.urls import path

from apps.service_requests.api import views

urlpatterns = [
    path("me/requests", views.MyRequestListCreateView.as_view(), name="my-requests"),
    path("me/requests/<uuid:pk>", views.MyRequestDetailView.as_view(), name="my-request-detail"),
    path(
        "me/requests/<uuid:pk>/publish",
        views.MyRequestPublishView.as_view(),
        name="my-request-publish",
    ),
    path(
        "me/requests/<uuid:pk>/cancel",
        views.MyRequestCancelView.as_view(),
        name="my-request-cancel",
    ),
    path(
        "me/requests/<uuid:pk>/reopen",
        views.MyRequestReopenView.as_view(),
        name="my-request-reopen",
    ),
    path("requests", views.RequestFeedView.as_view(), name="request-feed"),
    path("requests/<uuid:pk>", views.RequestDetailView.as_view(), name="request-detail"),
]
