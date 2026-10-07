import { useEffect, useRef, useState } from "react";
import { getMetrics } from "../utils/api";

const EMPTY = { cpu: null, memory: null, disk: null, network: null, processes: null, latency: null };

const ratio = (v) => (typeof v === "number" ? Math.min(1, Math.max(0, v / 100)) : null);

/**
 * Polls the backend's system load.
 *
 * Returns { cpu, memory, disk, network, processes, latency, online }: cpu, memory
 * and disk are 0..1, network is { sent, recv } in bytes per second, processes a
 * count (all null until the first reading or while offline); latency is the
 * poll's round trip in ms; online is true / false once a poll has finished.
 * onPoll runs after every successful reading.
 */
export default function useSystemMetrics({ intervalMs = 2000, onPoll } = {}) {
  const [metrics, setMetrics] = useState({ ...EMPTY, online: null });
  const onPollRef = useRef(onPoll);
  onPollRef.current = onPoll;

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      if (document.hidden) return;
      try {
        const started = performance.now();
        const { cpu, memory, disk, network, processes } = await getMetrics();
        if (cancelled) return;
        setMetrics({
          cpu: ratio(cpu),
          memory: ratio(memory),
          disk: ratio(disk),
          network: network || null,
          processes: processes ?? null,
          latency: Math.round(performance.now() - started),
          online: true,
        });
        onPollRef.current?.();
      } catch {
        if (!cancelled) setMetrics({ ...EMPTY, online: false });
      }
    };
    poll();
    const timer = setInterval(poll, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [intervalMs]);

  return metrics;
}
