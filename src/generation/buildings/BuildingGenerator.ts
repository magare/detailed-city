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
  BuildingFacadeGrammarContract,
  BuildingFacadeMaterialZone,
  BuildingFacadeRhythm,
  BuildingFacadeSideContract,
  BuildingFootprintGrammarContract,
  BuildingFootprintGrammarKind,
  BuildingFrontageSide,
  BuildingRoofDetailContract,
  BuildingRoofGrammarContract,
  BuildingRoofStyleKind,
  BuildingStructureShellContract,
  BuildingStructuralSystemKind,
  BuildingTypologyContract,
  BuildingTypologyKind,
  LandUse,
  ParcelFitContract,
  ParcelFrontagePriorityContract,
  ParcelZoningControlsContract,
  ParcelSetbackContract,
  Point2D,
  Polygon2D
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

function clampPointToEnvelope(
  point: Point2D,
  envelopeBounds: ReturnType<typeof getPolygonBounds>,
  size: { readonly x: number; readonly z: number }
): Point2D {
  const halfX = size.x / 2;
  const halfZ = size.z / 2;

  return {
    x: Math.min(envelopeBounds.maxX - halfX, Math.max(envelopeBounds.minX + halfX, point.x)),
    z: Math.min(envelopeBounds.maxZ - halfZ, Math.max(envelopeBounds.minZ + halfZ, point.z))
  };
}

function createCourtyardFootprint(
  center: Point2D,
  size: { readonly x: number; readonly z: number },
  courtyardSize: { readonly x: number; readonly z: number }
): Polygon2D {
  const halfX = size.x / 2;
  const halfZ = size.z / 2;
  const courtHalfX = courtyardSize.x / 2;
  const courtHalfZ = courtyardSize.z / 2;

  return [
    { x: center.x - halfX, z: center.z - halfZ },
    { x: center.x + halfX, z: center.z - halfZ },
    { x: center.x + halfX, z: center.z + halfZ },
    { x: center.x + courtHalfX, z: center.z + halfZ },
    { x: center.x + courtHalfX, z: center.z - courtHalfZ },
    { x: center.x - courtHalfX, z: center.z - courtHalfZ },
    { x: center.x - courtHalfX, z: center.z + halfZ },
    { x: center.x - halfX, z: center.z + halfZ }
  ];
}

