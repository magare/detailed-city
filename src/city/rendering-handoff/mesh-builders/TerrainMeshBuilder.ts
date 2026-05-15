import * as THREE from 'three';
import { MaterialLibrary } from '../../../rendering/materials/MaterialLibrary';
import type { GeneratedCity } from '../../../types/city';

export class TerrainMeshBuilder {
  constructor(private readonly materials: MaterialLibrary) {}

  build(generated: Pick<GeneratedCity, 'bounds'>): THREE.Mesh {
    const size = generated.bounds.span * 1.32;
    const geometry = new THREE.PlaneGeometry(size, size, 1, 1);
    geometry.rotateX(-Math.PI / 2);

    const mesh = new THREE.Mesh(geometry, this.materials.getMaterialForZone('terrain', 'terrain'));
    mesh.name = 'GroundPlane';
    mesh.receiveShadow = true;
    return mesh;
  }
}
