/**
 * Host ↔ avatar messages.
 *
 * The VS Code extension can import this module (`@sati/avatar/protocol`) or
 * copy the file. Payloads are plain JSON objects. `postMessage` and WebSocket
 * transports carry them without an extra envelope.
 */

export const AVATAR_STATES = ['idle', 'listening', 'thinking', 'speaking', 'error'] as const;
export type AvatarState = (typeof AVATAR_STATES)[number];

export const EXPRESSION_NAMES = ['neutral', 'happy', 'thinking', 'surprised', 'sad'] as const;
export type ExpressionName = (typeof EXPRESSION_NAMES)[number];

export const LOOK_TARGETS = ['cursor', 'camera'] as const;
export type LookTarget = (typeof LOOK_TARGETS)[number];

export interface SpeakMessage {
  type: 'speak';
  /** Transcript. Required when no audio is attached. May be empty when audio is set. */
  text: string;
  audioUrl?: string;
  /** Raw base64 or a `data:audio/...;base64,` URL. Takes precedence over `audioUrl`. */
  audioBase64?: string;
  /** `speechSynthesis` voice name or BCP-47 language tag. Ignored when audio plays. */
  voice?: string;
}

export interface StopSpeakingMessage {
  type: 'stopSpeaking';
}

export interface StateMessage {
  type: 'state';
  value: AvatarState;
}

export interface ExpressionMessage {
  type: 'expression';
  name: ExpressionName;
  /** 0..1. Defaults to 1. */
  intensity?: number;
  /** When set, the expression holds for this long and then returns to the state default. */
  durationMs?: number;
}

export interface LookAtPointMessage {
  type: 'lookAt';
  /** -1..1, left to right. Values outside the range are clamped. */
  x: number;
  /** -1..1, down to up. Values outside the range are clamped. */
  y: number;
}

export interface LookAtTargetMessage {
  type: 'lookAt';
  target: LookTarget;
}

export type LookAtMessage = LookAtPointMessage | LookAtTargetMessage;

export interface LoadModelMessage {
  type: 'loadModel';
  /**
   * `.vrm` URL (`http`, `https`, `blob`, `file`, or a relative path).
   * The sentinel `"placeholder"` restores the procedural bust.
   */
  url: string;
}

export type HostToAvatarMessage =
  | SpeakMessage
  | StopSpeakingMessage
  | StateMessage
  | ExpressionMessage
  | LookAtMessage
  | LoadModelMessage;

export interface ReadyMessage {
  type: 'ready';
}

export interface SpeakingStartedMessage {
  type: 'speakingStarted';
}

export interface SpeakingEndedMessage {
  type: 'speakingEnded';
}

export interface ModelLoadedMessage {
  type: 'modelLoaded';
  /** Resolved URL, or null when the procedural placeholder is showing. */
  url: string | null;
  source: 'vrm' | 'placeholder';
}

export interface ErrorMessage {
  type: 'error';
  message: string;
}

export interface ClickedMessage {
  type: 'clicked';
}

export type AvatarToHostMessage =
  | ReadyMessage
  | SpeakingStartedMessage
  | SpeakingEndedMessage
  | ModelLoadedMessage
  | ErrorMessage
  | ClickedMessage;

export type ParseResult<T> = { ok: true; message: T } | { ok: false; error: string };

const HOST_TYPES = ['speak', 'stopSpeaking', 'state', 'expression', 'lookAt', 'loadModel'] as const;

export function parseHostMessage(input: unknown): ParseResult<HostToAvatarMessage> {
  if (!isRecord(input)) return fail('Message must be an object');
  const type = input.type;
  if (typeof type !== 'string') return fail('Message type must be a string');
  if (!HOST_TYPES.includes(type as (typeof HOST_TYPES)[number])) {
    return fail(`Unknown message type "${type}"`);
  }
  switch (type) {
    case 'speak':
      return parseSpeak(input);
    case 'stopSpeaking':
      return { ok: true, message: { type: 'stopSpeaking' } };
    case 'state':
      return parseState(input);
    case 'expression':
      return parseExpression(input);
    case 'lookAt':
      return parseLookAt(input);
    case 'loadModel':
      return parseLoadModel(input);
    default:
      return fail(`Unknown message type "${type}"`);
  }
}

export function parseAvatarMessage(input: unknown): ParseResult<AvatarToHostMessage> {
  if (!isRecord(input)) return fail('Message must be an object');
  switch (input.type) {
    case 'ready':
      return { ok: true, message: { type: 'ready' } };
    case 'speakingStarted':
      return { ok: true, message: { type: 'speakingStarted' } };
    case 'speakingEnded':
      return { ok: true, message: { type: 'speakingEnded' } };
    case 'clicked':
      return { ok: true, message: { type: 'clicked' } };
    case 'error':
      if (typeof input.message !== 'string' || input.message.length === 0) {
        return fail('error.message must be a non-empty string');
      }
      return { ok: true, message: { type: 'error', message: input.message } };
    case 'modelLoaded': {
      const url = input.url;
      const source = input.source;
      if (url !== null && typeof url !== 'string') return fail('modelLoaded.url must be a string or null');
      if (source !== 'vrm' && source !== 'placeholder') {
        return fail('modelLoaded.source must be "vrm" or "placeholder"');
      }
      return { ok: true, message: { type: 'modelLoaded', url: url ?? null, source } };
    }
    default:
      return fail('Unknown avatar message type');
  }
}

