"""Taxonomy API URLConf — mounted at /api/v1 by config.api."""

from django.urls import path

from . import views

urlpatterns = [
    path("taxonomy/terms", views.TaxonomyListView.as_view(), name="taxonomy-terms"),
]
