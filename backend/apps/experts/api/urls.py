"""Experts API URLConf — mounted at /api/v1 by config.api."""

from django.urls import path

from . import views

urlpatterns = [
    # public directory
    path("experts", views.ExpertDirectoryView.as_view(), name="expert-directory"),
    path("experts/apply-info", views.ExpertApplyInfoView.as_view(), name="expert-apply-info"),
    path(
        "experts/<slug:slug>", views.ExpertPublicDetailView.as_view(), name="expert-public-detail"
    ),
    # own application (create/edit/submit)
    path(
        "me/expert-application",
        views.MyExpertApplicationView.as_view(),
        name="my-expert-application",
    ),
    path(
        "me/expert-application/submit",
        views.MyApplicationSubmitView.as_view(),
        name="my-expert-application-submit",
    ),
    # own expert profile (post-approval)
    path("me/expert-profile", views.MyExpertProfileView.as_view(), name="my-expert-profile"),
]
