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


def workflow_run(**fields):
    base = {
        "status": "completed",
        "conclusion": "success",
        "head_branch": "main",
        "head_sha": "629bdb38abcdef",
        "display_title": "Merge pull request #28",
        "updated_at": "2026-10-06T02:30:36Z",
        "html_url": "https://github.com/aiontrust/ai-dev-assistant/actions/runs/1",
    }
    return {"workflow_runs": [{**base, **fields}]}


def check_runs(*runs):
    return {"check_runs": list(runs)}


def fake_github(responses):
    """Answers _get(path) from the first matching path fragment in `responses`."""

    def get(path):
        for fragment, body in responses.items():
            if fragment in path:
                if isinstance(body, Exception):
                    raise body
                return body
        raise AssertionError(f"unexpected GitHub call: {path}")

    return get


def test_reports_ci_cloudflare_and_docker(monkeypatch):
    monkeypatch.setattr(build_routes, "_get", fake_github({
        "checks.yml": workflow_run(),
        "check-runs": check_runs(
            {"name": "Backend tests", "status": "completed", "conclusion": "success"},
            {"name": "Workers Builds: ai-dev-assistant", "status": "completed", "conclusion": "success",
             "head_sha": "d024c98aaaa", "completed_at": "2026-10-06T21:32:34Z"},
        ),
        "docker-publish.yml": workflow_run(conclusion="failure", display_title="Merge pull request #26"),
    }))

    body = client.get("/api/v1/build").json()

    assert body["ci"]["status"] == "success"
    assert body["ci"]["sha"] == "629bdb3"
    assert body["cloudflare"]["status"] == "success"
    assert body["cloudflare"]["sha"] == "d024c98"
    assert body["docker"]["status"] == "failure"
    assert body["docker"]["title"] == "Merge pull request #26"


@pytest.mark.parametrize("status", ["queued", "in_progress"])
def test_unfinished_runs_report_their_status(monkeypatch, status):
    monkeypatch.setattr(build_routes, "_get", fake_github({
        "checks.yml": workflow_run(status=status, conclusion=None),
        "check-runs": check_runs({"name": "Workers Builds: x", "status": status, "conclusion": None}),
        "docker-publish.yml": {"workflow_runs": []},
    }))

    body = client.get("/api/v1/build").json()

    assert body["ci"]["status"] == status
    assert body["cloudflare"]["status"] == status
    assert body["docker"]["status"] == "none"


def test_one_unreachable_source_does_not_hide_the_others(monkeypatch):
    monkeypatch.setattr(build_routes, "_get", fake_github({
        "checks.yml": workflow_run(),
        "check-runs": OSError("network unreachable"),
        "docker-publish.yml": workflow_run(),
    }))

    res = client.get("/api/v1/build")

    assert res.status_code == 200
    body = res.json()
    assert body["ci"]["status"] == "success"
    assert body["cloudflare"]["status"] == "unknown"
    assert "network unreachable" in body["cloudflare"]["error"]


def test_results_are_cached(monkeypatch):
    calls = []

    def get(path):
        calls.append(path)
        return check_runs() if "check-runs" in path else workflow_run()

    monkeypatch.setattr(build_routes, "_get", get)

    client.get("/api/v1/build")
    client.get("/api/v1/build")

    assert len(calls) == 3
