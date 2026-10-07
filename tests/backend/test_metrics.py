from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_metrics_reports_load_network_and_processes():
    response = client.get("/api/v1/metrics")

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"cpu", "memory", "disk", "network", "processes"}
    for key in ("cpu", "memory", "disk"):
        assert isinstance(body[key], (int, float))
        assert 0 <= body[key] <= 100
    assert set(body["network"]) == {"sent", "recv"}
    assert all(rate >= 0 for rate in body["network"].values())
    assert isinstance(body["processes"], int) and body["processes"] > 0
