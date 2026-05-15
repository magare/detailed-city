import * as THREE from 'three';
import { MaterialLibrary } from '../../../rendering/materials/MaterialLibrary';
import type { TrafficCalmingDevice } from '../../../types/city';
import { attachCityPickingInstanceMetadata, type CityPickingMetadata } from '../picking/pickingMetadata';

export class TrafficCalmingMeshBuilder {
  constructor(
    private readonly materials: MaterialLibrary,
    private readonly metadataByObjectId: Readonly<Record<string, CityPickingMetadata>>
  ) {}

  build(devices: readonly TrafficCalmingDevice[]): THREE.InstancedMesh | undefined {
    if (devices.length === 0) {
      return undefined;
    }

    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      this.materials.getMaterialForZone('traffic-calming', 'trafficCalming'),
      devices.length
    );
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();

    devices.forEach((device, index) => {
      matrix.compose(
        new THREE.Vector3(device.center.x, 0.1 + device.heightMeters / 2, device.center.z),
        rotation,
        new THREE.Vector3(device.size.x, device.heightMeters, device.size.z)
      );
      mesh.setMatrixAt(index, matrix);
    });

    mesh.name = 'TrafficCalmingDeviceInstances';
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    attachCityPickingInstanceMetadata(
      mesh,
      devices.map((device) => {
        const metadata = this.metadataByObjectId[device.id];

        if (!metadata) {
          throw new Error(`Missing picking metadata for ${device.id}.`);
        }

        return metadata;
      })
    );
    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
  }
}
