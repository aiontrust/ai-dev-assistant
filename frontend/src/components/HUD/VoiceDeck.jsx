import { useEffect, useRef, useState } from "react";
import { SLOTS } from "./hudLayout";

// Diameter of the clickable disc inside the speaker ring, in Figma pixels.
const CORE = 132;

// Per-frame fall-off for the displayed levels (~0.4 s from full to near zero).
const DECAY = 0.9;

// Bars in the captured-clip outline drawn after recording stops.
const ENVELOPE_BARS = 96;

const clock = (ms) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const size = (bytes) => (bytes < 1024 ? `${bytes} B` : `${Math.round(bytes / 1024)} KB`);

/** Text and tone for the REC / PROC / SENT cells. */
function cells(voice, now) {
  const { state, since, clip, error, errorStage } = voice;
  const elapsed = Math.max(0, now - since); // `now` can trail a just-started stage by one tick
  return [
    {
      key: "recording",
      on: state === "recording",
      text:
        state === "recording" ? `REC ${clock(elapsed)}` : errorStage === "recording" ? "MIC FAIL" : "REC",
      warn: errorStage === "recording",
    },
    {
      key: "processing",
      on: state === "processing",
      text: state === "processing" ? `PROC ${(elapsed / 1000).toFixed(1)}s` : "PROC",
    },
    {
      key: "uploaded",
      on: state === "uploaded",
      text:
        state === "uploaded" && clip
          ? `SENT ${size(clip.bytes)}`
          : errorStage === "processing"
            ? "FAIL"
            : "SENT",
      warn: errorStage === "processing",
      title: errorStage ? error : undefined,
    },
  ];
}

/** Reduces a long level history to `n` peak values for the clip outline. */
function envelope(history, n) {
  if (!history.length) return [];
  const out = new Array(n).fill(0);
  for (let i = 0; i < history.length; i += 1) {
    const b = Math.min(n - 1, Math.floor((i * n) / history.length));
    out[b] = Math.max(out[b], history[i]);
  }
  return out;
}

const SPEAKER_LABELS = {
  idle: "Start voice capture",
  recording: "Stop and transcribe",
  processing: "Transcribing",
  uploaded: "Start voice capture",
};

/** Draws the levels as mirrored bars around a centre line. */
function drawWave(canvas, levels, color = "#71dfff") {
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  const mid = height / 2;
  const slot = width / Math.max(1, levels.length);
  const bar = Math.max(1, slot * 0.55);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = color;
  ctx.shadowColor = "rgba(113, 223, 255, 0.8)";
  ctx.shadowBlur = 6;
  for (let i = 0; i < levels.length; i += 1) {
    const h = Math.max(2, Math.min(1, levels[i] * 1.6) * (height - 8));
    ctx.fillRect(i * slot + (slot - bar) / 2, mid - h / 2, bar, h);
  }
}

/**
 * The word in the speaker's centre (the inspiration HUD's "PROGRESSING"):
 * what the assistant is doing right now, most urgent first.
 */
export function speakerWord(voice, { thinking = false, speaking = false, online = null } = {}) {
  if (voice.state === "recording") return "LISTENING";
  if (voice.state === "processing" || thinking) return "PROCESSING";
  if (speaking) return "SPEAKING";
  if (online === false) return "OFFLINE";
  return "STANDBY";
}

/**
 * Live voice widgets on the HUD: the speaker ring (click to record) with its
 * status word, the waveform panel, and the REC / PROC / SENT status lights.
 *
 * `voice` is the object returned by useVoiceCapture(); `assistant` is
 * { thinking, speaking, online } for the status word.
 */
export default function VoiceDeck({ voice, assistant }) {
  const { state, levelsRef, toggle } = voice;
  const glowRef = useRef(null);
  const canvasRef = useRef(null);
  const historyRef = useRef([]); // average level per frame of the current clip
  const [captured, setCaptured] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Tick the REC / PROC timers.
  useEffect(() => {
    if (state !== "recording" && state !== "processing") return undefined;
    const timer = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(timer);
  }, [state]);

  // While recording, animate from the live levels without re-rendering React.
  // Afterwards, keep the outline of the whole clip on screen.
  useEffect(() => {
    const canvas = canvasRef.current;
    const glow = glowRef.current;
    if (state !== "recording") {
      const outline = envelope(historyRef.current, ENVELOPE_BARS);
      setCaptured(outline.length > 0);
      drawWave(canvas, outline.length ? outline : levelsRef.current.map(() => 0), "#4fb8dc");
      glow.style.removeProperty("--level");
      return undefined;
    }
    historyRef.current = [];
    setCaptured(false);
    let raf = 0;
    // Peaks fall off gradually so bars and halo ease down instead of flickering.
    let shown = levelsRef.current.map(() => 0);
    const frame = () => {
      const levels = levelsRef.current.map((v, i) => Math.max(v, shown[i] * DECAY));
      shown = levels;
      drawWave(canvas, levels);
      const avg = levels.reduce((sum, v) => sum + v, 0) / levels.length;
      historyRef.current.push(Math.max(...levelsRef.current));
      glow.style.setProperty("--level", Math.min(1, avg * 4).toFixed(3));
      raf = requestAnimationFrame(frame);
    };
    frame();
    return () => cancelAnimationFrame(raf);
  }, [state, levelsRef]);

  const sp = SLOTS.speaker;
  const wave = SLOTS.waveform;
  const word = speakerWord(voice, assistant);

  return (
    <>
      <button
        type="button"
        className={`hud-speaker hud-speaker--${state}`}
        aria-label={SPEAKER_LABELS[state]}
        title={SPEAKER_LABELS[state]}
        aria-pressed={state === "recording"}
        disabled={state === "processing"}
        onClick={toggle}
        style={{
          left: sp.x + (sp.w - CORE) / 2,
          top: sp.y + (sp.h - CORE) / 2,
          width: CORE,
          height: CORE,
        }}
      >
        <span className="hud-speaker__glow" ref={glowRef} />
        <span className="hud-speaker__spin" />
        <span className="hud-speaker__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </button>

      {/* Separate from the button so its label stays the action, not the state. */}
      <div
        className={`hud-speaker-word hud-speaker-word--${word.toLowerCase()}`}
        role="status"
        aria-label={`Assistant ${word.toLowerCase()}`}
        style={{ left: sp.x, top: sp.y + sp.h / 2 - 8, width: sp.w }}
      >
        <span key={word}>{word}</span>
      </div>

      <canvas
        ref={canvasRef}
        className={`hud-wave hud-wave--${state}${captured ? " hud-wave--captured" : ""}`}
        aria-hidden="true"
        // 4x backing store so the bars stay crisp when the board is scaled up.
        width={Math.round(wave.w * 4)}
        height={Math.round(wave.h * 4)}
        style={{ left: wave.x, top: wave.y, width: wave.w, height: wave.h }}
      />

      {cells(voice, now).map((cell) => {
        const box = SLOTS[cell.key];
        return (
          <div
            key={cell.key}
            className={`hud-light${cell.on ? " hud-light--on" : ""}${cell.warn ? " hud-light--warn" : ""}`}
            title={cell.title}
            style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
          >
            {cell.text}
          </div>
        );
      })}
    </>
  );
}
