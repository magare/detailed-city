import type { RenderConfig } from '../config/renderConfig';
import { cityConfig as defaultCityConfig } from '../config/cityConfig';
import { createConfigDiagnostics, type ConfigDiagnostics } from '../config/configSchema';
import { CITY_BLUEPRINT } from '../city/blueprint/cityBlueprint';
import {
  createMasterPlanDiagnostics,
  type MasterPlanDiagnostics
} from '../city/blueprint/master-plan/masterPlan';
import type { CityObjectIndex, SourceType } from '../city/data-contracts/cityContracts';
import { createGeneratedRuntimeObjectIndex } from '../city/data-contracts/generatedCityObjectIndex';
import { createGeneratedCityObjectGroupIndex } from '../city/data-contracts/generatedCityObjectGroups';
import {
  createCityObjectGroupDiagnostics,
  type CityObjectGroupDiagnostics,
  type CityObjectGroupIndex
} from '../city/data-contracts/cityObjectGroups';
import {
  createCityObjectRegistryDiagnostics,
  type CityObjectRegistryDiagnostics
} from '../city/data-contracts/cityObjectRegistry';
import { createCityLodPolicyDiagnostics, type CityLodPolicyDiagnostics } from '../city/data-contracts/lodPolicy';
import {
  createCitySceneLayerDiagnostics,
  type CitySceneLayerDiagnostics
} from '../city/rendering-handoff/scene-layers/sceneLayerDefinitions';
import { createCityOverlayDatasets, type CityOverlayDataset } from '../city/rendering-handoff/overlays/overlayData';
import {
  createCityPickingMetadataCatalog,
  type CityPickingCatalog
} from '../city/rendering-handoff/picking/pickingMetadata';
import {
  createAssetBindingDiagnostics,
  type AssetBindingDiagnostics
} from '../city/rendering-handoff/asset-binding/assetBindingDiagnostics';
import {
  createCityImportExportDiagnostics,
  type CityImportExportDiagnostics
} from '../city/data-contracts/import-export';
import { validateTrafficPlan } from '../city/data-contracts/validation/validateTrafficPlan';
import {
  createStaticPerformanceDiagnostics,
  type StaticPerformanceDiagnostics
} from '../systems/performance/PerformanceMonitor';
import type { CityConfig, GeneratedCity, GeneratedRuntimeCityObject, TrafficPlan } from '../types/city';

