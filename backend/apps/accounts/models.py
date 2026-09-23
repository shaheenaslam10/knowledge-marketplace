"""Identity & roles — custom user (Phase 2).

Design (ADR-0001, docs/architecture/authentication.md):
- ONE user table; roles are state, not separate tables. Every registered user is
  a student (BR-01); expert status arrives with `experts.ExpertProfile` (Phase 3)
  via the role-provider registry in services.py; staff roles use is_staff +
  Django groups (`support`, `admin`) for future moderation/finance/operations.
- Email is the credential (USERNAME_FIELD). No username anywhere.
- Audit fields: created_at/updated_at (TimeStampedModel), last_login, last_login_ip.
"""

from __future__ import annotations

from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models
from django.utils import timezone

from apps.core.models import TimeStampedModel


class UserManager(BaseUserManager["User"]):
    """Manager for the email-as-identifier user model."""

    use_in_migrations = True

    def _create(self, email: str, password: str | None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email).lower()
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email: str, password: str | None = None, **extra_fields) -> User:
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create(email, password, **extra_fields)

    def create_superuser(self, email: str, password: str | None = None, **extra_fields) -> User:
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        if extra_fields.get("is_staff") is not True or extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_staff=True and is_superuser=True")
        return self._create(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin, TimeStampedModel):
    """Platform identity. See module docstring + docs/product/user-roles.md."""

    email = models.EmailField("email address", unique=True, db_index=True)
    name = models.CharField("full name", max_length=150)
    is_active = models.BooleanField(
        "active",
        default=True,
        help_text="Deactivated accounts cannot log in and their tokens are rejected.",
    )
    is_staff = models.BooleanField(
        "staff status",
        default=False,
        help_text="Staff surface access (admin back office). Combined with groups for roles.",
    )
    email_verified_at = models.DateTimeField(
        "email verified at", null=True, blank=True, editable=False
    )
    timezone = models.CharField(max_length=63, default="UTC")
    locale = models.CharField(max_length=10, default="en")
    last_login_ip = models.GenericIPAddressField("last login IP", null=True, blank=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["name"]

    class Meta:
        verbose_name = "user"
        verbose_name_plural = "users"
        indexes = [models.Index(fields=["-created_at"])]

    def __str__(self) -> str:
        return self.email

    # --- account state -------------------------------------------------
    @property
    def is_verified(self) -> bool:
        return self.email_verified_at is not None

    def mark_email_verified(self) -> None:
        if self.email_verified_at is None:
            self.email_verified_at = timezone.now()
            self.save(update_fields=["email_verified_at", "updated_at"])

    def get_full_name(self) -> str:  # kept for Django/admin conventions
        return self.name

    def get_short_name(self) -> str:
        return self.name.split(" ", 1)[0] if self.name else self.email
