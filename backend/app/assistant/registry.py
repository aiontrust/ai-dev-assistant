"""Chooses which provider answers, and falls back to the next one if it can't."""

import os

from app.assistant.providers import ProviderError, ProviderRefused, default_providers

MAX_TURNS = 40  # most recent messages sent with each request


class NoProviderAvailable(Exception):
    def __init__(self, reasons):
        super().__init__("No model provider is available")
        self.reasons = reasons  # {provider id: why it couldn't answer}


class Assistant:
    def __init__(self, providers=None):
        self.providers = providers if providers is not None else default_providers()
        self._by_id = {p.id: p for p in self.providers}
        wanted = os.getenv("SATI_PROVIDER", self.providers[0].id)
        self.active = wanted if wanted in self._by_id else self.providers[0].id

    def describe(self):
        rows = []
        for p in self.providers:
            ok, reason = p.status()
            rows.append({
                "id": p.id,
                "label": p.label,
                "model": p.model,
                "available": ok,
                "reason": reason,
                "active": p.id == self.active,
            })
        return {"active": self.active, "providers": rows}

    def select(self, provider_id):
        if provider_id not in self._by_id:
            raise KeyError(provider_id)
        self.active = provider_id

    def chat(self, messages):
        """
        Answers with the active provider, falling back through the others in order.
        Returns the reply plus who produced it and who was skipped on the way.
        """
        messages = messages[-MAX_TURNS:]
        while messages and messages[0]["role"] != "user":
            messages = messages[1:]  # every provider expects the user to speak first
        order = [self._by_id[self.active]] + [p for p in self.providers if p.id != self.active]
        skipped = {}
        for provider in order:
            ok, reason = provider.status()
            if not ok:
                skipped[provider.id] = reason
                continue
            try:
                reply, model = provider.chat(messages)
            except ProviderRefused:
                raise  # a declined request must not be retried elsewhere
            except ProviderError as e:
                skipped[provider.id] = str(e)
                continue
            return {
                "reply": reply,
                "provider": provider.id,
                "label": provider.label,
                "model": model,
                # Set when the selected provider couldn't answer and another did.
                "fallback_from": self.active if provider.id != self.active else None,
                "skipped": skipped,
            }
        raise NoProviderAvailable(skipped)