export function isAvatarToHostMessage(input: unknown): input is AvatarToHostMessage {
  return parseAvatarMessage(input).ok;
}

function parseSpeak(input: Record<string, unknown>): ParseResult<SpeakMessage> {
  if (typeof input.text !== 'string') return fail('speak.text must be a string');
  const text = input.text;
  const audioUrl = optionalString(input.audioUrl);
  const audioBase64 = optionalString(input.audioBase64);
  const voice = optionalString(input.voice);
  if (audioUrl instanceof Error) return fail(`speak.audioUrl ${audioUrl.message}`);
  if (audioBase64 instanceof Error) return fail(`speak.audioBase64 ${audioBase64.message}`);
  if (voice instanceof Error) return fail(`speak.voice ${voice.message}`);
  if (audioUrl && !isFetchableUrl(audioUrl)) return fail('speak.audioUrl must be an http(s), blob, or relative URL');
  const hasAudio = Boolean(audioUrl || audioBase64);
  if (!hasAudio && text.trim().length === 0) return fail('speak.text is empty and no audio was provided');
  const message: SpeakMessage = { type: 'speak', text };
  if (audioUrl) message.audioUrl = audioUrl;
  if (audioBase64) message.audioBase64 = audioBase64;
  if (voice) message.voice = voice;
  return { ok: true, message };
}

function parseState(input: Record<string, unknown>): ParseResult<StateMessage> {
  if (typeof input.value !== 'string' || !AVATAR_STATES.includes(input.value as AvatarState)) {
    return fail(`state.value must be one of ${AVATAR_STATES.join(', ')}`);
  }
  return { ok: true, message: { type: 'state', value: input.value as AvatarState } };
}

function parseExpression(input: Record<string, unknown>): ParseResult<ExpressionMessage> {
  if (typeof input.name !== 'string' || !EXPRESSION_NAMES.includes(input.name as ExpressionName)) {
    return fail(`expression.name must be one of ${EXPRESSION_NAMES.join(', ')}`);
  }
  let intensity = 1;
  if (input.intensity !== undefined) {
    if (typeof input.intensity !== 'number' || !Number.isFinite(input.intensity)) {
      return fail('expression.intensity must be a finite number');
    }
    if (input.intensity < 0 || input.intensity > 1) return fail('expression.intensity must be between 0 and 1');
    intensity = input.intensity;
  }
  const message: ExpressionMessage = { type: 'expression', name: input.name as ExpressionName, intensity };
  if (input.durationMs !== undefined) {
    if (typeof input.durationMs !== 'number' || !Number.isFinite(input.durationMs) || input.durationMs <= 0) {
      return fail('expression.durationMs must be a positive number');
    }
    message.durationMs = input.durationMs;
  }
  return { ok: true, message };
}

function parseLookAt(input: Record<string, unknown>): ParseResult<LookAtMessage> {
  const hasTarget = input.target !== undefined;
  const hasPoint = input.x !== undefined || input.y !== undefined;
  if (hasTarget && hasPoint) return fail('lookAt accepts either {x, y} or {target}, not both');
  if (hasTarget) {
    if (input.target !== 'cursor' && input.target !== 'camera') {
      return fail('lookAt.target must be "cursor" or "camera"');
    }
    return { ok: true, message: { type: 'lookAt', target: input.target } };
  }
  if (typeof input.x !== 'number' || typeof input.y !== 'number') {
    return fail('lookAt point requires numeric x and y');
  }
  if (!Number.isFinite(input.x) || !Number.isFinite(input.y)) return fail('lookAt x and y must be finite');
  return {
    ok: true,
    message: { type: 'lookAt', x: clamp(input.x, -1, 1), y: clamp(input.y, -1, 1) },
  };
}

function parseLoadModel(input: Record<string, unknown>): ParseResult<LoadModelMessage> {
  if (typeof input.url !== 'string' || input.url.trim().length === 0) {
    return fail('loadModel.url must be a non-empty string');
  }
  const url = input.url.trim();
  if (url !== 'placeholder' && !isFetchableUrl(url)) {
    return fail('loadModel.url must be an http(s), blob, file, or relative URL, or "placeholder"');
  }
  return { ok: true, message: { type: 'loadModel', url } };
}

/** http(s), blob, data, file, or a relative path. Rejects script URLs. */
export function isFetchableUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (/^(javascript|vbscript|data:text\/html)/i.test(trimmed)) return false;
  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:') || trimmed.startsWith('file:')) return true;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }
  return !trimmed.startsWith('\\');
}

function optionalString(value: unknown): string | undefined | Error {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') return new Error('must be a string');
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fail(error: string): ParseResult<never> {
  return { ok: false, error };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
