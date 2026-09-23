"""Authentication & identity endpoints (docs/architecture/api.md).

Conventions:
- tokens live ONLY in httpOnly cookies (browser) — response bodies never carry them
- enumeration-safe: register/password-reset respond generically regardless of
  account existence
- emails are sent via django-q2 tasks (sync under test, queued otherwise)
"""

from __future__ import annotations

import contextlib
import logging

from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.settings import api_settings as jwt_settings
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.api.serializers import (
    AuthDetailSerializer,
    LoginSerializer,
    PasswordChangeSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RefreshRequestSerializer,
    RegisterResponseSerializer,
    RegisterSerializer,
    SessionUserSerializer,
    UpdateProfileSerializer,
    UserSummarySerializer,
    VerifyEmailSerializer,
)
from apps.accounts.authentication import ACCESS_COOKIE, REFRESH_COOKIE, get_raw_refresh_token
from apps.accounts.services import deactivate as deactivate_user
from apps.accounts.services import verify_email_with_token
from apps.core.exceptions import DomainError, NotFoundError

logger = logging.getLogger(__name__)
User = get_user_model()


def _cookie_kwargs(max_age: int) -> dict:
    from django.conf import settings

    return {
        "max_age": max_age,
        "httponly": True,
        "secure": getattr(settings, "COOKIE_SECURE", False),
        "samesite": "Lax",
        "path": "/",
    }


def _set_auth_cookies(response: Response, refresh: RefreshToken) -> Response:
    access = refresh.access_token
    response.set_cookie(
        ACCESS_COOKIE,
        str(access),
        **_cookie_kwargs(int(jwt_settings.ACCESS_TOKEN_LIFETIME.total_seconds())),
    )
    response.set_cookie(
        REFRESH_COOKIE,
        str(refresh),
        **_cookie_kwargs(int(jwt_settings.REFRESH_TOKEN_LIFETIME.total_seconds())),
    )
    return response


def _clear_auth_cookies(response: Response) -> Response:
    response.delete_cookie(ACCESS_COOKIE, path="/")
    response.delete_cookie(REFRESH_COOKIE, path="/")
    return response


