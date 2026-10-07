from types import SimpleNamespace

import anthropic
import httpx2
import pytest
from fastapi.testclient import TestClient

from app.assistant import providers as prov
from app.assistant.registry import Assistant
from app.main import app
from app.routes import assistant_routes

client = TestClient(app)


# ---- Simulated providers --------------------------------------------------

class FakeProvider:
    def __init__(self, id, available=True, reply=None, error=None, refuse=False):
        self.id = id
        self.label = id.title()
        self.model = f"{id}-model"
        self._available = available
        self._reply = reply or f"hello from {id}"
        self._error = error
        self._refuse = refuse
        self.calls = []

    def status(self):
        return (True, "") if self._available else (False, f"{self.label} offline")

    def chat(self, messages):
        self.calls.append(messages)
        if self._refuse:
            raise prov.ProviderRefused("declined")
        if self._error:
            raise prov.ProviderError(self._error)
        return self._reply, self.model


@pytest.fixture
def use_assistant(monkeypatch):
    """Swaps the app's assistant for one built from the given providers."""
    def install(*providers):
        assistant = Assistant(list(providers))
        monkeypatch.setattr(assistant_routes, "assistant", assistant)
        return assistant
    return install


def ask(*turns):
    roles = ["user", "assistant"]
    messages = [{"role": roles[i % 2], "content": t} for i, t in enumerate(turns)]
    return client.post("/api/v1/assistant/chat", json={"messages": messages})


# ---- Selection and fallback ------------------------------------------------

def test_active_provider_answers(use_assistant):
    use_assistant(FakeProvider("claude"), FakeProvider("lmstudio"))

    body = ask("hi").json()

    assert body["reply"] == "hello from claude"
    assert body["provider"] == "claude"
    assert body["model"] == "claude-model"
    assert body["fallback_from"] is None


def test_falls_back_when_the_active_provider_fails(use_assistant):
    claude = FakeProvider("claude", error="Could not reach the Anthropic API")
    use_assistant(claude, FakeProvider("lmstudio", available=False), FakeProvider("ollama"))

    body = ask("hi").json()

    assert body["provider"] == "ollama"
    assert body["fallback_from"] == "claude"
    assert body["skipped"] == {
        "claude": "Could not reach the Anthropic API",
        "lmstudio": "Lmstudio offline",
    }


def test_selected_provider_goes_first(use_assistant):
    use_assistant(FakeProvider("claude"), FakeProvider("lmstudio"))

    res = client.put("/api/v1/assistant/provider", json={"id": "lmstudio"})

    assert res.json()["active"] == "lmstudio"
    assert ask("hi").json()["provider"] == "lmstudio"


def test_unknown_provider_is_rejected(use_assistant):
    use_assistant(FakeProvider("claude"))

    assert client.put("/api/v1/assistant/provider", json={"id": "gpt"}).status_code == 400


def test_refusal_is_not_retried_elsewhere(use_assistant):
    local = FakeProvider("lmstudio")
    use_assistant(FakeProvider("claude", refuse=True), local)

    res = ask("hi")

    assert res.status_code == 422
    assert local.calls == []


def test_no_provider_lists_the_reasons(use_assistant):
    use_assistant(FakeProvider("claude", available=False), FakeProvider("lmstudio", available=False))

    res = ask("hi")

    assert res.status_code == 503
    assert "claude: Claude offline" in res.json()["detail"]
    assert "lmstudio: Lmstudio offline" in res.json()["detail"]


def test_provider_list_reports_availability(use_assistant):
    use_assistant(FakeProvider("claude", available=False), FakeProvider("lmstudio"))

    body = client.get("/api/v1/assistant/providers").json()

    assert body["active"] == "claude"
    assert [(p["id"], p["available"], p["active"]) for p in body["providers"]] == [
        ("claude", False, True),
        ("lmstudio", True, False),
    ]


def test_conversation_must_end_with_the_user(use_assistant):
    use_assistant(FakeProvider("claude"))

    assert ask("hi", "hello").status_code == 400


def test_history_is_trimmed_to_start_with_the_user(use_assistant):
    claude = FakeProvider("claude")
    use_assistant(claude)

    turns = [f"turn {i}" for i in range(45)]  # 45 turns, the last from the user
    assert ask(*turns).status_code == 200

    sent = claude.calls[0]
    assert len(sent) <= 40
    assert sent[0]["role"] == "user"
    assert sent[-1]["content"] == "turn 44"


# ---- Claude adapter --------------------------------------------------------

class FakeAnthropic:
    """Stands in for anthropic.Anthropic(); records the request it receives."""

    def __init__(self, response=None, error=None):
        self.requests = []
        outer = self

        class _Messages:
            def create(self, **kwargs):
                outer.requests.append(kwargs)
                if error:
                    raise error
                return response

        self.beta = SimpleNamespace(messages=_Messages())


