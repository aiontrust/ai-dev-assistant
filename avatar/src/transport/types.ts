import type { AvatarToHostMessage } from '../protocol';

export type Unsubscribe = () => void;

/** Pluggable link between the avatar and a host (webview, parent frame, or socket). */
export interface AvatarTransport {
  start(): void;
  stop(): void;
  send(message: AvatarToHostMessage): void;
  onMessage(handler: (message: unknown) => void): Unsubscribe;
}
