export const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";

/** Shortens a backend error into one console-friendly line. */
function shortError(text, max = 90) {
  const line = String(text || "").replace(/\s+/g, " ").trim();
  return line.length > max ? `${line.slice(0, max - 3)}...` : line;
}

/** JSON request to the backend; errors carry the backend's own explanation. */
async function request(path, { method = "GET", body, maxError = 90 } = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Backend not reachable");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(shortError(data.detail || `HTTP ${res.status}`, maxError));
  return data;
}

/**
 * Sends a conversation to the assistant (POST /api/v1/assistant/chat).
 * `messages` is [{ role: "user" | "assistant", content }], ending with the user.
 * Resolves to { reply, provider, label, model, fallback_from, skipped }; rejects
 * with an Error whose message is safe to show (e.g. why no provider could answer).
 */
export function askAssistant(messages) {
  return request("/api/v1/assistant/chat", { method: "POST", body: { messages }, maxError: 260 });
}

/** Model providers: { active, providers: [{ id, label, model, available, reason, active }] }. */
export function getProviders() {
  return request("/api/v1/assistant/providers");
}

/** Selects which provider answers first; resolves to the updated provider list. */
export function selectProvider(id) {
  return request("/api/v1/assistant/provider", { method: "PUT", body: { id } });
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
