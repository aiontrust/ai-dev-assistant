import type { BufferGeometry, Material, Object3D, Texture } from 'three';
import type { Pose } from './pose';

export interface ModelView {
  kind: 'vrm' | 'placeholder';
  url: string | null;
  object: Object3D;
  /** World-space anchor used to frame the camera and place the look target. */
  head: Object3D;
  cameraDistance: number;
  lookYOffset: number;
  preUpdate(pose: Pose): void;
  update(delta: number): void;
  postUpdate(pose: Pose): void;
  dispose(): void;
}

interface DisposableGeometry {
  geometry?: BufferGeometry;
  material?: Material | Material[];
}

export function disposeObject(root: Object3D): void {
  const materials = new Set<Material>();
  const textures = new Set<Texture>();
  root.traverse((node) => {
    const mesh = node as DisposableGeometry;
    mesh.geometry?.dispose();
    const list = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    for (const material of list) {
      if (materials.has(material)) continue;
      materials.add(material);
      const record = material as unknown as Record<string, unknown>;
      for (const key of Object.keys(record)) {
        const value = record[key];
        if (isTexture(value) && !textures.has(value)) {
          textures.add(value);
          value.dispose();
        }
      }
      material.dispose();
    }
  });
  root.removeFromParent();
}

function isTexture(value: unknown): value is Texture {
  return typeof value === 'object' && value !== null && (value as Texture).isTexture === true;
}
