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

/** Build: the latest CI run reported by the backend. */
export function buildStatus(build, online, now = Date.now()) {
  if (online === false) return null; // the last result would be stale
  if (!build) return online ? { lines: ["CHECKING"], tone: "busy" } : null;
  const where = [build.branch, build.sha].filter(Boolean).join(" ");
  const age = build.updated_at ? ago(build.updated_at, now) : "";
  const detail = [where, age].filter(Boolean).join("  ");
  if (build.status === "success") return { lines: ["PASSING", detail, build.title], tone: "ok" };
  if (FAILED.includes(build.status)) return { lines: ["FAILING", detail, build.title], tone: "warn" };
  if (RUNNING.includes(build.status)) {
    return { lines: [build.status === "queued" ? "QUEUED" : "RUNNING", detail, build.title], tone: "busy" };
  }
  return { lines: ["UNKNOWN", build.error || detail], tone: "warn" };
}
