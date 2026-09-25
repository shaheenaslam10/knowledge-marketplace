"""Phase 11 query budgets — hot-path query counts are pinned so N+1 creep
fails CI instead of shipping (brief §8/9). Budgets are ceilings chosen from
the deliberate query plan (documented in docs/architecture/performance.md):

- feed/directory/thread lists: constant per page (select/prefetch, not per row)
- order detail: O(1) in events/deliveries (prefetched)
- ops KPI dashboard: fixed small set of aggregate queries per range

Run against real Postgres (CaptureQueriesContext).
"""

import pytest
from django.db import connection
from django.test import Client
from django.test.utils import CaptureQueriesContext

from apps.experts.tests.test_api import api_login
from apps.portal.tests.test_concurrency import _paid_open_order
from apps.portal.tests.test_portal import _staff
from apps.service_requests import services as request_services
from apps.service_requests.models import ServiceRequest
from apps.taxonomy.services import ensure_term


@pytest.fixture
def busy_world(django_user_model):
    """Enough rows that an N+1 would show: several requests/experts/threads."""
    order, student, expert = _paid_open_order(django_user_model, complete=True)
    # two more order-threads for the same student: per-row N+1s in the inbox
    # would add ≥2 queries per row
    for _index in range(2):
        _paid_open_order(django_user_model, complete=True)
    subject = ensure_term(kind="subject", name=f"PerfSub{django_user_model.objects.count()}")[0]
    for index in range(6):
        extra = django_user_model.objects.create_user(
            email=f"perf-student-{index}-{django_user_model.objects.count()}@demo.local",
            password="long-pass-123",
            name=f"P{index}",
        )
        extra.mark_email_verified()
        request_services.create_request(
            extra,
            payload={
                "category": "tutoring",
                "title": f"Perf request {index}",
                "description": "d" * 40,
                "subject": subject,
                "budget_max": 4000 + index,
            },
        )
    return {"student": student, "expert": expert, "order": order}


def _query_count(client, method, path, **kwargs):
    with CaptureQueriesContext(connection) as context:
        response = getattr(client, method)(path, **kwargs)
    assert response.status_code == 200, f"{method} {path} → {response.status_code}"
    return len(context)


@pytest.mark.django_db
class TestHotPathQueryBudgets:
    def test_request_feed_is_constant_per_page(self, busy_world, django_user_model):
        client = Client()
        api_login(client, busy_world["expert"])
        assert ServiceRequest.objects.count() >= 6
        count = _query_count(client, "get", "/api/v1/requests")
        assert count <= 12, f"request feed used {count} queries (budget 12) — N+1?"

    def test_expert_directory_is_constant(self, busy_world):
        client = Client()
        count = _query_count(client, "get", "/api/v1/experts")
        assert count <= 12, f"expert directory used {count} queries (budget 12) — N+1?"

    def test_thread_list_is_constant(self, busy_world):
        client = Client()
        api_login(client, busy_world["student"])
        count = _query_count(client, "get", "/api/v1/me/threads")
        assert count <= 14, f"thread list used {count} queries (budget 14) — N+1?"

    def test_order_detail_is_constant(self, busy_world):
        client = Client()
        api_login(client, busy_world["student"])
        count = _query_count(client, "get", f"/api/v1/me/orders/{busy_world['order'].pk}")
        assert count <= 14, f"order detail used {count} queries (budget 14) — N+1?"

    def test_ops_kpis_is_fixed_aggregates(self, busy_world, django_user_model):
        client = Client()
        api_login(client, _staff(django_user_model))
        count = _query_count(client, "get", "/api/v1/ops/kpis?range=30d")
        assert count <= 40, f"KPI dashboard used {count} queries (budget 40) — leaky aggregation?"
