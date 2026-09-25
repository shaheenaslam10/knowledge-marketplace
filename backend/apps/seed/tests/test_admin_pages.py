"""Every Django admin page renders for the owner (Phase 11 E2E finding).

The owner's triage/resolution tooling IS the Django admin (ADR-0010). A
template error that only surfaces on one change page (the dispute resolution
form was a 500 on an invalid template expression) blocked every dispute
resolution — so over the full seeded demo dataset, every registered model's
changelist, add page (where allowed) and first change page must render.
"""

import pytest
from django.contrib import admin
from django.core.management import call_command
from django.test import Client
from django.urls import reverse

pytestmark = pytest.mark.django_db


def test_every_admin_page_renders_for_the_owner(monkeypatch, django_user_model):
    monkeypatch.delenv("DJANGO_SEED_DEMO_PASSWORD", raising=False)
    call_command("seed_demo")
    owner = django_user_model.objects.get(email="admin@demo.local")
    client = Client(raise_request_exception=False)  # collect every failure, not just the first
    client.force_login(owner)

    class OwnerRequest:  # has_add_permission only reads request.user
        user = owner

    visited, failures = [], []
    for model, model_admin in admin.site._registry.items():
        info = (model._meta.app_label, model._meta.model_name)
        urls = [reverse("admin:{}_{}_changelist".format(*info))]
        if model_admin.has_add_permission(OwnerRequest()):
            urls.append(reverse("admin:{}_{}_add".format(*info)))
        obj = model._default_manager.order_by("pk").first()
        if obj is not None:
            urls.append(reverse("admin:{}_{}_change".format(*info), args=[obj.pk]))
        for url in urls:
            visited.append(url)
            status = client.get(url).status_code
            if status != 200:
                failures.append((status, url))

    assert failures == []
    # the seeded disputed order guarantees the resolution form is covered
    assert any(
        url.startswith("/admin/disputes/dispute/") and url.endswith("/change/") for url in visited
    )