export interface CityDiagnostics {
  readonly schemaVersion: string;
  readonly config: ConfigDiagnostics;
  readonly masterPlan: MasterPlanDiagnostics;
  readonly administrativeBoundaries: AdministrativeBoundaryDiagnostics;
  readonly blockModel: BlockModelDiagnostics;
  readonly parcelModel: ParcelModelDiagnostics;
  readonly zoningModel: ZoningModelDiagnostics;
  readonly roadNetwork: RoadNetworkDiagnostics;
  readonly laneRestrictions: LaneRestrictionDiagnostics;
  readonly intersectionBehavior: IntersectionBehaviorDiagnostics;
  readonly crossingDetails: CrossingDetailDiagnostics;
  readonly waterwayNetwork: WaterwayNetworkDiagnostics;
  readonly waterfrontModel: WaterfrontModelDiagnostics;
  readonly hazardLayer: HazardLayerDiagnostics;
  readonly districtCharacter: DistrictCharacterDiagnostics;
  readonly cityMetrics: CityMetricDiagnostics;
  readonly constraintLayer: ConstraintLayerDiagnostics;
  readonly resilienceGoals: ResilienceGoalDiagnostics;
  readonly validation: GeneratedCity['validation'];
  readonly validationIssueFocus: {
    readonly issuesWithFocus: number;
    readonly issuesWithAffectedBoundary: number;
    readonly issuesWithSuggestedFix: number;
  };
  readonly trafficValidation: GeneratedCity['validation'];
  readonly objectIndex: CityObjectIndex<GeneratedRuntimeCityObject>;
  readonly objectGroupIndex: CityObjectGroupIndex<GeneratedRuntimeCityObject>;
  readonly objectGroups: CityObjectGroupDiagnostics;
  readonly objectRegistry: CityObjectRegistryDiagnostics;
  readonly geospatial: GeneratedCity['geospatial'];
  readonly sourceMetadata: {
    readonly objectsWithMetadata: number;
    readonly objectsMissingMetadata: number;
    readonly objectsRequiringReview: number;
    readonly sourceTypes: Readonly<Record<SourceType, number>>;
  };
  readonly assetCatalog: GeneratedCity['assetCatalog'];
  readonly assetBindings: GeneratedCity['assetBindings'];
  readonly assetBindingDiagnostics: AssetBindingDiagnostics;
  readonly importExport: CityImportExportDiagnostics;
  readonly sceneLayers: readonly CitySceneLayerDiagnostics[];
  readonly overlays: readonly CityOverlayDataset[];
  readonly picking: CityPickingCatalog;
  readonly performance: StaticPerformanceDiagnostics;
  readonly lodPolicy: GeneratedCity['lodPolicy'];
  readonly lodCoverage: CityLodPolicyDiagnostics;
  readonly objectCounts: {
    readonly sceneLayers: number;
    readonly overlayDatasets: number;
    readonly overlayFeatures: number;
    readonly pickableObjects: number;
    readonly assetDefinitions: number;
    readonly renderBindings: number;
    readonly masterPlanCenters: number;
    readonly masterPlanProtectedOpenSpaces: number;
    readonly masterPlanGrowthBoundaries: number;
    readonly administrativeBoundaries: number;
    readonly wards: number;
    readonly neighborhoods: number;
    readonly blocksWithInternalAccess: number;
    readonly blockAlleys: number;
    readonly blockFrontages: number;
    readonly blockBuildableEnvelopes: number;
    readonly parcelBuildableEnvelopes: number;
    readonly parcelsWithConstraints: number;
    readonly primaryFrontageParcels: number;
    readonly zoningDistricts: number;
    readonly zoningFormBasedDistricts: number;
    readonly parcelsWithZoning: number;
    readonly roadHierarchyKinds: number;
    readonly namedRoadCorridors: number;
    readonly transitEligibleRoads: number;
    readonly busOnlyLanes: number;
    readonly reversibleLanes: number;
    readonly turnPocketLanes: number;
    readonly laneContinuityGroups: number;
    readonly signalizedIntersections: number;
    readonly raisedJunctions: number;
    readonly intersectionConflictPoints: number;
    readonly waterwayEdgeSegments: number;
    readonly waterwayChannels: number;
    readonly waterwayCrossings: number;
    readonly waterwayCulverts: number;
    readonly waterwayDocks: number;
    readonly waterwayOutfalls: number;
    readonly waterfrontEdges: number;
    readonly waterfrontPublicAccessEdges: number;
    readonly waterfrontFloodProtectionEdges: number;
    readonly waterfrontPiers: number;
    readonly hazardZones: number;
    readonly criticalHazards: number;
    readonly noBuildHazards: number;
    readonly mitigationHazards: number;
    readonly districtUseMixRules: number;
    readonly districtLandmarkTargets: number;
    readonly districtTransitionBuffers: number;
    readonly districtStylePalettes: number;
    readonly cityMetrics: number;
    readonly constraints: number;
    readonly resilienceGoals: number;
    readonly districts: number;
    readonly verticalSlices: number;
    readonly blocks: number;
    readonly roads: number;
    readonly intersections: number;
    readonly crossings: number;
    readonly midblockCrossings: number;
    readonly raisedCrossings: number;
    readonly tactileCrossings: number;
    readonly crossingRefugeIslands: number;
    readonly crossingSignalPhases: number;
    readonly curbZones: number;
    readonly sidewalkGraphNodes: number;
    readonly sidewalkGraphEdges: number;
    readonly lanes: number;
    readonly sidewalks: number;
    readonly parcels: number;
    readonly buildings: number;
    readonly activeFrontages: number;
    readonly parks: number;
    readonly waterways: number;
    readonly trees: number;
    readonly parkTrees: number;
    readonly streetTrees: number;
    readonly streetLights: number;
    readonly streetFurniture: number;
    readonly laneMarkings: number;
    readonly trafficVehicles: number;
    readonly indexedObjects: number;
    readonly objectGroups: number;
    readonly emptyObjectGroups: number;
    readonly duplicateObjectIds: number;
    readonly registeredObjectKinds: number;
  };
  readonly performanceBudget: GeneratedCity['performanceBudget'];
  readonly quality: {
    readonly maxPixelRatio: number;
    readonly shadows: boolean;
  };
}

export interface DistrictCharacterDiagnostics {
  readonly districtRules: number;
  readonly useMixRules: number;
  readonly landmarkTargets: number;
  readonly transitionBuffers: number;
  readonly stylePalettes: readonly string[];
  readonly allowedStreetProfiles: readonly string[];
}

export interface AdministrativeBoundaryDiagnostics {
  readonly total: number;
  readonly byKind: Readonly<Record<string, number>>;
  readonly wards: number;
  readonly neighborhoods: number;
  readonly serviceAreas: number;
  readonly ownershipZones: number;
  readonly jurisdictionOverlays: number;
  readonly blocksWithBoundaryMembership: number;
  readonly parcelsWithBoundaryMembership: number;
}

export interface BlockModelDiagnostics {
  readonly total: number;
  readonly buildableEnvelopes: number;
  readonly blocksWithInternalAccess: number;
  readonly alleys: number;
  readonly frontageClasses: number;
  readonly permeability: Readonly<Record<string, number>>;
  readonly averagePermeabilityScore: number;
}

export interface ParcelModelDiagnostics {
  readonly total: number;
  readonly buildableEnvelopes: number;
  readonly parcelsWithConstraints: number;
  readonly primaryFrontageParcels: number;
  readonly averageBuildableAreaSqM: number;
  readonly developmentStatuses: Readonly<Record<string, number>>;
}

export interface ZoningModelDiagnostics {
  readonly total: number;
  readonly formBasedDistricts: number;
  readonly parcelsWithZoning: number;
  readonly allowedUseRules: number;
  readonly maxHeightMeters: number;
  readonly maxFloorAreaRatio: number;
  readonly frontageRuleCounts: Readonly<Record<string, number>>;
  readonly zoningCodes: readonly string[];
}

export interface RoadNetworkDiagnostics {
  readonly total: number;
  readonly byHierarchy: Readonly<Record<string, number>>;
  readonly byProfile: Readonly<Record<string, number>>;
  readonly namedCorridors: readonly string[];
  readonly hierarchyKinds: number;
  readonly transitEligibleRoads: number;
  readonly averageDesignSpeedKph: number;
  readonly totalRightOfWayMeters: number;
}

