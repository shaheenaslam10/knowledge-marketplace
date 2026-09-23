"""Files API representation — metadata only, never storage paths."""

from rest_framework import serializers

from apps.files.models import Attachment


class AttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attachment
        fields = ["id", "purpose", "access", "original_name", "content_type", "size", "created_at"]
        read_only_fields = fields


class UploadResponseSerializer(serializers.Serializer):
    attachment = AttachmentSerializer()
    deduplicated = serializers.BooleanField()


class DownloadUrlResponseSerializer(serializers.Serializer):
    url = serializers.URLField()
    expires_in = serializers.IntegerField()


class FileUploadRequestSerializer(serializers.Serializer):
    """Multipart request contract (drf-spectacular)."""

    purpose = serializers.ChoiceField(choices=Attachment.Purpose.choices)
    file = serializers.FileField()
