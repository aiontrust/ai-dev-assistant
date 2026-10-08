import '../styles.css';
import { mountAvatar } from '../avatar';
import { resolveModelUrl } from '../config';
import { isAvatarToHostMessage, type HostToAvatarMessage } from '../protocol';
import { mountPanel } from './panel';

const avatarEl = document.querySelector<HTMLElement>('#avatar');
const panelEl = document.querySelector<HTMLElement>('#panel');
if (!avatarEl || !panelEl) throw new Error('Demo markup is missing');

mountPanel(panelEl, (message) => {
  pushLog(`→ ${summarize(message)}`);
  window.postMessage(message, '*');
});

window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (!isAvatarToHostMessage(event.data)) return;
  pushLog(`← ${JSON.stringify(event.data)}`);
});

try {
  mountAvatar(avatarEl, {
    modelUrl: resolveModelUrl(),
    background: 'transparent',
  });
} catch (error) {
  avatarEl.textContent = error instanceof Error ? error.message : 'Avatar failed to start';
}

function pushLog(line: string): void {
  const log = document.querySelector<HTMLPreElement>('#log');
  if (!log) return;
  log.textContent = `${line}\n${log.textContent ?? ''}`.slice(0, 4000);
}

function summarize(message: HostToAvatarMessage): string {
  if (message.type === 'speak' && message.audioBase64) {
    return JSON.stringify({ ...message, audioBase64: `${message.audioBase64.length} chars` });
  }
  return JSON.stringify(message);
}
