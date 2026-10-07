import { useEffect, useRef, useState } from "react";
import { API_BASE } from "../utils/api";

const WS_URL = `${API_BASE.replace(/^http/, "ws")}/api/v1/ws`;
const PING_MS = 5000;
const RETRY_MIN_MS = 2000;
const RETRY_MAX_MS = 15000;

const INITIAL = {
  status: "connecting", // "connecting" | "open" | "closed"
  greeting: "", // first message from the backend
  openedAt: null, // Date.now() when the current link opened
  sent: 0,
  received: 0,
  rtt: null, // ms, from the last ping / pong
  reconnects: 0,
};

/**
 * Keeps a WebSocket open to the backend's /api/v1/ws, pinging it to measure
 * round-trip time and reconnecting with backoff when it drops.
 * onActivity(direction) runs for every message sent ("out") or received ("in").
 */
export default function useWebSocket({ onActivity } = {}) {
  const [link, setLink] = useState(INITIAL);
  const activityRef = useRef(onActivity);
  activityRef.current = onActivity;

  useEffect(() => {
    let socket = null;
    let pingTimer = 0;
    let retryTimer = 0;
    let retryMs = RETRY_MIN_MS;
    let pingSentAt = 0;
    let stopped = false;
    let everOpened = false;

    const send = (text) => {
      if (socket?.readyState !== WebSocket.OPEN) return;
      socket.send(text);
      setLink((l) => ({ ...l, sent: l.sent + 1 }));
      activityRef.current?.("out");
    };

    const connect = () => {
      setLink((l) => ({ ...l, status: "connecting" }));
      try {
        socket = new WebSocket(WS_URL);
      } catch {
        scheduleRetry();
        return;
      }
      socket.onopen = () => {
        retryMs = RETRY_MIN_MS;
        // Read before the update: React may run the updater after everOpened changes.
        const isReconnect = everOpened;
        everOpened = true;
        setLink((l) => ({
          ...l,
          status: "open",
          openedAt: Date.now(),
          reconnects: isReconnect ? l.reconnects + 1 : l.reconnects,
        }));
        pingTimer = setInterval(() => {
          pingSentAt = performance.now();
          send("ping");
        }, PING_MS);
      };
      socket.onmessage = (e) => {
        const text = String(e.data);
        setLink((l) => ({
          ...l,
          received: l.received + 1,
          greeting: l.greeting || text,
          rtt: text === "pong" && pingSentAt ? Math.round(performance.now() - pingSentAt) : l.rtt,
        }));
        activityRef.current?.("in");
      };
      socket.onclose = () => {
        clearInterval(pingTimer);
        if (stopped) return;
        setLink((l) => ({ ...l, status: "closed", openedAt: null, rtt: null }));
        scheduleRetry();
      };
    };

    function scheduleRetry() {
      if (stopped) return;
      retryTimer = setTimeout(connect, retryMs);
      retryMs = Math.min(RETRY_MAX_MS, retryMs * 2);
    }

    connect();
    return () => {
      stopped = true;
      clearInterval(pingTimer);
      clearTimeout(retryTimer);
      socket?.close();
    };
  }, []);

  return link;
}
