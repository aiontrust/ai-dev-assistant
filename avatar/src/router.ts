import { isAvatarToHostMessage, parseHostMessage, type HostToAvatarMessage } from './protocol';

export interface HostHandlers {
  onSpeak?: (message: Extract<HostToAvatarMessage, { type: 'speak' }>) => void;
  onStopSpeaking?: (message: Extract<HostToAvatarMessage, { type: 'stopSpeaking' }>) => void;
  onState?: (message: Extract<HostToAvatarMessage, { type: 'state' }>) => void;
  onExpression?: (message: Extract<HostToAvatarMessage, { type: 'expression' }>) => void;
  onLookAt?: (message: Extract<HostToAvatarMessage, { type: 'lookAt' }>) => void;
  onLoadModel?: (message: Extract<HostToAvatarMessage, { type: 'loadModel' }>) => void;
}

export type RouteResult =
  | { ok: true; message: HostToAvatarMessage }
  | { ok: false; error: string; ignored?: boolean };

/**
 * Validate a host payload and dispatch it. Avatar-to-host echoes (the same
 * window receiving its own postMessage) are ignored so they are not errors.
 */
export function routeHostMessage(input: unknown, handlers: HostHandlers): RouteResult {
  if (isAvatarToHostMessage(input)) return { ok: false, error: 'Ignored avatar message', ignored: true };
  const parsed = parseHostMessage(input);
  if (!parsed.ok) return parsed;
  switch (parsed.message.type) {
    case 'speak':
      handlers.onSpeak?.(parsed.message);
      break;
    case 'stopSpeaking':
      handlers.onStopSpeaking?.(parsed.message);
      break;
    case 'state':
      handlers.onState?.(parsed.message);
      break;
    case 'expression':
      handlers.onExpression?.(parsed.message);
      break;
    case 'lookAt':
      handlers.onLookAt?.(parsed.message);
      break;
    case 'loadModel':
      handlers.onLoadModel?.(parsed.message);
      break;
    default:
      break;
  }
  return { ok: true, message: parsed.message };
}
