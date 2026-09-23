"""Attachment admin — read-mostly; files are never modified via admin."""

from django.contrib import admin

from apps.files.models import Attachment


@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ("original_name", "purpose", "access", "uploader", "size", "created_at")
    list_filter = ("purpose", "access")
    search_fields = ("original_name", "uploader__email", "sha256")
    readonly_fields = (
        "id",
        "uploader",
        "purpose",
        "access",
        "file",
        "original_name",
        "content_type",
        "size",
        "sha256",
        "created_at",
        "updated_at",
    )
