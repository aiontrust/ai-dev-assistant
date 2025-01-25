from fastapi import APIRouter, UploadFile, File
from services.speech_to_text import convert_audio_to_text
import os

router = APIRouter()

@router.post("/convert-audio")
async def convert_audio(audio_file: bytes):
    text = convert_audio_to_text(audio_file)
    return {"text": text}

@router.post("/speech-to-text/")
async def speech_to_text(file: UploadFile = File(...)):
    """
    Endpoint to process uploaded audio file and return transcription.
    """
    try:
        file_path = f"temp/{file.filename}"
        
        # Save uploaded file
        with open(file_path, "wb") as f:
            f.write(file.file.read())

        # Convert audio to text
        transcription = convert_audio_to_text(file_path)

        # Clean up temporary file
        os.remove(file_path)

        return {"transcription": transcription}
    except Exception as e:
        return {"error": str(e)}
