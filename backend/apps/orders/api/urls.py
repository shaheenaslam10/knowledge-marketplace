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
]
