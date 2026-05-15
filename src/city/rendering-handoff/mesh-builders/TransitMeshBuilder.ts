import * as THREE from 'three';
import { MaterialLibrary } from '../../../rendering/materials/MaterialLibrary';
import type { TransitRoute, TransitStop } from '../../../types/city';
import { attachCityPickingInstanceMetadata, type CityPickingMetadata } from '../picking/pickingMetadata';

export class TransitMeshBuilder {
  constructor(
    private readonly materials: MaterialLibrary,
    private readonly metadataByObjectId: Readonly<Record<string, CityPickingMetadata>>
  ) {}

  build(stops: readonly TransitStop[], routes: readonly TransitRoute[]): THREE.Group {
    const group = new THREE.Group();
    group.name = 'TransitStopsAndRoutes';

    if (stops.length > 0) {
      group.add(this.buildStopMarkers(stops));
    }

    if (routes.length > 0) {
      group.userData.transitRouteCount = routes.length;
    }

    return group;
  }

  private buildStopMarkers(stops: readonly TransitStop[]): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      this.materials.getMaterialForZone('transit', 'transitStop'),
      stops.length
    );
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();

    mesh.name = 'TransitStopMarkerInstances';
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    stops.forEach((stop, index) => {
      matrix.compose(
        new THREE.Vector3(stop.center.x, 1.65, stop.center.z),
        rotation,
        new THREE.Vector3(0.34, 3.3, 0.34)
      );
      mesh.setMatrixAt(index, matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
    attachCityPickingInstanceMetadata(
      mesh,
      stops.map((stop) => this.metadataByObjectId[stop.id]).filter((metadata): metadata is CityPickingMetadata => Boolean(metadata))
    );
    return mesh;
  }
}
