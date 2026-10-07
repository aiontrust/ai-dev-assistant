import { useCallback, useEffect, useState } from "react";
import { getProviders, selectProvider } from "../utils/api";

/**
 * The assistant's model providers, refreshed every `intervalMs` while `active`
 * (e.g. while the GPT popup is open). Returns { list, select, refresh }:
 * list is the backend's { active, providers } or null before the first answer
 * / while offline; select(id) makes that provider answer first.
 */
export default function useProviders({ active = true, intervalMs = 15000 } = {}) {
  const [list, setList] = useState(null);

  const refresh = useCallback(async () => {
    try {
      setList(await getProviders());
    } catch {
      setList(null);
    }
  }, []);

  useEffect(() => {
    if (!active) return undefined;
    refresh();
    const timer = setInterval(refresh, intervalMs);
    return () => clearInterval(timer);
  }, [active, intervalMs, refresh]);

  const select = useCallback(async (id) => {
    setList(await selectProvider(id));
  }, []);

  return { list, select, refresh };
}
