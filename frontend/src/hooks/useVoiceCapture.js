import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE } from "../utils/api";
export const WAVE_BARS = 64;

// Browsers record different containers: Chrome WebM, Firefox Ogg, Safari MP4.
const EXTENSIONS = { "audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "m4a" };

// Records the microphone, exposes live levels for the waveform, and uploads the
// clip to the backend's POST /speech-to-text/ endpoint.
//
//   state: "idle" -> "recording" -> "processing" -> "uploaded" (or back to "idle" on error)
//   levelsRef.current: array of WAVE_BARS values in 0..1, updated every animation frame
//     (kept in a ref so the waveform can animate without re-rendering the page)
export default function useVoiceCapture() {
  const [state, setState] = useState("idle");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const levelsRef = useRef(new Array(WAVE_BARS).fill(0));
  const session = useRef(null);

  const release = useCallback(() => {
    const s = session.current;
    session.current = null;
    if (s) {
      cancelAnimationFrame(s.raf);
      s.stream.getTracks().forEach((t) => t.stop());
      s.ctx.close().catch(() => {});
    }
    levelsRef.current = new Array(WAVE_BARS).fill(0);
  }, []);

  // Stop the mic if the component unmounts mid-recording.
  useEffect(() => release, [release]);

  const upload = useCallback(async (blob) => {
    setState("processing");
    try {
      const body = new FormData();
      body.append("file", blob, `recording.${EXTENSIONS[blob.type.split(";")[0]] || "webm"}`);
      const res = await fetch(`${API_BASE}/speech-to-text/`, { method: "POST", body });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || `HTTP ${res.status}`);
      setTranscript(json.transcription || "");
      setState("uploaded");
    } catch (e) {
      setError(
        e instanceof TypeError ? "Backend not reachable" : e.message || "Upload failed"
      );
      setState("idle");
    }
  }, []);

  const start = useCallback(async () => {
    setError("");
    setTranscript("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const samples = new Uint8Array(analyser.frequencyBinCount);

      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      recorder.onstop = () => {
        const type = recorder.mimeType || "audio/webm";
        release();
        upload(new Blob(chunks, { type }));
      };

      const tick = () => {
        if (!session.current) return;
        analyser.getByteTimeDomainData(samples);
        const step = samples.length / WAVE_BARS;
        const next = new Array(WAVE_BARS);
        for (let i = 0; i < WAVE_BARS; i += 1) {
          let peak = 0;
          for (let j = Math.floor(i * step); j < Math.floor((i + 1) * step); j += 1) {
            peak = Math.max(peak, Math.abs(samples[j] - 128));
          }
          next[i] = peak / 128;
        }
        levelsRef.current = next;
        session.current.raf = requestAnimationFrame(tick);
      };

      session.current = { stream, ctx, recorder, raf: 0 };
      recorder.start();
      setState("recording");
      tick();
    } catch (e) {
      release();
      setError(e.name === "NotAllowedError" ? "Microphone blocked" : "No microphone");
      setState("idle");
    }
  }, [release, upload]);

  const stop = useCallback(() => {
    const s = session.current;
    if (s && s.recorder.state === "recording") s.recorder.stop();
  }, []);

  const toggle = useCallback(() => {
    if (state === "recording") stop();
    else if (state !== "processing") start();
  }, [state, start, stop]);

  return { state, transcript, error, levelsRef, toggle };
}
