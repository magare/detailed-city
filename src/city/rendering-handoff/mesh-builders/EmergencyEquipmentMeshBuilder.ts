import * as THREE from 'three';
import { MaterialLibrary } from '../../../rendering/materials/MaterialLibrary';
import type { EmergencyEquipment } from '../../../types/city';
import {
  attachCityPickingInstanceMetadata,
  createCityPickingMetadata,
  type CityPickingMetadata
} from '../picking/pickingMetadata';

export class EmergencyEquipmentMeshBuilder {
  constructor(
    private readonly materials: MaterialLibrary,
    private readonly metadataByObjectId: Readonly<Record<string, CityPickingMetadata>>
  ) {}

  build(equipment: readonly EmergencyEquipment[]): THREE.Group {
    const group = new THREE.Group();
    group.name = 'EmergencyEquipment';

    this.addDeviceMarkers(group, equipment.filter((item) => isDeviceMarker(item.equipmentKind)));
    this.addAudibleMarkers(group, equipment.filter((item) => item.equipmentKind === 'siren' || item.equipmentKind === 'alarm'));
    this.addAssemblyAreas(group, equipment.filter((item) => item.equipmentKind === 'assembly-area'));
    this.addShelterPanels(group, equipment.filter((item) => item.equipmentKind === 'shelter-signage'));

    return group;
  }

  private addDeviceMarkers(group: THREE.Group, equipment: readonly EmergencyEquipment[]): void {
    if (equipment.length === 0) {
      return;
    }

    const mesh = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.5, 0.5, 1, 10),
      this.materials.getMaterialForZone('emergency-equipment', 'storefrontSign'),
      equipment.length
    );
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();

    mesh.name = 'EmergencyEquipmentDeviceInstances';
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    equipment.forEach((item, index) => {
      const height = item.equipmentKind === 'lifeguard-station' ? 2.4 : 1.5;
      const width = item.equipmentKind === 'lifeguard-station' ? 1.4 : 0.7;
      matrix.compose(
        new THREE.Vector3(item.center.x, height / 2, item.center.z),
        rotation,
        new THREE.Vector3(width, height, width)
      );
      mesh.setMatrixAt(index, matrix);
    });

    finishInstancedMesh(mesh, equipment, this.metadataByObjectId);
    group.add(mesh);
  }

  private addAudibleMarkers(group: THREE.Group, equipment: readonly EmergencyEquipment[]): void {
    if (equipment.length === 0) {
      return;
    }

    const poleMesh = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.5, 0.5, 1, 10),
      this.materials.getMaterialForZone('street-furniture', 'streetFurnitureMetal'),
      equipment.length
    );
    const headMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      this.materials.getMaterialForZone('emergency-equipment', 'storefrontSign'),
      equipment.length
    );
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();

    poleMesh.name = 'EmergencyEquipmentSirenPoleInstances';
    headMesh.name = 'EmergencyEquipmentSirenHeadInstances';
    poleMesh.castShadow = true;
    headMesh.castShadow = true;
    poleMesh.receiveShadow = true;
    headMesh.receiveShadow = true;

    equipment.forEach((item, index) => {
      matrix.compose(new THREE.Vector3(item.center.x, 1.35, item.center.z), rotation, new THREE.Vector3(0.18, 2.7, 0.18));
      poleMesh.setMatrixAt(index, matrix);
      matrix.compose(new THREE.Vector3(item.center.x, 2.85, item.center.z), rotation, new THREE.Vector3(0.75, 0.42, 0.75));
      headMesh.setMatrixAt(index, matrix);
    });

    finishInstancedMesh(poleMesh, equipment, this.metadataByObjectId);
    finishInstancedMesh(headMesh, equipment, this.metadataByObjectId);
    group.add(poleMesh, headMesh);
  }

  private addAssemblyAreas(group: THREE.Group, equipment: readonly EmergencyEquipment[]): void {
    if (equipment.length === 0) {
      return;
    }

    const padMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      this.materials.getMaterialForZone('plaza', 'plazaHardscape'),
      equipment.length
    );
    const markerMesh = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.5, 0.5, 1, 12),
      this.materials.getMaterialForZone('emergency-equipment', 'storefrontSign'),
      equipment.length
    );
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();

    padMesh.name = 'EmergencyEquipmentAssemblyPadInstances';
    markerMesh.name = 'EmergencyEquipmentAssemblyMarkerInstances';
    padMesh.receiveShadow = true;
    markerMesh.castShadow = true;
    markerMesh.receiveShadow = true;

    equipment.forEach((item, index) => {
      const capacityScale = Math.max(1, Math.min(2.2, item.capacity.assemblyCapacityPeople / 180));
      matrix.compose(
        new THREE.Vector3(item.center.x, 0.06, item.center.z),
        rotation,
        new THREE.Vector3(5.2 * capacityScale, 0.12, 3.4 * capacityScale)
      );
      padMesh.setMatrixAt(index, matrix);
      matrix.compose(new THREE.Vector3(item.center.x, 0.7, item.center.z), rotation, new THREE.Vector3(0.9, 1.4, 0.9));
      markerMesh.setMatrixAt(index, matrix);
    });

    finishInstancedMesh(padMesh, equipment, this.metadataByObjectId);
    finishInstancedMesh(markerMesh, equipment, this.metadataByObjectId);
    group.add(padMesh, markerMesh);
  }

  private addShelterPanels(group: THREE.Group, equipment: readonly EmergencyEquipment[]): void {
    if (equipment.length === 0) {
      return;
    }

    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      this.materials.getMaterialForZone('wayfinding-sign', 'storefrontSign'),
      equipment.length
    );
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();

    mesh.name = 'EmergencyEquipmentShelterSignInstances';
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    equipment.forEach((item, index) => {
      matrix.compose(new THREE.Vector3(item.center.x, 1.55, item.center.z), rotation, new THREE.Vector3(1.3, 1.1, 0.16));
      mesh.setMatrixAt(index, matrix);
    });

    finishInstancedMesh(mesh, equipment, this.metadataByObjectId);
    group.add(mesh);
  }
}

function finishInstancedMesh(
  mesh: THREE.InstancedMesh,
  equipment: readonly EmergencyEquipment[],
  metadataByObjectId: Readonly<Record<string, CityPickingMetadata>>
): void {
  mesh.instanceMatrix.needsUpdate = true;
  attachCityPickingInstanceMetadata(
    mesh,
    equipment.map((item) => metadataByObjectId[item.id] ?? createCityPickingMetadata(item))
  );
}

function isDeviceMarker(equipmentKind: EmergencyEquipment['equipmentKind']): boolean {
  return equipmentKind === 'aed' ||
    equipmentKind === 'emergency-phone' ||
    equipmentKind === 'fire-alarm-box' ||
    equipmentKind === 'lifeguard-station';
}
