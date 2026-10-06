from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_read_root():
    response = client.get("/api/v1/test")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    assert "Welcome to the AI Development Assistant" in response.text
