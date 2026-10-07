from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_socket_greets_and_answers_pings():
    with client.websocket_connect("/api/v1/ws") as ws:
        assert ws.receive_text() == "Connected to AI Development Assistant!"
        ws.send_text("ping")
        assert ws.receive_text() == "pong"
        ws.send_text("ping")
        assert ws.receive_text() == "pong"


def test_assistant_failure_is_reported_without_closing(monkeypatch):
    from app.api.endpoints import example

    def broken(**_):
        raise RuntimeError("model retired")

    monkeypatch.setattr(example.openai.Completion, "create", broken, raising=False)

    with client.websocket_connect("/api/v1/ws") as ws:
        ws.receive_text()
        ws.send_text("hello")
        assert ws.receive_text() == "ERROR: model retired"
        ws.send_text("ping")
        assert ws.receive_text() == "pong"
