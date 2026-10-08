import {
  CircleGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
  type Material,
} from 'three';
import { disposeObject, type ModelView } from './model';
import type { ExpressionName } from './protocol';
import type { Pose } from './pose';

const SKIN = 0xf1cfc2;
const HAIR = 0x1a3344;
const JACKET = 0x0c2a3c;
const LIP = 0xc45d6e;
const IRIS = 0x1f8fb3;
const ACCENT = 0x71dfff;

/**
 * Stylised bust used until a VRM is loaded. Proportions are anime-adjacent so
 * the same camera framing still reads as head and shoulders.
 */
export function createPlaceholder(): ModelView {
  const root = new Group();
  root.name = 'placeholder-bust';

  const skin = new MeshStandardMaterial({ color: SKIN, roughness: 0.52, metalness: 0.02 });
  const hairMat = new MeshStandardMaterial({
    color: HAIR,
    roughness: 0.62,
    metalness: 0.08,
    emissive: 0x071820,
    emissiveIntensity: 0.4,
  });
  const jacket = new MeshStandardMaterial({ color: JACKET, roughness: 0.7, metalness: 0.12 });
  const trim = new MeshStandardMaterial({
    color: ACCENT,
    emissive: ACCENT,
    emissiveIntensity: 0.35,
    roughness: 0.32,
    metalness: 0.2,
  });
  const scleraMat = new MeshBasicMaterial({ color: 0xf6fbff });
  const irisMat = new MeshBasicMaterial({ color: IRIS });
  const pupilMat = new MeshBasicMaterial({ color: 0x071018 });
  const glintMat = new MeshBasicMaterial({ color: 0xffffff });
  const lipMat = new MeshBasicMaterial({ color: LIP });
  const mouthMat = new MeshBasicMaterial({ color: 0x4a2430 });
  const blushMat = new MeshBasicMaterial({
    color: 0xe48b98,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const haloMat = new MeshBasicMaterial({
    color: ACCENT,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
  });
  const gemMat = new MeshStandardMaterial({
    color: 0xbff4ff,
    emissive: ACCENT,
    emissiveIntensity: 0.9,
    roughness: 0.2,
    metalness: 0.1,
  });

  const halo = new Mesh(new CircleGeometry(0.2, 40), haloMat);
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = -0.02;
  const ring = new Mesh(new TorusGeometry(0.2, 0.004, 8, 40), trim);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.02;
  root.add(halo, ring);

  const shoulders = new Mesh(new SphereGeometry(0.15, 28, 18), jacket);
  shoulders.scale.set(1.85, 0.62, 0.78);
  shoulders.position.y = 0.05;
  const collar = new Mesh(new TorusGeometry(0.062, 0.01, 8, 20), trim);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.12;
  const neck = new Mesh(new CylinderGeometry(0.042, 0.05, 0.09, 18), skin);
  neck.position.y = 0.15;
  root.add(shoulders, collar, neck);

  const head = new Group();
  head.name = 'placeholder-head';
  head.position.y = 0.28;
  root.add(head);

  const skull = new Mesh(new SphereGeometry(0.115, 32, 24), skin);
  skull.scale.set(0.96, 1.08, 0.94);
  const hairCap = new Mesh(new SphereGeometry(0.122, 32, 24), hairMat);
  hairCap.scale.set(1.01, 1.0, 0.92);
  hairCap.position.set(0, 0.028, -0.03);
  const bangs = new Mesh(new SphereGeometry(0.078, 24, 16), hairMat);
  bangs.scale.set(1.35, 0.42, 0.55);
  bangs.position.set(0, 0.078, 0.055);
  const lockL = new Mesh(new SphereGeometry(0.045, 16, 12), hairMat);
  lockL.scale.set(0.55, 1.35, 0.55);
  lockL.position.set(-0.1, -0.01, 0.01);
  const lockR = lockL.clone();
  lockR.position.x = 0.1;
  head.add(skull, hairCap, lockL, lockR, bangs);

  const leftEye = makeEye(-0.04, scleraMat, irisMat, pupilMat, glintMat);
  const rightEye = makeEye(0.04, scleraMat, irisMat, pupilMat, glintMat);
  const leftBrow = makeBrow(-0.04, hairMat);
  const rightBrow = makeBrow(0.04, hairMat);
  const leftLash = makeLash(-0.04, hairMat);
  const rightLash = makeLash(0.04, hairMat);
  head.add(leftEye, rightEye, leftBrow, rightBrow, leftLash, rightLash);

  const nose = new Mesh(new SphereGeometry(0.012, 12, 10), skin);
  nose.scale.set(0.75, 0.62, 0.85);
  nose.position.set(0, -0.008, 0.108);
  const mouth = new Mesh(new SphereGeometry(0.02, 16, 12), mouthMat);
  mouth.scale.set(0.7, 0.16, 0.45);
  mouth.position.set(0, -0.05, 0.1);
  const lips = new Mesh(new TorusGeometry(0.022, 0.0042, 8, 18, Math.PI), lipMat);
  lips.position.set(0, -0.048, 0.108);
  const blushL = new Mesh(new SphereGeometry(0.02, 12, 8), blushMat);
  blushL.scale.set(1.1, 0.55, 0.3);
  blushL.position.set(-0.055, -0.02, 0.095);
  const blushR = blushL.clone();
  blushR.position.x = 0.055;
  head.add(nose, mouth, lips, blushL, blushR);

  const earL = new Mesh(new SphereGeometry(0.026, 12, 10), skin);
  earL.scale.set(0.42, 0.72, 0.35);
  earL.position.set(-0.108, 0, 0);
  const earR = earL.clone();
  earR.position.x = 0.108;
  const cup = new Mesh(new TorusGeometry(0.02, 0.005, 8, 16), trim);
  cup.position.set(0.112, 0.005, 0.01);
  cup.rotation.y = Math.PI / 2;
  const gem = new Mesh(new SphereGeometry(0.008, 12, 10), gemMat);
  gem.position.set(0.124, 0.012, 0.02);
  head.add(earL, earR, cup, gem);

  const browBase = leftBrow.position.y;
  const lashBase = leftLash.position.y;

  const applyExpression = (name: ExpressionName, intensity: number) => {
    const amount = clamp01(intensity);
    const lifts: Record<ExpressionName, [number, number]> = {
      neutral: [0, 0],
      happy: [0.008, 0.008],
      surprised: [0.016, 0.016],
      sad: [-0.008, -0.008],
      thinking: [0.014, -0.002],
    };
    const [leftLift, rightLift] = lifts[name];
    leftBrow.position.y = browBase + leftLift * amount;
    rightBrow.position.y = browBase + rightLift * amount;
    leftBrow.rotation.z =
      name === 'sad' ? 0.45 * amount : name === 'thinking' ? -0.35 * amount : name === 'happy' ? -0.2 * amount : 0;
    rightBrow.rotation.z =
      name === 'sad' ? -0.45 * amount : name === 'thinking' ? 0.08 * amount : name === 'happy' ? 0.2 * amount : 0;
    blushMat.opacity = name === 'happy' ? 0.45 * amount : name === 'surprised' ? 0.12 * amount : 0;
  };

  return {
    kind: 'placeholder',
    url: null,
    object: root,
    head,
    cameraDistance: 0.82,
    lookYOffset: -0.05,
    preUpdate(pose: Pose) {
      root.position.y = pose.breath;
      root.rotation.x = pose.lean;
      root.rotation.y = pose.headYaw * 0.35;
      head.rotation.x = pose.headPitch;
      head.rotation.y = pose.headYaw * 0.65;
      head.rotation.z = pose.headRoll;

      const shut =
        Math.max(pose.blink, pose.expression === 'happy' ? 0.22 * pose.expressionIntensity : 0) *
        (pose.expression === 'surprised' ? 0.35 : 1);
      const widen = pose.expression === 'surprised' ? 1 + 0.16 * pose.expressionIntensity : 1;
      for (const eye of [leftEye, rightEye]) {
        eye.rotation.y = pose.lookYaw * 0.9;
        eye.rotation.x = -pose.lookPitch * 0.9;
        eye.scale.set(widen, Math.max(0.08, (1 - shut * 0.92) * widen), 1);
      }
      leftLash.position.y = lashBase - shut * 0.012;
      rightLash.position.y = lashBase - shut * 0.012;
      applyExpression(pose.expression, pose.expressionIntensity);
      applyMouth(mouth, lips, pose);

      const alert = pose.state === 'error';
      gemMat.emissive.setHex(alert ? 0xe07a6a : ACCENT);
      gemMat.color.setHex(alert ? 0xffb0a4 : 0xbff4ff);
    },
    update() {},
    postUpdate() {},
    dispose() {
      disposeObject(root);
    },
  };
}

function makeEye(
  x: number,
  scleraMat: Material,
  irisMat: Material,
  pupilMat: Material,
  glintMat: Material,
): Group {
  const pivot = new Group();
  pivot.position.set(x, 0.02, 0.09);
  const sclera = new Mesh(new SphereGeometry(0.028, 20, 16), scleraMat);
  sclera.scale.z = 0.55;
  const iris = new Mesh(new SphereGeometry(0.014, 16, 12), irisMat);
  iris.position.z = 0.016;
  iris.scale.z = 0.45;
  const pupil = new Mesh(new SphereGeometry(0.007, 12, 10), pupilMat);
  pupil.position.z = 0.02;
  const glint = new Mesh(new SphereGeometry(0.0032, 8, 8), glintMat);
  glint.position.set(0.006, 0.006, 0.024);
  pivot.add(sclera, iris, pupil, glint);
  return pivot;
}

function makeBrow(x: number, material: Material): Mesh {
  const brow = new Mesh(new SphereGeometry(0.02, 12, 8), material);
  brow.scale.set(1.55, 0.28, 0.35);
  brow.position.set(x, 0.058, 0.09);
  return brow;
}

function makeLash(x: number, material: Material): Mesh {
  const lash = new Mesh(new TorusGeometry(0.026, 0.003, 6, 12, Math.PI * 0.85), material);
  lash.position.set(x, 0.038, 0.105);
  lash.rotation.z = Math.PI;
  return lash;
}

function applyMouth(mouth: Mesh, lips: Mesh, pose: Pose): void {
  const { aa, ee, ih, oh, ou } = pose.visemes;
  const open = aa + oh * 0.9 + ou * 0.72 + ih * 0.38 + ee * 0.2;
  const wide = ee * 0.55 + ih * 0.3;
  const round = oh * 0.25 + ou * 0.4;
  mouth.scale.set(Math.max(0.35, 0.7 + wide - round), 0.14 + open * 0.9, 0.45);
  mouth.position.y = -0.05 - open * 0.008;

  let smile = 0.28;
  if (pose.expression === 'happy') smile = 0.4 + 0.7 * pose.expressionIntensity;
  else if (pose.expression === 'sad') smile = -(0.35 + 0.55 * pose.expressionIntensity);
  else if (pose.expression === 'surprised') smile = 0.05;
  else if (pose.expression === 'thinking') smile = 0.18;
  const talking = open > 0.35;
  lips.visible = !talking && pose.expression !== 'surprised';
  lips.scale.set(1 + wide * 0.25, Math.max(0.22, Math.abs(smile)), 1);
  lips.rotation.z = smile >= 0 ? 0 : Math.PI;
  lips.position.y = -0.048 + (smile > 0 ? 0.004 * smile : -0.004);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
