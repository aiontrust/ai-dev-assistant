import type { AvatarToHostMessage } from '../protocol';
import type { AvatarTransport, Unsubscribe } from './types';

export interface SocketLike {
  readyState: number;
  send(data: string): void;
  close(): void;
  addEventListener(type: 'open' | 'message' | 'error' | 'close', listener: (event: { data?: unknown }) => void): void;
  removeEventListener(type: 'open' | 'message' | 'error' | 'close', listener: (event: { data?: unknown }) => void): void;
}

export interface WebSocketTransportOptions {
  /** Override the constructor in tests. Defaults to the global `WebSocket`. */
  factory?: (url: string) => SocketLike;
  onError?: (message: string) => void;
}

const OPEN = 1;

/**
 * Same message objects as postMessage, framed as one JSON text message each.
 * Sends made before the socket opens are queued.
 */
export function createWebSocketTransport(url: string, options: WebSocketTransportOptions = {}): AvatarTransport {
  const handlers = new Set<(message: unknown) => void>();
  const queue: string[] = [];
  let socket: SocketLike | null = null;
  let started = false;

  const onOpen = () => {
    while (queue.length > 0 && socket && socket.readyState === OPEN) {
      socket.send(queue.shift() as string);
    }
  };
  const onMessage = (event: { data?: unknown }) => {
    if (typeof event.data !== 'string') return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(event.data);
    } catch {
      options.onError?.('WebSocket message was not JSON');
      return;
    }
    handlers.forEach((handler) => handler(parsed));
  };
  const onError = () => {
    options.onError?.('WebSocket connection failed');
  };

  return {
    start() {
      if (started) return;
      started = true;
      const factory = options.factory ?? defaultFactory;
      socket = factory(url);
      socket.addEventListener('open', onOpen);
      socket.addEventListener('message', onMessage);
      socket.addEventListener('error', onError);
      if (socket.readyState === OPEN) onOpen();
    },
    stop() {
      started = false;
      socket?.close();
      socket = null;
      queue.length = 0;
      handlers.clear();
    },
    send(message: AvatarToHostMessage) {
      const payload = JSON.stringify(message);
      if (socket && socket.readyState === OPEN) socket.send(payload);
      else queue.push(payload);
    },
    onMessage(handler): Unsubscribe {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
  };
}

function defaultFactory(url: string): SocketLike {
  if (typeof WebSocket === 'undefined') {
    throw new Error('WebSocket is not available');
  }
  return new WebSocket(url) as unknown as SocketLike;
}
