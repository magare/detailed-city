import {
  CITY_BLUEPRINT,
  getBlueprintDistrictForNormalizedBlock,
  getBlueprintDistrictHeightMultiplier,
  getBlueprintDistrictRule
} from '../../city/blueprint/cityBlueprint';
import type {
  BlockFrontageClass,
  BlockFrontageContract,
  BlockInternalAccessContract,
  BuildingFrontageSide,
  LandUse
} from '../../city/data-contracts/cityContracts';
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
import { getPolygonBounds, rectanglePolygon } from '../../utils/geometry';
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
        const normalizedBlock = this.getNormalizedBlock(blockX, blockZ);
        const blockId = `block-${blockX}-${blockZ}`;
        const districtId = `district-${district}`;
        const allowedUses = this.getAllowedUses(district);
        const maxHeightMeters = this.getDistrictMaxHeight(district);
        const maxCoverageRatio = 0.82;
        const split = districtConfig.lotSplit + (this.random.chance(districtConfig.density * 0.32) ? 1 : 0);
        const blockCenter = this.getBlockCenter(bounds, blockX, blockZ);
        const blockBoundary = rectanglePolygon(blockCenter, {
          x: this.config.blockSize,
          z: this.config.blockSize
        });
        const blockModel = this.createBlockModel(blockId, district, blockX, blockZ, split, blockCenter);
        const envelopeBounds = getPolygonBounds(blockModel.buildableEnvelope.boundary);
        const lotSize = Math.min(envelopeBounds.maxX - envelopeBounds.minX, envelopeBounds.maxZ - envelopeBounds.minZ) / split;

        const blockPlan: BlockPlan = {
          id: blockId,
          kind: 'block',
          ownerDomain: 'land',
          parentId: districtId,
          lod: 'lod1',
          boundary: blockBoundary,
          districtId,
          administrativeBoundaryIds: [],
          wardId: '',
          neighborhoodId: '',
          permeability: this.getBlockPermeability(district),
          ...blockModel,
          grid: { x: blockX, z: blockZ },
          center: blockCenter,
          size: { x: this.config.blockSize, z: this.config.blockSize },
          district
        };

        blocks.push(blockPlan);

        for (let lotX = 0; lotX < split; lotX += 1) {
          for (let lotZ = 0; lotZ < split; lotZ += 1) {
            if (!this.random.chance(districtConfig.density)) {
              continue;
            }

            const center = this.getLotCenter(envelopeBounds, lotX, lotZ, lotSize);
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
            const heightMeters = this.getHeight(district, districtConfig.heightBias, normalizedBlock);
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
              blockBuildableEnvelopeId: blockPlan.buildableEnvelope.id,
              administrativeBoundaryIds: [],
              wardId: '',
              neighborhoodId: '',
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
    return getBlueprintDistrictForNormalizedBlock(this.getNormalizedBlock(blockX, blockZ));
  }

  private getNormalizedBlock(blockX: number, blockZ: number): { x: number; z: number } {
    const gridMax = Math.max(this.config.gridSize - 1, 1);
    return { x: blockX / gridMax, z: blockZ / gridMax };
  }

  private getLotCenter(
    envelopeBounds: ReturnType<typeof getPolygonBounds>,
    lotX: number,
    lotZ: number,
    lotSize: number
  ): { x: number; z: number } {
    return {
      x: envelopeBounds.minX + lotSize / 2 + lotX * lotSize,
      z: envelopeBounds.minZ + lotSize / 2 + lotZ * lotSize
    };
  }

  private getBlockCenter(bounds: CityBounds, blockX: number, blockZ: number): { x: number; z: number } {
    return {
      x: -bounds.halfSpan + this.config.roadWidth + this.config.blockSize / 2 + blockX * bounds.spacing,
      z: -bounds.halfSpan + this.config.roadWidth + this.config.blockSize / 2 + blockZ * bounds.spacing
    };
  }

  private getHeight(
    district: DistrictKind,
    heightBias: number,
    normalizedBlock: { readonly x: number; readonly z: number }
  ): number {
    const { minHeight, maxHeight } = this.config.building;
    const [districtMinHeight, districtMaxHeight] = this.getDistrictHeightRange(district);
    const districtBoost = district === 'downtown' ? this.random.range(0.7, 1.2) : this.random.range(0.32, 0.95);
    const shapedRandom = Math.pow(this.random.next(), 1.65);
    const gradientMultiplier = getBlueprintDistrictHeightMultiplier(district, normalizedBlock);
    const rawHeight = minHeight + (maxHeight - minHeight) * shapedRandom * heightBias * districtBoost * gradientMultiplier;

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
          useMix: rule.useMix,
          heightRangeMeters: rule.heightRangeMeters,
          densityGradient: rule.densityGradient,
          allowedStreetProfiles: rule.allowedStreetProfiles,
          landmarkTargets: rule.landmarkTargets,
          transitionBuffers: rule.transitionBuffers,
          styleHints: rule.styleHints,
          tags: {
            blueprintDistrictRuleId: rule.id,
            materialPalette: rule.styleHints.materialPalette,
            densityGradientCenterId: rule.densityGradient.centerId
          },
          district: rule.id
        }
      ];
    });
  }

  private getDistrictHeightRange(district: DistrictKind): readonly [number, number] {
    return getBlueprintDistrictRule(district).heightRangeMeters;
  }

  private getAllowedUses(district: DistrictKind): readonly LandUse[] {
    return getBlueprintDistrictRule(district)
      .useMix.filter((mix) => mix.share > 0)
      .sort((left, right) => right.share - left.share)
      .map((mix) => mix.use);
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

  private createBlockModel(
    blockId: string,
    district: DistrictKind,
    blockX: number,
    blockZ: number,
    split: number,
    center: { x: number; z: number }
  ): Pick<
    BlockPlan,
    'buildableEnvelope' | 'frontageClasses' | 'internalAccess' | 'alleys' | 'subdivisionConstraints' | 'permeabilityMetrics'
  > {
    const minSetbackMeters = this.getBlockEnvelopeSetback(district);
    const buildableSize = Math.max(8, this.config.blockSize - minSetbackMeters * 2);
    const alleys = this.createBlockAlleys(blockId, district, blockX, blockZ, split, center, buildableSize);
    const averageParcelFrontageMeters = buildableSize / split;

    return {
      buildableEnvelope: {
        id: `${blockId}-buildable-envelope`,
        boundary: rectanglePolygon(center, { x: buildableSize, z: buildableSize }),
        minSetbackMeters,
        maxCoverageRatio: 0.82,
        parcelFit: district === 'industrial' ? 'large-lot' : split <= 2 ? 'deep-lots' : 'regular-grid'
      },
      frontageClasses: this.createBlockFrontages(district, blockX, blockZ),
      internalAccess: {
        mode: this.getInternalAccessMode(district, split),
        accessIds: alleys.map((alley) => alley.id)
      },
      alleys,
      subdivisionConstraints: {
        preferredLotSplit: split,
        maxParcelCount: split * split,
        minParcelWidthMeters: Math.max(6, averageParcelFrontageMeters * 0.72),
        minParcelDepthMeters: Math.max(6, averageParcelFrontageMeters * 0.72),
        allowLotMerging: district === 'industrial' || district === 'civic'
      },
      permeabilityMetrics: {
        score: this.getBlockPermeabilityScore(district, split, alleys.length),
        throughAccessCount: alleys.length,
        frontageContinuityRatio: district === 'industrial' ? 0.62 : district === 'civic' ? 0.74 : 0.86,
        averageParcelFrontageMeters
      }
    };
  }

  private getBlockEnvelopeSetback(district: DistrictKind): number {
    if (district === 'downtown') {
      return 1.5;
    }
    if (district === 'industrial') {
      return 4;
    }
    if (district === 'civic') {
      return 3;
    }
    return 2.5;
  }

  private createBlockFrontages(district: DistrictKind, blockX: number, blockZ: number): BlockFrontageContract[] {
    return [
      { side: 'west', roadId: `road-v-${blockX}`, frontageClass: this.getFrontageClass(district, 'west'), lengthMeters: this.config.blockSize },
      { side: 'east', roadId: `road-v-${blockX + 1}`, frontageClass: this.getFrontageClass(district, 'east'), lengthMeters: this.config.blockSize },
      { side: 'south', roadId: `road-h-${blockZ}`, frontageClass: this.getFrontageClass(district, 'south'), lengthMeters: this.config.blockSize },
      { side: 'north', roadId: `road-h-${blockZ + 1}`, frontageClass: this.getFrontageClass(district, 'north'), lengthMeters: this.config.blockSize }
    ];
  }

  private getFrontageClass(district: DistrictKind, side: 'west' | 'east' | 'south' | 'north'): BlockFrontageClass {
    if (district === 'waterfront' && side === 'south') {
      return 'waterfront';
    }
    if (district === 'industrial') {
      return side === 'east' || side === 'north' ? 'industrial' : 'service';
    }
    if (district === 'downtown') {
      return side === 'west' || side === 'south' ? 'primary' : 'secondary';
    }
    if (district === 'civic') {
      return side === 'south' ? 'primary' : 'secondary';
    }
    return side === 'west' || side === 'east' ? 'secondary' : 'primary';
  }

  private createBlockAlleys(
    blockId: string,
    district: DistrictKind,
    blockX: number,
    blockZ: number,
    split: number,
    center: { x: number; z: number },
    buildableSize: number
  ): BlockInternalAccessContract[] {
    const mode = this.getInternalAccessMode(district, split);
    if (mode === 'none') {
      return [];
    }

    const half = buildableSize / 2;
    const eastWest: BlockInternalAccessContract = {
      id: `${blockId}-access-east-west`,
      mode,
      connectedRoadIds: [`road-v-${blockX}`, `road-v-${blockX + 1}`],
      widthMeters: mode === 'service-lane' ? 6 : 4,
      centerline: [
        { x: center.x - half, z: center.z },
        { x: center.x + half, z: center.z }
      ]
    };

    if (mode !== 'pedestrian-passage') {
      return [eastWest];
    }

    return [
      eastWest,
      {
        id: `${blockId}-access-north-south`,
        mode,
        connectedRoadIds: [`road-h-${blockZ}`, `road-h-${blockZ + 1}`],
        widthMeters: 4,
        centerline: [
          { x: center.x, z: center.z - half },
          { x: center.x, z: center.z + half }
        ]
      }
    ];
  }

  private getInternalAccessMode(district: DistrictKind, split: number): BlockPlan['internalAccess']['mode'] {
    if (district === 'industrial') {
      return 'service-lane';
    }
    if (district === 'downtown' || district === 'waterfront') {
      return split >= 3 ? 'pedestrian-passage' : 'alley';
    }
    if (split >= 3) {
      return 'alley';
    }
    return 'none';
  }

  private getBlockPermeabilityScore(district: DistrictKind, split: number, throughAccessCount: number): number {
    const base = district === 'industrial' ? 0.32 : district === 'civic' ? 0.58 : 0.64;
    const score = base + throughAccessCount * 0.12 + Math.max(0, split - 2) * 0.04;
    return Number(Math.min(0.95, score).toFixed(2));
  }
}
