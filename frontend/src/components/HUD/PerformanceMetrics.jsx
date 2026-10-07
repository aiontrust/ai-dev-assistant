import { place } from "./Board";

// Output Vector (Figma 257:14): five readouts beside the OS gauge, top to bottom.
const BOX = { x: 243.7, w: 66.7, h: 24.2 };
const ROWS = [100.6, 139.5, 178.7, 216.9, 256.1];

const pct = (v) => (v === null || v === undefined ? "--" : `${Math.round(v * 100)}%`);

function rate(bytesPerSec) {
  if (bytesPerSec === null || bytesPerSec === undefined) return "--";
  if (bytesPerSec < 1024) return `${Math.round(bytesPerSec)}B`;
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)}K`;
  return `${(bytesPerSec / 1024 / 1024).toFixed(1)}M`;
}

/** The five readouts, in Output 1..5 order. */
function readouts(m) {
  return [
    { label: "CPU", value: pct(m.cpu), level: m.cpu },
    { label: "MEMORY", value: pct(m.memory), level: m.memory },
    { label: "DISK", value: pct(m.disk), level: m.disk },
    {
      label: "NETWORK",
      value: m.network ? `↓${rate(m.network.recv)} ↑${rate(m.network.sent)}` : "--",
    },
    { label: "PROCESSES", value: m.processes ?? "--" },
  ];
}

/**
 * Performance metrics in the Output Vector boxes: CPU, memory and disk load,
 * network throughput and process count of the backend machine.
 * `metrics` is the object from useSystemMetrics().
 */
export default function PerformanceMetrics({ metrics }) {
  const offline = metrics.online === false;
  return readouts(metrics).map((r, i) => (
    <div
      key={r.label}
      className={`hud-output${offline ? " hud-output--idle" : ""}`}
      style={place({ ...BOX, y: ROWS[i] })}
      role="status"
      aria-label={`${r.label} ${r.value}`}
    >
      <span className="hud-output__label">{r.label}</span>
      <span className="hud-output__value">{r.value}</span>
      {r.level !== undefined && (
        <span className="hud-output__bar">
          <i style={{ width: pct(r.level === null ? 0 : r.level) }} />
        </span>
      )}
    </div>
  ));
}
