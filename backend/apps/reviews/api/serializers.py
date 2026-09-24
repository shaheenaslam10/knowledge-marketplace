from rest_framework import serializers


class ReviewSerializer(serializers.Serializer):
    id = serializers.CharField()
    order_id = serializers.CharField()
    order_number = serializers.CharField()
    rating = serializers.IntegerField()
    sub_quality = serializers.IntegerField(allow_null=True)
    sub_communication = serializers.IntegerField(allow_null=True)
    sub_timeliness = serializers.IntegerField(allow_null=True)
    body = serializers.CharField()
    status = serializers.CharField()
    expert_reply = serializers.CharField()
    replied_at = serializers.DateTimeField(allow_null=True)
    edited = serializers.BooleanField()
    created_at = serializers.DateTimeField()


def review_payload(review) -> dict:
    return {
        "id": str(review.pk),
        "order_id": str(review.order_id),
        "order_number": review.order.number,
        "rating": review.rating,
        "sub_quality": review.sub_quality,
        "sub_communication": review.sub_communication,
        "sub_timeliness": review.sub_timeliness,
        "body": review.body,
        "status": review.status,
        "expert_reply": review.expert_reply,
        "replied_at": review.replied_at,
        "edited": review.edited_at is not None,
        "created_at": review.created_at,
    }
