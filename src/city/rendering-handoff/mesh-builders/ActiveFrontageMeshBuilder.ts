import * as THREE from 'three';
import { MaterialLibrary } from '../../../rendering/materials/MaterialLibrary';
import type { ActiveFrontage } from '../../../types/city';
import {
  attachCityPickingInstanceMetadata,
  createCityPickingMetadata,
  type CityPickingMetadata
} from '../picking/pickingMetadata';

export class ActiveFrontageMeshBuilder {
  constructor(
    private readonly materials: MaterialLibrary,
    private readonly metadataByObjectId: Readonly<Record<string, CityPickingMetadata>>
  ) {}

  build(activeFrontages: readonly ActiveFrontage[]): THREE.Group {
    const group = new THREE.Group();
    group.name = 'ActiveFrontages';

    if (activeFrontages.length === 0) {
      return group;
    }

    group.add(
      this.createStorefrontWindows(activeFrontages),
      this.createEntranceDoors(activeFrontages),
      this.createAwnings(activeFrontages),
      this.createStorefrontSigns(activeFrontages),
      this.createNightWindows(activeFrontages)
    );

    return group;
  }

  private createStorefrontWindows(activeFrontages: readonly ActiveFrontage[]): THREE.InstancedMesh {
    const mesh = this.createBoxMesh('ActiveFrontageStorefrontWindowInstances', activeFrontages, 'storefront-glass');
    const matrix = new THREE.Matrix4();

    activeFrontages.forEach((frontage, index) => {
      setFrontageMatrix(matrix, frontage, {
        y: frontage.groundFloorHeightMeters * 0.43,
        alongMeters: frontage.widthMeters * 0.58,
        heightMeters: frontage.groundFloorHeightMeters * 0.52,
        depthMeters: 0.12
      });
      mesh.setMatrixAt(index, matrix);
    });
    finishInstancedMesh(mesh, activeFrontages, this.metadataByObjectId);
    return mesh;
  }

  private createEntranceDoors(activeFrontages: readonly ActiveFrontage[]): THREE.InstancedMesh {
    const mesh = this.createBoxMesh('ActiveFrontageEntranceDoorInstances', activeFrontages, 'entrance-door');
    const matrix = new THREE.Matrix4();

    activeFrontages.forEach((frontage, index) => {
      setFrontageMatrix(matrix, frontage, {
        y: 1.15,
        alongOffsetMeters: -frontage.widthMeters * 0.34,
        alongMeters: Math.min(1.35, frontage.widthMeters * 0.22),
        heightMeters: 2.3,
        depthMeters: 0.16
      });
      mesh.setMatrixAt(index, matrix);
    });
    finishInstancedMesh(mesh, activeFrontages, this.metadataByObjectId);
    return mesh;
  }

  private createAwnings(activeFrontages: readonly ActiveFrontage[]): THREE.InstancedMesh {
    const mesh = this.createBoxMesh('ActiveFrontageAwningInstances', activeFrontages, 'storefront-awning');
    const matrix = new THREE.Matrix4();

    activeFrontages.forEach((frontage, index) => {
      setFrontageMatrix(matrix, frontage, {
        y: frontage.groundFloorHeightMeters * 0.78,
        alongMeters: frontage.widthMeters * 0.76,
        heightMeters: 0.16,
        depthMeters: frontage.storefront.awning.depthMeters,
        protrudeFromFacadeMeters: frontage.storefront.awning.depthMeters / 2
      });
      mesh.setMatrixAt(index, matrix);
    });
    finishInstancedMesh(mesh, activeFrontages, this.metadataByObjectId);
    return mesh;
  }

