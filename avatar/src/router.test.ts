import { describe, expect, it, vi } from 'vitest';
import { routeHostMessage } from './router';

function handlers() {
  return {
    onSpeak: vi.fn(),
    onStopSpeaking: vi.fn(),
    onState: vi.fn(),
    onExpression: vi.fn(),
    onLookAt: vi.fn(),
    onLoadModel: vi.fn(),
  };
}

describe('routeHostMessage', () => {
  it('dispatches each host message to its handler', () => {
    const calls = handlers();
    expect(routeHostMessage({ type: 'speak', text: 'Hello' }, calls)).toMatchObject({ ok: true });
    expect(calls.onSpeak).toHaveBeenCalledWith({ type: 'speak', text: 'Hello' });

    routeHostMessage({ type: 'stopSpeaking' }, calls);
    expect(calls.onStopSpeaking).toHaveBeenCalledTimes(1);

    routeHostMessage({ type: 'state', value: 'thinking' }, calls);
    expect(calls.onState).toHaveBeenCalledWith({ type: 'state', value: 'thinking' });

    routeHostMessage({ type: 'expression', name: 'surprised', intensity: 0.5 }, calls);
    expect(calls.onExpression).toHaveBeenCalledWith({
      type: 'expression',
      name: 'surprised',
      intensity: 0.5,
    });

    routeHostMessage({ type: 'lookAt', target: 'camera' }, calls);
    expect(calls.onLookAt).toHaveBeenCalledWith({ type: 'lookAt', target: 'camera' });

    routeHostMessage({ type: 'lookAt', x: -0.2, y: 0.4 }, calls);
    expect(calls.onLookAt).toHaveBeenLastCalledWith({ type: 'lookAt', x: -0.2, y: 0.4 });

    routeHostMessage({ type: 'loadModel', url: './hero.vrm' }, calls);
    expect(calls.onLoadModel).toHaveBeenCalledWith({ type: 'loadModel', url: './hero.vrm' });

    expect(calls.onSpeak).toHaveBeenCalledTimes(1);
    expect(calls.onState).toHaveBeenCalledTimes(1);
  });

  it('does not call handlers for invalid or echoed messages', () => {
    const calls = handlers();
    const invalid = routeHostMessage({ type: 'expression', name: 'nope' }, calls);
    expect(invalid).toMatchObject({ ok: false });
    expect(calls.onExpression).not.toHaveBeenCalled();

    const echo = routeHostMessage({ type: 'ready' }, calls);
    expect(echo).toEqual({ ok: false, error: 'Ignored avatar message', ignored: true });
    expect(calls.onSpeak).not.toHaveBeenCalled();

    const modelEcho = routeHostMessage(
      { type: 'modelLoaded', url: null, source: 'placeholder' },
      calls,
    );
    expect(modelEcho).toMatchObject({ ignored: true });
    expect(calls.onLoadModel).not.toHaveBeenCalled();
  });
});