export interface LaneRestrictionDiagnostics {
  readonly total: number;
  readonly byRole: Readonly<Record<string, number>>;
  readonly busOnlyLanes: number;
  readonly reversibleLanes: number;
  readonly turnPocketLanes: number;
  readonly freightRestrictedLanes: number;
  readonly continuityGroups: number;
}

export interface IntersectionBehaviorDiagnostics {
  readonly total: number;
  readonly byControlType: Readonly<Record<string, number>>;
  readonly signalized: number;
  readonly stopControlled: number;
  readonly yieldControlled: number;
  readonly raisedJunctions: number;
  readonly conflictPoints: number;
  readonly turnConstraints: number;
  readonly averageCornerRadiusMeters: number;
}

export interface CrossingDetailDiagnostics {
  readonly total: number;
  readonly byLocation: Readonly<Record<string, number>>;
  readonly byType: Readonly<Record<string, number>>;
  readonly byPriority: Readonly<Record<string, number>>;
  readonly midblockCrossings: number;
  readonly raisedCrossings: number;
  readonly tactileCrossings: number;
  readonly refugeIslandCrossings: number;
  readonly signalPhases: number;
}

export interface WaterwayNetworkDiagnostics {
  readonly total: number;
  readonly edgeSegments: number;
  readonly continuousEdgeWaterways: number;
  readonly channels: number;
  readonly crossings: number;
  readonly bridges: number;
  readonly culverts: number;
  readonly docks: number;
  readonly outfalls: number;
  readonly navigableChannels: number;
}

export interface WaterfrontModelDiagnostics {
  readonly total: number;
  readonly byKind: Readonly<Record<string, number>>;
  readonly publicAccessEdges: number;
  readonly connectedPublicRealmEdges: number;
  readonly connectedRoadEdges: number;
  readonly floodProtectionEdges: number;
  readonly piers: number;
  readonly materialHints: readonly string[];
}

export interface HazardLayerDiagnostics {
  readonly total: number;
  readonly byKind: Readonly<Record<string, number>>;
  readonly bySeverity: Readonly<Record<string, number>>;
  readonly criticalHazards: number;
  readonly noBuildHazards: number;
  readonly mitigationRequiredHazards: number;
  readonly relatedWaterwayHazards: number;
  readonly relatedZoningHazards: number;
  readonly mitigationKinds: readonly string[];
}

export interface ConstraintLayerDiagnostics {
  readonly total: number;
  readonly byKind: Readonly<Record<string, number>>;
  readonly noBuildRules: number;
  readonly clearanceRules: number;
  readonly prohibitedObjectKinds: readonly string[];
}

export interface CityMetricDiagnostics {
  readonly total: number;
  readonly byKind: Readonly<Record<string, number>>;
  readonly passing: number;
  readonly warnings: number;
  readonly failing: number;
  readonly scoreAverage: number;
  readonly valuesByKind: Readonly<Record<string, number>>;
}

export interface ResilienceGoalDiagnostics {
  readonly total: number;
  readonly byKind: Readonly<Record<string, number>>;
  readonly criticalGoals: number;
  readonly shelterCandidates: number;
  readonly evacuationRouteRoads: readonly string[];
  readonly continuityTargets: readonly string[];
  readonly recoveryPriorities: readonly string[];
}

