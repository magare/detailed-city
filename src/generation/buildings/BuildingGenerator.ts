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
  BuildingTypologyContract,
  BuildingTypologyKind,
  LandUse,
  ParcelFitContract,
  ParcelFrontagePriorityContract,
  ParcelZoningControlsContract,
  ParcelSetbackContract
} from '../../city/data-contracts/cityContracts';
import type {
  BlockPlan,
  BuildingPlan,
  CityBounds,
  CityConfig,
  DistrictKind,
  DistrictPlan,
  Parcel,
  RoofStyle,
  ZoningDistrictPlan
} from '../../types/city';
import { SeededRandom } from '../../utils/random';
import { getPolygonBounds, rectanglePolygon } from '../../utils/geometry';
import { blockKey } from '../terrain/TerrainGenerator';

export interface GeneratedLandAndBuildings {
  districts: DistrictPlan[];
  zoningDistricts: ZoningDistrictPlan[];
  blocks: BlockPlan[];
  parcels: Parcel[];
  buildings: BuildingPlan[];
}

function getPriorityRank(priority: ParcelFrontagePriorityContract['priority']): number {
  if (priority === 'primary') {
    return 0;
  }
  if (priority === 'secondary') {
    return 1;
  }
  return 2;
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
        const zoning = this.createZoningControls(district);
        const allowedUses = zoning.allowedUses;
        const maxHeightMeters = zoning.maxHeightMeters;
        const maxCoverageRatio = zoning.maxCoverageRatio;
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
            const id = `parcel-${blockX}-${blockZ}-${lotX}-${lotZ}`;
            const buildingId = `building-${blockX}-${blockZ}-${lotX}-${lotZ}`;
            const heightMeters = this.getHeight(district, districtConfig.heightBias, normalizedBlock);
            const roofStyle = this.getRoofStyle(district, heightMeters);
            const frontageRoadIds = this.getFrontageRoadIds(blockX, blockZ, lotX, lotZ, split);
            const primaryFrontageRoadId = frontageRoadIds[0];
            const publicEntranceIds = [`${buildingId}-entrance-primary`];
            const buildingUses = this.selectBuildingUses(allowedUses);
            const typology = this.createBuildingTypology(district, buildingUses, roofStyle);
            const parcelModel = this.createParcelModel({
              id,
              district,
              block: blockPlan,
              center,
              size: parcelSize,
              lotX,
              lotZ,
              split,
              frontageRoadIds,
              maxHeightMeters,
              maxCoverageRatio
            });
            const maxFootprintSide = Math.sqrt(maxCoverageRatio) * lotSize;
            const buildingSize = {
              x: Math.min(maxFootprintSide, parcelModel.fit.minBuildableWidthMeters * this.random.range(0.78, 0.96)),
              z: Math.min(maxFootprintSide, parcelModel.fit.minBuildableDepthMeters * this.random.range(0.78, 0.96))
            };

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
              zoningDistrictId: zoning.zoningDistrictId,
              zoning,
              ...parcelModel,
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
              zoningDistrictId: zoning.zoningDistrictId,
              footprint: rectanglePolygon(parcelModel.fit.preferredBuildingCenter, buildingSize),
              uses: buildingUses,
              heightMeters,
              floorCount: this.getFloorCount(heightMeters, typology),
              typology,
              facadeGrammarId: typology.facadeGrammarId,
              roofGrammarId: typology.roofGrammarId,
              primaryFrontageRoadId,
              primaryFrontageSide: this.getFrontageSide(primaryFrontageRoadId, blockX, blockZ),
              entranceIds: publicEntranceIds,
              publicEntranceIds,
              center: parcelModel.fit.preferredBuildingCenter,
              size: buildingSize,
              district,
              roofStyle
            });
          }
        }
      }
    }

    const districts = this.generateDistricts(blocks);

    return {
      districts,
      zoningDistricts: this.generateZoningDistricts(districts, blocks, parcels),
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

  private createZoningControls(district: DistrictKind): ParcelZoningControlsContract {
    const rule = getBlueprintDistrictRule(district);
    const maxFloorAreaRatio = this.getMaxFloorAreaRatio(district);

    return {
      zoningDistrictId: `zoning-district-${district}`,
      zoningCode: this.getZoningCode(district),
      zoningKind: district === 'downtown' || district === 'waterfront' ? 'form-based' : 'base',
      allowedUses: this.getAllowedUses(district),
      maxHeightMeters: this.getDistrictMaxHeight(district),
      maxFloorAreaRatio,
      maxCoverageRatio: 0.82,
      minimumSetbacks: this.getParcelSetbacks(district, 1),
      bufferMeters: this.getZoningBufferMeters(district),
      frontageRules: {
        requiredPriority: 'any',
        activeUsesAllowed: ['downtown', 'waterfront', 'residential'].includes(district),
        activeFrontageRequiredOnPrimary: district === 'downtown' || district === 'waterfront'
      },
      density: {
        densityBand: rule.densityBand,
        targetFloorAreaRatio: maxFloorAreaRatio,
        targetDwellingUnitsPerHectare: district === 'residential' ? 180 : district === 'waterfront' ? 120 : 0,
        targetJobsPerHectare: district === 'downtown' ? 520 : district === 'industrial' ? 180 : district === 'civic' ? 140 : 60
      },
      formRules: {
        massing:
          district === 'downtown'
            ? 'tower'
            : district === 'waterfront'
              ? 'mid-rise'
              : district === 'civic'
                ? 'campus'
                : district === 'industrial'
                  ? 'industrial-shed'
                  : 'neighborhood-block',
        streetWallRequired: district === 'downtown' || district === 'waterfront',
        stepbackAboveMeters: district === 'downtown' ? 48 : district === 'waterfront' ? 32 : undefined
      }
    };
  }

  private generateZoningDistricts(
    districts: readonly DistrictPlan[],
    blocks: readonly BlockPlan[],
    parcels: readonly Parcel[]
  ): ZoningDistrictPlan[] {
    return districts.map((district) => {
      const controls = this.createZoningControls(district.district);

      return {
        id: controls.zoningDistrictId,
        kind: 'zoning-district',
        ownerDomain: 'land',
        parentId: district.id,
        name: `${district.name} Zoning`,
        lod: 'lod0',
        districtId: district.id,
        boundary: district.boundary,
        zoningCode: controls.zoningCode,
        zoningKind: controls.zoningKind,
        controls,
        blockIds: blocks.filter((block) => block.districtId === district.id).map((block) => block.id),
        parcelIds: parcels.filter((parcel) => parcel.districtId === district.id).map((parcel) => parcel.id),
        overlayConstraintIds: []
      };
    });
  }

  private getZoningCode(district: DistrictKind): string {
    if (district === 'downtown') {
      return 'FB-CBD-8';
    }
    if (district === 'waterfront') {
      return 'FB-WF-5';
    }
    if (district === 'industrial') {
      return 'I-MX-2';
    }
    if (district === 'civic') {
      return 'CIV-3';
    }
    return 'N-MX-3';
  }

  private getZoningBufferMeters(district: DistrictKind): number {
    if (district === 'industrial') {
      return 6;
    }
    if (district === 'waterfront') {
      return 5;
    }
    if (district === 'civic') {
      return 3;
    }
    if (district === 'residential') {
      return 2;
    }
    return 0;
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

  private createParcelModel(input: {
    readonly id: string;
    readonly district: DistrictKind;
    readonly block: BlockPlan;
    readonly center: { x: number; z: number };
    readonly size: { x: number; z: number };
    readonly lotX: number;
    readonly lotZ: number;
    readonly split: number;
    readonly frontageRoadIds: readonly string[];
    readonly maxHeightMeters: number;
    readonly maxCoverageRatio: number;
  }): Pick<Parcel, 'setbacks' | 'lotSplit' | 'developmentRights' | 'frontagePriority' | 'parcelConstraintIds' | 'fit'> {
    const setbacks = this.getParcelSetbacks(input.district, input.frontageRoadIds.length);
    const fit = this.createParcelFit(input.id, input.center, input.size, setbacks);
    const maxFloorAreaRatio = this.getMaxFloorAreaRatio(input.district);

    return {
      setbacks,
      lotSplit: {
        splitGrid: [input.split, input.split],
        lotIndex: [input.lotX, input.lotZ],
        isEdgeLot:
          input.lotX === 0 ||
          input.lotZ === 0 ||
          input.lotX === input.split - 1 ||
          input.lotZ === input.split - 1,
        canMerge: input.block.subdivisionConstraints.allowLotMerging || input.frontageRoadIds.length <= 1
      },
      developmentRights: {
        maxFloorAreaRatio,
        maxFloorAreaSqM: Number((input.size.x * input.size.z * maxFloorAreaRatio).toFixed(2)),
        maxCoverageRatio: input.maxCoverageRatio,
        maxHeightMeters: input.maxHeightMeters,
        transferable: input.district === 'downtown' || input.district === 'waterfront',
        status: input.district === 'industrial' ? 'limited' : fit.canFitBuilding ? 'as-of-right' : 'constrained'
      },
      frontagePriority: this.createParcelFrontagePriority(input.block, input.frontageRoadIds),
      parcelConstraintIds: [],
      fit
    };
  }

  private getParcelSetbacks(district: DistrictKind, frontageCount: number): ParcelSetbackContract {
    const frontageBonus = frontageCount > 1 ? 0.5 : 0;

    if (district === 'downtown') {
      return { frontMeters: 1.5, sideMeters: 1, rearMeters: 1.5 };
    }
    if (district === 'industrial') {
      return { frontMeters: 4 + frontageBonus, sideMeters: 3, rearMeters: 4 };
    }
    if (district === 'civic') {
      return { frontMeters: 3 + frontageBonus, sideMeters: 2.5, rearMeters: 3 };
    }
    if (district === 'waterfront') {
      return { frontMeters: 2.5 + frontageBonus, sideMeters: 2, rearMeters: 3 };
    }
    return { frontMeters: 2.5 + frontageBonus, sideMeters: 2, rearMeters: 2.5 };
  }

  private createParcelFit(
    parcelId: string,
    center: { x: number; z: number },
    size: { x: number; z: number },
    setbacks: ParcelSetbackContract
  ): ParcelFitContract {
    const buildableWidth = Math.max(2, size.x - setbacks.sideMeters * 2);
    const buildableDepth = Math.max(2, size.z - setbacks.frontMeters - setbacks.rearMeters);
    const centerOffsetZ = (setbacks.frontMeters - setbacks.rearMeters) / 2;

    return {
      buildableEnvelopeId: `${parcelId}-buildable-envelope`,
      buildableEnvelope: rectanglePolygon({ x: center.x, z: center.z + centerOffsetZ }, { x: buildableWidth, z: buildableDepth }),
      buildableAreaSqM: Number((buildableWidth * buildableDepth).toFixed(2)),
      minBuildableWidthMeters: buildableWidth,
      minBuildableDepthMeters: buildableDepth,
      preferredBuildingCenter: { x: center.x, z: center.z + centerOffsetZ },
      canFitBuilding: buildableWidth >= 4 && buildableDepth >= 4
    };
  }

  private getMaxFloorAreaRatio(district: DistrictKind): number {
    if (district === 'downtown') {
      return 18;
    }
    if (district === 'waterfront') {
      return 12;
    }
    if (district === 'civic') {
      return 8;
    }
    if (district === 'industrial') {
      return 6;
    }
    return 7;
  }

  private createParcelFrontagePriority(
    block: BlockPlan,
    frontageRoadIds: readonly string[]
  ): ParcelFrontagePriorityContract[] {
    return frontageRoadIds
      .map((roadId) => {
        const frontage = block.frontageClasses.find((candidate) => candidate.roadId === roadId);
        const side = frontage?.side ?? this.getBlockSideForRoad(block, roadId);
        const frontageClass = frontage?.frontageClass ?? 'secondary';

        return {
          roadId,
          side,
          frontageClass,
          priority: this.getParcelFrontagePriority(frontageClass)
        };
      })
      .sort((left, right) => getPriorityRank(left.priority) - getPriorityRank(right.priority));
  }

  private getBlockSideForRoad(block: BlockPlan, roadId: string): BuildingFrontageSide {
    return this.getFrontageSide(roadId, block.grid.x, block.grid.z);
  }

  private getParcelFrontagePriority(frontageClass: BlockFrontageClass): ParcelFrontagePriorityContract['priority'] {
    if (frontageClass === 'primary' || frontageClass === 'waterfront') {
      return 'primary';
    }
    if (frontageClass === 'service' || frontageClass === 'industrial') {
      return 'service';
    }
    return 'secondary';
  }

  private selectBuildingUses(allowedUses: readonly LandUse[]): LandUse[] {
    if (allowedUses.includes('mixed-use')) {
      return ['mixed-use', allowedUses.find((use) => use !== 'mixed-use' && use !== 'open-space') ?? 'retail'];
    }

    return [allowedUses.find((use) => use !== 'open-space') ?? allowedUses[0] ?? 'residential'];
  }

  private createBuildingTypology(
    district: DistrictKind,
    uses: readonly LandUse[],
    roofStyle: RoofStyle
  ): BuildingTypologyContract {
    const primaryUse = uses[0] ?? 'residential';
    const kind = this.getBuildingTypologyKind(district, uses);
    const typicalFloorHeightMeters = this.getTypologyFloorHeight(kind);
    const entranceStrategy = this.getTypologyEntranceStrategy(kind);

    return {
      typologyId: `building-typology-${kind}`,
      kind,
      primaryUse,
      defaultUses: [...uses],
      heightRangeMeters: this.getTypologyHeightRange(kind, district),
      typicalFloorHeightMeters,
      facadeGrammarId: this.getTypologyFacadeGrammarId(kind, district),
      roofGrammarId: this.getTypologyRoofGrammarId(kind, roofStyle),
      entranceStrategy,
      serviceAccess: this.getTypologyServiceAccess(kind),
      scheduleProfileId: `schedule:${kind}:baseline`
    };
  }

  private getBuildingTypologyKind(district: DistrictKind, uses: readonly LandUse[]): BuildingTypologyKind {
    if (uses.includes('mixed-use')) {
      return 'mixed-use';
    }
    if (uses.includes('hospitality')) {
      return 'hospitality';
    }
    if (uses.includes('retail')) {
      return 'retail';
    }
    if (uses.includes('office')) {
      return 'office';
    }
    if (uses.includes('civic') || uses.includes('education')) {
      return 'civic';
    }
    if (uses.includes('utility')) {
      return 'utility';
    }
    if (uses.includes('industrial')) {
      return district === 'industrial' ? 'industrial' : 'warehouse';
    }
    if (uses.includes('residential')) {
      return 'residential';
    }
    return 'special-use';
  }

  private getTypologyHeightRange(kind: BuildingTypologyKind, district: DistrictKind): readonly [number, number] {
    const districtRange = this.getDistrictHeightRange(district);
    const typologyRange: Record<BuildingTypologyKind, readonly [number, number]> = {
      residential: [8, 42],
      office: [18, 92],
      civic: [8, 48],
      industrial: [7, 28],
      'mixed-use': [12, 72],
      retail: [5, 24],
      hospitality: [12, 58],
      warehouse: [7, 24],
      utility: [4, 22],
      'special-use': [6, 50]
    };
    const [typologyMin, typologyMax] = typologyRange[kind];

    return [Math.min(districtRange[0], typologyMin), Math.max(districtRange[1], typologyMax)];
  }

  private getTypologyFloorHeight(kind: BuildingTypologyKind): number {
    if (kind === 'industrial' || kind === 'warehouse' || kind === 'utility') {
      return 4.5;
    }
    if (kind === 'retail' || kind === 'hospitality' || kind === 'civic') {
      return 3.8;
    }
    if (kind === 'office' || kind === 'mixed-use') {
      return 3.6;
    }
    return 3.2;
  }

  private getTypologyFacadeGrammarId(kind: BuildingTypologyKind, district: DistrictKind): string {
    if (kind === 'mixed-use' || kind === 'retail' || kind === 'hospitality') {
      return `${district}-active-frontage-facade-v1`;
    }
    if (kind === 'industrial' || kind === 'warehouse') {
      return 'industrial-large-bay-facade-v1';
    }
    if (kind === 'civic') {
      return 'civic-formal-facade-v1';
    }
    return `${district}-facade-v1`;
  }

  private getTypologyRoofGrammarId(kind: BuildingTypologyKind, roofStyle: RoofStyle): string {
    if (kind === 'industrial' || kind === 'warehouse') {
      return 'mechanical-sawtooth-roof-v1';
    }
    if (kind === 'civic') {
      return 'civic-cornice-roof-v1';
    }
    return `${roofStyle}-roof-v1`;
  }

  private getTypologyEntranceStrategy(kind: BuildingTypologyKind): BuildingTypologyContract['entranceStrategy'] {
    if (kind === 'mixed-use' || kind === 'retail' || kind === 'hospitality') {
      return 'storefront';
    }
    if (kind === 'industrial' || kind === 'warehouse') {
      return 'service-yard';
    }
    if (kind === 'civic') {
      return 'campus-entry';
    }
    if (kind === 'utility') {
      return 'utility-access';
    }
    return 'public-lobby';
  }

  private getTypologyServiceAccess(kind: BuildingTypologyKind): BuildingTypologyContract['serviceAccess'] {
    if (kind === 'industrial' || kind === 'warehouse') {
      return 'yard-loading';
    }
    if (kind === 'mixed-use' || kind === 'retail' || kind === 'hospitality') {
      return 'curb-loading';
    }
    if (kind === 'utility') {
      return 'utility-only';
    }
    if (kind === 'civic') {
      return 'public-service';
    }
    return 'internal-service';
  }

  private getFloorCount(heightMeters: number, typology: BuildingTypologyContract): number {
    return Math.max(1, Math.round(heightMeters / typology.typicalFloorHeightMeters));
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
