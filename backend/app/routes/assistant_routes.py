from typing import List, Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.assistant.providers import ProviderRefused
from app.assistant.registry import Assistant, NoProviderAvailable

router = APIRouter()

# One assistant for the app; the selected provider lasts until the server restarts
# (SATI_PROVIDER sets the starting choice).
assistant = Assistant()


class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1)


class ChatRequest(BaseModel):
    messages: List[Message] = Field(min_length=1)


class ProviderChoice(BaseModel):
    id: str


@router.get("/assistant/providers")
def list_providers():
    """Every provider, whether it can answer right now, and which one is selected."""
    return assistant.describe()


@router.put("/assistant/provider")
def choose_provider(choice: ProviderChoice):
    try:
        assistant.select(choice.id)
    except KeyError:
        raise HTTPException(status_code=400, detail=f"Unknown provider: {choice.id}")
    return assistant.describe()


@router.post("/assistant/chat")
def chat(request: ChatRequest):
    """Reply to a conversation, falling back to the next provider if needed."""
    if request.messages[-1].role != "user":
        raise HTTPException(status_code=400, detail="The last message must be from the user")
    try:
        return assistant.chat([m.model_dump() for m in request.messages])
    except ProviderRefused as e:
        raise HTTPException(status_code=422, detail=str(e))
    except NoProviderAvailable as e:
        reasons = "; ".join(f"{pid}: {why}" for pid, why in e.reasons.items())
        raise HTTPException(status_code=503, detail=f"No model provider available ({reasons})")
