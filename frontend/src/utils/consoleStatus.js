// What the right-panel status consoles say. Each function returns
// { lines: [headline, ...details], tone } or null for STANDBY.
// tone: "ok" (working), "busy" (in progress), "warn" (down or failing).

const pct = (v) => `${Math.round(v * 100)}%`;

/** "2m ago" style age of an ISO timestamp. */
export function ago(iso, now = Date.now()) {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (!Number.isFinite(s)) return "";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/** Backend server: reachable, and how loaded. */
export function serverStatus({ online, cpu, memory, latency }, host) {
  if (online === null) return { lines: ["CONNECTING", host], tone: "busy" };
  if (!online) return { lines: ["OFFLINE", `${host} unreachable`], tone: "warn" };
  return {
    lines: ["ONLINE", `CPU ${pct(cpu)}  MEM ${pct(memory)}`, `PING ${latency} MS`],
    tone: "ok",
  };
}

/** Terminal: open or docked, running, and how the last command went. */
export function terminalStatus({ open, busy, last }) {
  if (busy && last) return { lines: ["RUNNING", `> ${last.line}`], tone: "busy" };
  if (!last) return open ? { lines: ["READY", "type help"], tone: "ok" } : null;
  return {
    lines: [open ? "READY" : "DOCKED", `> ${last.line}`, last.ok ? "OK" : "FAILED"],
    tone: last.ok ? "ok" : "warn",
  };
}

const RUNNING = ["in_progress", "queued", "waiting", "requested", "pending"];
const FAILED = ["failure", "cancelled", "timed_out", "startup_failure", "action_required"];

// Sources the GPT console reports on, in display order.
const SOURCES = [
  ["ci", "CI"],
  ["cloudflare", "CF"],
  ["docker", "DOCKER"],
];

function short(status) {
  if (status === "success") return "PASS";
  if (FAILED.includes(status)) return "FAIL";
  if (RUNNING.includes(status)) return "RUN";
  if (status === "none") return "--";
  return "?";
}

/**
 * GPT console: the assistant's build reports (GitHub CI, Cloudflare, Docker),
 * from the backend's /api/v1/build summary.
 */
export function buildStatus(report, online, now = Date.now()) {
  if (online === false) return null; // the last report would be stale
  if (!report) return online ? { lines: ["CHECKING BUILDS"], tone: "busy" } : null;

  const known = SOURCES.filter(([key]) => report[key]).map(([key, label]) => ({ label, ...report[key] }));
  const running = known.filter((s) => RUNNING.includes(s.status));
  const failing = known.filter((s) => FAILED.includes(s.status));

  let head;
  let tone;
  if (running.length) {
    head = `${running.map((s) => s.label).join(" + ")} BUILDING`;
    tone = "busy";
  } else if (failing.length) {
    head = `${failing.map((s) => s.label).join(" + ")} FAILING`;
    tone = "warn";
  } else if (known.length && known.every((s) => s.status === "success" || s.status === "none")) {
    head = "ALL PASSING";
    tone = "ok";
  } else {
    head = "STATUS UNKNOWN";
    tone = "warn";
  }

  const summary = known.map((s) => `${s.label} ${short(s.status)}`).join("  ");
  const latest = known
    .filter((s) => s.updated_at)
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))[0];
  const event = latest
    ? [latest.label, short(latest.status), latest.sha, ago(latest.updated_at, now)].filter(Boolean).join(" ")
    : "";

  return { lines: [head, summary, event].filter(Boolean), tone };
}