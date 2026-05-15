import * as THREE from 'three';
import { MaterialLibrary } from '../../../rendering/materials/MaterialLibrary';
import type { ParkPatch } from '../../../types/city';
import { attachCityPickingMetadata, type CityPickingMetadata } from '../picking/pickingMetadata';

export class ParkSurfaceMeshBuilder {
  constructor(
    private readonly materials: MaterialLibrary,
    private readonly metadataByObjectId: Readonly<Record<string, CityPickingMetadata>>
  ) {}

  build(parks: readonly ParkPatch[]): THREE.Group {
    const group = new THREE.Group();
    group.name = 'ParkSurfaces';

    for (const park of parks) {
      const geometry = new THREE.BoxGeometry(park.size.x, 0.1, park.size.z);
      const mesh = new THREE.Mesh(geometry, this.materials.getMaterialForZone('park', 'park'));
      mesh.name = park.id;
      mesh.position.set(park.center.x, 0.11, park.center.z);
      mesh.receiveShadow = true;

      const metadata = this.metadataByObjectId[park.id];
      if (metadata) {
        attachCityPickingMetadata(mesh, metadata);
      }

      group.add(mesh);
    }

    return group;
  }
}
