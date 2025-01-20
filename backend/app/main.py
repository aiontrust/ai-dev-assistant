from fastapi import FastAPI
from app.api.endpoints import example

# Initialize FastAPI app
app = FastAPI()

app.include_router(example.router, prefix="/api/v1")