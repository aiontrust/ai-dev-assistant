import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.routes import build_routes

client = TestClient(app)


@pytest.fixture(autouse=True)
def fresh_cache():
    build_routes._cache.update(at=0.0, value=None)
    yield
    build_routes._cache.update(at=0.0, value=None)


def run(**fields):
    base = {
        "status": "completed",
        "conclusion": "success",
        "head_branch": "main",
        "head_sha": "629bdb38abcdef",
        "display_title": "Merge pull request #28",
        "updated_at": "2026-10-06T02:30:36Z",
        "html_url": "https://github.com/aiontrust/ai-dev-assistant/actions/runs/1",
    }
    return {**base, **fields}


def test_completed_run_reports_its_conclusion(monkeypatch):
    monkeypatch.setattr(build_routes, "_fetch_latest_run", lambda: run())

    body = client.get("/api/v1/build").json()

    assert body["status"] == "success"
    assert body["branch"] == "main"
    assert body["sha"] == "629bdb3"
    assert body["title"] == "Merge pull request #28"


@pytest.mark.parametrize("status", ["queued", "in_progress"])
def test_unfinished_run_reports_its_status(monkeypatch, status):
    monkeypatch.setattr(build_routes, "_fetch_latest_run", lambda: run(status=status, conclusion=None))

    assert client.get("/api/v1/build").json()["status"] == status


def test_failure_to_reach_github_is_reported_not_raised(monkeypatch):
    def boom():
        raise OSError("network unreachable")

    monkeypatch.setattr(build_routes, "_fetch_latest_run", boom)

    res = client.get("/api/v1/build")

    assert res.status_code == 200
    assert res.json()["status"] == "unknown"
    assert "network unreachable" in res.json()["error"]


def test_results_are_cached(monkeypatch):
    calls = []
    monkeypatch.setattr(build_routes, "_fetch_latest_run", lambda: calls.append(1) or run())

    client.get("/api/v1/build")
    client.get("/api/v1/build")

    assert len(calls) == 1
