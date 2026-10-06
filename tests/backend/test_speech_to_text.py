import shutil
import subprocess

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.routes import audio_routes
from app.services import speech_to_text

Encoding = speech_to_text.Encoding


class FakeClient:
    """Stands in for the Google client and records what it was asked to transcribe."""

    def __init__(self, transcript="run the tests", error=None):
        self.transcript = transcript
        self.error = error
        self.calls = []

    def recognize(self, config, audio):
        self.calls.append((config, audio))
        if self.error:
            raise self.error
        alt = type("Alt", (), {"transcript": self.transcript})
        result = type("Result", (), {"alternatives": [alt]})
        return type("Response", (), {"results": [result]})


@pytest.fixture
def fake_google(monkeypatch, tmp_path):
    fake = FakeClient()
    monkeypatch.setattr(speech_to_text, "_client", fake)
    monkeypatch.setattr(audio_routes, "RECORDINGS_DIR", tmp_path)
    return fake


@pytest.fixture
def client():
    return TestClient(app)


def upload(client, data, content_type, filename="recording.webm"):
    return client.post("/speech-to-text/", files={"file": (filename, data, content_type)})


def test_webm_opus_is_sent_natively_and_saved_for_playback(client, fake_google, tmp_path):
    res = upload(client, b"webm-bytes", "audio/webm;codecs=opus")

    assert res.status_code == 200
    body = res.json()
    assert body["transcription"] == "run the tests"
    assert body["recording"].endswith(".webm")

    config, audio = fake_google.calls[0]
    assert config.encoding == Encoding.WEBM_OPUS
    assert config.sample_rate_hertz == 48000
    assert audio.content == b"webm-bytes"

    # Kept on disk and served back for playback.
    assert (tmp_path / body["recording"]).read_bytes() == b"webm-bytes"
    playback = client.get(body["recording_url"])
    assert playback.status_code == 200
    assert playback.content == b"webm-bytes"


def test_ogg_opus_from_firefox(client, fake_google):
    res = upload(client, b"ogg-bytes", "audio/ogg;codecs=opus", "recording.ogg")

    assert res.status_code == 200
    assert res.json()["recording"].endswith(".ogg")
    assert fake_google.calls[0][0].encoding == Encoding.OGG_OPUS


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg not installed")
def test_safari_mp4_is_converted_to_wav(client, fake_google):
    mp4 = subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-f", "lavfi", "-i", "sine=frequency=440:duration=0.5",
         "-c:a", "aac", "-f", "mp4", "-movflags", "frag_keyframe+empty_moov", "pipe:1"],
        capture_output=True, check=True,
    ).stdout

    res = upload(client, mp4, "audio/mp4", "recording.m4a")

    assert res.status_code == 200
    assert res.json()["recording"].endswith(".m4a")
    config, audio = fake_google.calls[0]
    assert config.encoding == Encoding.LINEAR16
    assert audio.content[:4] == b"RIFF"


def test_failed_transcription_still_keeps_the_recording(client, fake_google, tmp_path):
    fake_google.error = RuntimeError("quota exceeded")

    res = upload(client, b"webm-bytes", "audio/webm")

    assert res.status_code == 502
    body = res.json()
    assert body["error"] == "quota exceeded"
    assert (tmp_path / body["recording"]).exists()


@pytest.mark.parametrize("name", ["..%2Fmain.py", "notes.txt", "20261006-142501-zzzzzzzz.webm"])
def test_playback_only_serves_saved_recordings(client, fake_google, name):
    assert client.get(f"/recordings/{name}").status_code == 404
