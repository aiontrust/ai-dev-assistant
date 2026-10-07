from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import HTMLResponse

from app.assistant.providers import ProviderRefused
from app.assistant.registry import NoProviderAvailable
from app.routes.assistant_routes import assistant

# Initialize FastAPI router
router = APIRouter()

# Root route for testing
@router.get("/test")
async def test_endpoint():
    return HTMLResponse("""
        <h1>Welcome to the AI Development Assistant</h1>
        <p>Use this platform for real-time coding, debugging, and testing assistance.</p>
    """)

# WebSocket for Real-Time Updates
@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    await websocket.send_text("Connected to AI Development Assistant!")
    try:
        while True:
            data = await websocket.receive_text()
            # The HUD pings to measure round-trip time and keep the link alive.
            if data == "ping":
                await websocket.send_text("pong")
                continue
            # Any other text is a one-off prompt for the assistant.
            try:
                result = await run_in_threadpool(assistant.chat, [{"role": "user", "content": data}])
                await websocket.send_text(result["reply"])
            except (NoProviderAvailable, ProviderRefused) as e:
                # Report assistant failures without dropping the connection.
                await websocket.send_text(f"ERROR: {e}")
    except WebSocketDisconnect:
        pass
