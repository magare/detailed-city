import * as THREE from 'three';
import { MaterialLibrary } from '../../../rendering/materials/MaterialLibrary';
import type { Waterway } from '../../../types/city';
import { attachCityPickingMetadata, type CityPickingMetadata } from '../picking/pickingMetadata';

export class WaterwayMeshBuilder {
  constructor(
    private readonly materials: MaterialLibrary,
    private readonly metadataByObjectId: Readonly<Record<string, CityPickingMetadata>>
  ) {}

  build(waterways: readonly Waterway[]): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Waterways';

    for (const waterway of waterways) {
      const geometry = new THREE.BoxGeometry(waterway.length, 0.06, waterway.width);
      const mesh = new THREE.Mesh(geometry, this.materials.getMaterialForZone('water', 'water'));
      mesh.name = waterway.id;
      mesh.position.set(waterway.center.x, 0.08, waterway.center.z);
      mesh.receiveShadow = true;

      const metadata = this.metadataByObjectId[waterway.id];
      if (metadata) {
        attachCityPickingMetadata(mesh, metadata);
      }

      group.add(mesh);
    }

    return group;
  }
}
