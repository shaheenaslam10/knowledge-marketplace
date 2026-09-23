"""Auth/identity serializers. Validation errors surface through the standard
error envelope (`validation_error` + field details)."""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

User = get_user_model()

PASSWORD_MIN_LENGTH = (
    10  # docs/architecture/authentication.md (enforced regardless of env validators)
)


class MinLength10:
    """Password floor independent of env-configured validators
    (dev disables validators for seed/demo convenience — BR/Phase-2 decision)."""

    def __call__(self, value: str) -> None:
        if len(value) < PASSWORD_MIN_LENGTH:
            raise serializers.ValidationError(
                f"Password must be at least {PASSWORD_MIN_LENGTH} characters."
            )


class UserSummarySerializer(serializers.ModelSerializer):
    roles = serializers.SerializerMethodField()
    email_verified = serializers.BooleanField(source="is_verified", read_only=True)

    class Meta:
        model = User
        fields = ["id", "email", "name", "timezone", "locale", "email_verified", "roles"]
        read_only_fields = fields

    def get_roles(self, obj) -> dict:
        from apps.accounts.services import get_roles

        return get_roles(obj)


class SessionUserSerializer(serializers.Serializer):
    """Envelope for endpoints that return the current session's user."""

    user = UserSummarySerializer()


class AuthDetailSerializer(serializers.Serializer):
    detail = serializers.CharField()


class RegisterResponseSerializer(serializers.Serializer):
    user = UserSummarySerializer()
    verification_required = serializers.BooleanField()
    detail = serializers.CharField()


class VerifyEmailSerializer(serializers.Serializer):
    token = serializers.CharField()


class RefreshRequestSerializer(serializers.Serializer):
    """Optional body fallback — browsers use the `hm_refresh` cookie."""

    refresh = serializers.CharField(required=False)


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    name = serializers.CharField(max_length=150, min_length=2)
    password = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
        validators=[MinLength10()],
    )

    def validate_email(self, value: str) -> str:
        return value.strip().lower()

    def validate_password(self, value: str) -> str:
        validate_password(value)
        return value

    def save(self) -> User:
        # Enumeration-safe: an existing email silently "succeeds" (generic
        # response), re-sending the verification email to the real owner.
        existing = User.objects.filter(email=self.validated_data["email"]).first()
        if existing:
            return existing
        return User.objects.create_user(
            email=self.validated_data["email"],
            password=self.validated_data["password"],
            name=self.validated_data["name"],
        )


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(write_only=True, validators=[MinLength10()])

    def validate_password(self, value: str) -> str:
        validate_password(value)
        return value


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True, validators=[MinLength10()])

    def validate_password(self, value: str) -> str:
        validate_password(value)
        return value


class UpdateProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["name", "timezone", "locale"]
