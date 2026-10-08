import { describe, expect, it } from 'vitest';
import { isAvatarToHostMessage, parseAvatarMessage, parseHostMessage } from './protocol';

describe('parseHostMessage', () => {
  it('accepts every host message', () => {
    expect(parseHostMessage({ type: 'speak', text: 'Hello' })).toEqual({
      ok: true,
      message: { type: 'speak', text: 'Hello' },
    });
    expect(parseHostMessage({ type: 'speak', text: '', audioUrl: 'https://example.com/line.mp3' })).toEqual({
      ok: true,
      message: { type: 'speak', text: '', audioUrl: 'https://example.com/line.mp3' },
    });
    expect(
      parseHostMessage({
        type: 'speak',
        text: 'Hi',
        audioBase64: 'AAAA',
        voice: 'Samantha',
      }),
    ).toEqual({
      ok: true,
      message: { type: 'speak', text: 'Hi', audioBase64: 'AAAA', voice: 'Samantha' },
    });
    expect(parseHostMessage({ type: 'stopSpeaking' })).toEqual({
      ok: true,
      message: { type: 'stopSpeaking' },
    });
    for (const value of ['idle', 'listening', 'thinking', 'speaking', 'error']) {
      expect(parseHostMessage({ type: 'state', value }).ok).toBe(true);
    }
    expect(parseHostMessage({ type: 'expression', name: 'thinking' })).toEqual({
      ok: true,
      message: { type: 'expression', name: 'thinking', intensity: 1 },
    });
    expect(parseHostMessage({ type: 'expression', name: 'happy', intensity: 0.4, durationMs: 800 })).toEqual({
      ok: true,
      message: { type: 'expression', name: 'happy', intensity: 0.4, durationMs: 800 },
    });
    expect(parseHostMessage({ type: 'lookAt', target: 'cursor' })).toEqual({
      ok: true,
      message: { type: 'lookAt', target: 'cursor' },
    });
    expect(parseHostMessage({ type: 'lookAt', target: 'camera' }).ok).toBe(true);
    expect(parseHostMessage({ type: 'lookAt', x: 2, y: -3 })).toEqual({
      ok: true,
      message: { type: 'lookAt', x: 1, y: -1 },
    });
    expect(parseHostMessage({ type: 'loadModel', url: 'placeholder' })).toEqual({
      ok: true,
      message: { type: 'loadModel', url: 'placeholder' },
    });
    expect(parseHostMessage({ type: 'loadModel', url: './models/me.vrm' }).ok).toBe(true);
    expect(parseHostMessage({ type: 'loadModel', url: 'blob:https://localhost/id' }).ok).toBe(true);
  });

  it('rejects malformed payloads', () => {
    expect(parseHostMessage(null).ok).toBe(false);
    expect(parseHostMessage(['speak']).ok).toBe(false);
    expect(parseHostMessage({}).ok).toBe(false);
    expect(parseHostMessage({ type: 'dance' }).ok).toBe(false);
    expect(parseHostMessage({ type: 'speak' }).ok).toBe(false);
    expect(parseHostMessage({ type: 'speak', text: '   ' }).ok).toBe(false);
    expect(parseHostMessage({ type: 'speak', text: 'Hi', audioUrl: 'javascript:alert(1)' }).ok).toBe(false);
    expect(parseHostMessage({ type: 'state', value: 'asleep' }).ok).toBe(false);
    expect(parseHostMessage({ type: 'expression', name: 'angry' }).ok).toBe(false);
    expect(parseHostMessage({ type: 'expression', name: 'happy', intensity: 1.2 }).ok).toBe(false);
    expect(parseHostMessage({ type: 'expression', name: 'sad', durationMs: 0 }).ok).toBe(false);
    expect(parseHostMessage({ type: 'lookAt', x: 0 }).ok).toBe(false);
    expect(parseHostMessage({ type: 'lookAt', target: 'cursor', x: 0, y: 0 }).ok).toBe(false);
    expect(parseHostMessage({ type: 'lookAt', target: 'mouse' }).ok).toBe(false);
    expect(parseHostMessage({ type: 'loadModel', url: '' }).ok).toBe(false);
    expect(parseHostMessage({ type: 'loadModel', url: 'javascript:alert(1)' }).ok).toBe(false);
  });
});

describe('parseAvatarMessage', () => {
  it('accepts avatar replies and rejects incomplete ones', () => {
    expect(isAvatarToHostMessage({ type: 'ready' })).toBe(true);
    expect(isAvatarToHostMessage({ type: 'speakingStarted' })).toBe(true);
    expect(isAvatarToHostMessage({ type: 'speakingEnded' })).toBe(true);
    expect(isAvatarToHostMessage({ type: 'clicked' })).toBe(true);
    expect(parseAvatarMessage({ type: 'error', message: 'WebGL is not available' })).toEqual({
      ok: true,
      message: { type: 'error', message: 'WebGL is not available' },
    });
    expect(parseAvatarMessage({ type: 'modelLoaded', url: null, source: 'placeholder' }).ok).toBe(true);
    expect(parseAvatarMessage({ type: 'modelLoaded', url: 'https://example.com/a.vrm', source: 'vrm' }).ok).toBe(true);
    expect(parseAvatarMessage({ type: 'error' }).ok).toBe(false);
    expect(parseAvatarMessage({ type: 'modelLoaded' }).ok).toBe(false);
    expect(isAvatarToHostMessage({ type: 'speak', text: 'Hi' })).toBe(false);
  });
});
