from django.urls import path

from apps.reviews.api import views

urlpatterns = [
    path(
        "me/orders/<int:order_id>/review",
        views.OrderReviewView.as_view(),
        name="order-review",
    ),
    path("me/reviews/<int:review_id>", views.MyReviewEditView.as_view(), name="review-edit"),
    path("reviews/<int:review_id>/reply", views.ReviewReplyView.as_view(), name="review-reply"),
    path(
        "experts/<slug:slug>/reviews",
        views.ExpertPublicReviewsView.as_view(),
        name="expert-reviews",
    ),
]