export function createCityDiagnostics(
  city: GeneratedCity,
  traffic: TrafficPlan,
  renderConfig: RenderConfig,
  activeCityConfig: CityConfig = defaultCityConfig
): CityDiagnostics {
  const objectIndex = createGeneratedRuntimeObjectIndex(city, traffic);
  const trafficValidation = validateTrafficPlan({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections,
    assetBindings: city.assetBindings,
    traffic,
    lodPolicy: city.lodPolicy
  });
  const objectGroupIndex = createGeneratedCityObjectGroupIndex(city, traffic, objectIndex, [
    ...city.validation.issues,
    ...trafficValidation.issues
  ]);
  const objectGroups = createCityObjectGroupDiagnostics(objectGroupIndex);
  const masterPlan = createMasterPlanDiagnostics(CITY_BLUEPRINT.masterPlan);
  const administrativeBoundaries = createAdministrativeBoundaryDiagnostics(city);
  const blockModel = createBlockModelDiagnostics(city);
  const parcelModel = createParcelModelDiagnostics(city);
  const zoningModel = createZoningModelDiagnostics(city);
  const roadNetwork = createRoadNetworkDiagnostics(city);
  const laneRestrictions = createLaneRestrictionDiagnostics(city);
  const intersectionBehavior = createIntersectionBehaviorDiagnostics(city);
  const crossingDetails = createCrossingDetailDiagnostics(city);
  const waterwayNetwork = createWaterwayNetworkDiagnostics(city);
  const waterfrontModel = createWaterfrontModelDiagnostics(city);
  const hazardLayer = createHazardLayerDiagnostics(city);
  const districtCharacter = createDistrictCharacterDiagnostics();
  const cityMetrics = createCityMetricDiagnostics(city);
  const constraintLayer = createConstraintLayerDiagnostics(city);
  const resilienceGoals = createResilienceGoalDiagnostics(city);
  const sceneLayers = createCitySceneLayerDiagnostics(city, traffic);
  const overlays = createCityOverlayDatasets(city, objectIndex);
  const picking = createCityPickingMetadataCatalog(city, traffic, objectIndex);
  const performance = createStaticPerformanceDiagnostics(city.performanceBudget, traffic.vehicles.length);
  const objectRegistry = createCityObjectRegistryDiagnostics();
  const sourceMetadata = createSourceMetadataDiagnostics(objectIndex);
  const lodCoverage = createCityLodPolicyDiagnostics(city.lodPolicy, objectIndex.objects);
  const assetBindingDiagnostics = createAssetBindingDiagnostics(city.assetCatalog, city.assetBindings);
  const config = createConfigDiagnostics(activeCityConfig, renderConfig);
  const importExport = createCityImportExportDiagnostics(city, {
    seed: activeCityConfig.seed,
    config: activeCityConfig
  });

  return {
    schemaVersion: city.schemaVersion,
    config,
    masterPlan,
    administrativeBoundaries,
    blockModel,
    parcelModel,
    zoningModel,
    roadNetwork,
    laneRestrictions,
    intersectionBehavior,
    crossingDetails,
    waterwayNetwork,
    waterfrontModel,
    hazardLayer,
    districtCharacter,
    cityMetrics,
    constraintLayer,
    resilienceGoals,
    validation: city.validation,
    validationIssueFocus: createValidationIssueFocusDiagnostics(city.validation.issues),
    trafficValidation,
    objectIndex,
    objectGroupIndex,
    objectGroups,
    objectRegistry,
    geospatial: city.geospatial,
    sourceMetadata,
    assetCatalog: city.assetCatalog,
    assetBindings: city.assetBindings,
    assetBindingDiagnostics,
    importExport,
    sceneLayers,
    overlays,
    picking,
    performance,
    lodPolicy: city.lodPolicy,
    lodCoverage,
    objectCounts: {
      sceneLayers: sceneLayers.length,
      overlayDatasets: overlays.length,
      overlayFeatures: overlays.reduce((sum, overlay) => sum + overlay.featureCount, 0),
      pickableObjects: picking.pickableObjects.length,
      assetDefinitions: city.assetCatalog.length,
      renderBindings: city.assetBindings.length,
      masterPlanCenters: masterPlan.centers.total,
      masterPlanProtectedOpenSpaces: masterPlan.protectedOpenSpaces.total,
      masterPlanGrowthBoundaries: masterPlan.growthBoundaries.total,
      administrativeBoundaries: city.administrativeBoundaries.length,
      wards: city.administrativeBoundaries.filter((boundary) => boundary.boundaryKind === 'ward').length,
      neighborhoods: city.administrativeBoundaries.filter((boundary) => boundary.boundaryKind === 'neighborhood').length,
      blocksWithInternalAccess: blockModel.blocksWithInternalAccess,
      blockAlleys: blockModel.alleys,
      blockFrontages: blockModel.frontageClasses,
      blockBuildableEnvelopes: blockModel.buildableEnvelopes,
      parcelBuildableEnvelopes: parcelModel.buildableEnvelopes,
      parcelsWithConstraints: parcelModel.parcelsWithConstraints,
      primaryFrontageParcels: parcelModel.primaryFrontageParcels,
      zoningDistricts: zoningModel.total,
      zoningFormBasedDistricts: zoningModel.formBasedDistricts,
      parcelsWithZoning: zoningModel.parcelsWithZoning,
      roadHierarchyKinds: roadNetwork.hierarchyKinds,
      namedRoadCorridors: roadNetwork.namedCorridors.length,
      transitEligibleRoads: roadNetwork.transitEligibleRoads,
      busOnlyLanes: laneRestrictions.busOnlyLanes,
      reversibleLanes: laneRestrictions.reversibleLanes,
      turnPocketLanes: laneRestrictions.turnPocketLanes,
      laneContinuityGroups: laneRestrictions.continuityGroups,
      signalizedIntersections: intersectionBehavior.signalized,
      raisedJunctions: intersectionBehavior.raisedJunctions,
      intersectionConflictPoints: intersectionBehavior.conflictPoints,
      waterwayEdgeSegments: waterwayNetwork.edgeSegments,
      waterwayChannels: waterwayNetwork.channels,
      waterwayCrossings: waterwayNetwork.crossings,
      waterwayCulverts: waterwayNetwork.culverts,
      waterwayDocks: waterwayNetwork.docks,
      waterwayOutfalls: waterwayNetwork.outfalls,
      waterfrontEdges: waterfrontModel.total,
      waterfrontPublicAccessEdges: waterfrontModel.publicAccessEdges,
      waterfrontFloodProtectionEdges: waterfrontModel.floodProtectionEdges,
      waterfrontPiers: waterfrontModel.piers,
      hazardZones: hazardLayer.total,
      criticalHazards: hazardLayer.criticalHazards,
      noBuildHazards: hazardLayer.noBuildHazards,
      mitigationHazards: hazardLayer.mitigationRequiredHazards,
      districtUseMixRules: districtCharacter.useMixRules,
      districtLandmarkTargets: districtCharacter.landmarkTargets,
      districtTransitionBuffers: districtCharacter.transitionBuffers,
      districtStylePalettes: districtCharacter.stylePalettes.length,
      cityMetrics: city.cityMetrics.length,
      constraints: city.constraints.length,
      resilienceGoals: city.resilienceGoals.length,
      districts: city.districts.length,
      verticalSlices: city.verticalSlices.length,
      blocks: city.blocks.length,
      roads: city.roads.length,
      intersections: city.intersections.length,
      crossings: city.crossings.length,
      midblockCrossings: crossingDetails.midblockCrossings,
      raisedCrossings: crossingDetails.raisedCrossings,
      tactileCrossings: crossingDetails.tactileCrossings,
      crossingRefugeIslands: crossingDetails.refugeIslandCrossings,
      crossingSignalPhases: crossingDetails.signalPhases,
      curbZones: city.curbZones.length,
      sidewalkGraphNodes: city.sidewalkGraph.nodes.length,
      sidewalkGraphEdges: city.sidewalkGraph.edges.length,
      lanes: objectIndex.countsByKind.lane ?? 0,
      sidewalks: objectIndex.countsByKind.sidewalk ?? 0,
      parcels: city.parcels.length,
      buildings: city.buildings.length,
      activeFrontages: city.activeFrontages.length,
      parks: city.parks.length,
      waterways: city.waterways.length,
      trees: city.trees.length,
      parkTrees: city.trees.filter((tree) => tree.plantingContext === 'park').length,
      streetTrees: city.trees.filter((tree) => tree.plantingContext === 'street').length,
      streetLights: city.streetLights.length,
      streetFurniture: city.streetFurniture.length,
      laneMarkings: objectIndex.countsByKind['lane-marking'] ?? 0,
      trafficVehicles: objectIndex.countsByKind['traffic-vehicle'] ?? 0,
      indexedObjects: objectIndex.objectIds.length,
      objectGroups: objectGroups.groupCount,
      emptyObjectGroups: objectGroups.emptyGroupCount,
      duplicateObjectIds: objectIndex.duplicateIds.length,
      registeredObjectKinds: objectRegistry.registeredKinds
    },
    performanceBudget: city.performanceBudget,
    quality: {
      maxPixelRatio: renderConfig.maxPixelRatio,
      shadows: renderConfig.shadows
    }
  };
}

