import * as THREE from 'three';
import { MaterialLibrary } from '../../../rendering/materials/MaterialLibrary';
import type { IndustrialFacility } from '../../../types/city';
import {
  attachCityPickingInstanceMetadata,
  createCityPickingMetadata,
  type CityPickingMetadata
} from '../picking/pickingMetadata';

export class IndustrialFacilityMeshBuilder {
  constructor(
    private readonly materials: MaterialLibrary,
    private readonly metadataByObjectId: Readonly<Record<string, CityPickingMetadata>>
  ) {}

  build(facilities: readonly IndustrialFacility[]): THREE.Group {
    const group = new THREE.Group();
    group.name = 'IndustrialFacilities';

    this.addYardBatch(group, facilities, 'concrete-apron', 'IndustrialFacilityConcreteApronInstances', 'curb-concrete');
    this.addYardBatch(group, facilities, 'asphalt-yard', 'IndustrialFacilityAsphaltYardInstances', 'asphalt');
    this.addYardBatch(group, facilities, 'gravel-service-yard', 'IndustrialFacilityGravelYardInstances', 'plaza');
    this.addLoadingBayMarkers(group, facilities);
    this.addColdChainEquipment(group, facilities);

    return group;
  }

  private addYardBatch(
    group: THREE.Group,
    facilities: readonly IndustrialFacility[],
    surface: IndustrialFacility['yard']['surface'],
    name: string,
    materialZone: string
  ): void {
    const items = facilities.filter((facility) => facility.yard.surface === surface);

    if (items.length === 0) {
      return;
    }

    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      this.materials.getMaterialForZone(materialZone),
      items.length
    );
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();

    mesh.name = name;
    mesh.receiveShadow = true;
    items.forEach((facility, index) => {
      const size = getBoundarySize(facility);
      matrix.compose(
        new THREE.Vector3(facility.yard.center.x, 0.06, facility.yard.center.z),
        rotation,
        new THREE.Vector3(size.x, 0.12, size.z)
      );
      mesh.setMatrixAt(index, matrix);
    });
    finishInstancedMesh(mesh, items, this.metadataByObjectId);
    group.add(mesh);
  }

  private addLoadingBayMarkers(group: THREE.Group, facilities: readonly IndustrialFacility[]): void {
    if (facilities.length === 0) {
      return;
    }

    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      this.materials.getMaterialForZone('lane-paint'),
      facilities.length
    );
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();

    mesh.name = 'IndustrialFacilityLoadingBayInstances';
    facilities.forEach((facility, index) => {
      const size = getBoundarySize(facility);
      const longAxis = Math.min(Math.max(2, facility.logistics.loadingBays * 1.6), Math.max(size.x, size.z) * 0.82);
      const scale = size.x >= size.z
        ? new THREE.Vector3(longAxis, 0.16, 0.34)
        : new THREE.Vector3(0.34, 0.16, longAxis);

      matrix.compose(new THREE.Vector3(facility.yard.center.x, 0.18, facility.yard.center.z), rotation, scale);
      mesh.setMatrixAt(index, matrix);
    });
    finishInstancedMesh(mesh, facilities, this.metadataByObjectId);
    group.add(mesh);
  }

  private addColdChainEquipment(group: THREE.Group, facilities: readonly IndustrialFacility[]): void {
    const items = facilities.filter((facility) => facility.logistics.coldChain.enabled);

    if (items.length === 0) {
      return;
    }

    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      this.materials.getMaterialForZone('metal'),
      items.length
    );
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();

    mesh.name = 'IndustrialFacilityColdChainUnitInstances';
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    items.forEach((facility, index) => {
      const size = getBoundarySize(facility);
      matrix.compose(
        new THREE.Vector3(facility.yard.center.x + size.x * 0.28, 0.72, facility.yard.center.z - size.z * 0.28),
        rotation,
        new THREE.Vector3(1.8, 1.35, 1.2)
      );
      mesh.setMatrixAt(index, matrix);
    });
    finishInstancedMesh(mesh, items, this.metadataByObjectId);
    group.add(mesh);
  }
}

function getBoundarySize(facility: IndustrialFacility): { readonly x: number; readonly z: number } {
  const xs = facility.yard.boundary.map((point) => point.x);
  const zs = facility.yard.boundary.map((point) => point.z);

  return {
    x: Math.max(0.2, Math.max(...xs) - Math.min(...xs)),
    z: Math.max(0.2, Math.max(...zs) - Math.min(...zs))
  };
}

function finishInstancedMesh(
  mesh: THREE.InstancedMesh,
  items: readonly IndustrialFacility[],
  metadataByObjectId: Readonly<Record<string, CityPickingMetadata>>
): void {
  mesh.instanceMatrix.needsUpdate = true;
  attachCityPickingInstanceMetadata(
    mesh,
    items.map((item) => metadataByObjectId[item.id] ?? createCityPickingMetadata(item))
  );
}
