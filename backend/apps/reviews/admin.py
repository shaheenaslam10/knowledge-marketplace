"""Reviews admin — read-only board; hide/unhide via the audited service action."""

from django.contrib import admin

from apps.reviews.models import Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("__str__", "expert", "rating", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("body", "expert__email")
    readonly_fields = [f.name for f in Review._meta.fields]

    @admin.action(description="Hide review (moderation)")
    def hide(self, request, queryset):
        from apps.reviews import services

        for review in queryset:
            services.set_hidden(review, actor=request.user, hidden=True)

    @admin.action(description="Restore review")
    def unhide(self, request, queryset):
        from apps.reviews import services

        for review in queryset:
            services.set_hidden(review, actor=request.user, hidden=False)

    actions = ["hide", "unhide"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
