import { useEffect, useRef, useState } from "react";
import { place } from "./Board";

// The WebSocket API panel's screen (Figma 746:29) and the WaveConsole Group
// (158:15) of three consoles beside it, top to bottom.
const SCREEN = { x: 407.14, y: 112.79, w: 73.66, h: 56.34 };
const WAVE = { x: 529.4, w: 89.5, h: 26.2 };
const WAVE_ROWS = [136.5, 171.2, 205.8];

// Canvas covering the three WaveConsoles, for the waves behind their readouts.
const WAVES = { x: 526.5, y: 135.1, w: 95.2, h: 99.6 };
const WAVE_SCALE = 4; // canvas backing store per Figma px

/**
 * Draws one wave along the bottom of each console. `energy` (0..1) swells with
 * socket traffic; a closed link draws a flat line.
 */
function drawWaves(canvas, t, energy, open) {
  const ctx = canvas.getContext("2d");
  ctx.setTransform(WAVE_SCALE, 0, 0, WAVE_SCALE, 0, 0);
  ctx.clearRect(0, 0, WAVES.w, WAVES.h);
  const x0 = WAVE.x - WAVES.x + 2;
  const x1 = x0 + WAVE.w - 4;
  WAVE_ROWS.forEach((row, i) => {
    const mid = row - WAVES.y + WAVE.h * 0.8; // under the readout, not through it
    const amp = open ? 1 + energy * 3.5 : 0;
    const freq = 0.11 + i * 0.05;
    const speed = 2.2 + i * 0.9;
    ctx.strokeStyle = open ? `rgba(113, 223, 255, ${0.22 + energy * 0.4})` : "rgba(79, 123, 153, 0.35)";
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (let x = x0; x <= x1; x += 1) {
      // Taper towards the ends so the wave sits inside the console.
      const edge = Math.sin(((x - x0) / (x1 - x0)) * Math.PI);
      const y =
        mid +
        edge * amp * (Math.sin(x * freq + t * speed) * 0.7 + Math.sin(x * freq * 2.3 - t * speed * 0.6) * 0.3);
      if (x === x0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  });
}

const HEADLINES = { open: "LINKED", connecting: "CONNECTING", closed: "OFFLINE" };

function uptime(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * Live status of the backend WebSocket: the panel's screen shows the link state
 * and the backend's greeting; the three WaveConsoles show uptime, traffic and
 * ping. `link` is the object from useWebSocket().
 */
export default function WebSocketStatus({ link }) {
  const [now, setNow] = useState(Date.now());
  const open = link.status === "open";
  const canvasRef = useRef(null);
  const energyRef = useRef(0);
  const openRef = useRef(open);
  openRef.current = open;

  // Every message in or out swells the waves.
  useEffect(() => {
    energyRef.current = 1;
  }, [link.sent, link.received]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let drawn = 0;
    const frame = (t) => {
      raf = requestAnimationFrame(frame);
      if (t - drawn < 33) return;
      drawn = t;
      energyRef.current *= 0.94;
      drawWaves(canvas, reduceMotion ? 0 : t / 1000, energyRef.current, openRef.current);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [open]);

  const waves = [
    { label: "UPTIME", value: open && link.openedAt ? uptime(Math.max(0, now - link.openedAt)) : "--" },
    { label: "TRAFFIC", value: `↑${link.sent} ↓${link.received}` },
    { label: "PING", value: open && link.rtt !== null ? `${link.rtt} MS` : "--" },
  ];

  return (
    <>
      <div className={`hud-ws hud-ws--${link.status}`} style={place(SCREEN)} role="status" aria-label="WebSocket">
        <div className="hud-ws__head">{HEADLINES[link.status]}</div>
        <div className="hud-ws__msg">{open ? link.greeting : "Waiting for backend…"}</div>
        {link.reconnects > 0 && <div className="hud-ws__meta">RECONNECTS {link.reconnects}</div>}
      </div>

      <canvas
        ref={canvasRef}
        className="hud-ws-waves"
        aria-hidden="true"
        width={Math.round(WAVES.w * WAVE_SCALE)}
        height={Math.round(WAVES.h * WAVE_SCALE)}
        style={place(WAVES)}
      />

      {waves.map((w, i) => (
        <div
          key={w.label}
          className={`hud-output hud-output--wave${open ? "" : " hud-output--idle"}`}
          style={place({ ...WAVE, y: WAVE_ROWS[i] })}
          role="status"
          aria-label={`WebSocket ${w.label} ${w.value}`}
        >
          <span className="hud-output__label">{w.label}</span>
          <span className="hud-output__value">{w.value}</span>
        </div>
      ))}
    </>
  );
}