function createValidationIssueFocusDiagnostics(
  issues: GeneratedCity['validation']['issues']
): CityDiagnostics['validationIssueFocus'] {
  return {
    issuesWithFocus: issues.filter((issue) => issue.affectedPoint || issue.affectedBoundary).length,
    issuesWithAffectedBoundary: issues.filter((issue) => issue.affectedBoundary).length,
    issuesWithSuggestedFix: issues.filter((issue) => issue.suggestedFix).length
  };
}

function createDistrictCharacterDiagnostics(): DistrictCharacterDiagnostics {
  const stylePalettes = new Set<string>();
  const allowedStreetProfiles = new Set<string>();
  let useMixRules = 0;
  let landmarkTargets = 0;
  let transitionBuffers = 0;

  for (const rule of CITY_BLUEPRINT.districtRules) {
    useMixRules += rule.useMix.length;
    landmarkTargets += rule.landmarkTargets.length;
    transitionBuffers += rule.transitionBuffers.length;
    stylePalettes.add(rule.styleHints.materialPalette);

    for (const profileId of rule.allowedStreetProfiles) {
      allowedStreetProfiles.add(profileId);
    }
  }

  return {
    districtRules: CITY_BLUEPRINT.districtRules.length,
    useMixRules,
    landmarkTargets,
    transitionBuffers,
    stylePalettes: [...stylePalettes].sort(),
    allowedStreetProfiles: [...allowedStreetProfiles].sort()
  };
}

function createAdministrativeBoundaryDiagnostics(city: GeneratedCity): AdministrativeBoundaryDiagnostics {
  const byKind: Record<string, number> = {};

  for (const boundary of city.administrativeBoundaries) {
    byKind[boundary.boundaryKind] = (byKind[boundary.boundaryKind] ?? 0) + 1;
  }

  return {
    total: city.administrativeBoundaries.length,
    byKind,
    wards: byKind.ward ?? 0,
    neighborhoods: byKind.neighborhood ?? 0,
    serviceAreas: byKind['service-area'] ?? 0,
    ownershipZones: byKind['ownership-zone'] ?? 0,
    jurisdictionOverlays: byKind['jurisdiction-overlay'] ?? 0,
    blocksWithBoundaryMembership: city.blocks.filter((block) => block.administrativeBoundaryIds.length > 0).length,
    parcelsWithBoundaryMembership: city.parcels.filter((parcel) => parcel.administrativeBoundaryIds.length > 0).length
  };
}

function createBlockModelDiagnostics(city: GeneratedCity): BlockModelDiagnostics {
  const permeability: Record<string, number> = {};
  let scoreTotal = 0;

  for (const block of city.blocks) {
    permeability[block.permeability] = (permeability[block.permeability] ?? 0) + 1;
    scoreTotal += block.permeabilityMetrics.score;
  }

  return {
    total: city.blocks.length,
    buildableEnvelopes: city.blocks.filter((block) => block.buildableEnvelope.boundary.length >= 4).length,
    blocksWithInternalAccess: city.blocks.filter((block) => block.internalAccess.mode !== 'none').length,
    alleys: city.blocks.reduce((sum, block) => sum + block.alleys.length, 0),
    frontageClasses: city.blocks.reduce((sum, block) => sum + block.frontageClasses.length, 0),
    permeability,
    averagePermeabilityScore: Number((scoreTotal / Math.max(1, city.blocks.length)).toFixed(2))
  };
}

