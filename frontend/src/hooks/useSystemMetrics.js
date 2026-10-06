import { useEffect, useRef, useState } from "react";
import { getMetrics } from "../utils/api";

/**
 * Polls the backend's CPU and memory load.
 *
 * Returns { cpu, memory, latency, online }: cpu and memory are 0..1 (null until
 * the first reading or while offline), latency is the poll's round trip in ms,
 * online is true / false once a poll has finished (null before that).
 * onPoll runs after every successful reading.
 */
export default function useSystemMetrics({ intervalMs = 2000, onPoll } = {}) {
  const [metrics, setMetrics] = useState({ cpu: null, memory: null, latency: null, online: null });
  const onPollRef = useRef(onPoll);
  onPollRef.current = onPoll;

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      if (document.hidden) return;
      try {
        const started = performance.now();
        const { cpu, memory } = await getMetrics();
        if (cancelled) return;
        const ratio = (v) => Math.min(1, Math.max(0, v / 100));
        setMetrics({
          cpu: ratio(cpu),
          memory: ratio(memory),
          latency: Math.round(performance.now() - started),
          online: true,
        });
        onPollRef.current?.();
      } catch {
        if (!cancelled) setMetrics({ cpu: null, memory: null, latency: null, online: false });
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
