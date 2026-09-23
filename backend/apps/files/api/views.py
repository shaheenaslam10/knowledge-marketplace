"""Files API — upload, download-url grant, and the local streaming view.

Thin views: authn → services. Business rules (allowlists, dedupe, access)
live in files.services.
"""

from django.core.files.uploadedfile import UploadedFile as DjangoUploadedFile
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit.services import log as audit_log
from apps.core.exceptions import NotFoundError, PermissionDeniedError
from apps.files.models import Attachment
from apps.files.services import (
    PURPOSE_RULES,
    grant_download,
    resolve_download_token,
    store_upload,
)
from apps.files.services import (
    download_url as build_download_url,
)

from .serializers import (
    AttachmentSerializer,
    DownloadUrlResponseSerializer,
    FileUploadRequestSerializer,
    UploadResponseSerializer,
)


class FileUploadView(APIView):
    """`POST /api/v1/files` — multipart upload; upload-first, owners link later."""

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(
        request=FileUploadRequestSerializer,
        responses={201: UploadResponseSerializer, 400: None},
        description="Uploads a file for an allowed purpose (credential: pdf/png/jpg ≤10 MB private; "
        "avatar: png/jpg/webp ≤2 MB public). Returns the attachment id for owner objects to reference. "
        "Identical re-uploads by the same user are deduplicated.",
    )
    def post(self, request):
        purpose = request.data.get("purpose")
        uploaded: DjangoUploadedFile | None = request.FILES.get("file")
        attachment, deduplicated = store_upload(
            request.user, purpose=purpose, uploaded_file=uploaded
        )
        return Response(
            {
                "attachment": AttachmentSerializer(attachment).data,
                "deduplicated": deduplicated,
            },
            status=status.HTTP_201_CREATED,
        )


class FileMetadataView(APIView):
    """`GET /api/v1/files/{id}` — metadata for the uploader or staff."""

    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: AttachmentSerializer, 403: None, 404: None})
    def get(self, request, attachment_id: str):
        attachment = self._get(attachment_id)
        if not grant_download(request.user, attachment):
            raise PermissionDeniedError("You do not have access to this file.")
        return Response(AttachmentSerializer(attachment).data)

    @staticmethod
    def _get(attachment_id: str) -> Attachment:
        attachment = Attachment.objects.filter(id=attachment_id).first()
        if attachment is None:
            raise NotFoundError("File not found.")
        return attachment


class FileDownloadUrlView(APIView):
    """`GET /api/v1/files/{id}/download-url` — grants a short-lived download URL.

    Local/dev: signed 5-minute token against the streaming view. Every staff
    view of a private credential is audited (docs/workflows/files.md §5).
    """

    permission_classes = [AllowAny]

    @extend_schema(responses={200: DownloadUrlResponseSerializer, 403: None, 404: None})
    def get(self, request, attachment_id: str):
        attachment = FileMetadataView._get(attachment_id)
        if not grant_download(request.user, attachment):
            raise PermissionDeniedError("You do not have access to this file.")
        if (
            attachment.access == Attachment.Access.PRIVATE
            and request.user.is_authenticated
            and request.user.is_staff
            and request.user.pk != attachment.uploader_id
        ):
            audit_log(
                request.user,
                action="files.credential_viewed",
                obj=attachment,
                detail={"purpose": attachment.purpose},
                request=request,
            )
        return Response({"url": build_download_url(request, attachment), "expires_in": 300})


class FileDownloadView(APIView):
    """`GET /api/v1/files/{id}/download?token=` — signed local streaming (public
    avatars need no token). Streams via FileResponse with disposition + nosniff."""

    permission_classes = [AllowAny]

    def get(self, request, attachment_id: str):
        import mimetypes

        from django.http import FileResponse

        attachment = FileMetadataView._get(attachment_id)
        if attachment.access == Attachment.Access.PUBLIC:
            as_attachment = False  # avatars render in <img>
        else:
            resolve_download_token(attachment_id, request.query_params.get("token"))
            as_attachment = True
        content_type = attachment.content_type or (
            mimetypes.guess_type(attachment.original_name)[0] or "application/octet-stream"
        )
        response = FileResponse(attachment.file.open("rb"), content_type=content_type)
        disposition = "inline" if not as_attachment else "attachment"
        response["Content-Disposition"] = f'{disposition}; filename="{attachment.original_name}"'
        response["X-Content-Type-Options"] = "nosniff"
        return response


def allowed_purposes() -> list[str]:
    """Exposed for docs/tests — the purposes this phase accepts."""
    return list(PURPOSE_RULES)
