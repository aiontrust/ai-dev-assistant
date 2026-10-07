import { useEffect, useRef } from "react";
import { place } from "./Board";

// Prometheus Console (Figma 389:51): the octagon below the left output panel.
const BOX = { x: 317.72, y: 420.91, w: 98.81, h: 127.3 };
const CHART = { left: 8, right: 8, top: 22, bottom: 12 }; // inner margins, Figma px
const SCALE = 4; // canvas backing store per Figma px, so bars stay crisp when scaled up

/** Draws CPU as bars and memory as a line over the last N readings. */
function draw(canvas, history, capacity) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width / SCALE;
  const h = canvas.height / SCALE;
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const left = CHART.left;
  const top = CHART.top;
  const width = w - CHART.left - CHART.right;
  const height = h - CHART.top - CHART.bottom;
  const slot = width / capacity;
  const offset = capacity - history.length; // newest readings sit on the right

  // Grid lines at 25 / 50 / 75 %.
  ctx.strokeStyle = "rgba(79, 159, 196, 0.18)";
  ctx.lineWidth = 0.4;
  [0.25, 0.5, 0.75].forEach((f) => {
    ctx.beginPath();
    ctx.moveTo(left, top + height * (1 - f));
    ctx.lineTo(left + width, top + height * (1 - f));
    ctx.stroke();
  });

  // CPU bars.
  ctx.fillStyle = "#3fa4e3";
  ctx.shadowColor = "rgba(113, 223, 255, 0.7)";
  ctx.shadowBlur = 2;
  history.forEach((s, i) => {
    const barH = Math.max(0.6, s.cpu * height);
    ctx.fillRect(left + (offset + i) * slot + slot * 0.2, top + height - barH, slot * 0.6, barH);
  });

  // Memory line.
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#a6d6a4";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  history.forEach((s, i) => {
    const x = left + (offset + i + 0.5) * slot;
    const y = top + height * (1 - s.memory);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Baseline.
  ctx.strokeStyle = "rgba(113, 223, 255, 0.5)";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(left, top + height);
  ctx.lineTo(left + width, top + height);
  ctx.stroke();
}

const pct = (v) => (v === null || v === undefined ? "--" : `${Math.round(v * 100)}%`);

/**
 * Monitoring panel in the Prometheus Console: CPU (bars) and memory (line) over
 * the last `capacity` readings (2 s apart, so 80 s by default).
 */
export default function MonitoringLogging({ history, capacity = 40, pollSeconds = 2 }) {
  const canvasRef = useRef(null);
  const latest = history[history.length - 1];

  useEffect(() => {
    if (canvasRef.current) draw(canvasRef.current, history, capacity);
  }, [history, capacity]);

  return (
    <div className="hud-monitor" style={place(BOX)} role="img" aria-label={`CPU ${pct(latest?.cpu)}, memory ${pct(latest?.memory)}, last ${capacity * pollSeconds} seconds`}>
      <canvas ref={canvasRef} width={Math.round(BOX.w * SCALE)} height={Math.round(BOX.h * SCALE)} />
      <div className="hud-monitor__head">
        <span>CPU {pct(latest?.cpu)}</span>
        <span className="hud-monitor__mem">MEM {pct(latest?.memory)}</span>
      </div>
      <div className="hud-monitor__foot">{capacity * pollSeconds}S HISTORY</div>
    </div>
  );
}
