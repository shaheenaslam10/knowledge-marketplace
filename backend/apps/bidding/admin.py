"""Offer admin — offers are created/managed via services; admin observes."""

from django.contrib import admin

from apps.bidding.models import Offer


@admin.register(Offer)
class OfferAdmin(admin.ModelAdmin):
    list_display = ("request", "expert", "amount", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("expert__email", "request__title")
    readonly_fields = ("created_at", "updated_at", "responded_at")
