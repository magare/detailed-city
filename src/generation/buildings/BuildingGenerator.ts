import { CITY_BLUEPRINT } from '../../city/blueprint/cityBlueprint';
import type { BuildingFrontageSide, LandUse } from '../../city/data-contracts/cityContracts';
import type {
  BlockPlan,
  BuildingPlan,
  CityBounds,
  CityConfig,
  DistrictKind,
  DistrictPlan,
  Parcel,
  RoofStyle
} from '../../types/city';
import { SeededRandom } from '../../utils/random';
import { rectanglePolygon } from '../../utils/geometry';
import { blockKey } from '../terrain/TerrainGenerator';

export interface GeneratedLandAndBuildings {
  districts: DistrictPlan[];
  blocks: BlockPlan[];
  parcels: Parcel[];
  buildings: BuildingPlan[];
}

export class BuildingGenerator {
  constructor(
    private readonly config: CityConfig,
    private readonly random: SeededRandom
  ) {}

  generate(bounds: CityBounds, excludedBlocks: Set<string>): GeneratedLandAndBuildings {
    const blocks: BlockPlan[] = [];
    const parcels: Parcel[] = [];
    const buildings: BuildingPlan[] = [];

    for (let blockX = 0; blockX < this.config.gridSize; blockX += 1) {
      for (let blockZ = 0; blockZ < this.config.gridSize; blockZ += 1) {
        if (excludedBlocks.has(blockKey(blockX, blockZ))) {
          continue;
        }

        const district = this.getDistrict(blockX, blockZ);
        const districtConfig = this.config.districts[district];
        const blockId = `block-${blockX}-${blockZ}`;
        const districtId = `district-${district}`;
        const allowedUses = this.getAllowedUses(district);
        const maxHeightMeters = this.getDistrictMaxHeight(district);
        const maxCoverageRatio = 0.82;
        const split = districtConfig.lotSplit + (this.random.chance(districtConfig.density * 0.32) ? 1 : 0);
        const lotSize = this.config.blockSize / split;

        blocks.push({
          id: blockId,
          kind: 'block',
          ownerDomain: 'land',
          parentId: districtId,
          lod: 'lod1',
          boundary: rectanglePolygon(this.getBlockCenter(bounds, blockX, blockZ), {
            x: this.config.blockSize,
            z: this.config.blockSize
          }),
          districtId,
          permeability: this.getBlockPermeability(district),
          grid: { x: blockX, z: blockZ },
          center: this.getBlockCenter(bounds, blockX, blockZ),
          size: { x: this.config.blockSize, z: this.config.blockSize },
          district
        });

        for (let lotX = 0; lotX < split; lotX += 1) {
          for (let lotZ = 0; lotZ < split; lotZ += 1) {
            if (!this.random.chance(districtConfig.density)) {
              continue;
            }

            const center = this.getLotCenter(bounds, blockX, blockZ, lotX, lotZ, lotSize);
            const parcelSize = { x: lotSize, z: lotSize };
            const maxFootprintSide = Math.sqrt(maxCoverageRatio) * lotSize;
            const buildableSide = Math.min(
              maxFootprintSide,
              Math.max(4, lotSize - this.config.building.setback - this.random.range(0.5, 3.5))
            );
            const buildingSize = {
              x: Math.min(maxFootprintSide, buildableSide * this.random.range(0.82, 1.08)),
              z: Math.min(maxFootprintSide, buildableSide * this.random.range(0.82, 1.08))
            };
            const id = `parcel-${blockX}-${blockZ}-${lotX}-${lotZ}`;
            const buildingId = `building-${blockX}-${blockZ}-${lotX}-${lotZ}`;
            const heightMeters = this.getHeight(district, districtConfig.heightBias);
            const roofStyle = this.getRoofStyle(district, heightMeters);
            const frontageRoadIds = this.getFrontageRoadIds(blockX, blockZ, lotX, lotZ, split);
            const primaryFrontageRoadId = frontageRoadIds[0];
            const publicEntranceIds = [`${buildingId}-entrance-primary`];

            parcels.push({
              id,
              kind: 'parcel',
              ownerDomain: 'land',
              parentId: blockId,
              lod: 'lod1',
              block: { x: blockX, z: blockZ },
              center,
              size: parcelSize,
              boundary: rectanglePolygon(center, parcelSize),
              district,
              districtId,
              blockId,
              frontageRoadIds,
              allowedUses: [...allowedUses],
              density: districtConfig.density,
              maxHeightMeters,
              maxCoverageRatio
            });

            buildings.push({
              id: buildingId,
              kind: 'building',
              ownerDomain: 'buildings',
              parentId: id,
              lod: 'lod1',
              parcelId: id,
              footprint: rectanglePolygon(center, buildingSize),
              uses: this.selectBuildingUses(allowedUses),
              heightMeters,
              floorCount: this.getFloorCount(district, heightMeters),
              facadeGrammarId: `${district}-facade-v1`,
              roofGrammarId: `${roofStyle}-roof-v1`,
              primaryFrontageRoadId,
              primaryFrontageSide: this.getFrontageSide(primaryFrontageRoadId, blockX, blockZ),
              entranceIds: publicEntranceIds,
              publicEntranceIds,
              center,
              size: buildingSize,
              district,
              roofStyle
            });
          }
        }
      }
    }

    return {
      districts: this.generateDistricts(blocks),
      blocks,
      parcels,
      buildings
    };
  }