function createParcelModelDiagnostics(city: GeneratedCity): ParcelModelDiagnostics {
  const developmentStatuses: Record<string, number> = {};
  let buildableAreaTotal = 0;

  for (const parcel of city.parcels) {
    developmentStatuses[parcel.developmentRights.status] = (developmentStatuses[parcel.developmentRights.status] ?? 0) + 1;
    buildableAreaTotal += parcel.fit.buildableAreaSqM;
  }

  return {
    total: city.parcels.length,
    buildableEnvelopes: city.parcels.filter((parcel) => parcel.fit.buildableEnvelope.length >= 4).length,
    parcelsWithConstraints: city.parcels.filter((parcel) => parcel.parcelConstraintIds.length > 0).length,
    primaryFrontageParcels: city.parcels.filter((parcel) =>
      parcel.frontagePriority.some((frontage) => frontage.priority === 'primary')
    ).length,
    averageBuildableAreaSqM: Number((buildableAreaTotal / Math.max(1, city.parcels.length)).toFixed(2)),
    developmentStatuses
  };
}

function createZoningModelDiagnostics(city: GeneratedCity): ZoningModelDiagnostics {
  const frontageRuleCounts: Record<string, number> = {};
  let allowedUseRules = 0;
  let maxHeightMeters = 0;
  let maxFloorAreaRatio = 0;

  for (const zoning of city.zoningDistricts) {
    allowedUseRules += zoning.controls.allowedUses.length;
    maxHeightMeters = Math.max(maxHeightMeters, zoning.controls.maxHeightMeters);
    maxFloorAreaRatio = Math.max(maxFloorAreaRatio, zoning.controls.maxFloorAreaRatio);
    const frontageRule = zoning.controls.frontageRules.requiredPriority;
    frontageRuleCounts[frontageRule] = (frontageRuleCounts[frontageRule] ?? 0) + 1;
  }

  const zoningIds = new Set(city.zoningDistricts.map((zoning) => zoning.id));

  return {
    total: city.zoningDistricts.length,
    formBasedDistricts: city.zoningDistricts.filter((zoning) => zoning.zoningKind === 'form-based').length,
    parcelsWithZoning: city.parcels.filter((parcel) => zoningIds.has(parcel.zoningDistrictId)).length,
    allowedUseRules,
    maxHeightMeters,
    maxFloorAreaRatio,
    frontageRuleCounts,
    zoningCodes: city.zoningDistricts.map((zoning) => zoning.zoningCode).sort()
  };
}

function createRoadNetworkDiagnostics(city: GeneratedCity): RoadNetworkDiagnostics {
  const byHierarchy: Record<string, number> = {};
  const byProfile: Record<string, number> = {};
  const namedCorridors = new Set<string>();
  let speedTotal = 0;
  let totalRightOfWayMeters = 0;

  for (const road of city.roads) {
    byHierarchy[road.hierarchy] = (byHierarchy[road.hierarchy] ?? 0) + 1;
    byProfile[road.streetProfileId] = (byProfile[road.streetProfileId] ?? 0) + 1;
    namedCorridors.add(road.corridorName);
    speedTotal += road.designSpeedKph;
    totalRightOfWayMeters += road.rightOfWayWidthMeters;
  }

  return {
    total: city.roads.length,
    byHierarchy,
    byProfile,
    namedCorridors: [...namedCorridors].sort(),
    hierarchyKinds: Object.keys(byHierarchy).length,
    transitEligibleRoads: city.roads.filter((road) => road.transitEligible).length,
    averageDesignSpeedKph: Number((speedTotal / Math.max(1, city.roads.length)).toFixed(1)),
    totalRightOfWayMeters: Number(totalRightOfWayMeters.toFixed(1))
  };
}

function createLaneRestrictionDiagnostics(city: GeneratedCity): LaneRestrictionDiagnostics {
  const byRole: Record<string, number> = {};
  const continuityGroups = new Set<string>();
  const lanes = city.roads.flatMap((road) => road.lanes);

  for (const lane of lanes) {
    byRole[lane.laneRole] = (byRole[lane.laneRole] ?? 0) + 1;
    continuityGroups.add(lane.continuityGroupId);
  }

  return {
    total: lanes.length,
    byRole,
    busOnlyLanes: byRole['bus-only'] ?? 0,
    reversibleLanes: byRole.reversible ?? 0,
    turnPocketLanes: byRole['turn-pocket'] ?? 0,
    freightRestrictedLanes: lanes.filter((lane) => lane.restrictedModes.includes('freight')).length,
    continuityGroups: continuityGroups.size
  };
}

