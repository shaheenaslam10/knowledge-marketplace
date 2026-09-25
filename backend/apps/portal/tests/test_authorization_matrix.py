"""Phase 11 authorization matrix — one parametrized suite asserting the
role x endpoint contract across every major resource family (the test spec
is the matrix in docs/product/user-roles.md; audit F-6 makes it continuous).

Roles exercised: anonymous, resource-owner student, second (unrelated)
student, stakeholder expert, unrelated expert, support staff, admin staff.

Expectation vocabulary:
  401 anonymous (envelope), 403 authenticated-but-forbidden, 404 ownership
  mask (existence hidden), 200 allowed.
"""

import pytest
from django.test import Client

from apps.audit.models import AuditEvent
from apps.experts.tests.test_api import PASSWORD, api_login, make_expert
from apps.messaging import services as messaging
from apps.portal.tests.test_portal import _paid_completed_order, _staff, _student
from apps.service_requests import services as request_services
from apps.taxonomy.services import ensure_term

V1 = "/api/v1"


@pytest.fixture
def clients():
    return Client()


@pytest.fixture
def world(django_user_model):
    """One graph of real resources shared by the matrix cases."""
    student, expert, order = _paid_completed_order(django_user_model, complete=True)
    other_student = _student(django_user_model)
    unrelated_expert = make_expert(django_user_model, "matrix-expert-b@demo.local", "B")
    support = _staff(django_user_model, group="support")
    admin = _staff(django_user_model, group="admin")

    subject = ensure_term(kind="subject", name="MatrixSub")[0]
    draft = request_services.create_request(
        other_student,
        payload={
            "category": "tutoring",
            "title": "Other draft",
            "description": "d" * 40,
            "subject": subject,
            "budget_max": 5000,
        },
    )
    # a thread between the order parties (context open is participant-safe)
    thread = messaging.get_or_create_thread(context_type="order", context=order, actor=student)

    return {
        "student": student,
        "expert": expert,
        "other_student": other_student,
        "unrelated_expert": unrelated_expert,
        "support": support,
        "admin": admin,
        "order": order,
        "draft": draft,
        "thread": thread,
    }


def _login(client, user):
    return api_login(client, user)


# (label, method, path-builder, actor key, expected status)
MATRIX = [
    # --- anonymous baseline ---
    ("anon me", "get", lambda w: f"{V1}/me", None, 401),
    ("anon orders", "get", lambda w: f"{V1}/me/orders", None, 401),
    ("anon ops kpis", "get", lambda w: f"{V1}/ops/kpis", None, 401),
    ("anon ops config", "get", lambda w: f"{V1}/ops/config", None, 401),
    # --- order ownership: integer pks → explicit 403 "not a party" (tested
    # contract since Phase 5; UUID resources use 404 masks instead) ---
    (
        "other student reads order",
        "get",
        lambda w: f"{V1}/me/orders/{w['order'].pk}",
        "other_student",
        403,
    ),
    (
        "unrelated expert reads order",
        "get",
        lambda w: f"{V1}/me/orders/{w['order'].pk}",
        "unrelated_expert",
        403,
    ),
    (
        "other student approves order",
        "post",
        lambda w: f"{V1}/me/orders/{w['order'].pk}/approve",
        "other_student",
        403,
    ),
    (
        "other student disputes order",
        "post",
        lambda w: f"{V1}/me/orders/{w['order'].pk}/dispute",
        "other_student",
        403,
    ),
    (
        "other student reviews order",
        "post",
        lambda w: f"{V1}/me/orders/{w['order'].pk}/review",
        "other_student",
        403,
    ),
    (
        "other student pays order",
        "post",
        lambda w: f"{V1}/me/orders/{w['order'].pk}/pay",
        "other_student",
        403,
    ),
    (
        "stakeholder expert reads order",
        "get",
        lambda w: f"{V1}/me/orders/{w['order'].pk}",
        "expert",
        200,
    ),
    ("owner reads order", "get", lambda w: f"{V1}/me/orders/{w['order'].pk}", "student", 200),
    # --- request ownership ---
    (
        "other student patches foreign draft",
        "patch",
        lambda w: f"{V1}/me/requests/{w['draft'].pk}",
        "student",
        404,
    ),
    (
        "draft owner reads own",
        "get",
        lambda w: f"{V1}/me/requests/{w['draft'].pk}",
        "other_student",
        200,
    ),
    # --- thread membership ---
    (
        "outsider posts to thread",
        "post",
        lambda w: f"{V1}/me/threads/{w['thread'].id}/messages",
        "unrelated_expert",
        404,
    ),
    (
        "outsider reads thread",
        "get",
        lambda w: f"{V1}/me/threads/{w['thread'].id}",
        "other_student",
        404,
    ),
    # --- ops surface: staff-only reads ---
    ("student ops kpis", "get", lambda w: f"{V1}/ops/kpis", "student", 403),
    ("expert ops users", "get", lambda w: f"{V1}/ops/users", "expert", 403),
    ("student ops audit", "get", lambda w: f"{V1}/ops/audit", "other_student", 403),
    (
        "expert ops reconciliation",
        "get",
        lambda w: f"{V1}/ops/reconciliation",
        "unrelated_expert",
        403,
    ),
    ("support reads kpis", "get", lambda w: f"{V1}/ops/kpis", "support", 200),
    ("support reads users", "get", lambda w: f"{V1}/ops/users", "support", 200),
    ("admin reads reconciliation", "get", lambda w: f"{V1}/ops/reconciliation", "admin", 200),
    # --- ops surface: config write is admin-only ---
    ("support reads config", "get", lambda w: f"{V1}/ops/config", "support", 200),
    ("support writes config", "put", lambda w: f"{V1}/ops/config", "support", 403),
    ("student writes config", "put", lambda w: f"{V1}/ops/config", "student", 403),
    ("expert writes config", "put", lambda w: f"{V1}/ops/config", "expert", 403),
    # --- moderation review is staff-only ---
    ("student reviews report", "post", lambda w: f"{V1}/ops/reports/1/review", "student", 403),
    # --- privilege escalation probes ---
    ("student escalates via me-patch role", "patch", lambda w: f"{V1}/me", "student", 200),
]


