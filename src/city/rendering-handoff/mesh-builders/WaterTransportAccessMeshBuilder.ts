import * as THREE from 'three';
import { MaterialLibrary } from '../../../rendering/materials/MaterialLibrary';
import type { WaterTransportAccess } from '../../../types/city';
import {
  attachCityPickingInstanceMetadata,
  createCityPickingMetadata,
  type CityPickingMetadata
} from '../picking/pickingMetadata';

export class WaterTransportAccessMeshBuilder {
  constructor(
    private readonly materials: MaterialLibrary,
    private readonly metadataByObjectId: Readonly<Record<string, CityPickingMetadata>>
  ) {}

  build(accessPoints: readonly WaterTransportAccess[]): THREE.Group {
    const group = new THREE.Group();
    group.name = 'WaterTransportAccess';

    this.addPlatforms(group, accessPoints);
    this.addMarkers(group, accessPoints);
    this.addHelipadSymbols(group, accessPoints.filter((access) => access.accessKind === 'emergency-helipad'));

    return group;
  }

  private addPlatforms(group: THREE.Group, accessPoints: readonly WaterTransportAccess[]): void {
    if (accessPoints.length === 0) {
      return;
    }

    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      this.materials.getMaterialForZone('waterfront', 'waterfrontEdge'),
      accessPoints.length
    );
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();

    mesh.name = 'WaterTransportAccessPlatformInstances';
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    accessPoints.forEach((access, index) => {
      const size = getBoundarySize(access);
      matrix.compose(
        new THREE.Vector3(access.center.x, 0.72, access.center.z),
        rotation,
        new THREE.Vector3(size.x, 0.28, size.z)
      );
      mesh.setMatrixAt(index, matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
    attachCityPickingInstanceMetadata(mesh, accessPoints.map((access) => this.metadataFor(access)));
    group.add(mesh);
  }

  private addMarkers(group: THREE.Group, accessPoints: readonly WaterTransportAccess[]): void {
    if (accessPoints.length === 0) {
      return;
    }

    const mesh = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.5, 0.5, 1, 12),
      this.materials.getMaterialForZone('transit', 'transitStop'),
      accessPoints.length
    );
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();

    mesh.name = 'WaterTransportAccessMarkerInstances';
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    accessPoints.forEach((access, index) => {
      matrix.compose(
        new THREE.Vector3(access.center.x, 2.0, access.center.z),
        rotation,
        new THREE.Vector3(1.2, access.accessKind === 'emergency-helipad' ? 2.2 : 2.6, 1.2)
      );
      mesh.setMatrixAt(index, matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
    attachCityPickingInstanceMetadata(mesh, accessPoints.map((access) => this.metadataFor(access)));
    group.add(mesh);
  }

  private addHelipadSymbols(group: THREE.Group, helipads: readonly WaterTransportAccess[]): void {
    if (helipads.length === 0) {
      return;
    }

    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      this.materials.getMaterialForZone('lane-paint', 'lanePaint'),
      helipads.length * 3
    );
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();
    const placements: WaterTransportAccess[] = [];

    mesh.name = 'WaterTransportHelipadSymbolInstances';
    mesh.receiveShadow = true;

    helipads.forEach((access, index) => {
      const base = index * 3;
      const y = 0.9;
      matrix.compose(new THREE.Vector3(access.center.x, y, access.center.z), rotation, new THREE.Vector3(10, 0.08, 1.2));
      mesh.setMatrixAt(base, matrix);
      matrix.compose(new THREE.Vector3(access.center.x, y + 0.01, access.center.z), rotation, new THREE.Vector3(1.2, 0.08, 10));
      mesh.setMatrixAt(base + 1, matrix);
      matrix.compose(new THREE.Vector3(access.center.x, y + 0.02, access.center.z - 3.2), rotation, new THREE.Vector3(4.4, 0.08, 1.2));
      mesh.setMatrixAt(base + 2, matrix);
      placements.push(access, access, access);
    });

    mesh.instanceMatrix.needsUpdate = true;
    attachCityPickingInstanceMetadata(mesh, placements.map((access) => this.metadataFor(access)));
    group.add(mesh);
  }

  private metadataFor(access: WaterTransportAccess): CityPickingMetadata {
    return this.metadataByObjectId[access.id] ?? createCityPickingMetadata(access);
  }
}

function getBoundarySize(access: WaterTransportAccess): { readonly x: number; readonly z: number } {
  const xs = access.boundary.map((point) => point.x);
  const zs = access.boundary.map((point) => point.z);

  return {
    x: Math.max(1, Math.max(...xs) - Math.min(...xs)),
    z: Math.max(1, Math.max(...zs) - Math.min(...zs))
  };
}