function createIntersectionBehaviorDiagnostics(city: GeneratedCity): IntersectionBehaviorDiagnostics {
  const byControlType: Record<string, number> = {};
  let cornerRadiusTotal = 0;

  for (const intersection of city.intersections) {
    byControlType[intersection.controlType] = (byControlType[intersection.controlType] ?? 0) + 1;
    cornerRadiusTotal += intersection.cornerRadiusMeters;
  }

  return {
    total: city.intersections.length,
    byControlType,
    signalized: byControlType['traffic-signal'] ?? 0,
    stopControlled: (byControlType['all-way-stop'] ?? 0) + (byControlType['minor-stop'] ?? 0),
    yieldControlled: byControlType.yield ?? 0,
    raisedJunctions: city.intersections.filter((intersection) => intersection.raisedJunction).length,
    conflictPoints: city.intersections.reduce((sum, intersection) => sum + intersection.conflictPoints.length, 0),
    turnConstraints: city.intersections.reduce((sum, intersection) => sum + intersection.turnConstraints.length, 0),
    averageCornerRadiusMeters: Number((cornerRadiusTotal / Math.max(1, city.intersections.length)).toFixed(1))
  };
}

function createCrossingDetailDiagnostics(city: GeneratedCity): CrossingDetailDiagnostics {
  const byLocation: Record<string, number> = {};
  const byType: Record<string, number> = {};
  const byPriority: Record<string, number> = {};

  for (const crossing of city.crossings) {
    byLocation[crossing.crossingLocation] = (byLocation[crossing.crossingLocation] ?? 0) + 1;
    byType[crossing.crosswalkType] = (byType[crossing.crosswalkType] ?? 0) + 1;
    byPriority[crossing.priority] = (byPriority[crossing.priority] ?? 0) + 1;
  }

  return {
    total: city.crossings.length,
    byLocation,
    byType,
    byPriority,
    midblockCrossings: byLocation.midblock ?? 0,
    raisedCrossings: city.crossings.filter((crossing) => crossing.raisedCrossing).length,
    tactileCrossings: city.crossings.filter((crossing) => crossing.tactileCues).length,
    refugeIslandCrossings: city.crossings.filter((crossing) => crossing.hasRefugeIsland).length,
    signalPhases: city.crossings.filter((crossing) => crossing.signalPhase).length
  };
}

function createWaterwayNetworkDiagnostics(city: GeneratedCity): WaterwayNetworkDiagnostics {
  return {
    total: city.waterways.length,
    edgeSegments: city.waterways.reduce((sum, waterway) => sum + waterway.edgeSegments.length, 0),
    continuousEdgeWaterways: city.waterways.filter(hasContinuousWaterEdges).length,
    channels: city.waterways.reduce((sum, waterway) => sum + waterway.channels.length, 0),
    crossings: city.waterways.reduce((sum, waterway) => sum + waterway.crossingRefs.length, 0),
    bridges: city.waterways.reduce(
      (sum, waterway) => sum + waterway.crossingRefs.filter((crossing) => crossing.crossingKind === 'bridge').length,
      0
    ),
    culverts: city.waterways.reduce((sum, waterway) => sum + waterway.culverts.length, 0),
    docks: city.waterways.reduce((sum, waterway) => sum + waterway.docks.length, 0),
    outfalls: city.waterways.reduce((sum, waterway) => sum + waterway.outfalls.length, 0),
    navigableChannels: city.waterways.reduce(
      (sum, waterway) => sum + waterway.channels.filter((channel) => channel.navigable).length,
      0
    )
  };
}

function hasContinuousWaterEdges(waterway: GeneratedCity['waterways'][number]): boolean {
  return (['north', 'south'] as const).every((side) => {
    const sideSegments = waterway.edgeSegments.filter((segment) => segment.side === side);

    if (sideSegments.length === 0) {
      return false;
    }

    const segmentIds = new Set(sideSegments.map((segment) => segment.id));
    const visited = new Set<string>();
    const queue = [sideSegments[0].id];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const segment = sideSegments.find((candidate) => candidate.id === currentId);

      if (!segment || visited.has(currentId)) {
        continue;
      }

      visited.add(currentId);
      for (const connectedSegmentId of segment.connectedSegmentIds) {
        if (segmentIds.has(connectedSegmentId) && !visited.has(connectedSegmentId)) {
          queue.push(connectedSegmentId);
        }
      }
    }

    return visited.size === sideSegments.length;
  });
}

function createWaterfrontModelDiagnostics(city: GeneratedCity): WaterfrontModelDiagnostics {
  const byKind: Record<string, number> = {};

  for (const edge of city.waterfrontEdges) {
    byKind[edge.waterfrontKind] = (byKind[edge.waterfrontKind] ?? 0) + 1;
  }

  return {
    total: city.waterfrontEdges.length,
    byKind,
    publicAccessEdges: city.waterfrontEdges.filter((edge) => edge.publicAccess).length,
    connectedPublicRealmEdges: city.waterfrontEdges.filter((edge) => edge.connectedPublicRealmIds.length > 0).length,
    connectedRoadEdges: city.waterfrontEdges.filter((edge) => edge.connectedRoadIds.length > 0).length,
    floodProtectionEdges: city.waterfrontEdges.filter((edge) => edge.floodProtection.kind !== 'none').length,
    piers: city.waterfrontEdges.filter((edge) => edge.waterfrontKind === 'pier').length,
    materialHints: [...new Set(city.waterfrontEdges.map((edge) => edge.materialHint))].sort()
  };
}

