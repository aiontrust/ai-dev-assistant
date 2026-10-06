import mimetypes
import re
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse

from app.services.speech_to_text import convert_audio_to_text

router = APIRouter()

# Recordings are kept here for playback: backend/temp/
RECORDINGS_DIR = Path(__file__).resolve().parents[2] / "temp"
RECORDINGS_DIR.mkdir(exist_ok=True)

EXTENSIONS = {
    "audio/webm": ".webm",
    "audio/ogg": ".ogg",
    "audio/mp4": ".m4a",
    "audio/mpeg": ".mp3",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/flac": ".flac",
}

# Names this module generates: 20261006-142501-1a2b3c4d.webm
RECORDING_NAME = re.compile(r"^\d{8}-\d{6}-[0-9a-f]{8}\.[a-z0-9]{2,5}$")


@router.post("/convert-audio")
async def convert_audio(audio_file: bytes):
    text = convert_audio_to_text(audio_file)
    return {"text": text}


@router.post("/speech-to-text/")
async def speech_to_text(file: UploadFile = File(...)):
    """
    Save the uploaded recording for playback and return its transcription.
    """
    content_type = (file.content_type or "").split(";")[0].strip().lower()
    if not content_type or content_type == "application/octet-stream":
        content_type = mimetypes.guess_type(file.filename or "")[0] or "audio/webm"
    ext = EXTENSIONS.get(content_type) or Path(file.filename or "").suffix.lower() or ".bin"

    name = f"{datetime.now():%Y%m%d-%H%M%S}-{uuid.uuid4().hex[:8]}{ext}"
    path = RECORDINGS_DIR / name
    path.write_bytes(await file.read())
    recording = {"recording": name, "recording_url": f"/recordings/{name}"}

    try:
        transcription = convert_audio_to_text(str(path), content_type)
    except Exception as e:
        # Keep the recording even when transcription fails, so it can still be played back.
        return JSONResponse(status_code=502, content={"error": str(e), **recording})

    return {"transcription": transcription, **recording}


@router.get("/recordings/{name}")
async def get_recording(name: str):
    """Serve a saved recording for playback."""
    path = RECORDINGS_DIR / name
    if not RECORDING_NAME.match(name) or not path.is_file():
        raise HTTPException(status_code=404, detail="Recording not found")
    return FileResponse(path)
