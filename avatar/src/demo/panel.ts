import type { AvatarState, ExpressionMessage, HostToAvatarMessage, SpeakMessage } from '../protocol';
import { AVATAR_STATES, EXPRESSION_NAMES } from '../protocol';
import { makeToneWavBase64 } from './tone';

export function mountPanel(root: HTMLElement, send: (message: HostToAvatarMessage) => void): void {
  root.className = 'panel';
  root.innerHTML = `
    <header class="panel__header">
      <h1>SATI Avatar</h1>
      <p>Procedural bust until you load a <code>.vrm</code>. Messages use the host contract.</p>
    </header>
    <section>
      <label for="speak-text">Speak</label>
      <textarea id="speak-text" rows="3">Hello. I am the dev assistant.</textarea>
      <label for="speak-voice">Voice name or language</label>
      <input id="speak-voice" type="text" placeholder="en-US" autocomplete="off" />
      <label for="speak-audio">Audio URL</label>
      <input id="speak-audio" type="text" placeholder="https://…/line.mp3" autocomplete="off" />
      <div class="row">
        <button type="button" id="speak-text-btn">Speak text</button>
        <button type="button" id="speak-audio-btn">Speak tone</button>
        <button type="button" id="stop-btn">Stop</button>
      </div>
    </section>
    <section>
      <h2>State</h2>
      <div class="row" id="state-row"></div>
    </section>
    <section>
      <h2>Expression</h2>
      <div class="row" id="expression-row"></div>
      <div class="split">
        <div>
          <label for="intensity">Intensity <span id="intensity-value">1.00</span></label>
          <input id="intensity" type="range" min="0" max="1" step="0.05" value="1" />
        </div>
        <div>
          <label for="duration">Duration ms</label>
          <input id="duration" type="number" min="1" step="50" placeholder="hold" />
        </div>
      </div>
    </section>
    <section>
      <h2>Look at</h2>
      <div class="row">
        <button type="button" id="look-cursor" aria-pressed="true">Cursor</button>
        <button type="button" id="look-camera" aria-pressed="false">Camera</button>
      </div>
      <label for="look-x">Point x <span id="look-x-value">0.00</span></label>
      <input id="look-x" type="range" min="-1" max="1" step="0.01" value="0" />
      <label for="look-y">Point y <span id="look-y-value">0.00</span></label>
      <input id="look-y" type="range" min="-1" max="1" step="0.01" value="0" />
    </section>
    <section>
      <h2>Model</h2>
      <label for="model-url">VRM URL</label>
      <input id="model-url" type="text" placeholder="./models/you.vrm or https://…" autocomplete="off" />
      <div class="row">
        <button type="button" id="load-url">Load URL</button>
        <button type="button" id="load-placeholder">Placeholder</button>
      </div>
      <label for="model-file">Local .vrm</label>
      <input id="model-file" type="file" accept=".vrm,model/gltf-binary" />
    </section>
    <section class="log-section">
      <h2>Messages</h2>
      <pre id="log" class="log"></pre>
    </section>
  `;

  const text = required<HTMLTextAreaElement>(root, '#speak-text');
  const voice = required<HTMLInputElement>(root, '#speak-voice');
  const audio = required<HTMLInputElement>(root, '#speak-audio');
  const intensity = required<HTMLInputElement>(root, '#intensity');
  const intensityValue = required(root, '#intensity-value');
  const duration = required<HTMLInputElement>(root, '#duration');
  const lookX = required<HTMLInputElement>(root, '#look-x');
  const lookY = required<HTMLInputElement>(root, '#look-y');
  const lookXValue = required(root, '#look-x-value');
  const lookYValue = required(root, '#look-y-value');
  const stateRow = required(root, '#state-row');
  const expressionRow = required(root, '#expression-row');
  const lookCursor = required<HTMLButtonElement>(root, '#look-cursor');
  const lookCamera = required<HTMLButtonElement>(root, '#look-camera');

  const speakPayload = (withTone: boolean): SpeakMessage => {
    const message: SpeakMessage = { type: 'speak', text: text.value };
    const voiceName = voice.value.trim();
    const audioUrl = audio.value.trim();
    if (voiceName) message.voice = voiceName;
    if (withTone) message.audioBase64 = makeToneWavBase64();
    else if (audioUrl) message.audioUrl = audioUrl;
    return message;
  };

  required<HTMLButtonElement>(root, '#speak-text-btn').addEventListener('click', () => send(speakPayload(false)));
  required<HTMLButtonElement>(root, '#speak-audio-btn').addEventListener('click', () => send(speakPayload(true)));
  required<HTMLButtonElement>(root, '#stop-btn').addEventListener('click', () => send({ type: 'stopSpeaking' }));

  const stateButtons = new Map<AvatarState, HTMLButtonElement>();
  for (const value of AVATAR_STATES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = value;
    button.dataset.state = value;
    button.addEventListener('click', () => {
      send({ type: 'state', value });
      for (const [name, el] of stateButtons) el.setAttribute('aria-pressed', name === value ? 'true' : 'false');
    });
    stateRow.append(button);
    stateButtons.set(value, button);
  }
  stateButtons.get('idle')?.setAttribute('aria-pressed', 'true');

  intensity.addEventListener('input', () => {
    intensityValue.textContent = Number(intensity.value).toFixed(2);
  });

  for (const name of EXPRESSION_NAMES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = name;
    button.addEventListener('click', () => {
      const message: ExpressionMessage = {
        type: 'expression',
        name,
        intensity: Number(intensity.value),
      };
      const ms = Number(duration.value);
      if (duration.value.trim() && Number.isFinite(ms) && ms > 0) message.durationMs = ms;
      send(message);
      for (const el of expressionRow.querySelectorAll('button')) {
        el.setAttribute('aria-pressed', el === button ? 'true' : 'false');
      }
    });
    expressionRow.append(button);
  }

  const setLookPressed = (mode: 'cursor' | 'camera' | 'point') => {
    lookCursor.setAttribute('aria-pressed', mode === 'cursor' ? 'true' : 'false');
    lookCamera.setAttribute('aria-pressed', mode === 'camera' ? 'true' : 'false');
  };
  lookCursor.addEventListener('click', () => {
    setLookPressed('cursor');
    send({ type: 'lookAt', target: 'cursor' });
  });
  lookCamera.addEventListener('click', () => {
    setLookPressed('camera');
    send({ type: 'lookAt', target: 'camera' });
  });
  const sendPoint = () => {
    setLookPressed('point');
    lookXValue.textContent = Number(lookX.value).toFixed(2);
    lookYValue.textContent = Number(lookY.value).toFixed(2);
    send({ type: 'lookAt', x: Number(lookX.value), y: Number(lookY.value) });
  };
  lookX.addEventListener('input', sendPoint);
  lookY.addEventListener('input', sendPoint);

  required<HTMLButtonElement>(root, '#load-url').addEventListener('click', () => {
    const url = required<HTMLInputElement>(root, '#model-url').value.trim();
    if (!url) return;
    send({ type: 'loadModel', url });
  });
  required<HTMLButtonElement>(root, '#load-placeholder').addEventListener('click', () => {
    send({ type: 'loadModel', url: 'placeholder' });
  });
  required<HTMLInputElement>(root, '#model-file').addEventListener('change', (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    send({ type: 'loadModel', url: URL.createObjectURL(file) });
  });
}

function required<T extends Element = HTMLElement>(root: ParentNode, selector: string): T {
  const node = root.querySelector<T>(selector);
  if (!node) throw new Error(`Missing ${selector}`);
  return node;
}