def _enqueue(task_name: str, user_id: int) -> None:
    from apps.accounts.tasks import enqueue_email

    enqueue_email(task_name, user_id)


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "auth"

    @extend_schema(
        request=RegisterSerializer,
        responses={201: RegisterResponseSerializer},
        description="Creates the account (enumeration-safe: an existing email re-sends the verification email and still returns 201). Auto-login via httpOnly cookies.",
    )
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        _enqueue("apps.accounts.tasks.send_verification_email", user.pk)
        # Auto-login: verification gates posting/offers/messaging, not login.
        refresh = RefreshToken.for_user(user)
        payload = {
            "user": UserSummarySerializer(user).data,
            "verification_required": not user.is_verified,
            "detail": "Account created. Check your inbox to verify your email address.",
        }
        logger.info("account registered user_id=%s", user.pk)
        return _set_auth_cookies(Response(payload, status=status.HTTP_201_CREATED), refresh)


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "auth"

    @extend_schema(
        request=LoginSerializer,
        responses={200: SessionUserSerializer, 401: AuthDetailSerializer},
        description="Sets `hm_access`/`hm_refresh` httpOnly cookies; bodies never carry tokens.",
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(
            request,
            email=serializer.validated_data["email"].strip().lower(),
            password=serializer.validated_data["password"],
        )
        if user is None:
            # Generic message: no account-existence oracle.
            raise DomainError(
                "Invalid email or password.",
                code="invalid_credentials",
                status_code=status.HTTP_401_UNAUTHORIZED,
            )
        user.last_login_ip = request.META.get("REMOTE_ADDR") or None
        user.save(update_fields=["last_login_ip", "last_login"])
        refresh = RefreshToken.for_user(user)
        logger.info("login user_id=%s", user.pk)
        return _set_auth_cookies(Response({"user": UserSummarySerializer(user).data}), refresh)


class RefreshView(APIView):
    """Rotate + blacklist (SimpleJWT). Reuse of a rotated refresh → 401."""

    permission_classes = [AllowAny]
    throttle_scope = "auth"

    @extend_schema(
        request=RefreshRequestSerializer,
        responses={200: AuthDetailSerializer, 401: AuthDetailSerializer},
        description="Rotates + blacklists the refresh token (cookie-first, body fallback). Reuse of a rotated refresh token is rejected with 401 `token_invalid`.",
    )
    def post(self, request):
        raw = get_raw_refresh_token(request)
        if not raw:
            raise DomainError(
                "Refresh token missing.",
                code="refresh_missing",
                status_code=status.HTTP_401_UNAUTHORIZED,
            )
        try:
            old = RefreshToken(raw)
            user = User.objects.get(pk=old.payload[jwt_settings.USER_ID_CLAIM])
            if not user.is_active:
                raise TokenError("User inactive")
            new = RefreshToken.for_user(user)
            old.blacklist()  # rotation invalidates the used refresh (blacklist app is a hard dep)
        except TokenError:
            raise DomainError(
                "Session expired or invalid. Please sign in again.",
                code="token_invalid",
                status_code=status.HTTP_401_UNAUTHORIZED,
            ) from None
        return _set_auth_cookies(Response({"detail": "Token refreshed."}), new)


class LogoutView(APIView):
    permission_classes = [AllowAny]  # idempotent: anonymous logout just clears cookies

    @extend_schema(
        request=None,
        responses={200: AuthDetailSerializer},
        description="Blacklists the presented refresh token and clears both auth cookies. Idempotent.",
    )
    def post(self, request):
        raw = get_raw_refresh_token(request)
        if raw:
            with contextlib.suppress(TokenError):
                RefreshToken(raw).blacklist()  # idempotent
        return _clear_auth_cookies(Response({"detail": "Signed out."}))


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "auth"

    @extend_schema(
        request=VerifyEmailSerializer,
        responses={200: AuthDetailSerializer, 400: AuthDetailSerializer},
    )
    def post(self, request):
        token = (request.data or {}).get("token", "")
        ok, message = verify_email_with_token(str(token))
        if not ok:
            raise DomainError(
                message, code="verification_failed", status_code=status.HTTP_400_BAD_REQUEST
            )
        return Response({"detail": message})


class ResendVerificationView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "auth"

    @extend_schema(
        request=None,
        responses={200: AuthDetailSerializer},
    )
    def post(self, request):
        user = request.user
        if not user.is_verified:
            _enqueue("apps.accounts.tasks.send_verification_email", user.pk)
        return Response({"detail": "Verification email sent if your account is unverified."})


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "auth"

    @extend_schema(
        request=PasswordResetRequestSerializer,
        responses={200: AuthDetailSerializer},
        description="Always the same response regardless of account existence (no enumeration oracle).",
    )
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(
            email=serializer.validated_data["email"].strip().lower(), is_active=True
        ).first()
        if user:
            _enqueue("apps.accounts.tasks.send_password_reset_email", user.pk)
        # Always the same response — no account-existence oracle.
        return Response({"detail": "If that address has an account, a reset link is on its way."})


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "auth"

    @extend_schema(
        request=PasswordResetConfirmSerializer,
        responses={200: AuthDetailSerializer, 400: AuthDetailSerializer, 404: AuthDetailSerializer},
        description="Single-use: consumes the reset token and blacklists every outstanding refresh token for the user.",
    )
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            uid = force_str(urlsafe_base64_decode(serializer.validated_data["uid"]))
            user = User.objects.get(pk=uid)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            raise NotFoundError("This reset link is invalid.") from None
        if not default_token_generator.check_token(user, serializer.validated_data["token"]):
            raise DomainError(
                "This reset link is invalid or has expired.", code="reset_link_invalid"
            )
        user.set_password(serializer.validated_data["password"])
        user.save(update_fields=["password", "updated_at"])
        # Kill every existing session (docs/architecture/authentication.md).
        from rest_framework_simplejwt.token_blacklist.models import (
            BlacklistedToken,
            OutstandingToken,
        )

        for outstanding in OutstandingToken.objects.filter(user=user):
            BlacklistedToken.objects.get_or_create(token=outstanding)
        logger.info("password reset completed user_id=%s", user.pk)
        return Response({"detail": "Password updated. Sign in with your new password."})


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: SessionUserSerializer})
    def get(self, request):
        return Response({"user": UserSummarySerializer(request.user).data})

    @extend_schema(request=UpdateProfileSerializer, responses={200: SessionUserSerializer})
    def patch(self, request):
        serializer = UpdateProfileSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"user": UserSummarySerializer(request.user).data})


class PasswordChangeView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "auth"

    @extend_schema(
        request=PasswordChangeSerializer,
        responses={200: AuthDetailSerializer, 400: AuthDetailSerializer},
        description="Verifies the current password, then blacklists every outstanding refresh token (all devices sign out).",
    )
    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        if not user.check_password(serializer.validated_data["current_password"]):
            raise DomainError("Current password is incorrect.", code="invalid_credentials")
        user.set_password(serializer.validated_data["password"])
        user.save(update_fields=["password", "updated_at"])
        from rest_framework_simplejwt.token_blacklist.models import (
            BlacklistedToken,
            OutstandingToken,
        )

        for outstanding in OutstandingToken.objects.filter(user=user):
            BlacklistedToken.objects.get_or_create(token=outstanding)
        response = Response({"detail": "Password changed. Please sign in again."})
        return _clear_auth_cookies(response)


class DeactivateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=None,
        responses={200: AuthDetailSerializer},
        description="Self-service deactivation: `is_active=False` plus refresh-token blacklist; login and token refresh are refused.",
    )
    def post(self, request):
        deactivate_user(request.user)
        logger.info("account self-deactivated user_id=%s", request.user.pk)
        response = Response({"detail": "Account deactivated."})
        return _clear_auth_cookies(response)
