import { useEffect, useState } from "react";
import { getBuildStatus } from "../utils/api";

/**
 * Polls the backend for the latest CI run (the backend caches GitHub for 2 min).
 * Returns the backend's summary, or null before the first answer / while offline.
 */
export default function useBuildStatus(intervalMs = 60000) {
  const [build, setBuild] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      if (document.hidden) return;
      try {
        const next = await getBuildStatus();
        if (!cancelled) setBuild(next);
      } catch {
        if (!cancelled) setBuild(null);
      }
    };
    poll();
    const timer = setInterval(poll, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [intervalMs]);

  return build;
}
