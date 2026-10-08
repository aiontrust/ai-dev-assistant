/** `null` means the procedural bust. An explicit `null` skips query and env detection. */
export function resolveModelUrl(explicit?: string | null): string | null {
  if (explicit !== undefined) return normalizeModelUrl(explicit);
  if (typeof window !== 'undefined') {
    const fromQuery = new URLSearchParams(window.location.search).get('model');
    if (fromQuery) return normalizeModelUrl(fromQuery);
    if (window.__SATI_AVATAR_MODEL_URL__) return normalizeModelUrl(window.__SATI_AVATAR_MODEL_URL__);
  }
  const fromEnv = import.meta.env?.VITE_AVATAR_MODEL_URL;
  if (typeof fromEnv === 'string') return normalizeModelUrl(fromEnv);
  return null;
}

export function normalizeModelUrl(url: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed || trimmed.toLowerCase() === 'placeholder') return null;
  return trimmed;
}
