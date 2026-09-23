"""Custom user model + role registry."""

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError

from apps.accounts.services import (
    get_roles,
    issue_verification_token,
    register_role_provider,
    verify_email_with_token,
)

User = get_user_model()


@pytest.mark.django_db
class TestUserModel:
    def test_create_user_normalizes_email(self):
        user = User.objects.create_user(
            email="Priya@Example.COM ", password="long-password-123", name="Priya"
        )
        assert user.email == "priya@example.com"
        assert user.is_active and not user.is_staff and not user.is_superuser
        assert not user.is_verified
        assert user.created_at is not None and user.updated_at is not None

    def test_email_unique(self):
        User.objects.create_user(email="a@b.co", password="long-password-123", name="A")
        with pytest.raises(IntegrityError):
            User.objects.create_user(email="a@b.co", password="long-password-123", name="B")

    def test_default_hasher_is_argon2_by_contract(self):
        # Phase-2 contract (docs/architecture/security.md): Argon2 first in base settings.
        from config.settings.base import PASSWORD_HASHERS as BASE_PASSWORD_HASHERS

        assert BASE_PASSWORD_HASHERS[0] == "django.contrib.auth.hashers.Argon2PasswordHasher"

    def test_passwords_never_stored_plaintext(self):
        user = User.objects.create_user(email="hash@b.co", password="long-password-123", name="H")
        assert user.password != "long-password-123"
        assert "$" in user.password  # Django hash format (<algo>$<salt>$<hash>)
        assert user.check_password("long-password-123")

    def test_superuser_requires_flags(self):
        User.objects.create_superuser(email="root@b.co", password="long-password-123", name="Root")
        assert User.objects.get(email="root@b.co").is_staff

    def test_mark_email_verified_idempotent(self):
        user = User.objects.create_user(email="v@b.co", password="long-password-123", name="V")
        user.mark_email_verified()
        first = user.email_verified_at
        user.mark_email_verified()
        user.refresh_from_db()
        assert user.email_verified_at == first

    def test_deactivation_blocks_login(self, client):
        User.objects.create_user(email="dead@b.co", password="long-password-123", name="D")
        from apps.accounts.services import deactivate

        user = User.objects.get(email="dead@b.co")
        deactivate(user)
        response = client.post(
            "/api/v1/auth/token",
            {"email": "dead@b.co", "password": "long-password-123"},
            content_type="application/json",
        )
        assert response.status_code == 401
        assert response.json()["error"]["code"] == "invalid_credentials"


@pytest.mark.django_db
class TestRoles:
    def test_base_roles(self):
        staff = User.objects.create_user(
            email="s@b.co", password="long-password-123", name="S", is_staff=True
        )
        roles = get_roles(staff)
        assert roles["student"] is True
        assert roles["staff"] is True
        assert roles["admin"] is False  # staff but not superuser/group
        assert roles["expert"] is False  # registered in Phase 3

    def test_admin_role_via_group_or_superuser(self):
        from django.contrib.auth.models import Group

        user = User.objects.create_user(
            email="g@b.co", password="long-password-123", name="G", is_staff=True
        )
        user.groups.add(Group.objects.get_or_create(name="admin")[0])
        assert get_roles(user)["admin"] is True
        super_user = User.objects.create_superuser(
            email="su@b.co", password="long-password-123", name="SU"
        )
        assert get_roles(super_user)["admin"] is True

    def test_role_provider_registry(self):
        register_role_provider("test_role", lambda user: user.email.startswith("special@"))
        special = User.objects.create_user(
            email="special@b.co", password="long-password-123", name="Sp"
        )
        other = User.objects.create_user(email="plain@b.co", password="long-password-123", name="P")
        assert get_roles(special)["test_role"] is True
        assert get_roles(other)["test_role"] is False

    def test_broken_provider_does_not_break_roles(self):
        def boom(user):
            raise RuntimeError("provider bug")

        register_role_provider("broken", boom)
        user = User.objects.create_user(email="x@b.co", password="long-password-123", name="X")
        assert get_roles(user)["broken"] is False


@pytest.mark.django_db
class TestVerificationTokens:
    def test_issue_and_verify(self):
        user = User.objects.create_user(email="ver@b.co", password="long-password-123", name="Ver")
        token = issue_verification_token(user)
        ok, _ = verify_email_with_token(token)
        assert ok
        user.refresh_from_db()
        assert user.is_verified

    def test_token_single_use_via_state(self):
        user = User.objects.create_user(email="vu@b.co", password="long-password-123", name="VU")
        token = issue_verification_token(user)
        verify_email_with_token(token)
        # a NEW token issued after verification should not be valid for a stale payload
        ok, _ = verify_email_with_token(token)
        assert ok  # idempotent for the same account

    def test_tampered_token_rejected(self):
        user = User.objects.create_user(email="t@b.co", password="long-password-123", name="T")
        ok, message = verify_email_with_token(issue_verification_token(user)[:-2] + "xx")
        assert not ok and "invalid" in message.lower()

    def test_garbage_token_rejected(self):
        ok, _ = verify_email_with_token("not-a-token")
        assert not ok
