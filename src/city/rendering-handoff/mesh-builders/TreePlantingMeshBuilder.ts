import * as THREE from 'three';
import { MaterialLibrary } from '../../../rendering/materials/MaterialLibrary';
import type { TreePlanting } from '../../../types/city';
import { attachCityPickingInstanceMetadata, type CityPickingMetadata } from '../picking/pickingMetadata';

export class TreePlantingMeshBuilder {
  constructor(
    private readonly materials: MaterialLibrary,
    private readonly metadataByObjectId: Readonly<Record<string, CityPickingMetadata>>
  ) {}

  build(trees: readonly TreePlanting[]): THREE.Group {
    const group = new THREE.Group();
    group.name = 'TreePlantings';

    if (trees.length === 0) {
      return group;
    }

    const trunkMesh = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.35, 0.45, 1, 6),
      this.materials.getMaterialForZone('tree-trunk', 'treeTrunk'),
      trees.length
    );
    const canopyMesh = new THREE.InstancedMesh(
      new THREE.ConeGeometry(1, 1, 7),
      this.materials.getMaterialForZone('tree-canopy', 'treeCanopy'),
      trees.length
    );
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();
    const metadata = trees.map((tree) => {
      const pickingMetadata = this.metadataByObjectId[tree.id];

      if (!pickingMetadata) {
        throw new Error(`Missing picking metadata for ${tree.id}.`);
      }

      return pickingMetadata;
    });

    trees.forEach((tree, index) => {
      const trunkHeight = tree.height * 0.38;
      const canopyHeight = tree.height * 0.62;
      const canopyRadius = tree.canopyDiameter / 2;

      matrix.compose(
        new THREE.Vector3(tree.center.x, trunkHeight / 2, tree.center.z),
        rotation,
        new THREE.Vector3(1, trunkHeight, 1)
      );
      trunkMesh.setMatrixAt(index, matrix);

      matrix.compose(
        new THREE.Vector3(tree.center.x, trunkHeight + canopyHeight / 2, tree.center.z),
        rotation,
        new THREE.Vector3(canopyRadius, canopyHeight, canopyRadius)
      );
      canopyMesh.setMatrixAt(index, matrix);
    });

    trunkMesh.name = 'TreeTrunkInstances';
    canopyMesh.name = 'TreeCanopyInstances';
    trunkMesh.castShadow = true;
    canopyMesh.castShadow = true;
    attachCityPickingInstanceMetadata(trunkMesh, metadata);
    attachCityPickingInstanceMetadata(canopyMesh, metadata);
    trunkMesh.instanceMatrix.needsUpdate = true;
    canopyMesh.instanceMatrix.needsUpdate = true;
    group.add(trunkMesh, canopyMesh);

    return group;
  }
}
