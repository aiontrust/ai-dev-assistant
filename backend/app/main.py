from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from app.api.endpoints import example
from app.routes.audio_routes import router as audio_router
from fastapi.middleware.cors import CORSMiddleware
import os
import subprocess
import sys
print(sys.path)


# Initialize FastAPI app
app = FastAPI()

# Define the root route
@app.get("/")
def read_root():
    return HTMLResponse("""
        <h1>Welcome to the AI Development Assistant</h1>
        <p>Use this platform for real-time coding, debugging, and testing assistance.</p>
    """)

app.include_router(example.router, prefix="/api/v1")

# Register the audio processing route
app.include_router(audio_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend's URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def execute_code_in_docker(code: str, language: str):
    # Define file names and Docker images for supported languages
    file_names = {"python": "script.py", "cpp": "main.cpp"}
    docker_images = {"python": "python:3.9", "cpp": "gcc:latest"}

    # Ensure the specified language is supported
    if language not in file_names or language not in docker_images:
        return {"error": f"Unsupported language: {language}"}

    # Save the code to a file
    file_name = file_names[language]
    with open(file_name, "w") as file:
        file.write(code)

    # Construct the Docker command
    if language == "python":
        docker_command = [
            "docker", "run", "--rm", "-v",
            f"{os.getcwd()}:/app", docker_images[language],
            "python", f"/app/{file_name}"
        ]
    elif language == "cpp":
        docker_command = [
            "docker", "run", "--rm", "-v",
            f"{os.getcwd()}:/app", docker_images[language],
            "bash", "-c", f"g++ /app/{file_name} -o /app/a.out && /app/a.out"
        ]

    # Execute the command
    try:
        result = subprocess.run(
            docker_command, capture_output=True, text=True
        )
        return {"stdout": result.stdout, "stderr": result.stderr}
    except Exception as e:
        return {"error": str(e)}
    