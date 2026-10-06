import subprocess

from google.cloud import speech_v1p1beta1 as speech

Encoding = speech.RecognitionConfig.AudioEncoding

# Formats Google Speech-to-Text decodes directly, keyed by MIME type.
# Browsers record Opus at 48 kHz (Chrome: WebM, Firefox: Ogg); WAV and FLAC
# carry their own sample rate in the header.
NATIVE_FORMATS = {
    "audio/webm": (Encoding.WEBM_OPUS, 48000),
    "audio/ogg": (Encoding.OGG_OPUS, 48000),
    "audio/wav": (Encoding.LINEAR16, None),
    "audio/x-wav": (Encoding.LINEAR16, None),
    "audio/flac": (Encoding.FLAC, None),
}

_client = None


def _get_client():
    """Create the Google client on first use so the app can start without credentials."""
    global _client
    if _client is None:
        _client = speech.SpeechClient()
    return _client


def _to_wav(content):
    """Convert any ffmpeg-readable audio (e.g. Safari's audio/mp4) to 16 kHz mono WAV."""
    try:
        result = subprocess.run(
            ["ffmpeg", "-loglevel", "error", "-i", "pipe:0", "-ac", "1", "-ar", "16000", "-f", "wav", "pipe:1"],
            input=content,
            capture_output=True,
            check=True,
        )
    except FileNotFoundError as e:
        raise RuntimeError("ffmpeg is required to transcribe this audio format") from e
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"Could not decode audio: {e.stderr.decode(errors='replace').strip()}") from e
    return result.stdout


def convert_audio_to_text(audio_file_path, content_type="audio/webm"):
    """
    Convert an audio file to text using Google Speech-to-Text API.
    """
    with open(audio_file_path, "rb") as audio_file:
        content = audio_file.read()

    fmt = NATIVE_FORMATS.get(content_type.split(";")[0].strip().lower())
    if fmt is None:
        content = _to_wav(content)
        fmt = (Encoding.LINEAR16, None)
    encoding, sample_rate = fmt

    config = speech.RecognitionConfig(
        encoding=encoding,
        language_code="en-US",
        enable_automatic_punctuation=True,
    )
    if sample_rate:
        config.sample_rate_hertz = sample_rate

    # Synchronous recognition handles clips up to about a minute.
    response = _get_client().recognize(config=config, audio=speech.RecognitionAudio(content=content))
    return " ".join(result.alternatives[0].transcript for result in response.results)
