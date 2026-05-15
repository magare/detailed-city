import * as THREE from 'three';
import { MaterialLibrary } from '../../../rendering/materials/MaterialLibrary';
import type { BuildingRoofDetailContract, BuildingRoofDetailKind } from '../../data-contracts/cityContracts';
import type { BuildingPlan } from '../../../types/city';
import {
  attachCityPickingInstanceMetadata,
  createCityPickingMetadata,
  type CityPickingMetadata
} from '../picking/pickingMetadata';

interface RoofPlacement {
  readonly building: BuildingPlan;
  readonly detail: BuildingRoofDetailContract;
}

export class BuildingRoofMeshBuilder {
  constructor(
    private readonly materials: MaterialLibrary,
    private readonly metadataByObjectId: Readonly<Record<string, CityPickingMetadata>>
  ) {}

  build(buildings: readonly BuildingPlan[], detailedBuildingIds: ReadonlySet<string>): THREE.Group {
    const placements = buildings.filter((building) => detailedBuildingIds.has(building.id)).flatMap((building) =>
      building.roofGrammar.details.map((detail) => ({
        building,
        detail
      }))
    );
    const group = new THREE.Group();
    group.name = 'BuildingRoofDetails';

    for (const detailKind of getDetailKinds(placements)) {
      const detailPlacements = placements.filter((placement) => placement.detail.detailKind === detailKind);
      group.add(this.createInstancedBoxes(`BuildingRoof${toPascalCase(detailKind)}Instances`, detailPlacements));
    }

    return group;
  }

  private createInstancedBoxes(name: string, placements: readonly RoofPlacement[]): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), this.getMaterial(placements[0].detail), placements.length);
    const matrix = new THREE.Matrix4();

    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    placements.forEach((placement, index) => {
      setRoofDetailMatrix(matrix, placement);
      mesh.setMatrixAt(index, matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
    attachCityPickingInstanceMetadata(
      mesh,
      placements.map((placement) => this.metadataByObjectId[placement.building.id] ?? createCityPickingMetadata(placement.building))
    );
    return mesh;
  }

  private getMaterial(detail: BuildingRoofDetailContract): THREE.Material {
    return this.materials.getMaterialForZone(detail.materialZone, 'rooftop');
  }
}

function setRoofDetailMatrix(matrix: THREE.Matrix4, placement: RoofPlacement): void {
  const { building, detail } = placement;

  matrix.compose(
    new THREE.Vector3(
      building.center.x + detail.centerOffsetMeters.x,
      detail.baseElevationMeters + detail.sizeMeters.y / 2,
      building.center.z + detail.centerOffsetMeters.z
    ),
    new THREE.Quaternion(),
    new THREE.Vector3(detail.sizeMeters.x, detail.sizeMeters.y, detail.sizeMeters.z)
  );
}

function getDetailKinds(placements: readonly RoofPlacement[]): BuildingRoofDetailKind[] {
  return [...new Set(placements.map((placement) => placement.detail.detailKind))].sort();
}

function toPascalCase(value: string): string {
  return value
    .split('-')
    .map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
    .join('');
}