  private getDistrict(blockX: number, blockZ: number): DistrictKind {
    const gridMax = Math.max(this.config.gridSize - 1, 1);
    const normalized = { x: blockX / gridMax, z: blockZ / gridMax };
    return CITY_BLUEPRINT.districtRules.find((rule) => rule.matches(normalized))?.id ?? 'residential';
  }

  private getLotCenter(
    bounds: CityBounds,
    blockX: number,
    blockZ: number,
    lotX: number,
    lotZ: number,
    lotSize: number
  ): { x: number; z: number } {
    const blockMinX = -bounds.halfSpan + this.config.roadWidth + blockX * bounds.spacing;
    const blockMinZ = -bounds.halfSpan + this.config.roadWidth + blockZ * bounds.spacing;

    return {
      x: blockMinX + lotSize / 2 + lotX * lotSize,
      z: blockMinZ + lotSize / 2 + lotZ * lotSize
    };
  }

  private getBlockCenter(bounds: CityBounds, blockX: number, blockZ: number): { x: number; z: number } {
    return {
      x: -bounds.halfSpan + this.config.roadWidth + this.config.blockSize / 2 + blockX * bounds.spacing,
      z: -bounds.halfSpan + this.config.roadWidth + this.config.blockSize / 2 + blockZ * bounds.spacing
    };
  }

  private getHeight(district: DistrictKind, heightBias: number): number {
    const { minHeight, maxHeight } = this.config.building;
    const [districtMinHeight, districtMaxHeight] = this.getDistrictHeightRange(district);
    const districtBoost = district === 'downtown' ? this.random.range(0.7, 1.2) : this.random.range(0.32, 0.95);
    const shapedRandom = Math.pow(this.random.next(), 1.65);
    const rawHeight = minHeight + (maxHeight - minHeight) * shapedRandom * heightBias * districtBoost;

    return Math.min(districtMaxHeight, Math.max(districtMinHeight, rawHeight));
  }

  private getRoofStyle(district: DistrictKind, height: number): RoofStyle {
    if (district === 'industrial' && this.random.chance(0.56)) {
      return 'mechanical';
    }

    if (height > 58 && this.random.chance(0.22)) {
      return 'antenna';
    }

    if (this.random.chance(0.18)) {
      return 'mechanical';
    }

    return 'flat';
  }

  private getDistrictMaxHeight(district: DistrictKind): number {
    return this.getDistrictHeightRange(district)[1];
  }

