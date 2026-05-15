import * as THREE from 'three';
import { MaterialLibrary } from '../../../rendering/materials/MaterialLibrary';
import type { AccessControl } from '../../../types/city';
import { attachCityPickingInstanceMetadata, type CityPickingMetadata } from '../picking/pickingMetadata';

export class AccessControlMeshBuilder {
  constructor(
    private readonly materials: MaterialLibrary,
    private readonly metadataByObjectId: Readonly<Record<string, CityPickingMetadata>>
  ) {}

  build(accessControls: readonly AccessControl[]): THREE.Group {
    const group = new THREE.Group();
    group.name = 'AccessControls';

    this.addControls(group, 'AccessControlWallInstances', accessControls.filter((control) => control.controlKind === 'wall'), 'curb-concrete', 'refugeIsland');
    this.addControls(group, 'AccessControlMetalBarrierInstances', accessControls.filter((control) => control.controlKind !== 'wall'), 'railing', 'streetFurnitureMetal');

    return group;
  }

  private addControls(
    group: THREE.Group,
    name: string,
    controls: readonly AccessControl[],
    materialZone: string,
    fallbackMaterial: string
  ): void {
    if (controls.length === 0) {
      return;
    }

    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      this.materials.getMaterialForZone(materialZone, fallbackMaterial),
      controls.length
    );
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();
    const yAxis = new THREE.Vector3(0, 1, 0);

    mesh.name = name;
    controls.forEach((control, index) => {
      const start = control.centerline[0];
      const end = control.centerline[control.centerline.length - 1] ?? start;
      const lengthMeters = Math.max(0.5, Math.hypot(end.x - start.x, end.z - start.z));
      const angle = Math.atan2(end.z - start.z, end.x - start.x);
      rotation.setFromAxisAngle(yAxis, -angle);
      matrix.compose(
        new THREE.Vector3(control.center.x, control.heightMeters / 2, control.center.z),
        rotation,
        new THREE.Vector3(lengthMeters, control.heightMeters, control.widthMeters)
      );
      mesh.setMatrixAt(index, matrix);
    });

    attachCityPickingInstanceMetadata(
      mesh,
      controls.map((control) => {
        const metadata = this.metadataByObjectId[control.id];

        if (!metadata) {
          throw new Error(`Missing picking metadata for ${control.id}.`);
        }

        return metadata;
      })
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
  }
}
