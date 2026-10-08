import type { AvatarState, ExpressionName } from './protocol';
import { zeroVisemes, type VisemeWeights } from './viseme';

export interface PoseInput {
  time: number;
  state: AvatarState;
  expression: ExpressionName;
  expressionIntensity: number;
  blink: number;
  visemes: VisemeWeights;
  /** -1..1 */
  lookX: number;
  /** -1..1 */
  lookY: number;
  speaking: boolean;
}

export interface Pose {
  state: AvatarState;
  expression: ExpressionName;
  expressionIntensity: number;
  blink: number;
  visemes: VisemeWeights;
  /** Radians applied to the head / bust. */
  headYaw: number;
  headPitch: number;
  headRoll: number;
  lean: number;
  breath: number;
  /** Radians for the eyes or the VRM look target. */
  lookYaw: number;
  lookPitch: number;
}

export function expressionForState(state: AvatarState): ExpressionName {
  if (state === 'thinking') return 'thinking';
  if (state === 'error') return 'sad';
  return 'neutral';
}

/** Idle motion plus the pose that belongs to each avatar state. */
export function computePose(input: PoseInput): Pose {
  const t = input.time;
  const breath = Math.sin(t * 1.65) * (input.speaking ? 0.004 : 0.012);
  const sway = Math.sin(t * 0.45) * 0.055;
  let headYaw = sway;
  let headPitch = Math.sin(t * 0.37) * 0.018;
  let headRoll = Math.sin(t * 0.31) * 0.02;
  let lean = 0;
  let lookX = input.lookX;
  let lookY = input.lookY;

  if (input.state === 'thinking') {
    headRoll += 0.16;
    headPitch += 0.06;
    lookX += Math.sin(t * 2.15) * 0.32;
    lookY += Math.sin(t * 3.05) * 0.14;
  } else if (input.state === 'listening') {
    lean = 0.12;
    headPitch -= 0.05;
  } else if (input.state === 'error') {
    headPitch += 0.12;
    headRoll -= 0.04;
  } else if (input.state === 'speaking') {
    headPitch += Math.sin(t * 3.4) * 0.025;
    headYaw += Math.sin(t * 1.8) * 0.03;
  }

  return {
    state: input.state,
    expression: input.expression,
    expressionIntensity: input.expressionIntensity,
    blink: clamp01(input.blink),
    visemes: input.visemes,
    headYaw,
    headPitch,
    headRoll,
    lean,
    breath,
    lookYaw: clamp(lookX, -1, 1) * 0.5,
    lookPitch: clamp(lookY, -1, 1) * 0.32,
  };
}

export function restPose(): Pose {
  return computePose({
    time: 0,
    state: 'idle',
    expression: 'neutral',
    expressionIntensity: 1,
    blink: 0,
    visemes: zeroVisemes(),
    lookX: 0,
    lookY: 0,
    speaking: false,
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}
