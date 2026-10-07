from fastapi.testclient import TestClient

from app.assistant.registry import NoProviderAvailable
from app.main import app
from app.routes import assistant_routes

client = TestClient(app)


def test_socket_greets_and_answers_pings():
    with client.websocket_connect("/api/v1/ws") as ws:
        assert ws.receive_text() == "Connected to AI Development Assistant!"
        ws.send_text("ping")
        assert ws.receive_text() == "pong"
        ws.send_text("ping")
        assert ws.receive_text() == "pong"


def test_other_text_is_answered_by_the_assistant(monkeypatch):
    monkeypatch.setattr(
        assistant_routes.assistant, "chat",
        lambda messages: {"reply": f"echo: {messages[-1]['content']}"},
    )

    with client.websocket_connect("/api/v1/ws") as ws:
        ws.receive_text()
        ws.send_text("hello")
        assert ws.receive_text() == "echo: hello"


def test_assistant_failure_is_reported_without_closing(monkeypatch):
    def unavailable(messages):
        raise NoProviderAvailable({"claude": "no key"})

    monkeypatch.setattr(assistant_routes.assistant, "chat", unavailable)

    with client.websocket_connect("/api/v1/ws") as ws:
        ws.receive_text()
        ws.send_text("hello")
        assert ws.receive_text() == "ERROR: No model provider is available"
        ws.send_text("ping")
        assert ws.receive_text() == "pong"
