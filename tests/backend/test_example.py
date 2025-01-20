from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_read_root():
    response = client.get("/api/v1/test")
    assert response.status_code == 200
    assert response.json() == {"message": "AI Development Environment Backend Test"}