  private generateDistricts(blocks: readonly BlockPlan[]): DistrictPlan[] {
    return CITY_BLUEPRINT.districtRules.flatMap((rule) => {
      const districtBlocks = blocks.filter((block) => block.district === rule.id);

      if (districtBlocks.length === 0) {
        return [];
      }

      const minX = Math.min(...districtBlocks.map((block) => block.center.x - block.size.x / 2));
      const maxX = Math.max(...districtBlocks.map((block) => block.center.x + block.size.x / 2));
      const minZ = Math.min(...districtBlocks.map((block) => block.center.z - block.size.z / 2));
      const maxZ = Math.max(...districtBlocks.map((block) => block.center.z + block.size.z / 2));
      const center = { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2 };
      const size = { x: maxX - minX, z: maxZ - minZ };

      return [
        {
          id: `district-${rule.id}`,
          kind: 'district',
          ownerDomain: 'blueprint',
          name: rule.name,
          lod: 'lod0',
          boundary: rectanglePolygon(center, size),
          density: rule.densityBand,
          primaryUses: rule.primaryUses,
          heightRangeMeters: rule.heightRangeMeters,
          allowedStreetProfiles: getAllowedStreetProfiles(rule.id),
          district: rule.id
        }
      ];
    });
  }

  private getDistrictHeightRange(district: DistrictKind): readonly [number, number] {
    return CITY_BLUEPRINT.districtRules.find((rule) => rule.id === district)?.heightRangeMeters ?? [
      this.config.building.minHeight,
      this.config.building.maxHeight
    ];
  }

  private getAllowedUses(district: DistrictKind): readonly LandUse[] {
    return CITY_BLUEPRINT.districtRules.find((rule) => rule.id === district)?.primaryUses ?? ['residential'];
  }

  private getFrontageRoadIds(blockX: number, blockZ: number, lotX: number, lotZ: number, split: number): string[] {
    const frontageRoadIds: string[] = [];

    if (lotX === 0) {
      frontageRoadIds.push(`road-v-${blockX}`);
    }
    if (lotX === split - 1) {
      frontageRoadIds.push(`road-v-${blockX + 1}`);
    }
    if (lotZ === 0) {
      frontageRoadIds.push(`road-h-${blockZ}`);
    }
    if (lotZ === split - 1) {
      frontageRoadIds.push(`road-h-${blockZ + 1}`);
    }

    if (frontageRoadIds.length === 0) {
      frontageRoadIds.push(lotX < split / 2 ? `road-v-${blockX}` : `road-v-${blockX + 1}`);
    }

    return frontageRoadIds;
  }

  private getFrontageSide(frontageRoadId: string, blockX: number, blockZ: number): BuildingFrontageSide {
    const verticalMatch = /^road-v-(\d+)$/.exec(frontageRoadId);

    if (verticalMatch) {
      const roadIndex = Number(verticalMatch[1]);
      return roadIndex <= blockX ? 'west' : 'east';
    }

    const horizontalMatch = /^road-h-(\d+)$/.exec(frontageRoadId);

    if (horizontalMatch) {
      const roadIndex = Number(horizontalMatch[1]);
      return roadIndex <= blockZ ? 'south' : 'north';
    }

    return 'west';
  }

  private selectBuildingUses(allowedUses: readonly LandUse[]): LandUse[] {
    if (allowedUses.includes('mixed-use')) {
      return ['mixed-use', allowedUses.find((use) => use !== 'mixed-use' && use !== 'open-space') ?? 'retail'];
    }

    return [allowedUses.find((use) => use !== 'open-space') ?? allowedUses[0] ?? 'residential'];
  }

  private getFloorCount(district: DistrictKind, heightMeters: number): number {
    const floorHeight = district === 'industrial' ? 4.5 : 3.4;
    return Math.max(1, Math.round(heightMeters / floorHeight));
  }

  private getBlockPermeability(district: DistrictKind): BlockPlan['permeability'] {
    if (district === 'industrial') {
      return 'low';
    }

    return district === 'downtown' || district === 'waterfront' ? 'high' : 'medium';
  }
}

function getAllowedStreetProfiles(district: DistrictKind): string[] {
  switch (district) {
    case 'downtown':
      return ['grand-avenue', 'main-street'];
    case 'waterfront':
      return ['waterfront-promenade', 'main-street', 'grand-avenue'];
    case 'industrial':
      return ['service-alley', 'main-street', 'grand-avenue'];
    case 'civic':
      return ['main-street', 'grand-avenue', 'residential-street'];
    case 'residential':
      return ['residential-street', 'main-street'];
  }
}
