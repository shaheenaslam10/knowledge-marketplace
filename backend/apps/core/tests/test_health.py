"""Health/readiness probes + API root + OpenAPI contract."""

from django.db import connection


def test_healthz_ok(client, db):
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": True}


def test_readyz_ready_after_migrations(client, db):
    # pytest-django applies all migrations, so readiness must be true.
    response = client.get("/readyz")
    assert response.status_code == 200
    assert response.json() == {"status": "ready"}


def test_readyz_503_with_unapplied_migrations(client, monkeypatch):
    class FakeExecutor:
        def __init__(self, conn):
            pass

        def migration_plan(self, targets):
            return [("0001_fake", "pending")]

    monkeypatch.setattr("django.db.migrations.executor.MigrationExecutor", FakeExecutor)
    response = client.get("/readyz")
    assert response.status_code == 503
    assert response.json() == {"status": "not_ready"}


def test_api_root_lists_contract(client):
    response = client.get("/api/v1/")
    assert response.status_code == 200
    payload = response.json()
    assert payload["name"] == "Hybrid Expert Marketplace API"
    assert payload["version"]
    assert "schema" in payload["endpoints"]
    assert payload["request_id"] not in ("", None)


def test_openapi_schema_is_generated(client):
    response = client.get("/api/schema/", headers={"Accept": "application/json"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["openapi"].startswith("3.")
    assert payload["info"]["title"] == "Hybrid Expert Marketplace API"


def test_request_id_echoed_and_generated(client):
    echoed = client.get("/api/v1/", headers={"X-Request-ID": "test-rid-123"})
    assert echoed["X-Request-ID"] == "test-rid-123"
    generated = client.get("/api/v1/")
    assert generated["X-Request-ID"] not in ("", "test-rid-123")


def test_404_uses_envelope(client):
    response = client.get("/api/v1/does-not-exist/")
    assert response.status_code == 404
    body = response.json()
    assert body["error"]["code"] == "not_found"


def test_database_connection_usable(db):
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
        assert cursor.fetchone()[0] == 1
