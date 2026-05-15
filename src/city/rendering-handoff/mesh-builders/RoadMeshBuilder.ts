import * as THREE from 'three';
import { MaterialLibrary } from '../../../rendering/materials/MaterialLibrary';
import type { RoadSegment } from '../../../types/city';
import { attachCityPickingMetadata, type CityPickingMetadata } from '../picking/pickingMetadata';

export class RoadMeshBuilder {
  constructor(
    private readonly materials: MaterialLibrary,
    private readonly metadataByObjectId: Readonly<Record<string, CityPickingMetadata>>
  ) {}

  build(roads: readonly RoadSegment[]): THREE.Group {
    const group = new THREE.Group();
    group.name = 'RoadSegments';

    for (const road of roads) {
      const geometry =
        road.orientation === 'vertical'
          ? new THREE.BoxGeometry(road.width, 0.08, road.length)
          : new THREE.BoxGeometry(road.length, 0.08, road.width);
      const mesh = new THREE.Mesh(geometry, this.materials.getMaterialForZone('asphalt', 'asphalt'));
      mesh.name = road.id;
      mesh.position.set(road.center.x, 0.04, road.center.z);
      mesh.receiveShadow = true;

      const metadata = this.metadataByObjectId[road.id];
      if (metadata) {
        attachCityPickingMetadata(mesh, metadata);
      }

      group.add(mesh);
    }

    return group;
  }
}
