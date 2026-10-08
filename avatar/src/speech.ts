import type { SpeakMessage } from './protocol';
import {
  amplitudeFromRms,
  estimateSpeechMs,
  mapSpectrumToVisemes,
  rmsFromTimeDomain,
  timedMouthFlap,
  zeroVisemes,
  type VisemeWeights,
} from './viseme';

const MAX_TTS_CHARS = 2000;

export interface LipSync {
  readonly visemes: VisemeWeights;
  tick(nowMs: number): void;
  /** Detach audio and synthesis without emitting the end callback. */
  stop(): void;
}

export interface LipSyncHooks {
  onEnd: () => void;
  onError: (message: string) => void;
}

/**
 * Audio, when present, drives the five VRM visemes from an AnalyserNode.
 * Text alone uses speechSynthesis plus a timed mouth flap. If audio fails and
 * there is still text, synthesis is the fallback.
 */
export async function startLipSync(
  message: SpeakMessage,
  hooks: LipSyncHooks,
  audioContext: AudioContext | null,
): Promise<LipSync> {
  const text = message.text.trim().slice(0, MAX_TTS_CHARS);
  const hasAudio = Boolean(message.audioBase64 || message.audioUrl);
  if (hasAudio) {
    if (!audioContext) {
      if (!text) throw new Error('Web Audio is not available');
      hooks.onError('Web Audio is not available. Using speech synthesis.');
    } else {
      try {
        if (audioContext.state === 'suspended') await audioContext.resume();
        return await startAudio(message, hooks, audioContext);
      } catch (error) {
        if (!text) throw error;
        hooks.onError(`Audio lip-sync failed (${errorText(error)}). Using speech synthesis.`);
      }
    }
  }
  if (!text) throw new Error('Nothing to speak');
  return startText(text, message.voice, hooks);
}

async function startAudio(message: SpeakMessage, hooks: LipSyncHooks, audioContext: AudioContext): Promise<LipSync> {
  const raw = message.audioBase64
    ? decodeBase64Audio(message.audioBase64)
    : await fetchAudio(message.audioUrl ?? '');
  const decoded = await audioContext.decodeAudioData(raw.slice(0));
  const source = audioContext.createBufferSource();
  source.buffer = decoded;
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.55;
  source.connect(analyser);
  analyser.connect(audioContext.destination);

  const frequency = new Uint8Array(analyser.frequencyBinCount);
  const time = new Uint8Array(analyser.fftSize);
  const bins = new Float32Array(frequency.length);
  const visemes = zeroVisemes();
  let stopped = false;
  let finished = false;

  source.onended = () => {
    if (stopped || finished) return;
    finished = true;
    source.disconnect();
    analyser.disconnect();
    hooks.onEnd();
  };
  source.start();

  return {
    visemes,
    tick() {
      if (stopped || finished) return;
      analyser.getByteTimeDomainData(time);
      analyser.getByteFrequencyData(frequency);
      for (let i = 0; i < frequency.length; i++) bins[i] = frequency[i] / 255;
      assignVisemes(
        visemes,
        mapSpectrumToVisemes({
          bins,
          binHz: audioContext.sampleRate / analyser.fftSize,
          amplitude: amplitudeFromRms(rmsFromTimeDomain(time)),
        }),
      );
    },
    stop() {
      stopped = true;
      try {
        source.stop();
      } catch {
        // start() can throw if the context was closed.
      }
      source.disconnect();
      analyser.disconnect();
    },
  };
}

function startText(text: string, voice: string | undefined, hooks: LipSyncHooks): LipSync {
  const started = now();
  const duration = estimateSpeechMs(text);
  const visemes = zeroVisemes();
  let stopped = false;
  let finished = false;
  let timer = 0;

  const finish = () => {
    if (stopped || finished) return;
    finished = true;
    clearTimer();
    cancelSynthesis();
    hooks.onEnd();
  };
  const clearTimer = () => {
    if (timer) clearTimeout(timer);
    timer = 0;
  };

  const synthesis = typeof speechSynthesis !== 'undefined' ? speechSynthesis : null;
  if (synthesis) {
    const utterance = new SpeechSynthesisUtterance(text);
    const picked = resolveVoice(synthesis, voice);
    if (picked) utterance.voice = picked;
    utterance.onend = () => finish();
    utterance.onerror = () => {
      if (stopped || finished) return;
      const elapsed = now() - started;
      if (elapsed < 200) {
        clearTimer();
        timer = window.setTimeout(finish, Math.max(0, duration - elapsed));
      } else finish();
    };
    try {
      synthesis.cancel();
      synthesis.speak(utterance);
      if (!timer && !finished) timer = window.setTimeout(finish, duration + 4000);
    } catch (error) {
      hooks.onError(`speechSynthesis failed (${errorText(error)}). Flapping the mouth on a timer.`);
      timer = window.setTimeout(finish, duration);
    }
  } else {
    timer = window.setTimeout(finish, duration);
  }

  return {
    visemes,
    tick(nowMs: number) {
      if (stopped || finished) return;
      assignVisemes(visemes, timedMouthFlap(nowMs - started));
    },
    stop() {
      stopped = true;
      clearTimer();
      cancelSynthesis();
    },
  };
}

function resolveVoice(synthesis: SpeechSynthesis, hint: string | undefined): SpeechSynthesisVoice | undefined {
  if (!hint) return undefined;
  const needle = hint.toLowerCase();
  const voices = synthesis.getVoices();
  return (
    voices.find((voice) => voice.name.toLowerCase() === needle || voice.voiceURI.toLowerCase() === needle) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith(needle))
  );
}

async function fetchAudio(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`request failed (${response.status})`);
  return response.arrayBuffer();
}

export function decodeBase64Audio(input: string): ArrayBuffer {
  const cleaned = input.replace(/^data:[^,]*,/, '').replace(/\s/g, '');
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function assignVisemes(target: VisemeWeights, next: VisemeWeights): void {
  target.aa = next.aa;
  target.ih = next.ih;
  target.ou = next.ou;
  target.ee = next.ee;
  target.oh = next.oh;
}

function cancelSynthesis(): void {
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error';
}
