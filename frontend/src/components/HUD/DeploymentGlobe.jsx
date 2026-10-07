import { useEffect, useRef } from "react";

// Frame 8 (Figma 748:104): the bottom-left octagon, where the inspiration HUD
// has its holographic globe.
const FRAME = { x: 42.36, y: 416.01, w: 102.05, h: 122.39 };
const SCENE_H = 96; // globe + base; the legend sits below
const SCALE = 4; // canvas backing store per Figma px
const R = 27; // globe radius
const CX = FRAME.w / 2;
const CY = 44;
const TILT = 0.38; // radians the globe leans towards the viewer
const RUNNING = ["in_progress", "queued", "waiting", "requested", "pending"];

const COLORS = { ok: "#a6d6a4", warn: "#e0a35c", busy: "#71dfff", none: "#4f7b99" };

function tone(status) {
  if (status === "success") return "ok";
  if (RUNNING.includes(status)) return "busy";
  if (!status || status === "none" || status === "unknown") return "none";
  return "warn";
}

/** Status tone of each deployment target. */
export function targets(report, online) {
  const local = online === null ? "busy" : online ? "ok" : "warn";
  // Build results come through the backend; without it they are unknown.
  const remote = (key) => (online ? tone(report?.[key]?.status) : "none");
  return { local, cloudflare: remote("cloudflare"), docker: remote("docker") };
}

/** Rough longitude of this machine from its time zone (15 degrees per hour). */
const LOCAL_LON = (-new Date().getTimezoneOffset() / 60) * 15;
const DOCKER_SITE = { lat: 39, lon: -77 }; // GitHub-hosted runners (US East)

const rad = (d) => (d * Math.PI) / 180;

/** Projects a lat/lon (degrees) on the rotated, tilted globe: screen x, y and depth z. */
function project(lat, lon, spin) {
  const p = rad(lat);
  const l = rad(lon) + spin;
  const x = Math.cos(p) * Math.sin(l);
  const y = Math.sin(p);
  const z = Math.cos(p) * Math.cos(l);
  return {
    x: CX + R * x,
    y: CY - R * (y * Math.cos(TILT) - z * Math.sin(TILT)),
    z: y * Math.sin(TILT) + z * Math.cos(TILT),
  };
}

function strokePath(ctx, points) {
  // Front segments bright, back segments faint.
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const front = (a.z + b.z) / 2 > 0;
    ctx.strokeStyle = front ? "rgba(113, 223, 255, 0.55)" : "rgba(113, 223, 255, 0.12)";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
}

