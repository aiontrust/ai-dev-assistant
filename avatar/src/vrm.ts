import { Group } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils, type VRM } from '@pixiv/three-vrm';
import { disposeObject, type ModelView } from './model';
import type { ExpressionName } from './protocol';
import type { Pose } from './pose';
import { VISEME_NAMES } from './viseme';

/** VRM preset used for each host expression. `thinking` has no preset, so it maps to `relaxed`. */
export const EXPRESSION_TO_VRM: Record<ExpressionName, string> = {
  neutral: 'neutral',
  happy: 'happy',
  thinking: 'relaxed',
  surprised: 'surprised',
  sad: 'sad',
};

const EMOTIONS = ['neutral', 'happy', 'relaxed', 'surprised', 'sad', 'angry'] as const;

export async function loadVrm(url: string): Promise<VRM> {
  const loader = new GLTFLoader();
  loader.setCrossOrigin('anonymous');
  loader.register((parser) => new VRMLoaderPlugin(parser));
  const gltf = await loader.loadAsync(url);
  const vrm = (gltf.userData as { vrm?: VRM }).vrm;
  if (!vrm) throw new Error('That file is not a VRM model');
  VRMUtils.removeUnnecessaryVertices(gltf.scene);
  VRMUtils.combineSkeletons(gltf.scene);
  VRMUtils.combineMorphs(vrm);
  VRMUtils.rotateVRM0(vrm);
  vrm.scene.traverse((node) => {
    node.frustumCulled = false;
  });
  return vrm;
}

export function createVrmView(vrm: VRM, url: string): ModelView {
  const rig = new Group();
  rig.name = 'vrm-rig';
  rig.add(vrm.scene);
  const head = vrm.humanoid?.getNormalizedBoneNode('head') ?? vrm.scene;
  if (vrm.lookAt) vrm.lookAt.autoUpdate = true;

  return {
    kind: 'vrm',
    url,
    object: rig,
    head,
    cameraDistance: 0.58,
    lookYOffset: 0.05,
    preUpdate(pose: Pose) {
      // Absolute rig rotation. The VRM0 yaw correction stays on `vrm.scene`, a child of the rig.
      rig.position.y = pose.breath;
      rig.rotation.set(pose.lean + pose.headPitch, pose.headYaw, pose.headRoll);
      setExpression(vrm, EXPRESSION_TO_VRM[pose.expression], pose.expressionIntensity);
      setWeight(vrm, 'blink', pose.blink);
      for (const name of VISEME_NAMES) setWeight(vrm, name, pose.visemes[name]);
    },
    update(delta: number) {
      vrm.update(delta);
    },
    postUpdate() {},
    dispose() {
      disposeObject(rig);
    },
  };
}

function setExpression(vrm: VRM, active: string, intensity: number): void {
  for (const name of EMOTIONS) setWeight(vrm, name, name === active ? intensity : 0);
}

function setWeight(vrm: VRM, name: string, value: number): void {
  const manager = vrm.expressionManager;
  if (!manager?.getExpression(name)) return;
  manager.setValue(name, value);
}
