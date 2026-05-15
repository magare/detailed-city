import * as THREE from 'three';
import { MaterialLibrary } from '../../../rendering/materials/MaterialLibrary';
import type { BuildingFacadeSideContract } from '../../data-contracts/cityContracts';
import type { BuildingPlan } from '../../../types/city';
import {
  attachCityPickingInstanceMetadata,
  createCityPickingMetadata,
  type CityPickingMetadata
} from '../picking/pickingMetadata';

interface FacadePlacement {
  readonly building: BuildingPlan;
  readonly side: BuildingFacadeSideContract;
  readonly y: number;
  readonly alongOffsetMeters: number;
  readonly alongMeters: number;
  readonly heightMeters: number;
  readonly depthMeters: number;
  readonly protrudeFromFacadeMeters: number;
}

export class BuildingFacadeMeshBuilder {
  constructor(
    private readonly materials: MaterialLibrary,
    private readonly metadataByObjectId: Readonly<Record<string, CityPickingMetadata>>
  ) {}

  build(buildings: readonly BuildingPlan[], detailedBuildingIds: ReadonlySet<string>): THREE.Group {
    const detailedBuildings = buildings.filter((building) => detailedBuildingIds.has(building.id));
    const group = new THREE.Group();
    group.name = 'BuildingFacadeModules';

    if (detailedBuildings.length === 0) {
      return group;
    }

    const windows = this.createWindowPlacements(detailedBuildings);
    const frames = this.createFramePlacements(detailedBuildings);
    const balconies = this.createBalconyPlacements(detailedBuildings);

    if (frames.length > 0) {
      group.add(this.createInstancedBoxes('BuildingFacadeFrameInstances', frames, 'building'));
    }
    if (windows.length > 0) {
      group.add(this.createInstancedBoxes('BuildingFacadeWindowInstances', windows, 'storefront-glass'));
    }
    if (balconies.length > 0) {
      group.add(this.createInstancedBoxes('BuildingFacadeBalconyInstances', balconies, 'metal'));
    }

    return group;
  }

  private createWindowPlacements(buildings: readonly BuildingPlan[]): FacadePlacement[] {
    const placements: FacadePlacement[] = [];

    for (const building of buildings) {
      for (const side of building.facadeGrammar.sides) {
        if (side.renderLod !== 'lod3') {
          continue;
        }

        const floorHeight = building.facadeGrammar.floorGrid.typicalFloorHeightMeters;
        const firstWindowLevel = side.storefrontModule.enabled ? 2 : 1;

        for (const level of side.floorLevels) {
          if (level < firstWindowLevel) {
            continue;
          }

          const y = (level - 1) * floorHeight + side.windowModule.sillHeightMeters + side.windowModule.heightMeters / 2;

          for (let bayIndex = 0; bayIndex < side.bayCount; bayIndex += 1) {
            placements.push({
              building,
              side,
              y,
              alongOffsetMeters: -side.widthMeters / 2 + side.baySpacingMeters * (bayIndex + 0.5),
              alongMeters: side.windowModule.widthMeters,
              heightMeters: side.windowModule.heightMeters,
              depthMeters: 0.1,
              protrudeFromFacadeMeters: 0.09
            });
          }
        }
      }
    }

    return placements;
  }

  private createFramePlacements(buildings: readonly BuildingPlan[]): FacadePlacement[] {
    const placements: FacadePlacement[] = [];

    for (const building of buildings) {
      for (const side of building.facadeGrammar.sides) {
        if (side.renderLod !== 'lod3') {
          continue;
        }

        const floorHeight = building.facadeGrammar.floorGrid.typicalFloorHeightMeters;

        for (const level of side.floorLevels) {
          placements.push({
            building,
            side,
            y: Math.min(building.heightMeters - 0.08, level * floorHeight),
            alongOffsetMeters: 0,
            alongMeters: side.widthMeters,
            heightMeters: 0.12,
            depthMeters: 0.09,
            protrudeFromFacadeMeters: 0.06
          });
        }
      }
    }

    return placements;
  }

  private createBalconyPlacements(buildings: readonly BuildingPlan[]): FacadePlacement[] {
    const placements: FacadePlacement[] = [];

    for (const building of buildings) {
      for (const side of building.facadeGrammar.sides) {
        if (side.renderLod !== 'lod3' || !side.balconyModule.enabled) {
          continue;
        }

        const floorHeight = building.facadeGrammar.floorGrid.typicalFloorHeightMeters;
        for (const level of side.floorLevels) {
          if (level < side.balconyModule.startLevel || (level - side.balconyModule.startLevel) % side.balconyModule.everyNFloors !== 0) {
            continue;
          }

          const y = (level - 1) * floorHeight + Math.min(1.1, floorHeight * 0.32);
          for (let bayIndex = 0; bayIndex < side.bayCount; bayIndex += 2) {
            placements.push({
              building,
              side,
              y,
              alongOffsetMeters: -side.widthMeters / 2 + side.baySpacingMeters * (bayIndex + 0.5),
              alongMeters: side.balconyModule.widthMeters,
              heightMeters: 0.16,
              depthMeters: side.balconyModule.depthMeters,
              protrudeFromFacadeMeters: side.balconyModule.depthMeters / 2
            });
          }
        }
      }
    }

    return placements;
  }

  private createInstancedBoxes(
    name: string,
    placements: readonly FacadePlacement[],
    materialZone: string
  ): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      this.materials.getMaterialForZone(materialZone),
      placements.length
    );
    const matrix = new THREE.Matrix4();

    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    placements.forEach((placement, index) => {
      setFacadeMatrix(matrix, placement);
      mesh.setMatrixAt(index, matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
    attachCityPickingInstanceMetadata(
      mesh,
      placements.map((placement) => this.metadataByObjectId[placement.building.id] ?? createCityPickingMetadata(placement.building))
    );
    return mesh;
  }
}

function setFacadeMatrix(matrix: THREE.Matrix4, placement: FacadePlacement): void {
  const normal = getNormal(placement.side.side);
  const along = getAlong(placement.side.side);
  const position = new THREE.Vector3(
    placement.building.center.x + normal.x * (getHalfDepth(placement.building, placement.side.side) + placement.protrudeFromFacadeMeters) + along.x * placement.alongOffsetMeters,
    placement.y,
    placement.building.center.z + normal.z * (getHalfDepth(placement.building, placement.side.side) + placement.protrudeFromFacadeMeters) + along.z * placement.alongOffsetMeters
  );

  matrix.compose(position, new THREE.Quaternion(), getScale(placement));
}

function getScale(placement: FacadePlacement): THREE.Vector3 {
  if (placement.side.side === 'east' || placement.side.side === 'west') {
    return new THREE.Vector3(placement.depthMeters, placement.heightMeters, placement.alongMeters);
  }

  return new THREE.Vector3(placement.alongMeters, placement.heightMeters, placement.depthMeters);
}

function getHalfDepth(building: BuildingPlan, side: BuildingFacadeSideContract['side']): number {
  return side === 'east' || side === 'west' ? building.size.x / 2 : building.size.z / 2;
}

function getNormal(side: BuildingFacadeSideContract['side']): { readonly x: number; readonly z: number } {
  switch (side) {
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

function getAlong(side: BuildingFacadeSideContract['side']): { readonly x: number; readonly z: number } {
  if (side === 'east' || side === 'west') {
    return { x: 0, z: 1 };
  }

  return { x: 1, z: 0 };
}
