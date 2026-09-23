"""Authorization matrix — permission classes enforced end-to-end through DRF
(test-only probe views at apps.accounts.tests.urls)."""

import pytest
from django.conf import settings
from django.contrib.auth import get_user_model

User = get_user_model()
PASSWORD = "long-password-123"


@pytest.fixture(autouse=True)
def probe_urlconf(monkeypatch):
    monkeypatch.setattr(settings, "ROOT_URLCONF", "apps.accounts.tests.urls")


PROBES = {
    "authenticated": 200,
    "admin": 403,
    "support": 403,
    "expert": 403,
    "verified": 403,
}


def make_client(client, user, *, verified=False, staff=False, superuser=False, group=None):
    if staff:
        user.is_staff = True
    if superuser:
        user.is_staff = True
        user.is_superuser = True
    user.save()
    if verified:
        user.mark_email_verified()
    if group:
        from django.contrib.auth.models import Group

        user.groups.add(Group.objects.get_or_create(name=group)[0])
    response = client.post(
        "/api/v1/auth/token",
        {"email": user.email, "password": PASSWORD},
        content_type="application/json",
    )
    assert response.status_code == 200
    return client


@pytest.mark.django_db
class TestAuthorizationMatrix:
    def test_anonymous_gets_401_on_authenticated_probe(self, client, db):
        response = client.get("/probe/authenticated")
        assert response.status_code == 401
        assert response.json()["error"]["code"] == "not_authenticated"

    def test_student(self, client, db):
        user = User.objects.create_user(email="st@x.io", password=PASSWORD, name="St")
        c = make_client(client, user)
        assert c.get("/probe/authenticated").status_code == 200
        assert c.get("/probe/admin").status_code == 403
        assert c.get("/probe/support").status_code == 403
        assert c.get("/probe/expert").status_code == 403
        assert c.get("/probe/verified").status_code == 403  # unverified

    def test_verified_student(self, client, db):
        user = User.objects.create_user(email="ver@x.io", password=PASSWORD, name="Ver")
        c = make_client(client, user, verified=True)
        assert c.get("/probe/verified").status_code == 200

    def test_admin_via_superuser(self, client, db):
        user = User.objects.create_user(email="su@x.io", password=PASSWORD, name="SU")
        c = make_client(client, user, superuser=True, verified=True)
        assert c.get("/probe/admin").status_code == 200
        # admin is not automatically support
        assert c.get("/probe/support").status_code == 403

    def test_admin_via_group(self, client, db):
        user = User.objects.create_user(email="adming@x.io", password=PASSWORD, name="AG")
        c = make_client(client, user, staff=True, group="admin")
        assert c.get("/probe/admin").status_code == 200

    def test_support_via_group_but_not_admin(self, client, db):
        user = User.objects.create_user(email="sup@x.io", password=PASSWORD, name="Sup")
        c = make_client(client, user, staff=True, group="support")
        assert c.get("/probe/support").status_code == 200
        assert c.get("/probe/admin").status_code == 403

    def test_staff_without_group_is_neither(self, client, db):
        user = User.objects.create_user(email="plainstaff@x.io", password=PASSWORD, name="PS")
        c = make_client(client, user, staff=True)
        assert c.get("/probe/admin").status_code == 403
        assert c.get("/probe/support").status_code == 403

    def test_expert_role_false_until_phase3(self, client, db):
        user = User.objects.create_user(email="ex@x.io", password=PASSWORD, name="Ex")
        c = make_client(client, user, verified=True)
        assert c.get("/probe/expert").status_code == 403

    def test_deactivated_user_rejected_everywhere(self, client, db):
        user = User.objects.create_user(email="off@x.io", password=PASSWORD, name="Off")
        c = make_client(client, user, verified=True)
        user.is_active = False
        user.save()
        assert c.get("/probe/authenticated").status_code == 401

    def test_permission_denied_envelope(self, client, db):
        user = User.objects.create_user(email="env@x.io", password=PASSWORD, name="Env")
        c = make_client(client, user)
        response = c.get("/probe/admin")
        assert response.json()["error"]["code"] == "permission_denied"


@pytest.mark.django_db
class TestDjangoAdmin:
    def test_admin_login_with_email_and_changelist(self, client, db, settings):
        User.objects.create_superuser(email="root@x.io", password=PASSWORD, name="Root")
        login_ok = client.login(email="root@x.io", password=PASSWORD)
        assert login_ok
        response = client.get("/admin/accounts/user/")
        assert response.status_code == 200

    def test_admin_add_user_page_renders(self, client, db):
        User.objects.create_superuser(email="root2@x.io", password=PASSWORD, name="Root2")
        client.login(email="root2@x.io", password=PASSWORD)
        response = client.get("/admin/accounts/user/add/")
        assert response.status_code == 200
        assert b"email" in response.content

    def test_admin_requires_staff(self, client, db):
        User.objects.create_user(email="notstaff@x.io", password=PASSWORD, name="NS")
        assert client.login(email="notstaff@x.io", password=PASSWORD)
        response = client.get("/admin/accounts/user/")
        assert response.status_code == 302  # redirected to admin login
