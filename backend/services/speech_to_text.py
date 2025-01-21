import os
import io
import speech_recognition as sr
from google.cloud import speech_v1p1beta1 as speech

# Google Cloud Speech Client
client = speech.SpeechClient()

def convert_audio_to_text(audio_file_path):
    """
    Convert an audio file to text using Google Speech-to-Text API.
    """
    # Load the audio file
    with io.open(audio_file_path, "rb") as audio_file:
        content = audio_file.read()

    # Configure recognition settings
    audio = speech.RecognitionAudio(content=content)
    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
        sample_rate_hertz=16000,
        language_code="en-US",
    )

    # Perform speech recognition
    response = client.recognize(config=config, audio=audio)

    # Extract and return transcription
    transcription = " ".join(result.alternatives[0].transcript for result in response.results)
    return transcription


def convert_with_sr(audio_file_path):
    """
    Convert an audio file to text using the SpeechRecognition library.
    """
    recognizer = sr.Recognizer()

    # Load the audio file
    with sr.AudioFile(audio_file_path) as source:
        audio = recognizer.record(source)

    # Recognize speech using Google Web Speech API
    try:
        transcription = recognizer.recognize_google(audio)
        return transcription
    except sr.UnknownValueError:
        return "Google Speech Recognition could not understand audio."
    except sr.RequestError as e:
        return f"Could not request results from Google Speech Recognition; {e}"