@pytest.mark.django_db
class TestAuthorizationMatrix:
    def test_matrix(self, world, clients):
        cache = {}

        def client_for(actor_key):
            if actor_key is None:
                return Client()
            if actor_key not in cache:
                client = Client()
                _login(client, world[actor_key])
                cache[actor_key] = client
            return cache[actor_key]

        violations = []
        for label, method, path_of, actor_key, expected in MATRIX:
            client = client_for(actor_key)
            response = getattr(client, method)(path_of(world))
            if response.status_code != expected:
                violations.append(f"{label}: got {response.status_code}, want {expected}")
        assert not violations, "authorization matrix violations:\n" + "\n".join(violations)

    def test_me_patch_cannot_self_escalate_roles(self, world):
        """The one 200 case in the matrix is probed deeper here: role flags in
        the /me PATCH payload must be ignored server-side."""
        from django.db.models import Model

        from apps.accounts.models import User

        client = Client()
        _login(client, world["student"])
        response = client.patch(
            f"{V1}/me",
            data='{"is_staff": true, "roles": {"admin": true, "support": true}}',
            content_type="application/json",
        )
        assert response.status_code in (200, 400)  # accepted or rejected — never 5xx
        user = User.objects.get(pk=world["student"].pk)
        assert user.is_staff is False
        assert not user.groups.filter(name__in=["admin", "support"]).exists()
        assert isinstance(user, Model)

    def test_django_admin_platform_config_is_view_only(self, world):
        """Portal config writes are admin-only; the Django admin surface is
        view-only for everyone (no add/change/delete, ever) and invisible to
        non-privileged staff."""
        from django.contrib import admin as django_admin
        from django.test import RequestFactory

        from apps.core.models import PlatformConfig
        from apps.portal.admin import PlatformConfigAdmin

        config_row = PlatformConfig.objects.first()
        model_admin = PlatformConfigAdmin(PlatformConfig, django_admin.site)
        request = RequestFactory().get("/")

        request.user = world["support"]
        assert model_admin.has_view_permission(request) is False  # not even read
        request.user = world["admin"]  # group-admin: full portal config rights,
        # but Django admin stays invisible (model perms are not granted to the group)
        assert model_admin.has_view_permission(request) is False
        superuser = type(world["admin"]).objects.create_user(
            email="root@matrix.test",
            password=PASSWORD,
            name="root",
            is_staff=True,
            is_superuser=True,
        )
        request.user = superuser
        assert model_admin.has_view_permission(request) is True
        # …and even then: view-only (the single write path is the audited portal API)
        assert model_admin.has_change_permission(request) is False
        assert model_admin.has_add_permission(request) is False
        assert model_admin.has_delete_permission(request, config_row) is False

    def test_moderation_review_is_staff_only_and_audited(self, world):
        from apps.messaging.models import MessageReport

        sender = world["expert"]  # thread participant (the order's expert)
        thread = messaging.get_or_create_thread(
            context_type="order", context=world["order"], actor=world["student"]
        )
        message = messaging.send_message(
            thread, sender=sender, body="Contact me off-platform directly."
        )
        report = MessageReport.objects.create(
            message=message,
            reported_by=world["student"],
            reason=MessageReport.Reason.OFF_PLATFORM,
        )
        client = Client()
        _login(client, world["other_student"])
        response = client.post(
            f"{V1}/ops/reports/{report.pk}/review",
            data='{"action": "dismiss", "note": "not staff"}',
            content_type="application/json",
        )
        assert response.status_code == 403
        report.refresh_from_db()
        assert report.status == MessageReport.Status.OPEN  # unchanged

        _login(client, world["support"])
        response = client.post(
            f"{V1}/ops/reports/{report.pk}/review",
            data='{"action": "dismiss", "note": "no violation found"}',
            content_type="application/json",
        )
        assert response.status_code == 200
        report.refresh_from_db()
        assert report.status == MessageReport.Status.DISMISSED
        assert AuditEvent.objects.filter(
            object_type="MessageReport", object_id=str(report.pk)
        ).exists()
