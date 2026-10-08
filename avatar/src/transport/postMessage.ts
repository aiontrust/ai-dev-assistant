import type { AvatarToHostMessage } from '../protocol';
import type { AvatarTransport, Unsubscribe } from './types';

export interface VsCodeApi {
  postMessage(message: unknown): void;
}

export interface MessageEventLike {
  data: unknown;
}

/** Minimal window surface so the adapter can be tested without a DOM. */
export interface MessageHost {
  postMessage(message: unknown, targetOrigin?: string): void;
  addEventListener(type: 'message', listener: (event: MessageEventLike) => void): void;
  removeEventListener(type: 'message', listener: (event: MessageEventLike) => void): void;
  parent?: MessageHost | null;
}

export interface PostMessageTransportOptions {
  host?: MessageHost;
  vscodeApi?: VsCodeApi | null;
  acquireVsCodeApi?: () => VsCodeApi;
}

const CACHE_KEY = '__satiAvatarVsCodeApi';

/**
 * Speaks the VS Code webview protocol (`acquireVsCodeApi`) and, outside the
 * extension, `window.postMessage` (parent frame when embedded, otherwise self).
 */
export function createPostMessageTransport(options: PostMessageTransportOptions = {}): AvatarTransport {
  const host = options.host ?? (typeof window !== 'undefined' ? (window as unknown as MessageHost) : undefined);
  const vscode = options.vscodeApi === undefined ? readVsCodeApi(options.acquireVsCodeApi) : options.vscodeApi;
  const handlers = new Set<(message: unknown) => void>();
  let listening = false;

  const onWindowMessage = (event: MessageEventLike) => {
    handlers.forEach((handler) => handler(event.data));
  };

  return {
    start() {
      if (listening) return;
      if (!host) throw new Error('postMessage transport has no window');
      host.addEventListener('message', onWindowMessage);
      listening = true;
    },
    stop() {
      if (!listening || !host) return;
      host.removeEventListener('message', onWindowMessage);
      listening = false;
      handlers.clear();
    },
    send(message: AvatarToHostMessage) {
      if (vscode) {
        vscode.postMessage(message);
        return;
      }
      if (!host) return;
      if (host.parent && host.parent !== host) host.parent.postMessage(message, '*');
      else host.postMessage(message, '*');
    },
    onMessage(handler): Unsubscribe {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
  };
}

function readVsCodeApi(acquire: (() => VsCodeApi) | undefined): VsCodeApi | null {
  const globalRecord = globalThis as Record<string, unknown>;
  const cached = globalRecord[CACHE_KEY];
  if (isVsCodeApi(cached)) return cached;
  const fn =
    acquire ??
    (typeof globalRecord.acquireVsCodeApi === 'function'
      ? (globalRecord.acquireVsCodeApi as () => VsCodeApi)
      : undefined);
  if (!fn) return null;
  try {
    const api = fn();
    globalRecord[CACHE_KEY] = api;
    return api;
  } catch {
    const again = globalRecord[CACHE_KEY];
    return isVsCodeApi(again) ? again : null;
  }
}

function isVsCodeApi(value: unknown): value is VsCodeApi {
  return typeof value === 'object' && value !== null && typeof (value as VsCodeApi).postMessage === 'function';
}
