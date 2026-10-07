"""
Model providers SATI can talk to. Each one turns a conversation into a reply.

- Claude (Anthropic API): the default; needs ANTHROPIC_API_KEY (or another
  credential the Anthropic SDK can find).
- LM Studio and Ollama: local servers with OpenAI-style chat endpoints, e.g. a
  Hermes model loaded in LM Studio. They need no keys; the loaded model is
  detected unless one is named in the environment.
"""

import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

import anthropic

SYSTEM_PROMPT = (
    "You are SATI (Self Assessing Trained Interface), the assistant built into a "
    "heads-up-display development environment. Help the developer write, run and "
    "debug code. Keep replies concise. Put code in fenced blocks with a language "
    "tag (```python ...```); the HUD offers to open each block in its IDE."
)


class ProviderError(Exception):
    """The provider could not answer (unreachable, misconfigured, rate limited...)."""


class ProviderRefused(Exception):
    """The model declined the request. Not retried on another provider."""


class ClaudeProvider:
    id = "claude"
    label = "Claude"

    def __init__(self, client_factory=anthropic.Anthropic):
        self._client_factory = client_factory
        self._client = None

    @property
    def model(self):
        return os.getenv("SATI_CLAUDE_MODEL", "claude-opus-5-5")

    def status(self):
        # The SDK also reads ANTHROPIC_AUTH_TOKEN and `ant auth login` profiles.
        has_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("ANTHROPIC_AUTH_TOKEN")
        has_profile = (Path.home() / ".config" / "anthropic").is_dir()
        if has_key or has_profile:
            return True, ""
        return False, "No Anthropic credentials (set ANTHROPIC_API_KEY)"

    def chat(self, messages):
        if self._client is None:
            self._client = self._client_factory()
        try:
            response = self._client.beta.messages.create(
                model=self.model,
                max_tokens=16000,
                system=SYSTEM_PROMPT,
                messages=messages,
                # Claude Opus 5.5 defaults to medium effort; set it explicitly.
                output_config={"effort": os.getenv("SATI_CLAUDE_EFFORT", "medium")},
                # If a safety classifier declines, Anthropic re-runs the request on
                # its recommended fallback model instead of returning a refusal.
                betas=["server-side-fallback-2026-07-01"],
                fallbacks="default",
            )
        except anthropic.AuthenticationError as e:
            raise ProviderError("Anthropic API key was rejected") from e
        except anthropic.PermissionDeniedError as e:
            raise ProviderError("Anthropic API key lacks access to this model") from e
        except anthropic.RateLimitError as e:
            raise ProviderError("Claude is rate limited; try again shortly") from e
        except anthropic.APIStatusError as e:
            raise ProviderError(f"Claude error {e.status_code}: {e.message}") from e
        except anthropic.APIConnectionError as e:
            raise ProviderError("Could not reach the Anthropic API") from e

        if response.stop_reason == "refusal":
            details = getattr(response, "stop_details", None)
            reason = getattr(details, "explanation", None) or "the request was declined"
            raise ProviderRefused(f"Claude declined: {reason}")
        text = "".join(block.text for block in response.content if block.type == "text")
        return text, response.model


def _http_json(method, url, body=None, headers=None, timeout=10):
    """Small JSON-over-HTTP helper (stdlib only)."""
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(url, data=data, method=method)
    request.add_header("Content-Type", "application/json")
    for key, value in (headers or {}).items():
        request.add_header(key, value)
    with urllib.request.urlopen(request, timeout=timeout) as res:
        return json.load(res)


class LocalProvider:
    """A local server with OpenAI-style /models and /chat/completions endpoints."""

    STATUS_TTL = 15  # seconds to remember a reachability check

    def __init__(self, id, label, url_env, default_url, model_env, prefer=None, http=_http_json):
        self.id = id
        self.label = label
        self._url_env = url_env
        self._default_url = default_url
        self._model_env = model_env
        self._prefer = prefer  # e.g. "hermes": pick a loaded model whose id contains it
        self._http = http
        self._checked = {"at": -1e9, "ok": False, "reason": "", "model": None}

    @property
    def base_url(self):
        return os.getenv(self._url_env, self._default_url).rstrip("/")

    @property
    def model(self):
        return os.getenv(self._model_env) or self._checked["model"]

    def _check(self):
        now = time.monotonic()
        if now - self._checked["at"] < self.STATUS_TTL:
            return
        try:
            ids = [m["id"] for m in self._http("GET", f"{self.base_url}/models", timeout=2).get("data", [])]
            preferred = [i for i in ids if self._prefer and self._prefer in i.lower()]
            model = os.getenv(self._model_env) or (preferred or ids or [None])[0]
            ok = model is not None
            reason = "" if ok else f"No model loaded in {self.label}"
        except (OSError, ValueError, KeyError) as e:
            ok, model, reason = False, None, f"{self.label} not reachable at {self.base_url}"
            if isinstance(e, urllib.error.HTTPError):
                reason = f"{self.label} answered HTTP {e.code}"
        self._checked = {"at": now, "ok": ok, "reason": reason, "model": model}

    def status(self):
        self._check()
        return self._checked["ok"], self._checked["reason"]

    def chat(self, messages):
        self._check()
        if not self._checked["ok"]:
            raise ProviderError(self._checked["reason"])
        body = {
            "model": self.model,
            "messages": [{"role": "system", "content": SYSTEM_PROMPT}, *messages],
            "stream": False,
        }
        try:
            # Local models can be slow on modest hardware.
            data = self._http("POST", f"{self.base_url}/chat/completions", body, timeout=180)
            return data["choices"][0]["message"]["content"] or "", data.get("model", self.model)
        except (OSError, ValueError, KeyError, IndexError) as e:
            self._checked["at"] = -1e9  # re-check reachability next time
            raise ProviderError(f"{self.label} failed: {e}") from e


def default_providers():
    """Providers in fallback order."""
    return [
        ClaudeProvider(),
        LocalProvider(
            "lmstudio", "LM Studio", "SATI_LMSTUDIO_URL", "http://localhost:1234/v1",
            "SATI_LMSTUDIO_MODEL", prefer="hermes",
        ),
        LocalProvider(
            "ollama", "Ollama", "SATI_OLLAMA_URL", "http://localhost:11434/v1", "SATI_OLLAMA_MODEL",
        ),
    ]
