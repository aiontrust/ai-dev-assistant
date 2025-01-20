from fastapi import APIRouter, WebSocket, HTTPException
from fastapi.responses import HTMLResponse
from app.models import GPTRequest
import openai

# Initialize FastAPI router
router = APIRouter()

# Root route for testing
@router.get("/test")
async def test_endpoint():
    return HTMLResponse("""
        <h1>Welcome to the AI Development Assistant</h1>
        <p>Use this platform for real-time coding, debugging, and testing assistance.</p>
    """)

# GPT Route
@router.post("/gpt")
def get_gpt_response(request: GPTRequest):
    try:
        response = openai.Completion.create(
            engine="text-davinci-003",
            prompt=request.prompt,
            max_tokens=request.max_tokens,
        )
        return {"response": response.choices[0].text.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {e}")

# WebSocket for Real-Time Updates
@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    await websocket.send_text("Connected to AI Development Assistant!")
    try:
        while True:
            data = await websocket.receive_text()
            response = openai.Completion.create(
                engine="text-davinci-003", prompt=data, max_tokens=150
            )
            await websocket.send_text(response.choices[0].text.strip())
    except Exception as e:
        await websocket.close()
        print(f"WebSocket closed: {e}")
