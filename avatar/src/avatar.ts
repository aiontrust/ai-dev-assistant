import { Clock } from 'three';
import { resolveModelUrl } from './config';
import { disposeObject } from './model';
import type { ModelView } from './model';
import { computePose, expressionForState, type Pose } from './pose';
import type { AvatarState, ExpressionName, HostToAvatarMessage, SpeakMessage } from './protocol';
import { createPlaceholder } from './placeholder';
import { routeHostMessage } from './router';
import { createAvatarScene, placeLookTarget } from './scene';
import { startLipSync, type LipSync } from './speech';
import { createPostMessageTransport, type AvatarTransport } from './transport';
import { lerpVisemes, zeroVisemes, type VisemeWeights } from './viseme';
import { createVrmView, loadVrm } from './vrm';

export interface MountOptions {
  /** Force a model URL. `null` keeps the procedural bust and skips query/env detection. */
  modelUrl?: string | null;
  transport?: AvatarTransport;
  /** `hud` paints the stage `#001c2b`. `transparent` leaves the host page visible. */
  background?: 'transparent' | 'hud';
}

export interface AvatarHandle {
  destroy(): void;
  readonly transport: AvatarTransport;
}

interface HoldExpression {
  name: ExpressionName;
  intensity: number;
  until: number;
}