function marker(ctx, point, color, pulse) {
  const front = point.z > 0;
  ctx.globalAlpha = front ? 1 : 0.25;
  if (pulse && front) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 2 + pulse * 4, 0, Math.PI * 2);
    ctx.globalAlpha = 1 - pulse;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = front ? 4 : 0;
  ctx.beginPath();
  ctx.arc(point.x, point.y, front ? 1.6 : 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

function drawScene(canvas, spin, orbit, pulse, status) {
  const ctx = canvas.getContext("2d");
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.clearRect(0, 0, FRAME.w, SCENE_H);

  // Projector base and light cone, as in the inspiration.
  const baseY = CY + R + 14;
  const beam = ctx.createLinearGradient(0, baseY, 0, CY - R);
  beam.addColorStop(0, "rgba(113, 223, 255, 0.22)");
  beam.addColorStop(1, "rgba(113, 223, 255, 0)");
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(CX - 20, baseY);
  ctx.lineTo(CX - R, CY);
  ctx.lineTo(CX + R, CY);
  ctx.lineTo(CX + 20, baseY);
  ctx.fill();
  [[30, 6, 0.55], [22, 4, 0.8]].forEach(([rx, ry, a]) => {
    ctx.strokeStyle = `rgba(160, 236, 255, ${a})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(CX, baseY, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.shadowBlur = 0;

  // Globe body.
  const body = ctx.createRadialGradient(CX - 8, CY - 10, 2, CX, CY, R);
  body.addColorStop(0, "rgba(40, 120, 180, 0.55)");
  body.addColorStop(1, "rgba(2, 30, 52, 0.85)");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(CX, CY, R, 0, Math.PI * 2);
  ctx.fill();

  // Graticule: meridians every 30 degrees, parallels every 30 degrees.
  ctx.lineWidth = 0.45;
  for (let lon = 0; lon < 360; lon += 30) {
    const pts = [];
    for (let lat = -90; lat <= 90; lat += 10) pts.push(project(lat, lon, spin));
    strokePath(ctx, pts);
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const pts = [];
    for (let lon = 0; lon <= 360; lon += 10) pts.push(project(lat, lon, spin));
    strokePath(ctx, pts);
  }

  // Rim.
  ctx.strokeStyle = "rgba(160, 236, 255, 0.7)";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.arc(CX, CY, R, 0, Math.PI * 2);
  ctx.stroke();

  // Markers: this machine and the Docker build runners.
  marker(ctx, project(35, LOCAL_LON, spin), COLORS[status.local], status.local === "busy" ? pulse : 0);
  marker(ctx, project(DOCKER_SITE.lat, DOCKER_SITE.lon, spin), COLORS[status.docker], status.docker === "busy" ? pulse : 0);

  // Cloudflare runs at the edge everywhere: a satellite on an inclined orbit.
  const ox = CX + Math.cos(orbit) * (R + 8);
  const oy = CY + Math.sin(orbit) * (R + 8) * 0.32 - Math.cos(orbit) * 6;
  const behind = Math.sin(orbit) < 0;
  ctx.strokeStyle = "rgba(113, 223, 255, 0.18)";
  ctx.lineWidth = 0.4;
  ctx.beginPath();
  ctx.ellipse(CX, CY, R + 8, (R + 8) * 0.32 + 1, -0.21, 0, Math.PI * 2);
  ctx.stroke();
  marker(ctx, { x: ox, y: oy, z: behind ? -1 : 1 }, COLORS[status.cloudflare], status.cloudflare === "busy" ? pulse : 0);
}

/**
 * Deployment globe in Frame 8: where SATI is running and how each target is
 * doing. LOCAL is this machine's backend, CF the Cloudflare deployment (an
 * orbiting satellite, since it runs at the edge everywhere), DOCKER the image
 * build. Spins faster while any build is running.
 *  - report: backend build summary ({ ci, cloudflare, docker }) or null
 *  - online: backend reachable (true / false / null while unknown)
 */
export default function DeploymentGlobe({ report, online }) {
  const canvasRef = useRef(null);
  const statusRef = useRef(targets(report, online));
  statusRef.current = targets(report, online);

  useEffect(() => {
    const canvas = canvasRef.current;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let spin = 0.6;
    let orbit = 0;
    let last = performance.now();
    let drawn = 0;
    let raf = 0;
    const frame = (t) => {
      raf = requestAnimationFrame(frame);
      if (t - drawn < 50) return; // 20 fps is plenty for a slow spin
      drawn = t;
      const dt = Math.min(0.1, (t - last) / 1000);
      last = t;
      const s = statusRef.current;
      const building = Object.values(s).includes("busy");
      if (!reduceMotion) {
        spin += dt * (building ? 1.1 : 0.25);
        orbit += dt * (building ? 1.6 : 0.5);
      }
      drawScene(canvas, spin, orbit, reduceMotion ? 0 : (t / 1200) % 1, s);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const s = statusRef.current;
  const items = [
    ["local", "LOCAL"],
    ["cloudflare", "CF"],
    ["docker", "DOCKER"],
  ];
  return (
    <div
      className="hud-globe"
      style={{ left: FRAME.x, top: FRAME.y, width: FRAME.w, height: FRAME.h }}
      role="img"
      aria-label={`Deployments: ${items.map(([k, label]) => `${label} ${s[k]}`).join(", ")}`}
    >
      <canvas
        ref={canvasRef}
        width={Math.round(FRAME.w * SCALE)}
        height={Math.round(SCENE_H * SCALE)}
        style={{ width: FRAME.w, height: SCENE_H }}
      />
      <div className="hud-globe__legend">
        {items.map(([key, label]) => (
          <span key={key} className={`hud-globe__item hud-globe__item--${s[key]}`}>
            <i />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
