from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_metrics_reports_cpu_and_memory_percentages():
    response = client.get("/api/v1/metrics")

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"cpu", "memory"}
    for value in body.values():
        assert isinstance(value, (int, float))
        assert 0 <= value <= 100
