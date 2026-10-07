import { useEffect, useState } from "react";

/**
 * Keeps the last `size` readings from useSystemMetrics() as { cpu, memory }
 * (0..1), oldest first. Offline polls add nothing, so the chart freezes rather
 * than dropping to zero.
 */
export default function useMetricsHistory(metrics, size = 40) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!metrics.online || metrics.cpu === null) return;
    setHistory((h) => [...h, { cpu: metrics.cpu, memory: metrics.memory }].slice(-size));
  }, [metrics, size]);

  return history;
}
