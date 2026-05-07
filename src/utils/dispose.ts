import * as THREE from 'three';

export function disposeObject3D(object: THREE.Object3D, disposeMaterials = false): void {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;

    if (mesh.geometry) {
      mesh.geometry.dispose();
    }

    if (disposeMaterials && mesh.material) {
      if (Array.isArray(mesh.material)) {
        for (const material of mesh.material) {
          material.dispose();
        }
      } else {
        mesh.material.dispose();
      }
    }
  });
}
