import * as THREE from 'three';
import { MaterialLibrary } from '../../../rendering/materials/MaterialLibrary';
import type { WaterfrontOpenSpace } from '../../../types/city';
import {
  attachCityPickingInstanceMetadata,
  createCityPickingMetadata,
  type CityPickingMetadata
} from '../picking/pickingMetadata';

export class WaterfrontOpenSpaceMeshBuilder {
  constructor(
    private readonly materials: MaterialLibrary,
    private readonly metadataByObjectId: Readonly<Record<string, CityPickingMetadata>>
  ) {}

  build(openSpaces: readonly WaterfrontOpenSpace[]): THREE.Group {
    const group = new THREE.Group();
    group.name = 'WaterfrontOpenSpaces';

    this.addSurfaceBatch(group, openSpaces, 'promenade', 'WaterfrontPromenadeInstances', 'waterfront');
    this.addSurfaceBatch(group, openSpaces, 'boardwalk', 'WaterfrontBoardwalkInstances', 'park-seating');
    this.addSurfaceBatch(group, openSpaces, 'overlook', 'WaterfrontOverlookInstances', 'storefront-sign');
    this.addSurfaceBatch(group, openSpaces, 'pier-landing', 'WaterfrontPierLandingInstances', 'park-seating');
    this.addSurfaceBatch(group, openSpaces, 'water-access', 'WaterfrontWaterAccessInstances', 'waterfront-edge');
    this.addSurfaceBatch(group, openSpaces, 'ecological-edge', 'WaterfrontEcologicalEdgeInstances', 'park');
    this.addRailings(group, openSpaces.filter((openSpace) => openSpace.railingLengthMeters > 0));
    this.addSeatingMarkers(group, openSpaces.filter((openSpace) => openSpace.seatingCapacity > 0));

    return group;
  }

  private addSurfaceBatch(
    group: THREE.Group,
    openSpaces: readonly WaterfrontOpenSpace[],
    kind: WaterfrontOpenSpace['openSpaceKind'],
    name: string,
    materialZone: string
  ): void {
    const items = openSpaces.filter((openSpace) => openSpace.openSpaceKind === kind);

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
    mesh.castShadow = kind === 'overlook' || kind === 'pier-landing';

    items.forEach((openSpace, index) => {
      const size = getBoundarySize(openSpace);
      matrix.compose(
        new THREE.Vector3(openSpace.center.x, openSpace.elevationMeters + 0.08, openSpace.center.z),
        rotation,
        new THREE.Vector3(size.x, 0.16, size.z)
      );
      mesh.setMatrixAt(index, matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
    attachCityPickingInstanceMetadata(mesh, items.map((openSpace) => this.metadataFor(openSpace)));
    group.add(mesh);
  }

  private addRailings(group: THREE.Group, openSpaces: readonly WaterfrontOpenSpace[]): void {
    if (openSpaces.length === 0) {
      return;
    }

    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      this.materials.getMaterialForZone('railing', 'streetFurnitureMetal'),
      openSpaces.length
    );
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();

    mesh.name = 'WaterfrontRailingInstances';
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    openSpaces.forEach((openSpace, index) => {
      const size = getBoundarySize(openSpace);
      matrix.compose(
        new THREE.Vector3(openSpace.center.x, openSpace.elevationMeters + 0.72, openSpace.center.z - size.z / 2 + 0.28),
        rotation,
        new THREE.Vector3(Math.min(size.x, openSpace.railingLengthMeters), 0.12, 0.12)
      );
      mesh.setMatrixAt(index, matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
    attachCityPickingInstanceMetadata(mesh, openSpaces.map((openSpace) => this.metadataFor(openSpace)));
    group.add(mesh);
  }

  private addSeatingMarkers(group: THREE.Group, openSpaces: readonly WaterfrontOpenSpace[]): void {
    if (openSpaces.length === 0) {
      return;
    }

    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      this.materials.getMaterialForZone('bench', 'streetFurnitureWood'),
      openSpaces.length
    );
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();

    mesh.name = 'WaterfrontSeatingMarkerInstances';
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    openSpaces.forEach((openSpace, index) => {
      const size = getBoundarySize(openSpace);
      matrix.compose(
        new THREE.Vector3(openSpace.center.x, openSpace.elevationMeters + 0.36, openSpace.center.z + size.z / 2 - 0.8),
        rotation,
        new THREE.Vector3(Math.min(8, size.x * 0.2), 0.28, 0.42)
      );
      mesh.setMatrixAt(index, matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
    attachCityPickingInstanceMetadata(mesh, openSpaces.map((openSpace) => this.metadataFor(openSpace)));
    group.add(mesh);
  }

  private metadataFor(openSpace: WaterfrontOpenSpace): CityPickingMetadata {
    return this.metadataByObjectId[openSpace.id] ?? createCityPickingMetadata(openSpace);
  }
}

function getBoundarySize(openSpace: WaterfrontOpenSpace): { readonly x: number; readonly z: number } {
  const xs = openSpace.boundary.map((point) => point.x);
  const zs = openSpace.boundary.map((point) => point.z);

  return {
    x: Math.max(1, Math.max(...xs) - Math.min(...xs)),
    z: Math.max(1, Math.max(...zs) - Math.min(...zs))
  };
}
