// Reads assistant replies aloud with the browser's speech synthesis.

const STORAGE_KEY = "sati.speech";
const MAX_CHARS = 600;

export function speechSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speechEnabled() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSpeechEnabled(on) {
  try {
    localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    // Storage blocked (private mode); the setting just won't persist.
  }
  if (!on) stopSpeaking();
}

/** Reply text as it should be spoken: code blocks summarised, markdown removed. */
export function speakableText(text) {
  const spoken = String(text || "")
    .replace(/```[\s\S]*?```/g, " The code is in the chat. ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/[*_#>]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return spoken.length > MAX_CHARS ? `${spoken.slice(0, MAX_CHARS)}…` : spoken;
}

export function stopSpeaking() {
  if (speechSupported()) window.speechSynthesis.cancel();
}

/**
 * Speaks `text` unless speech is off or unsupported. Returns true if it started.
 * onBoundary fires at each word, which drives the speaker ring.
 */
export function speak(text, { onStart, onBoundary, onEnd } = {}) {
  const spoken = speakableText(text);
  if (!speechSupported() || !speechEnabled() || !spoken) return false;
  stopSpeaking();
  const utterance = new SpeechSynthesisUtterance(spoken);
  utterance.onstart = () => onStart?.();
  utterance.onboundary = () => onBoundary?.();
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();
  window.speechSynthesis.speak(utterance);
  return true;
}
