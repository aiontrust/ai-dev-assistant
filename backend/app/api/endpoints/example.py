from fastapi import APIRouter
from fastapi.responses import HTMLResponse

router = APIRouter()

@router.get("/test")
async def test_endpoint():
    return HTMLResponse("""
        <h1>Welcome to the AI Development Assistant</h1>
        <p>Use this platform for real-time coding, debugging, and testing assistance.</p>
    """)