function getPolygonArea(polygon: Polygon2D): number {
  if (polygon.length < 3) {
    return 0;
  }

  let area = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index];
    const next = polygon[(index + 1) % polygon.length];
    area += current.x * next.z - next.x * current.z;
  }

  return Math.abs(area) / 2;
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
            const footprintPlan = this.createBuildingFootprintPlan({
              buildingId,
              district,
              typology,
              parcelCenter: center,
              parcelSize,
              parcelFit: parcelModel.fit,
              parcelSetbacks: parcelModel.setbacks,
              parcelConstraintIds: parcelModel.parcelConstraintIds,
              frontagePriority: parcelModel.frontagePriority,
              maxCoverageRatio,
              heightMeters
            });
            const floorCount = this.getFloorCount(heightMeters, typology);
            const primaryFrontageSide = this.getFrontageSide(primaryFrontageRoadId, blockX, blockZ);
            const structureShell = this.createBuildingStructureShell({
              buildingId,
              typology,
              footprintGrammar: footprintPlan.grammar,
              footprint: footprintPlan.footprint,
              heightMeters,
              floorCount
            });
            const facadeGrammar = this.createBuildingFacadeGrammar({
              buildingId,
              district,
              typology,
              footprintGrammar: footprintPlan.grammar,
              structureShell,
              size: footprintPlan.size,
              primaryFrontageRoadId,
              primaryFrontageSide
            });
            const roofGrammar = this.createBuildingRoofGrammar({
              buildingId,
              district,
              typology,
              structureShell,
              center: footprintPlan.center,
              roofStyle,
              maxHeightMeters
            });

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
              cadastreRecordId: `cadastre-record-${id}`,
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
              footprint: footprintPlan.footprint,
              uses: buildingUses,
              heightMeters,
              floorCount,
              typology,
              footprintGrammar: footprintPlan.grammar,
              structureShell,
              facadeGrammar,
              facadeGrammarId: typology.facadeGrammarId,
              roofGrammar,
              roofGrammarId: typology.roofGrammarId,
              primaryFrontageRoadId,
              primaryFrontageSide,
              entranceIds: publicEntranceIds,
              publicEntranceIds,
              center: footprintPlan.center,
              size: footprintPlan.size,
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

  private createBuildingStructureShell(input: {
    readonly buildingId: string;
    readonly typology: BuildingTypologyContract;
    readonly footprintGrammar: BuildingFootprintGrammarContract;
    readonly footprint: Polygon2D;
    readonly heightMeters: number;
    readonly floorCount: number;
  }): BuildingStructureShellContract {
    const structuralSystem = this.getStructuralSystem(input.typology, input.footprintGrammar);
    const gridMaterial = this.getStructuralGridMaterial(structuralSystem);
    const typicalFloorHeightMeters = Number((input.heightMeters / input.floorCount).toFixed(2));
    const gridFootprintBounds = getPolygonBounds(input.footprintGrammar.tower?.footprint ?? input.footprint);
    const gridFootprintSize = {
      x: gridFootprintBounds.maxX - gridFootprintBounds.minX,
      z: gridFootprintBounds.maxZ - gridFootprintBounds.minZ
    };
    const podiumFloorCount = input.footprintGrammar.podium
      ? Math.min(input.floorCount, Math.max(1, Math.round(input.footprintGrammar.podium.heightMeters / typicalFloorHeightMeters)))
      : 0;
    const towerFloorCount = input.footprintGrammar.tower ? Math.max(0, input.floorCount - podiumFloorCount) : 0;
    const gridBaySpacing = this.getStructuralBaySpacing(structuralSystem, input.footprintGrammar);
    const core = this.createBuildingCore(input.buildingId, input.typology, input.footprintGrammar, input.footprint, input.floorCount);
    const transferLevels =
      input.footprintGrammar.tower && podiumFloorCount < input.floorCount ? [podiumFloorCount + 1] : [];
    const floorPlates = Array.from({ length: input.floorCount }, (_, index) => {
      const level = index + 1;
      const footprint =
        input.footprintGrammar.tower && level > podiumFloorCount
          ? input.footprintGrammar.tower.footprint
          : input.footprint;
      const areaSqM = Number(getPolygonArea(footprint).toFixed(2));

      return {
        level,
        elevationMeters: Number((index * typicalFloorHeightMeters).toFixed(2)),
        floorHeightMeters: typicalFloorHeightMeters,
        footprint,
        areaSqM,
        use: input.typology.defaultUses[Math.min(index, input.typology.defaultUses.length - 1)] ?? input.typology.primaryUse,
        structuralGridId: `${input.buildingId}-structural-grid`,
        isTransferLevel: transferLevels.includes(level),
        isMechanicalLevel: input.floorCount > 8 && level === input.floorCount
      };
    });

    return {
      grammarId: `${input.buildingId}-structure-shell`,
      structuralSystem,
      massing: {
        totalHeightMeters: Number(input.heightMeters.toFixed(2)),
        floorCount: input.floorCount,
        typicalFloorHeightMeters,
        podiumFloorCount,
        towerFloorCount,
        roofElevationMeters: Number(input.heightMeters.toFixed(2))
      },
      core,
      structuralGrid: {
        gridId: `${input.buildingId}-structural-grid`,
        baySpacingMeters: gridBaySpacing,
        columnLineCount: {
          x: Math.max(2, Math.ceil(gridFootprintSize.x / gridBaySpacing.x) + 1),
          z: Math.max(2, Math.ceil(gridFootprintSize.z / gridBaySpacing.z) + 1)
        },
        primarySpanMeters: Number(Math.max(gridBaySpacing.x, gridBaySpacing.z).toFixed(2)),
        material: gridMaterial
      },
      floorPlates,
      transferLevels,
      loadBearingAssumptions: {
        gravitySystem: this.getGravitySystem(structuralSystem),
        lateralSystem: this.getLateralSystem(structuralSystem),
        foundationHint: this.getFoundationHint(input.typology, input.footprintGrammar),
        liveLoadKpa: this.getLiveLoadKpa(input.typology),
        longSpan: structuralSystem === 'long-span-steel'
      }
    };
  }

  private getStructuralSystem(
    typology: BuildingTypologyContract,
    footprintGrammar: BuildingFootprintGrammarContract
  ): BuildingStructuralSystemKind {
    if (footprintGrammar.kind === 'tower-on-podium') {
      return 'concrete-core-outrigger';
    }
    if (typology.kind === 'industrial' || typology.kind === 'warehouse') {
      return 'long-span-steel';
    }
    if (typology.kind === 'civic') {
      return 'civic-frame';
    }
    if (typology.kind === 'residential' && footprintGrammar.kind === 'bar') {
      return 'load-bearing-wall';
    }
    if (typology.kind === 'office' || typology.kind === 'mixed-use') {
      return 'steel-frame';
    }
    return 'reinforced-concrete-frame';
  }

  private getStructuralGridMaterial(
    structuralSystem: BuildingStructuralSystemKind
  ): BuildingStructureShellContract['structuralGrid']['material'] {
    if (structuralSystem === 'load-bearing-wall') {
      return 'masonry';
    }
    if (structuralSystem === 'steel-frame' || structuralSystem === 'long-span-steel') {
      return 'steel';
    }
    if (structuralSystem === 'concrete-core-outrigger') {
      return 'hybrid';
    }
    return 'concrete';
  }

  private getStructuralBaySpacing(
    structuralSystem: BuildingStructuralSystemKind,
    footprintGrammar: BuildingFootprintGrammarContract
  ): { readonly x: number; readonly z: number } {
    if (structuralSystem === 'long-span-steel') {
      return { x: 9, z: 12 };
    }
    if (structuralSystem === 'concrete-core-outrigger') {
      return { x: 8.4, z: 8.4 };
    }
    if (structuralSystem === 'load-bearing-wall') {
      return { x: 5.4, z: 6 };
    }
    if (footprintGrammar.kind === 'civic-block') {
      return { x: 8, z: 9 };
    }
    return { x: 7.2, z: 7.2 };
  }

  private createBuildingCore(
    buildingId: string,
    typology: BuildingTypologyContract,
    footprintGrammar: BuildingFootprintGrammarContract,
    footprint: Polygon2D,
    floorCount: number
  ): BuildingStructureShellContract['core'] {
    const bounds = getPolygonBounds(footprintGrammar.tower?.footprint ?? footprint);
    const width = bounds.maxX - bounds.minX;
    const depth = bounds.maxZ - bounds.minZ;
    const coreKind = this.getCoreKind(typology, footprintGrammar);
    const coreSize = {
      x: Number(Math.max(0.8, Math.min(width * 0.28, coreKind === 'service-core' ? 5.5 : 7.5)).toFixed(2)),
      z: Number(Math.max(0.8, Math.min(depth * 0.28, coreKind === 'service-core' ? 5.5 : 7.5)).toFixed(2))
    };
    const coreCenter =
      coreKind === 'side-core'
        ? {
            x: Number((bounds.minX + coreSize.x / 2 + Math.max(0.6, width * 0.08)).toFixed(2)),
            z: Number(((bounds.minZ + bounds.maxZ) / 2).toFixed(2))
          }
        : {
            x: Number(((bounds.minX + bounds.maxX) / 2).toFixed(2)),
            z: Number(((bounds.minZ + bounds.maxZ) / 2).toFixed(2))
          };
    const elevatorBankCount = Math.max(
      coreKind === 'service-core' ? 0 : 1,
      Math.min(6, Math.ceil(floorCount / (coreKind === 'dual-core' ? 12 : 16)))
    );

    return {
      coreId: `${buildingId}-core`,
      kind: coreKind,
      footprint: rectanglePolygon(coreCenter, coreSize),
      areaSqM: Number((coreSize.x * coreSize.z).toFixed(2)),
      servesLevels: [1, floorCount],
      egressStairCount: coreKind === 'distributed-core' || coreKind === 'dual-core' ? 2 : 1,
      elevatorBankCount
    };
  }

  private getCoreKind(
    typology: BuildingTypologyContract,
    footprintGrammar: BuildingFootprintGrammarContract
  ): BuildingStructureShellContract['core']['kind'] {
    if (typology.kind === 'industrial' || typology.kind === 'warehouse') {
      return 'service-core';
    }
    if (footprintGrammar.kind === 'courtyard') {
      return 'side-core';
    }
    if (footprintGrammar.kind === 'civic-block') {
      return 'distributed-core';
    }
    if (footprintGrammar.kind === 'tower-on-podium' && footprintGrammar.tower) {
      return 'dual-core';
    }
    return 'single-core';
  }

  private getGravitySystem(structuralSystem: BuildingStructuralSystemKind): string {
    if (structuralSystem === 'load-bearing-wall') {
      return 'bearing walls and precast slabs';
    }
    if (structuralSystem === 'long-span-steel') {
      return 'steel portal frames and metal deck';
    }
    if (structuralSystem === 'concrete-core-outrigger') {
      return 'composite columns, slabs, and outrigger levels';
    }
    return 'regular column grid and flat slabs';
  }

  private getLateralSystem(structuralSystem: BuildingStructuralSystemKind): string {
    if (structuralSystem === 'concrete-core-outrigger') {
      return 'reinforced core with outrigger transfer';
    }
    if (structuralSystem === 'long-span-steel') {
      return 'braced steel bays';
    }
    if (structuralSystem === 'load-bearing-wall') {
      return 'bearing wall shear panels';
    }
    return 'moment frame with shear walls';
  }

  private getFoundationHint(
    typology: BuildingTypologyContract,
    footprintGrammar: BuildingFootprintGrammarContract
  ): string {
    if (footprintGrammar.hazardConstrained || footprintGrammar.waterfrontSetbackApplied) {
      return 'deep piles with waterproofed podium edge';
    }
    if (typology.kind === 'industrial' || typology.kind === 'warehouse') {
      return 'spread footings with slab-on-grade';
    }
    if (footprintGrammar.kind === 'tower-on-podium') {
      return 'mat foundation with core thickening';
    }
    return 'shallow spread footings';
  }

  private getLiveLoadKpa(typology: BuildingTypologyContract): number {
    if (typology.kind === 'industrial' || typology.kind === 'warehouse') {
      return 7.5;
    }
    if (typology.kind === 'retail' || typology.kind === 'hospitality') {
      return 4.8;
    }
    if (typology.kind === 'civic') {
      return 5;
    }
    return 3.2;
  }

  private createBuildingRoofGrammar(input: {
    readonly buildingId: string;
    readonly district: DistrictKind;
    readonly typology: BuildingTypologyContract;
    readonly structureShell: BuildingStructureShellContract;
    readonly center: Point2D;
    readonly roofStyle: RoofStyle;
    readonly maxHeightMeters: number;
  }): BuildingRoofGrammarContract {
    const roofPlate = input.structureShell.floorPlates[input.structureShell.floorPlates.length - 1];
    const roofFootprint = roofPlate?.footprint ?? input.structureShell.core.footprint;
    const roofBounds = getPolygonBounds(roofFootprint);
    const roofSize = {
      x: Number((roofBounds.maxX - roofBounds.minX).toFixed(2)),
      z: Number((roofBounds.maxZ - roofBounds.minZ).toFixed(2))
    };
    const roofCenter = {
      x: Number(((roofBounds.minX + roofBounds.maxX) / 2).toFixed(2)),
      z: Number(((roofBounds.minZ + roofBounds.maxZ) / 2).toFixed(2))
    };
    const roofCenterOffset = {
      x: roofCenter.x - input.center.x,
      z: roofCenter.z - input.center.z
    };
    const roofAreaSqM = Number(getPolygonArea(roofFootprint).toFixed(2));
    const roofElevationMeters = input.structureShell.massing.roofElevationMeters;
    const details: BuildingRoofDetailContract[] = [];
    const addDetail = (
      suffix: string,
      detailKind: BuildingRoofDetailContract['detailKind'],
      offset: Point2D,
      sizeMeters: BuildingRoofDetailContract['sizeMeters'],
      materialZone: BuildingRoofDetailContract['materialZone'],
      heightExempt: boolean
    ): BuildingRoofDetailContract => {
      const fittedSize = {
        x: Number(Math.max(0.45, Math.min(sizeMeters.x, roofSize.x - 0.7)).toFixed(2)),
        y: sizeMeters.y,
        z: Number(Math.max(0.45, Math.min(sizeMeters.z, roofSize.z - 0.7)).toFixed(2))
      };
      const safeOffset = this.clampRoofOffset(offset, roofSize, fittedSize);
      const detail = {
        detailId: `${input.buildingId}-${suffix}`,
        detailKind,
        centerOffsetMeters: {
          x: Number((roofCenterOffset.x + safeOffset.x).toFixed(2)),
          z: Number((roofCenterOffset.z + safeOffset.z).toFixed(2))
        },
        sizeMeters: {
          x: fittedSize.x,
          y: Number(fittedSize.y.toFixed(2)),
          z: fittedSize.z
        },
        baseElevationMeters: Number(roofElevationMeters.toFixed(2)),
        topElevationMeters: Number((roofElevationMeters + fittedSize.y).toFixed(2)),
        assetBindingId: 'binding:building:roof-detail',
        materialZone,
        heightExempt
      };
      details.push(detail);
      return detail;
    };

    const access = addDetail(
      'roof-access-0',
      'roof-access',
      { x: -roofSize.x * 0.28, z: roofSize.z * 0.24 },
      { x: Math.min(3.2, Math.max(1.8, roofSize.x * 0.14)), y: 2.4, z: Math.min(3.2, Math.max(1.8, roofSize.z * 0.14)) },
      'roof',
      true
    );
    const roofStyle = this.getRoofGrammarStyle(input.typology, input.roofStyle);
    const mechanicalEligible =
      input.roofStyle === 'mechanical' ||
      input.typology.kind === 'industrial' ||
      input.typology.kind === 'warehouse' ||
      input.typology.kind === 'office' ||
      input.typology.kind === 'mixed-use' ||
      input.structureShell.massing.totalHeightMeters > 24;
    const solarEligible = roofAreaSqM >= 32 && input.typology.kind !== 'civic';
    const greenEligible =
      roofAreaSqM >= 36 &&
      (input.roofStyle === 'green' ||
        input.district === 'waterfront' ||
        input.district === 'residential' ||
        input.typology.kind === 'hospitality');
    const terraceEligible =
      roofAreaSqM >= 36 &&
      input.structureShell.massing.floorCount >= 3 &&
      (input.typology.kind === 'residential' || input.typology.kind === 'mixed-use' || input.typology.kind === 'hospitality');
    const antennaEligible = input.roofStyle === 'antenna' || input.structureShell.massing.totalHeightMeters > 58;

    if (mechanicalEligible) {
      addDetail(
        'roof-mechanical-0',
        'mechanical-screen',
        { x: roofSize.x * 0.24, z: -roofSize.z * 0.22 },
        { x: Math.min(6.8, Math.max(2.8, roofSize.x * 0.26)), y: 1.6, z: Math.min(5.4, Math.max(2.2, roofSize.z * 0.22)) },
        'metal',
        true
      );
    }

    const solarDetail = solarEligible
      ? addDetail(
          'roof-solar-0',
          'solar-array',
          { x: roofSize.x * 0.12, z: roofSize.z * 0.18 },
          { x: Math.min(roofSize.x * 0.52, 9.6), y: 0.16, z: Math.min(roofSize.z * 0.32, 5.2) },
          'solar',
          false
        )
      : undefined;
    const greenDetail = greenEligible
      ? addDetail(
          'roof-green-0',
          'green-roof',
          { x: -roofSize.x * 0.1, z: -roofSize.z * 0.08 },
          { x: Math.min(roofSize.x * 0.58, 10.5), y: 0.12, z: Math.min(roofSize.z * 0.42, 7.4) },
          'green-roof',
          false
        )
      : undefined;

    if (terraceEligible) {
      addDetail(
        'roof-terrace-0',
        'terrace',
        { x: 0, z: roofSize.z * 0.3 },
        { x: Math.min(roofSize.x * 0.48, 8.2), y: 0.12, z: Math.min(roofSize.z * 0.24, 4.4) },
        'terrace',
        false
      );
    }

    if (antennaEligible) {
      addDetail(
        'roof-antenna-0',
        'antenna',
        { x: roofSize.x * 0.32, z: roofSize.z * 0.3 },
        { x: 0.5, y: Math.min(10.5, Math.max(6, input.structureShell.massing.totalHeightMeters * 0.12)), z: 0.5 },
        'metal',
        true
      );
    }

    const heightExemptions: BuildingRoofGrammarContract['heightExemptions'] = details
      .filter((detail) => detail.heightExempt)
      .map((detail) => ({
        detailId: detail.detailId,
        allowed: detail.topElevationMeters <= input.maxHeightMeters + 12,
        reason:
          detail.detailKind === 'antenna'
            ? 'antenna'
            : detail.detailKind === 'mechanical-screen'
              ? 'mechanical-screen'
              : 'access-bulkhead',
        exemptHeightMeters: Number((detail.topElevationMeters - roofElevationMeters).toFixed(2)),
        zoningLimitMeters: Number(input.maxHeightMeters.toFixed(2))
      }));
    const solarArrayArea = solarDetail ? Number((solarDetail.sizeMeters.x * solarDetail.sizeMeters.z).toFixed(2)) : 0;
    const greenArea = greenDetail ? Number((greenDetail.sizeMeters.x * greenDetail.sizeMeters.z).toFixed(2)) : 0;

    return {
      grammarId: `${input.buildingId}-roof-grammar`,
      templateId: input.typology.roofGrammarId,
      sourceStructureShellId: input.structureShell.grammarId,
      roofStyle,
      roofPlane: {
        footprint: roofFootprint,
        areaSqM: roofAreaSqM,
        elevationMeters: Number(roofElevationMeters.toFixed(2)),
        usableAreaSqM: Number(Math.max(0, roofAreaSqM - details.reduce((sum, detail) => sum + detail.sizeMeters.x * detail.sizeMeters.z, 0)).toFixed(2)),
        parapetHeightMeters: input.typology.kind === 'industrial' || input.typology.kind === 'warehouse' ? 0.65 : 0.9,
        drainageSlopePercent: input.typology.kind === 'industrial' || input.typology.kind === 'warehouse' ? 1.5 : 2
      },
      details,
      solar: {
        panelCount: solarDetail ? Math.max(2, Math.floor(solarArrayArea / 1.8)) : 0,
        arrayAreaSqM: solarArrayArea,
        tiltDegrees: solarDetail ? 12 : 0,
        azimuthDegrees: 180,
        detailIds: solarDetail ? [solarDetail.detailId] : []
      },
      greenRoof: {
        enabled: Boolean(greenDetail),
        coverageRatio: Number((greenArea / Math.max(1, roofAreaSqM)).toFixed(4)),
        areaSqM: greenArea,
        soilDepthMeters: greenDetail ? 0.18 : 0,
        detailId: greenDetail?.detailId
      },
      roofAccess: {
        hasStairBulkhead: true,
        hasMaintenancePath: details.some((detail) => detail.detailKind === 'mechanical-screen' || detail.detailKind === 'solar-array'),
        accessDetailIds: [access.detailId]
      },
      heightExemptions
    };
  }

  private getRoofGrammarStyle(typology: BuildingTypologyContract, roofStyle: RoofStyle): BuildingRoofStyleKind {
    if (typology.kind === 'industrial' || typology.kind === 'warehouse') {
      return 'sawtooth';
    }
    if (typology.kind === 'civic') {
      return 'civic-cornice';
    }
    if (typology.kind === 'hospitality' || typology.kind === 'residential') {
      return roofStyle === 'flat' ? 'terrace' : roofStyle;
    }
    return roofStyle;
  }

  private clampRoofOffset(
    offset: Point2D,
    roofSize: { readonly x: number; readonly z: number },
    detailSize: { readonly x: number; readonly z: number }
  ): Point2D {
    const limitX = Math.max(0, roofSize.x / 2 - detailSize.x / 2 - 0.25);
    const limitZ = Math.max(0, roofSize.z / 2 - detailSize.z / 2 - 0.25);

    return {
      x: Number(Math.min(limitX, Math.max(-limitX, offset.x)).toFixed(2)),
      z: Number(Math.min(limitZ, Math.max(-limitZ, offset.z)).toFixed(2))
    };
  }

  private createBuildingFacadeGrammar(input: {
    readonly buildingId: string;
    readonly district: DistrictKind;
    readonly typology: BuildingTypologyContract;
    readonly footprintGrammar: BuildingFootprintGrammarContract;
    readonly structureShell: BuildingStructureShellContract;
    readonly size: { readonly x: number; readonly z: number };
    readonly primaryFrontageRoadId: string;
    readonly primaryFrontageSide: BuildingFrontageSide;
  }): BuildingFacadeGrammarContract {
    const rhythm = this.getFacadeRhythm(input.district, input.typology, input.footprintGrammar);
    const baySpacingMeters = this.getFacadeBaySpacing(input.typology, input.structureShell);
    const expressedFloorLevels = input.structureShell.floorPlates
      .filter((floorPlate) => floorPlate.level === 1 || floorPlate.level === input.structureShell.massing.floorCount || floorPlate.level % 2 === 0)
      .map((floorPlate) => floorPlate.level);
    const atlasSlots = this.getFacadeAtlasSlots(input.typology, rhythm);
    const materialZones = this.getFacadeMaterialZones(input.district, input.typology, rhythm);
    const sides: BuildingFacadeSideContract[] = (['north', 'east', 'south', 'west'] as const).map((side) => {
      const sideWidthMeters = side === 'north' || side === 'south' ? input.size.x : input.size.z;
      const bayCount = Math.max(1, Math.round(sideWidthMeters / baySpacingMeters));
      const hasStorefront = side === input.primaryFrontageSide && this.hasStorefrontFacade(input.typology);

      return {
        side,
        widthMeters: Number(sideWidthMeters.toFixed(2)),
        heightMeters: input.structureShell.massing.totalHeightMeters,
        bayCount,
        baySpacingMeters: Number((sideWidthMeters / bayCount).toFixed(2)),
        floorLevels: expressedFloorLevels,
        windowModule: {
          widthMeters: Number(Math.min(2.6, Math.max(0.8, (sideWidthMeters / bayCount) * 0.52)).toFixed(2)),
          heightMeters: this.getFacadeWindowHeight(input.typology),
          sillHeightMeters: input.typology.kind === 'industrial' || input.typology.kind === 'warehouse' ? 1.4 : 0.92,
          transparencyRatio: this.getFacadeTransparencyRatio(input.typology, input.district)
        },
        balconyModule: {
          enabled: this.hasBalconyFacade(input.typology, input.district),
          startLevel: Math.min(input.structureShell.massing.floorCount, input.typology.kind === 'hospitality' ? 3 : 2),
          everyNFloors: input.typology.kind === 'residential' ? 2 : 3,
          widthMeters: Number(Math.min(3.2, Math.max(1.4, (sideWidthMeters / bayCount) * 0.72)).toFixed(2)),
          depthMeters: input.district === 'waterfront' ? 1.05 : 0.72
        },
        storefrontModule: {
          enabled: hasStorefront,
          roadId: hasStorefront ? input.primaryFrontageRoadId : undefined,
          bayCount: hasStorefront ? Math.max(1, Math.min(6, bayCount)) : 0,
          signAtlasSlot: hasStorefront ? atlasSlots.storefrontSign : undefined,
          awningAtlasSlot: hasStorefront ? atlasSlots.awning : undefined
        },
        materialZones,
        renderLod: side === input.primaryFrontageSide || hasStorefront ? 'lod3' : 'lod2'
      };
    });

    return {
      grammarId: `${input.buildingId}-facade-grammar`,
      templateId: input.typology.facadeGrammarId,
      sourceStructureShellId: input.structureShell.grammarId,
      rhythm,
      floorGrid: {
        floorCount: input.structureShell.massing.floorCount,
        typicalFloorHeightMeters: input.structureShell.massing.typicalFloorHeightMeters,
        expressedFloorLevels
      },
      baySpacingMeters,
      sides,
      materialPaletteId: `${input.district}-${rhythm}-facade-palette`,
      atlasSlots
    };
  }

  private getFacadeRhythm(
    district: DistrictKind,
    typology: BuildingTypologyContract,
    footprintGrammar: BuildingFootprintGrammarContract
  ): BuildingFacadeRhythm {
    if (typology.kind === 'industrial' || typology.kind === 'warehouse') {
      return 'industrial-large-bay';
    }
    if (typology.kind === 'civic' || footprintGrammar.kind === 'civic-block') {
      return 'civic-formal';
    }
    if (footprintGrammar.kind === 'tower-on-podium') {
      return 'tower-grid';
    }
    if (district === 'waterfront') {
      return 'mid-rise-waterfront';
    }
    if (typology.kind === 'mixed-use' || typology.kind === 'retail' || typology.kind === 'hospitality') {
      return 'fine-grain';
    }
    return 'residential-regular';
  }

  private getFacadeBaySpacing(
    typology: BuildingTypologyContract,
    shell: BuildingStructureShellContract
  ): number {
    if (typology.kind === 'industrial' || typology.kind === 'warehouse') {
      return Number(Math.max(shell.structuralGrid.baySpacingMeters.x, shell.structuralGrid.baySpacingMeters.z).toFixed(2));
    }
    if (typology.kind === 'civic') {
      return 4.8;
    }
    if (typology.kind === 'mixed-use' || typology.kind === 'retail' || typology.kind === 'hospitality') {
      return 3.6;
    }
    return 3.2;
  }

  private getFacadeAtlasSlots(
    typology: BuildingTypologyContract,
    rhythm: BuildingFacadeRhythm
  ): BuildingFacadeGrammarContract['atlasSlots'] {
    const wall = rhythm === 'industrial-large-bay' ? 'facade-wall-metal-panel-a' : rhythm === 'civic-formal' ? 'facade-wall-stone-a' : 'facade-wall-neutral-a';

    return {
      wall,
      window: typology.kind === 'industrial' || typology.kind === 'warehouse' ? 'facade-window-strip-a' : 'facade-window-punched-a',
      frame: rhythm === 'tower-grid' ? 'facade-frame-metal-a' : 'facade-frame-concrete-a',
      balcony: this.hasBalconyFacade(typology, rhythm === 'mid-rise-waterfront' ? 'waterfront' : 'residential') ? 'facade-balcony-rail-a' : undefined,
      storefrontSign: this.hasStorefrontFacade(typology) ? 'facade-storefront-sign-a' : undefined,
      awning: this.hasStorefrontFacade(typology) ? 'facade-awning-a' : undefined
    };
  }

  private getFacadeMaterialZones(
    district: DistrictKind,
    typology: BuildingTypologyContract,
    rhythm: BuildingFacadeRhythm
  ): BuildingFacadeMaterialZone[] {
    if (rhythm === 'industrial-large-bay') {
      return ['metal-panel', 'glass'];
    }
    if (rhythm === 'civic-formal') {
      return ['stone', 'concrete', 'glass'];
    }
    if (district === 'waterfront') {
      return ['glass', 'plaster', 'balcony-rail', 'storefront-glass'];
    }
    if (typology.kind === 'mixed-use' || typology.kind === 'retail' || typology.kind === 'hospitality') {
      return ['brick', 'glass', 'storefront-glass'];
    }
    return ['plaster', 'glass', 'balcony-rail'];
  }

  private getFacadeWindowHeight(typology: BuildingTypologyContract): number {
    if (typology.kind === 'industrial' || typology.kind === 'warehouse') {
      return 1.4;
    }
    if (typology.kind === 'retail' || typology.kind === 'hospitality') {
      return 2.1;
    }
    return 1.55;
  }

  private getFacadeTransparencyRatio(typology: BuildingTypologyContract, district: DistrictKind): number {
    if (typology.kind === 'industrial' || typology.kind === 'warehouse') {
      return 0.22;
    }
    if (typology.kind === 'civic') {
      return 0.38;
    }
    if (typology.kind === 'mixed-use' || typology.kind === 'retail' || typology.kind === 'hospitality') {
      return 0.58;
    }
    return district === 'waterfront' ? 0.46 : 0.34;
  }

  private hasStorefrontFacade(typology: BuildingTypologyContract): boolean {
    return typology.kind === 'mixed-use' || typology.kind === 'retail' || typology.kind === 'hospitality';
  }

  private hasBalconyFacade(typology: BuildingTypologyContract, district: DistrictKind): boolean {
    return typology.kind === 'residential' || typology.kind === 'hospitality' || district === 'waterfront';
  }

  private createBuildingFootprintPlan(input: {
    readonly buildingId: string;
    readonly district: DistrictKind;
    readonly typology: BuildingTypologyContract;
    readonly parcelCenter: Point2D;
    readonly parcelSize: { readonly x: number; readonly z: number };
    readonly parcelFit: ParcelFitContract;
    readonly parcelSetbacks: ParcelSetbackContract;
    readonly parcelConstraintIds: readonly string[];
    readonly frontagePriority: readonly ParcelFrontagePriorityContract[];
    readonly maxCoverageRatio: number;
    readonly heightMeters: number;
  }): {
    readonly center: Point2D;
    readonly size: { readonly x: number; readonly z: number };
    readonly footprint: Polygon2D;
    readonly grammar: BuildingFootprintGrammarContract;
  } {
    const kind = this.getFootprintGrammarKind(input.district, input.typology, input.heightMeters);
    const envelopeBounds = getPolygonBounds(input.parcelFit.buildableEnvelope);
    const envelopeSize = {
      x: envelopeBounds.maxX - envelopeBounds.minX,
      z: envelopeBounds.maxZ - envelopeBounds.minZ
    };
    const waterfrontSetbackApplied = input.frontagePriority.some((frontage) => frontage.frontageClass === 'waterfront');
    const hazardConstrained = input.parcelConstraintIds.some((constraintId) => constraintId.includes('hazard'));
    const coverageScale = this.getFootprintCoverageScale(kind, input.district, hazardConstrained);
    const maxFootprintSide = Math.sqrt(input.maxCoverageRatio * coverageScale) * Math.min(input.parcelSize.x, input.parcelSize.z);
    const widthJitter = this.random.range(0.78, 0.96);
    const depthJitter = this.random.range(0.78, 0.96);
    const size = {
      x: Math.min(envelopeSize.x, maxFootprintSide, envelopeSize.x * this.getFootprintWidthRatio(kind) * widthJitter),
      z: Math.min(envelopeSize.z, maxFootprintSide, envelopeSize.z * this.getFootprintDepthRatio(kind) * depthJitter)
    };
    const offset = this.getFootprintOffset(kind, envelopeSize, size, input.frontagePriority, waterfrontSetbackApplied);
    const center = clampPointToEnvelope(
      {
        x: input.parcelFit.preferredBuildingCenter.x + offset.x,
        z: input.parcelFit.preferredBuildingCenter.z + offset.z
      },
      envelopeBounds,
      size
    );
    const baseFootprint = rectanglePolygon(center, size);
    const courtyard =
      kind === 'courtyard'
        ? {
            center,
            sizeMeters: {
              x: Number((size.x * 0.34).toFixed(2)),
              z: Number((size.z * 0.34).toFixed(2))
            },
            openToSky: true
          }
        : undefined;
    const podium =
      kind === 'podium' || kind === 'tower-on-podium'
        ? {
            footprint: baseFootprint,
            heightMeters: Number(Math.min(input.heightMeters, kind === 'tower-on-podium' ? 18 : 12).toFixed(2))
          }
        : undefined;
    const tower =
      kind === 'tower-on-podium'
        ? {
            footprint: rectanglePolygon(center, {
              x: Number((size.x * 0.58).toFixed(2)),
              z: Number((size.z * 0.58).toFixed(2))
            }),
            floorPlateAreaSqM: Number((size.x * size.z * 0.58 * 0.58).toFixed(2)),
            stepbackMeters: Number((Math.min(size.x, size.z) * 0.12).toFixed(2))
          }
        : undefined;
    const footprint = kind === 'courtyard' ? createCourtyardFootprint(center, size, courtyard!.sizeMeters) : baseFootprint;
    const footprintAreaSqM = Number(getPolygonArea(footprint).toFixed(2));
    const parcelAreaSqM = input.parcelSize.x * input.parcelSize.z;
    const envelopeAreaSqM = envelopeSize.x * envelopeSize.z;

    return {
      center,
      size,
      footprint,
      grammar: {
        grammarId: `${input.buildingId}-footprint-grammar`,
        kind,
        parcelFitEnvelopeId: input.parcelFit.buildableEnvelopeId,
        buildableEnvelope: input.parcelFit.buildableEnvelope,
        footprintAreaSqM,
        groundCoverageRatio: Number((footprintAreaSqM / parcelAreaSqM).toFixed(4)),
        envelopeCoverageRatio: Number((footprintAreaSqM / envelopeAreaSqM).toFixed(4)),
        placementOffsetMeters: {
          x: Number((center.x - input.parcelFit.preferredBuildingCenter.x).toFixed(2)),
          z: Number((center.z - input.parcelFit.preferredBuildingCenter.z).toFixed(2))
        },
        setbacks: {
          ...input.parcelSetbacks,
          waterfrontMeters: waterfrontSetbackApplied ? Number((input.parcelSetbacks.frontMeters + 2.5).toFixed(2)) : undefined
        },
        podium,
        tower,
        courtyard,
        constraintIds: [...input.parcelConstraintIds],
        waterfrontSetbackApplied,
        hazardConstrained
      }
    };
  }

  private getFootprintGrammarKind(
    district: DistrictKind,
    typology: BuildingTypologyContract,
    heightMeters: number
  ): BuildingFootprintGrammarKind {
    if (typology.kind === 'industrial' || typology.kind === 'warehouse') {
      return 'warehouse-shed';
    }
    if (typology.kind === 'civic') {
      return 'civic-block';
    }
    if ((district === 'downtown' || district === 'waterfront') && heightMeters >= 42) {
      return 'tower-on-podium';
    }
    if (district === 'downtown' || district === 'waterfront') {
      return 'podium';
    }
    if (district === 'residential' && heightMeters >= 18) {
      return 'courtyard';
    }
    return 'bar';
  }

  private getFootprintCoverageScale(
    kind: BuildingFootprintGrammarKind,
    district: DistrictKind,
    hazardConstrained: boolean
  ): number {
    const base =
      kind === 'tower-on-podium'
        ? 0.68
        : kind === 'courtyard'
          ? 0.72
          : kind === 'warehouse-shed'
            ? 0.9
            : kind === 'civic-block'
              ? 0.76
              : district === 'downtown'
                ? 0.82
                : 0.74;

    return hazardConstrained ? base * 0.86 : base;
  }

  private getFootprintWidthRatio(kind: BuildingFootprintGrammarKind): number {
    if (kind === 'tower-on-podium') {
      return 0.74;
    }
    if (kind === 'warehouse-shed') {
      return 0.92;
    }
    if (kind === 'bar') {
      return 0.68;
    }
    return 0.82;
  }

  private getFootprintDepthRatio(kind: BuildingFootprintGrammarKind): number {
    if (kind === 'tower-on-podium') {
      return 0.74;
    }
    if (kind === 'warehouse-shed') {
      return 0.86;
    }
    if (kind === 'bar') {
      return 0.52;
    }
    return 0.78;
  }

  private getFootprintOffset(
    kind: BuildingFootprintGrammarKind,
    envelopeSize: { readonly x: number; readonly z: number },
    footprintSize: { readonly x: number; readonly z: number },
    frontagePriority: readonly ParcelFrontagePriorityContract[],
    waterfrontSetbackApplied: boolean
  ): Point2D {
    const offsetRoom = {
      x: Math.max(0, (envelopeSize.x - footprintSize.x) / 2),
      z: Math.max(0, (envelopeSize.z - footprintSize.z) / 2)
    };
    const primarySide = frontagePriority.find((frontage) => frontage.priority === 'primary')?.side ?? frontagePriority[0]?.side;
    const frontBias = kind === 'tower-on-podium' || kind === 'podium' ? 0.46 : kind === 'bar' ? 0.34 : 0.24;
    let offset: Point2D = { x: 0, z: 0 };

    if (primarySide === 'west') {
      offset = { x: -offsetRoom.x * frontBias, z: 0 };
    } else if (primarySide === 'east') {
      offset = { x: offsetRoom.x * frontBias, z: 0 };
    } else if (primarySide === 'south') {
      offset = { x: 0, z: -offsetRoom.z * frontBias };
    } else if (primarySide === 'north') {
      offset = { x: 0, z: offsetRoom.z * frontBias };
    }

    if (waterfrontSetbackApplied) {
      offset = { x: offset.x, z: offset.z + offsetRoom.z * 0.32 };
    }

    return {
      x: Number(offset.x.toFixed(2)),
      z: Number(offset.z.toFixed(2))
    };
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
