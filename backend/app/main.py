from fastapi import FastAPI
from app.api.endpoints import example
import sys
print(sys.path)


# Initialize FastAPI app
app = FastAPI()

app.include_router(example.router, prefix="/api/v1")