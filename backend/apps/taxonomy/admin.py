"""Taxonomy admin — CRUD for curating the subject tree."""

from django.contrib import admin

from .models import TaxonomyTerm


@admin.register(TaxonomyTerm)
class TaxonomyTermAdmin(admin.ModelAdmin):
    list_display = ("name", "kind", "parent", "slug", "is_active", "created_at")
    list_filter = ("kind", "is_active")
    search_fields = ("name", "description", "slug")
    ordering = ("kind", "name")
