"""Experts API URLConf — mounted at /api/v1 by config.api."""

from django.urls import path

from . import views
from .catalog_views import (
    CatalogDetailView,
    CatalogListView,
    CatalogPurchaseView,
    MyCatalogPurchasesView,
    MyProductDetailView,
    MyProductsView,
)

urlpatterns = [
    # public directory
    path("experts", views.ExpertDirectoryView.as_view(), name="expert-directory"),
    path("experts/apply-info", views.ExpertApplyInfoView.as_view(), name="expert-apply-info"),
    path(
        "experts/<slug:slug>", views.ExpertPublicDetailView.as_view(), name="expert-public-detail"
    ),
    # public subject landing pages (seo-ux.md) — discovery over the directory,
    # so they live with the directory rather than in the taxonomy app.
    path("subjects", views.PublicSubjectListView.as_view(), name="public-subject-list"),
    path(
        "subjects/<slug:slug>",
        views.PublicSubjectDetailView.as_view(),
        name="public-subject-detail",
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
    # --- Sprint 4: Knowledge Catalog (public) ---
    path("catalog", CatalogListView.as_view(), name="catalog-list"),
    path("catalog/<slug:slug>", CatalogDetailView.as_view(), name="catalog-detail"),
    path("catalog/<slug:slug>/purchase", CatalogPurchaseView.as_view(), name="catalog-purchase"),
    # --- Sprint 4: Buyer purchase history ---
    path("me/catalog-purchases", MyCatalogPurchasesView.as_view(), name="my-catalog-purchases"),
    # --- Sprint 4: Specialist publisher studio ---
    path("me/expert/products", MyProductsView.as_view(), name="my-expert-products"),
    path(
        "me/expert/products/<slug:slug>",
        MyProductDetailView.as_view(),
        name="my-expert-product-detail",
    ),
]
