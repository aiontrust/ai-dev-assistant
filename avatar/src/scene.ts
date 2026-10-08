import {
  ACESFilmicToneMapping,
  AmbientLight,
  Color,
  DirectionalLight,
  Object3D,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';

export interface AvatarScene {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  lookTarget: Object3D;
  resize(): void;
  frame(head: Object3D, distance: number, lookYOffset: number): void;
  render(): void;
  dispose(): void;
}

const headWorld = new Vector3();

export function createAvatarScene(container: HTMLElement): AvatarScene {
  const renderer = new WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  if (!renderer.getContext()) {
    renderer.dispose();
    throw new Error('WebGL is not available');
  }
  renderer.setClearColor(new Color(0x000000), 0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
  renderer.domElement.setAttribute('aria-label', 'SATI avatar');
  container.append(renderer.domElement);

  const scene = new Scene();
  const camera = new PerspectiveCamera(32, 1, 0.05, 20);

  const ambient = new AmbientLight(0xc9e6f6, 0.62);
  const key = new DirectionalLight(0xf5fbff, Math.PI * 1.2);
  key.position.set(0.5, 0.85, 1.15);
  const rim = new DirectionalLight(0x71dfff, Math.PI * 0.9);
  rim.position.set(-0.85, 0.55, -0.65);
  const fill = new DirectionalLight(0x1a4c68, Math.PI * 0.4);
  fill.position.set(-0.35, 0.05, 0.9);
  scene.add(ambient, key, rim, fill);

  const lookTarget = new Object3D();
  scene.add(lookTarget);

  const resize = () => {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  return {
    renderer,
    scene,
    camera,
    lookTarget,
    resize,
    frame(head, distance, lookYOffset) {
      head.updateWorldMatrix(true, false);
      head.getWorldPosition(headWorld);
      camera.position.set(headWorld.x, headWorld.y + 0.03, headWorld.z + distance);
      camera.lookAt(headWorld.x, headWorld.y + lookYOffset, headWorld.z);
      camera.updateProjectionMatrix();
    },
    render() {
      renderer.render(scene, camera);
    },
    dispose() {
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

export function placeLookTarget(target: Object3D, head: Object3D, yaw: number, pitch: number): void {
  head.getWorldPosition(headWorld);
  const distance = 0.72;
  target.position.set(
    headWorld.x + Math.sin(yaw) * distance,
    headWorld.y + Math.sin(pitch) * 0.48,
    headWorld.z + Math.cos(yaw) * distance,
  );
}