def claude_with(fake, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    return prov.ClaudeProvider(client_factory=lambda: fake)


def test_claude_request_and_reply(monkeypatch):
    response = SimpleNamespace(
        stop_reason="end_turn",
        model="claude-opus-5-5",
        content=[
            SimpleNamespace(type="thinking", thinking=""),
            SimpleNamespace(type="text", text="Here you go."),
        ],
    )
    fake = FakeAnthropic(response=response)

    reply, model = claude_with(fake, monkeypatch).chat([{"role": "user", "content": "hi"}])

    assert (reply, model) == ("Here you go.", "claude-opus-5-5")
    sent = fake.requests[0]
    assert sent["model"] == "claude-opus-5-5"
    assert sent["messages"] == [{"role": "user", "content": "hi"}]
    assert "SATI" in sent["system"]
    assert sent["fallbacks"] == "default"
    assert sent["betas"] == ["server-side-fallback-2026-07-01"]
    assert sent["output_config"] == {"effort": "medium"}


def test_claude_model_and_effort_come_from_the_environment(monkeypatch):
    monkeypatch.setenv("SATI_CLAUDE_MODEL", "claude-sonnet-5-5")
    monkeypatch.setenv("SATI_CLAUDE_EFFORT", "low")
    fake = FakeAnthropic(response=SimpleNamespace(stop_reason="end_turn", model="claude-sonnet-5-5", content=[]))

    claude_with(fake, monkeypatch).chat([{"role": "user", "content": "hi"}])

    assert fake.requests[0]["model"] == "claude-sonnet-5-5"
    assert fake.requests[0]["output_config"] == {"effort": "low"}


def test_claude_refusal_raises(monkeypatch):
    response = SimpleNamespace(
        stop_reason="refusal",
        model="claude-opus-5-5",
        content=[],
        stop_details=SimpleNamespace(explanation="not allowed"),
    )

    with pytest.raises(prov.ProviderRefused, match="not allowed"):
        claude_with(FakeAnthropic(response=response), monkeypatch).chat([{"role": "user", "content": "x"}])


def test_claude_connection_error_becomes_provider_error(monkeypatch):
    error = anthropic.APIConnectionError(request=httpx2.Request("POST", "https://api.anthropic.com/v1/messages"))

    with pytest.raises(prov.ProviderError, match="Could not reach"):
        claude_with(FakeAnthropic(error=error), monkeypatch).chat([{"role": "user", "content": "x"}])


def test_claude_unavailable_without_credentials(monkeypatch, tmp_path):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.delenv("ANTHROPIC_AUTH_TOKEN", raising=False)
    monkeypatch.setattr(prov.Path, "home", lambda: tmp_path)

    ok, reason = prov.ClaudeProvider().status()

    assert not ok
    assert "ANTHROPIC_API_KEY" in reason


# ---- Local (LM Studio / Ollama) adapter -----------------------------------

def local_with(routes, **kwargs):
    calls = []

    def http(method, url, body=None, headers=None, timeout=10):
        calls.append((method, url, body))
        handler = routes[(method, url.rsplit("/", 1)[-1])]
        if isinstance(handler, Exception):
            raise handler
        return handler

    provider = prov.LocalProvider(
        "lmstudio", "LM Studio", "TEST_URL", "http://desk:1234/v1", "TEST_MODEL", http=http, **kwargs
    )
    return provider, calls


def test_local_prefers_a_hermes_model_and_sends_the_system_prompt(monkeypatch):
    monkeypatch.delenv("TEST_MODEL", raising=False)
    provider, calls = local_with({
        ("GET", "models"): {"data": [{"id": "qwen2.5-coder-7b"}, {"id": "nous-hermes-3-llama-8b"}]},
        ("POST", "completions"): {"model": "nous-hermes-3-llama-8b", "choices": [{"message": {"content": "hi!"}}]},
    }, prefer="hermes")

    assert provider.status() == (True, "")
    reply, model = provider.chat([{"role": "user", "content": "hello"}])

    assert (reply, model) == ("hi!", "nous-hermes-3-llama-8b")
    method, url, body = calls[-1]
    assert url == "http://desk:1234/v1/chat/completions"
    assert body["model"] == "nous-hermes-3-llama-8b"
    assert body["messages"][0]["role"] == "system"
    assert body["messages"][1:] == [{"role": "user", "content": "hello"}]


def test_local_unreachable_is_reported(monkeypatch):
    provider, _ = local_with({("GET", "models"): OSError("connection refused")})

    ok, reason = provider.status()

    assert not ok
    assert reason == "LM Studio not reachable at http://desk:1234/v1"


def test_local_with_no_model_loaded_is_unavailable():
    provider, _ = local_with({("GET", "models"): {"data": []}})

    assert provider.status() == (False, "No model loaded in LM Studio")
