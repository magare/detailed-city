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

    this.addZoneBatch(group, zones, 'hardscape', 'PlazaHardscapeInstances', 'plaza', 0.16);
    this.addZoneBatch(group, zones, 'event', 'PlazaEventZoneInstances', 'storefront-sign', 0.22);
    this.addZoneBatch(group, zones, 'active-edge', 'PlazaActiveEdgeInstances', 'storefront-awning', 0.32);
    this.addZoneBatch(group, zones, 'seating', 'PlazaSeatingZoneInstances', 'park-seating', 0.42);
    this.addZoneBatch(group, zones, 'shade', 'PlazaShadeZoneInstances', 'park-shade', 1.85);
    this.addZoneBatch(group, zones, 'paving', 'PlazaPavingBandInstances', 'curb-concrete', 0.2);

    return group;
  }

  private addZoneBatch(
    group: THREE.Group,
    zones: readonly PlazaZone[],
    zoneKind: PlazaZone['zoneKind'],
    name: string,
    materialZone: string,
    heightMeters: number
  ): void {
    const items = zones.filter((zone) => zone.zoneKind === zoneKind);

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