function createHazardLayerDiagnostics(city: GeneratedCity): HazardLayerDiagnostics {
  const byKind: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  const mitigationKinds = new Set<string>();

  for (const hazard of city.hazardZones) {
    byKind[hazard.hazardKind] = (byKind[hazard.hazardKind] ?? 0) + 1;
    bySeverity[hazard.severity] = (bySeverity[hazard.severity] ?? 0) + 1;

    for (const mitigationKind of hazard.mitigationKinds) {
      mitigationKinds.add(mitigationKind);
    }
  }

  return {
    total: city.hazardZones.length,
    byKind,
    bySeverity,
    criticalHazards: city.hazardZones.filter((hazard) => hazard.severity === 'critical').length,
    noBuildHazards: city.hazardZones.filter((hazard) => hazard.prohibitedObjectKinds.length > 0).length,
    mitigationRequiredHazards: city.hazardZones.filter((hazard) => hazard.requiresMitigation).length,
    relatedWaterwayHazards: city.hazardZones.filter((hazard) => hazard.relatedWaterwayIds.length > 0).length,
    relatedZoningHazards: city.hazardZones.filter((hazard) => hazard.relatedZoningDistrictIds.length > 0).length,
    mitigationKinds: [...mitigationKinds].sort()
  };
}

function createConstraintLayerDiagnostics(city: GeneratedCity): ConstraintLayerDiagnostics {
  const byKind: Record<string, number> = {};
  const prohibitedObjectKinds = new Set<string>();

  for (const constraint of city.constraints) {
    byKind[constraint.constraintKind] = (byKind[constraint.constraintKind] ?? 0) + 1;

    for (const objectKind of constraint.prohibitedObjectKinds) {
      prohibitedObjectKinds.add(objectKind);
    }
  }

  return {
    total: city.constraints.length,
    byKind,
    noBuildRules: city.constraints.filter((constraint) => constraint.constraintKind === 'no-build-zone').length,
    clearanceRules: city.constraints.filter(
      (constraint) =>
        constraint.constraintKind === 'clearance' || constraint.constraintKind === 'emergency-access-corridor'
    ).length,
    prohibitedObjectKinds: [...prohibitedObjectKinds].sort()
  };
}

function createCityMetricDiagnostics(city: GeneratedCity): CityMetricDiagnostics {
  const byKind: Record<string, number> = {};
  const valuesByKind: Record<string, number> = {};
  const scoreMetrics = city.cityMetrics.filter((metric) => metric.unit === 'score');

  for (const metric of city.cityMetrics) {
    byKind[metric.metricKind] = (byKind[metric.metricKind] ?? 0) + 1;
    valuesByKind[metric.metricKind] = metric.value;
  }

  return {
    total: city.cityMetrics.length,
    byKind,
    passing: city.cityMetrics.filter((metric) => metric.status === 'pass').length,
    warnings: city.cityMetrics.filter((metric) => metric.status === 'warn').length,
    failing: city.cityMetrics.filter((metric) => metric.status === 'fail').length,
    scoreAverage:
      Math.round(
        (scoreMetrics.reduce((sum, metric) => sum + metric.value, 0) / Math.max(1, scoreMetrics.length)) * 100
      ) / 100,
    valuesByKind
  };
}

function createResilienceGoalDiagnostics(city: GeneratedCity): ResilienceGoalDiagnostics {
  const byKind: Record<string, number> = {};
  const shelterCandidates = new Set<string>();
  const evacuationRouteRoads = new Set<string>();
  const continuityTargets = new Set<string>();

  for (const goal of city.resilienceGoals) {
    byKind[goal.goalKind] = (byKind[goal.goalKind] ?? 0) + 1;

    for (const shelterId of goal.shelterObjectIds) {
      shelterCandidates.add(shelterId);
    }

    if (goal.goalKind === 'evacuation-route' || goal.goalKind === 'emergency-access') {
      for (const roadId of goal.routeRoadIds) {
        evacuationRouteRoads.add(roadId);
      }
    }

    for (const continuityTarget of goal.continuityTargets) {
      continuityTargets.add(continuityTarget);
    }
  }

  return {
    total: city.resilienceGoals.length,
    byKind,
    criticalGoals: city.resilienceGoals.filter((goal) => goal.priority === 'critical').length,
    shelterCandidates: shelterCandidates.size,
    evacuationRouteRoads: [...evacuationRouteRoads].sort(),
    continuityTargets: [...continuityTargets].sort(),
    recoveryPriorities: city.resilienceGoals
      .slice()
      .sort((left, right) => left.recoveryPriority - right.recoveryPriority || left.id.localeCompare(right.id))
      .map((goal) => goal.id)
  };
}

function createSourceMetadataDiagnostics(
  objectIndex: CityObjectIndex<GeneratedRuntimeCityObject>
): CityDiagnostics['sourceMetadata'] {
  const sourceTypes: Record<SourceType, number> = {
    procedural: 0,
    authored: 0,
    imported: 0,
    simulated: 0
  };
  let objectsWithMetadata = 0;
  let objectsRequiringReview = 0;

  for (const object of objectIndex.objects) {
    if (!object.metadata) {
      continue;
    }

    objectsWithMetadata += 1;
    sourceTypes[object.metadata.sourceType] += 1;

    if (object.metadata.reviewStatus !== 'reviewed' && object.metadata.reviewStatus !== 'generated') {
      objectsRequiringReview += 1;
    }
  }

  return {
    objectsWithMetadata,
    objectsMissingMetadata: objectIndex.objects.length - objectsWithMetadata,
    objectsRequiringReview,
    sourceTypes
  };
}
