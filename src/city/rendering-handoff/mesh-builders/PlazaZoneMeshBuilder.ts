import * as THREE from 'three';
import { MaterialLibrary } from '../../../rendering/materials/MaterialLibrary';
import type { PlazaZone } from '../../../types/city';
import {
  attachCityPickingInstanceMetadata,
  createCityPickingMetadata,
  type CityPickingMetadata
} from '../picking/pickingMetadata';

export class PlazaZoneMeshBuilder {
  constructor(
    private readonly materials: MaterialLibrary,
    private readonly metadataByObjectId: Readonly<Record<string, CityPickingMetadata>>
  ) {}

  build(zones: readonly PlazaZone[]): THREE.Group {
    const group = new THREE.Group();
    group.name = 'PlazaZones';

    this.addZoneBatch(group, zones, 'hardscape', 'PlazaHardscapeInstances', this.materials.plazaHardscape, 0.16);
    this.addZoneBatch(group, zones, 'event', 'PlazaEventZoneInstances', this.materials.storefrontSign, 0.22);
    this.addZoneBatch(group, zones, 'active-edge', 'PlazaActiveEdgeInstances', this.materials.storefrontAwning, 0.32);
    this.addZoneBatch(group, zones, 'seating', 'PlazaSeatingZoneInstances', this.materials.streetFurnitureWood, 0.42);
    this.addZoneBatch(group, zones, 'shade', 'PlazaShadeZoneInstances', this.materials.streetFurnitureMetal, 1.85);
    this.addZoneBatch(group, zones, 'paving', 'PlazaPavingBandInstances', this.materials.refugeIsland, 0.2);

    return group;
  }

  private addZoneBatch(
    group: THREE.Group,
    zones: readonly PlazaZone[],
    zoneKind: PlazaZone['zoneKind'],
    name: string,
    material: THREE.Material,
    heightMeters: number
  ): void {
    const items = zones.filter((zone) => zone.zoneKind === zoneKind);

    if (items.length === 0) {
      return;
    }

    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, items.length);
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();

    mesh.name = name;
    mesh.receiveShadow = true;
    mesh.castShadow = zoneKind === 'shade' || zoneKind === 'active-edge';

    items.forEach((zone, index) => {
      matrix.compose(
        new THREE.Vector3(zone.center.x, heightMeters / 2 + 0.18, zone.center.z),
        rotation,
        new THREE.Vector3(zone.size.x, heightMeters, zone.size.z)
      );
      mesh.setMatrixAt(index, matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
    attachCityPickingInstanceMetadata(
      mesh,
      items.map((zone) => this.metadataByObjectId[zone.id] ?? createCityPickingMetadata(zone))
    );
    group.add(mesh);
  }
}
