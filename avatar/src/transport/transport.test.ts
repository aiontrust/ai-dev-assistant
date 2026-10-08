import { describe, expect, it, vi } from 'vitest';
import { createPostMessageTransport, type MessageHost } from './postMessage';
import { createWebSocketTransport, type SocketLike } from './websocket';

class FakeHost implements MessageHost {
  parent: MessageHost | null = null;
  sent: unknown[] = [];
  private listeners = new Set<(event: { data: unknown }) => void>();

  postMessage(message: unknown): void {
    this.sent.push(message);
  }

  addEventListener(_type: 'message', listener: (event: { data: unknown }) => void): void {
    this.listeners.add(listener);
  }

  removeEventListener(_type: 'message', listener: (event: { data: unknown }) => void): void {
    this.listeners.delete(listener);
  }

  emit(data: unknown): void {
    this.listeners.forEach((listener) => listener({ data }));
  }
}

class FakeSocket implements SocketLike {
  readyState = 0;
  sent: string[] = [];
  private listeners: Record<string, Set<(event: { data?: unknown }) => void>> = {
    open: new Set(),
    message: new Set(),
    error: new Set(),
    close: new Set(),
  };

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.readyState = 3;
  }

  addEventListener(type: 'open' | 'message' | 'error' | 'close', listener: (event: { data?: unknown }) => void): void {
    this.listeners[type].add(listener);
  }

  removeEventListener(
    type: 'open' | 'message' | 'error' | 'close',
    listener: (event: { data?: unknown }) => void,
  ): void {
    this.listeners[type].delete(listener);
  }

  open(): void {
    this.readyState = 1;
    this.listeners.open.forEach((listener) => listener({}));
  }

  receive(data: unknown): void {
    this.receiveRaw(JSON.stringify(data));
  }

  receiveRaw(data: string): void {
    this.listeners.message.forEach((listener) => listener({ data }));
  }

  fail(): void {
    this.listeners.error.forEach((listener) => listener({}));
  }
}

describe('createPostMessageTransport', () => {
  it('delivers window messages and posts replies to the parent when present', () => {
    const child = new FakeHost();
    const parent = new FakeHost();
    child.parent = parent;
    const transport = createPostMessageTransport({ host: child, vscodeApi: null });
    const received: unknown[] = [];
    transport.onMessage((message) => received.push(message));
    transport.start();
    child.emit({ type: 'state', value: 'idle' });
    transport.send({ type: 'ready' });
    expect(received).toEqual([{ type: 'state', value: 'idle' }]);
    expect(parent.sent).toEqual([{ type: 'ready' }]);
    expect(child.sent).toEqual([]);
    transport.stop();
    child.emit({ type: 'clicked' });
    expect(received).toHaveLength(1);
  });

  it('uses acquireVsCodeApi postMessage inside a webview', () => {
    const host = new FakeHost();
    const vscode = { postMessage: vi.fn() };
    const transport = createPostMessageTransport({ host, vscodeApi: vscode });
    transport.start();
    transport.send({ type: 'clicked' });
    expect(vscode.postMessage).toHaveBeenCalledWith({ type: 'clicked' });
    expect(host.sent).toEqual([]);
  });
});

describe('createWebSocketTransport', () => {
  it('queues until open and parses inbound JSON with the same shapes', () => {
    const socket = new FakeSocket();
    const errors: string[] = [];
    const transport = createWebSocketTransport('ws://localhost:9', {
      factory: () => socket,
      onError: (message) => errors.push(message),
    });
    const received: unknown[] = [];
    transport.onMessage((message) => received.push(message));
    transport.send({ type: 'ready' });
    expect(socket.sent).toEqual([]);
    transport.start();
    socket.open();
    expect(socket.sent).toEqual([JSON.stringify({ type: 'ready' })]);
    socket.receive({ type: 'speak', text: 'Hi' });
    expect(received).toEqual([{ type: 'speak', text: 'Hi' }]);
    socket.receiveRaw('{');
    expect(errors).toEqual(['WebSocket message was not JSON']);
    socket.fail();
    expect(errors).toContain('WebSocket connection failed');
  });
});
