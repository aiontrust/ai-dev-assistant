export const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";

/** Shortens a backend error into one console-friendly line. */
function shortError(text) {
  const line = String(text || "").replace(/\s+/g, " ").trim();
  return line.length > 90 ? `${line.slice(0, 87)}...` : line;
}

/**
 * Sends a prompt to the backend's GPT route (POST /api/v1/gpt).
 * Resolves to the reply text; rejects with an Error whose message is safe to show.
 */
export async function askAssistant(prompt) {
  let res;
  try {
    res = await fetch(`${API_BASE}/api/v1/gpt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
  } catch {
    throw new Error("Backend not reachable");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(shortError(body.detail || `HTTP ${res.status}`));
  return body.response || "";
}

/** CPU and memory load of the backend machine: { cpu, memory } in percent. */
export async function getMetrics() {
  const res = await fetch(`${API_BASE}/api/v1/metrics`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Latest build results: { ci, cloudflare, docker }, each { status, branch, sha, title, updated_at, url, error? }. */
export async function getBuildStatus() {
  const res = await fetch(`${API_BASE}/api/v1/build`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** True when the backend answers its root route. */
export async function backendOnline() {
  try {
    const res = await fetch(`${API_BASE}/`);
    return res.ok;
  } catch {
    return false;
  }
}