  private createStorefrontSigns(activeFrontages: readonly ActiveFrontage[]): THREE.InstancedMesh {
    const mesh = this.createBoxMesh('ActiveFrontageSignInstances', activeFrontages, 'storefront-sign');
    const matrix = new THREE.Matrix4();

    activeFrontages.forEach((frontage, index) => {
      setFrontageMatrix(matrix, frontage, {
        y: frontage.groundFloorHeightMeters + 0.28,
        alongMeters: frontage.widthMeters * 0.66,
        heightMeters: 0.58,
        depthMeters: 0.14,
        protrudeFromFacadeMeters: 0.09
      });
      mesh.setMatrixAt(index, matrix);
    });
    finishInstancedMesh(mesh, activeFrontages, this.metadataByObjectId);
    return mesh;
  }

  private createNightWindows(activeFrontages: readonly ActiveFrontage[]): THREE.InstancedMesh {
    const mesh = this.createBoxMesh('ActiveFrontageNightWindowInstances', activeFrontages, 'window-glow');
    const matrix = new THREE.Matrix4();

    activeFrontages.forEach((frontage, index) => {
      setFrontageMatrix(matrix, frontage, {
        y: frontage.groundFloorHeightMeters + 1.06,
        alongMeters: frontage.widthMeters * 0.42,
        heightMeters: 0.46,
        depthMeters: 0.1,
        protrudeFromFacadeMeters: 0.1
      });
      mesh.setMatrixAt(index, matrix);
    });
    finishInstancedMesh(mesh, activeFrontages, this.metadataByObjectId);
    return mesh;
  }

  private createBoxMesh(
    name: string,
    activeFrontages: readonly ActiveFrontage[],
    materialZone: string
  ): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      this.materials.getMaterialForZone(materialZone),
      activeFrontages.length
    );
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }
}

interface FrontageComponentPlacement {
  readonly y: number;
  readonly alongOffsetMeters?: number;
  readonly alongMeters: number;
  readonly heightMeters: number;
  readonly depthMeters: number;
  readonly protrudeFromFacadeMeters?: number;
}

function setFrontageMatrix(
  matrix: THREE.Matrix4,
  frontage: ActiveFrontage,
  placement: FrontageComponentPlacement
): void {
  const normal = getNormal(frontage);
  const along = getAlong(frontage);
  const alongOffsetMeters = placement.alongOffsetMeters ?? 0;
  const protrudeMeters = placement.protrudeFromFacadeMeters ?? 0;
  const position = new THREE.Vector3(
    frontage.position.x + normal.x * protrudeMeters + along.x * alongOffsetMeters,
    placement.y,
    frontage.position.z + normal.z * protrudeMeters + along.z * alongOffsetMeters
  );

  matrix.compose(position, new THREE.Quaternion(), getScale(frontage, placement));
}

function getScale(frontage: ActiveFrontage, placement: FrontageComponentPlacement): THREE.Vector3 {
  if (frontage.frontageSide === 'east' || frontage.frontageSide === 'west') {
    return new THREE.Vector3(placement.depthMeters, placement.heightMeters, placement.alongMeters);
  }

  return new THREE.Vector3(placement.alongMeters, placement.heightMeters, placement.depthMeters);
}

function getNormal(frontage: ActiveFrontage): { x: number; z: number } {
  switch (frontage.frontageSide) {
    case 'east':
      return { x: 1, z: 0 };
    case 'west':
      return { x: -1, z: 0 };
    case 'north':
      return { x: 0, z: 1 };
    case 'south':
      return { x: 0, z: -1 };
  }
}

function getAlong(frontage: ActiveFrontage): { x: number; z: number } {
  if (frontage.frontageSide === 'east' || frontage.frontageSide === 'west') {
    return { x: 0, z: 1 };
  }

  return { x: 1, z: 0 };
}

function finishInstancedMesh(
  mesh: THREE.InstancedMesh,
  activeFrontages: readonly ActiveFrontage[],
  metadataByObjectId: Readonly<Record<string, CityPickingMetadata>>
): void {
  mesh.instanceMatrix.needsUpdate = true;
  attachCityPickingInstanceMetadata(
    mesh,
    activeFrontages.map((frontage) => metadataByObjectId[frontage.id] ?? createCityPickingMetadata(frontage))
  );
}
