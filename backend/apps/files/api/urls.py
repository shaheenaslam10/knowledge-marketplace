"""Files API URLConf — mounted at /api/v1/files by config.api."""

from django.urls import path

from . import views

urlpatterns = [
    path("files", views.FileUploadView.as_view(), name="file-upload"),
    path("files/<uuid:attachment_id>", views.FileMetadataView.as_view(), name="file-metadata"),
    path(
        "files/<uuid:attachment_id>/download-url",
        views.FileDownloadUrlView.as_view(),
        name="file-download-url",
    ),
    path(
        "files/<uuid:attachment_id>/download",
        views.FileDownloadView.as_view(),
        name="file-download",
    ),
]
