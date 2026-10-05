import { useEffect, useRef } from "react";
import { SLOTS } from "./hudLayout";

// Diameter of the clickable disc inside the speaker ring, in Figma pixels.
const CORE = 132;

// Per-frame fall-off for the displayed levels (~0.4 s from full to near zero).
const DECAY = 0.9;

const LIGHTS = [
  ["recording", "REC"],
  ["processing", "PROC"],
  ["uploaded", "SENT"],
];

const SPEAKER_LABELS = {
  idle: "Start voice capture",
  recording: "Stop and transcribe",
  processing: "Transcribing",
  uploaded: "Start voice capture",
};

/** Draws the levels as mirrored bars around a centre line. */
function drawWave(canvas, levels) {
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  const mid = height / 2;
  const slot = width / levels.length;
  const bar = Math.max(1, slot * 0.55);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#71dfff";
  ctx.shadowColor = "rgba(113, 223, 255, 0.8)";
  ctx.shadowBlur = 6;
  for (let i = 0; i < levels.length; i += 1) {
    const h = Math.max(2, Math.min(1, levels[i] * 1.6) * (height - 8));
    ctx.fillRect(i * slot + (slot - bar) / 2, mid - h / 2, bar, h);
  }
}

/**
 * Live voice widgets on the HUD: the speaker ring (click to record), the
 * waveform panel, and the REC / PROC / SENT status lights.
 *
 * `voice` is the object returned by useVoiceCapture().
 */
export default function VoiceDeck({ voice }) {
  const { state, levelsRef, toggle } = voice;
  const glowRef = useRef(null);
  const canvasRef = useRef(null);

  // While recording, animate from the live levels without re-rendering React.
  useEffect(() => {
    const canvas = canvasRef.current;
    const glow = glowRef.current;
    if (state !== "recording") {
      drawWave(canvas, levelsRef.current.map(() => 0));
      glow.style.removeProperty("--level");
      return undefined;
    }
    let raf = 0;
    // Peaks fall off gradually so bars and halo ease down instead of flickering.
    let shown = levelsRef.current.map(() => 0);
    const frame = () => {
      const levels = levelsRef.current.map((v, i) => Math.max(v, shown[i] * DECAY));
      shown = levels;
      drawWave(canvas, levels);
      const avg = levels.reduce((sum, v) => sum + v, 0) / levels.length;
      glow.style.setProperty("--level", Math.min(1, avg * 4).toFixed(3));
      raf = requestAnimationFrame(frame);
    };
    frame();
    return () => cancelAnimationFrame(raf);
  }, [state, levelsRef]);

  const sp = SLOTS.speaker;
  const wave = SLOTS.waveform;

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

      <canvas
        ref={canvasRef}
        className={`hud-wave hud-wave--${state}`}
        aria-hidden="true"
        // 4x backing store so the bars stay crisp when the board is scaled up.
        width={Math.round(wave.w * 4)}
        height={Math.round(wave.h * 4)}
        style={{ left: wave.x, top: wave.y, width: wave.w, height: wave.h }}
      />

      {LIGHTS.map(([key, label]) => {
        const box = SLOTS[key];
        return (
          <div
            key={key}
            className={`hud-light${state === key ? " hud-light--on" : ""}`}
            style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
          >
            {label}
          </div>
        );
      })}
    </>
  );
}
