import { useEffect, useState } from "react";
import { place } from "./Board";

// The WebSocket API panel's screen (Figma 746:29) and the WaveConsole Group
// (158:15) of three consoles beside it, top to bottom.
const SCREEN = { x: 407.14, y: 112.79, w: 73.66, h: 56.34 };
const WAVE = { x: 529.4, w: 89.5, h: 26.2 };
const WAVE_ROWS = [136.5, 171.2, 205.8];

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
