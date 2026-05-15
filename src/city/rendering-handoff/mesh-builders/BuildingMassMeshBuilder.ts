import * as THREE from 'three';
import { MaterialLibrary } from '../../../rendering/materials/MaterialLibrary';
import type { BuildingPlan } from '../../../types/city';
import { attachCityPickingInstanceMetadata, type CityPickingMetadata } from '../picking/pickingMetadata';

export class BuildingMassMeshBuilder {
  constructor(
    private readonly materials: MaterialLibrary,
    private readonly metadataByObjectId: Readonly<Record<string, CityPickingMetadata>>
  ) {}

  build(buildings: readonly BuildingPlan[]): THREE.InstancedMesh | undefined {
    if (buildings.length === 0) {
      return undefined;
    }

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const mesh = new THREE.InstancedMesh(
      geometry,
      this.materials.getMaterialForZone('building', 'building'),
      buildings.length
    );
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();

    mesh.name = 'BuildingInstances';
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    attachCityPickingInstanceMetadata(
      mesh,
      buildings.map((building) => {
        const metadata = this.metadataByObjectId[building.id];

        if (!metadata) {
          throw new Error(`Missing picking metadata for ${building.id}.`);
        }

        return metadata;
      })
    );

    buildings.forEach((building, index) => {
      matrix.compose(
        new THREE.Vector3(building.center.x, building.heightMeters / 2, building.center.z),
        rotation,
        new THREE.Vector3(building.size.x, building.heightMeters, building.size.z)
      );
      mesh.setMatrixAt(index, matrix);
      mesh.setColorAt(index, this.materials.getBuildingColor(building.district, building.heightMeters));
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }

    return mesh;
  }
}