export function mountAvatar(container: HTMLElement, options: MountOptions = {}): AvatarHandle {
  const transport = options.transport ?? createPostMessageTransport();
  const background = options.background ?? 'hud';
  container.classList.add('avatar-root');
  container.dataset.background = background;

  const status = document.createElement('div');
  status.className = 'avatar-status';
  container.append(status);

  const view = createAvatarScene(container);
  let model: ModelView = createPlaceholder();
  view.scene.add(model.object);
  view.frame(model.head, model.cameraDistance, model.lookYOffset);

  let destroyed = false;
  let announced = false;
  let loadToken = 0;
  let speechGen = 0;
  let lipSync: LipSync | null = null;
  let audioContext: AudioContext | null = null;
  let state: AvatarState = 'idle';
  let rest: { name: ExpressionName; intensity: number } = { name: 'neutral', intensity: 1 };
  let hold: HoldExpression | null = null;
  let lookMode: 'cursor' | 'camera' | 'point' = 'cursor';
  let pointX = 0;
  let pointY = 0;
  let pointerX = 0;
  let pointerY = 0;
  let blink = 0;
  let blinkPhase: 'wait' | 'closing' | 'opening' = 'wait';
  let nextBlink = 1.6 + Math.random() * 2.2;
  let smoothed: VisemeWeights = zeroVisemes();
  const clock = new Clock();
  let frameId = 0;

  const setStatus = (text: string) => {
    status.textContent = text;
  };

  const publish = (message: Parameters<AvatarTransport['send']>[0]) => {
    if (!destroyed) transport.send(message);
  };

  const showModel = (next: ModelView) => {
    const previous = model;
    model = next;
    view.scene.add(model.object);
    model.object.updateWorldMatrix(true, true);
    view.frame(model.head, model.cameraDistance, model.lookYOffset);
    if (previous !== next) previous.dispose();
    publish({ type: 'modelLoaded', url: model.url, source: model.kind });
    if (!announced) {
      announced = true;
      publish({ type: 'ready' });
    }
  };

  const replaceWithPlaceholder = () => {
    showModel(createPlaceholder());
    setStatus('');
  };

  const loadModel = async (url: string | null) => {
    const token = ++loadToken;
    if (!url) {
      replaceWithPlaceholder();
      return;
    }
    setStatus('Loading model…');
    try {
      const vrm = await loadVrm(url);
      if (destroyed || token !== loadToken) {
        disposeObject(vrm.scene);
        return;
      }
      if (vrm.lookAt) vrm.lookAt.target = view.lookTarget;
      showModel(createVrmView(vrm, url));
      setStatus('');
    } catch (error) {
      if (destroyed || token !== loadToken) return;
      const message = error instanceof Error ? error.message : 'Failed to load VRM';
      setStatus(message);
      publish({ type: 'error', message });
    }
  };

  const stopSpeech = (notify: boolean) => {
    const current = lipSync;
    if (!current) return;
    speechGen += 1;
    lipSync = null;
    current.stop();
    if (notify) publish({ type: 'speakingEnded' });
  };

  const finishSpeech = (generation: number) => {
    if (generation !== speechGen || !lipSync) return;
    lipSync = null;
    publish({ type: 'speakingEnded' });
  };

  const ensureAudio = (): AudioContext | null => {
    if (typeof AudioContext === 'undefined') return null;
    if (!audioContext) audioContext = new AudioContext();
    return audioContext;
  };

  const speak = async (message: SpeakMessage) => {
    const generation = ++speechGen;
    const previous = lipSync;
    lipSync = null;
    previous?.stop();
    if (previous) publish({ type: 'speakingEnded' });
    const wantsAudio = Boolean(message.audioBase64 || message.audioUrl);
    try {
      const session = await startLipSync(message, {
        onEnd: () => finishSpeech(generation),
        onError: (text) => publish({ type: 'error', message: text }),
      }, wantsAudio ? ensureAudio() : null);
      if (destroyed || generation !== speechGen) {
        session.stop();
        return;
      }
      lipSync = session;
      smoothed = zeroVisemes();
      publish({ type: 'speakingStarted' });
    } catch (error) {
      if (destroyed || generation !== speechGen) return;
      publish({
        type: 'error',
        message: error instanceof Error ? error.message : 'Speech failed',
      });
    }
  };

  const applyHost = (message: HostToAvatarMessage) => {
    switch (message.type) {
      case 'speak':
        void speak(message);
        break;
      case 'stopSpeaking':
        stopSpeech(true);
        break;
      case 'state':
        state = message.value;
        hold = null;
        rest = { name: expressionForState(message.value), intensity: 1 };
        break;
      case 'expression':
        if (message.durationMs) {
          hold = {
            name: message.name,
            intensity: message.intensity ?? 1,
            until: performance.now() + message.durationMs,
          };
        } else {
          hold = null;
          rest = { name: message.name, intensity: message.intensity ?? 1 };
        }
        break;
      case 'lookAt':
        if ('target' in message) lookMode = message.target;
        else {
          lookMode = 'point';
          pointX = message.x;
          pointY = message.y;
        }
        break;
      case 'loadModel':
        void loadModel(message.url.toLowerCase() === 'placeholder' ? null : message.url);
        break;
      default:
        break;
    }
  };

  const onPointerMove = (event: PointerEvent) => {
    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    pointerX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointerY = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
  };

  const warmAudio = () => {
    try {
      const context = ensureAudio();
      if (context && context.state === 'suspended') void context.resume();
    } catch {
      // speak() reports a real failure if audio is required and this stays suspended.
    }
  };

  const onPointerDown = () => {
    publish({ type: 'clicked' });
  };

  const tickBlink = (delta: number) => {
    if (blinkPhase === 'wait') {
      nextBlink -= delta;
      if (nextBlink <= 0) blinkPhase = 'closing';
      return;
    }
    if (blinkPhase === 'closing') {
      blink = Math.min(1, blink + delta / 0.065);
      if (blink >= 1) blinkPhase = 'opening';
      return;
    }
    blink = Math.max(0, blink - delta / 0.09);
    if (blink <= 0) {
      blinkPhase = 'wait';
      nextBlink = Math.random() < 0.2 ? 0.14 : 2.1 + Math.random() * 3.4;
    }
  };

  const frame = () => {
    if (destroyed) return;
    frameId = requestAnimationFrame(frame);
    const delta = Math.min(clock.getDelta(), 0.05);
    const time = clock.elapsedTime;
    tickBlink(delta);
    if (hold && performance.now() >= hold.until) hold = null;
    lipSync?.tick(performance.now());
    const targetVisemes = lipSync ? { ...lipSync.visemes } : zeroVisemes();
    smoothed = lerpVisemes(smoothed, targetVisemes, 1 - Math.exp(-delta * 16));

    let lookX = 0;
    let lookY = 0;
    if (lookMode === 'cursor') {
      lookX = clamp(pointerX, -1, 1);
      lookY = clamp(pointerY, -1, 1);
    } else if (lookMode === 'point') {
      lookX = pointX;
      lookY = pointY;
    }

    const expression = hold ?? rest;
    const pose: Pose = computePose({
      time,
      state: lipSync ? 'speaking' : state,
      expression: expression.name,
      expressionIntensity: expression.intensity,
      blink,
      visemes: smoothed,
      lookX,
      lookY,
      speaking: lipSync !== null,
    });
    model.preUpdate(pose);
    model.object.updateWorldMatrix(true, true);
    placeLookTarget(view.lookTarget, model.head, pose.lookYaw, pose.lookPitch);
    model.update(delta);
    model.postUpdate(pose);
    view.render();
  };

  transport.onMessage((raw) => {
    const result = routeHostMessage(raw, {
      onSpeak: applyHost,
      onStopSpeaking: applyHost,
      onState: applyHost,
      onExpression: applyHost,
      onLookAt: applyHost,
      onLoadModel: applyHost,
    });
    if (!result.ok && !result.ignored && hasStringType(raw)) {
      publish({ type: 'error', message: result.error });
    }
  });
  transport.start();

  const observer = new ResizeObserver(() => view.resize());
  observer.observe(container);
  view.resize();
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerdown', warmAudio, true);
  container.addEventListener('pointerdown', onPointerDown);

  showModel(model);
  const initialUrl = resolveModelUrl(options.modelUrl);
  if (initialUrl) void loadModel(initialUrl);
  frame();

  return {
    transport,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelAnimationFrame(frameId);
      stopSpeech(false);
      observer.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', warmAudio, true);
      container.removeEventListener('pointerdown', onPointerDown);
      audioContext?.close();
      model.dispose();
      view.dispose();
      transport.stop();
      status.remove();
      container.classList.remove('avatar-root');
    },
  };
}

function hasStringType(value: unknown): boolean {
  return typeof value === 'object' && value !== null && typeof (value as { type?: unknown }).type === 'string';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
