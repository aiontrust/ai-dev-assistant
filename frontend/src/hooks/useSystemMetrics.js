import { useEffect, useRef, useState } from "react";
import { getMetrics } from "../utils/api";

/**
 * Polls the backend's CPU load.
 *
 * Returns { cpu, online }: cpu is 0..1 (null until the first reading or while
 * offline), online is true / false once a poll has finished (null before that).
 * onPoll runs after every successful reading.
 */
export default function useSystemMetrics({ intervalMs = 2000, onPoll } = {}) {
  const [metrics, setMetrics] = useState({ cpu: null, online: null });
  const onPollRef = useRef(onPoll);
  onPollRef.current = onPoll;

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      if (document.hidden) return;
      try {
        const { cpu } = await getMetrics();
        if (cancelled) return;
        setMetrics({ cpu: Math.min(1, Math.max(0, cpu / 100)), online: true });
        onPollRef.current?.();
      } catch {
        if (!cancelled) setMetrics({ cpu: null, online: false });
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
