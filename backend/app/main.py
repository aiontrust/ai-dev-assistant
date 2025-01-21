from fastapi import FastAPI
from app.api.endpoints import example
from app.routes.audio_routes import router as audio_router
import sys
print(sys.path)


# Initialize FastAPI app
app = FastAPI()

app.include_router(example.router, prefix="/api/v1")

# Register the audio processing route
app.include_router(audio_router)