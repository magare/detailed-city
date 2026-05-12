import type { RenderConfig } from '../config/renderConfig';
import { cityConfig as defaultCityConfig } from '../config/cityConfig';
import { createConfigDiagnostics, type ConfigDiagnostics } from '../config/configSchema';
import { CITY_BLUEPRINT } from '../city/blueprint/cityBlueprint';
import {
  createMasterPlanDiagnostics,
  type MasterPlanDiagnostics
} from '../city/blueprint/master-plan/masterPlan';
import type {
  BuildingFacadeRhythm,
  BuildingFootprintGrammarKind,
  BuildingRoofDetailKind,
  BuildingRoofStyleKind,
  BuildingStructuralSystemKind,
  BuildingTypologyKind,
  CityObjectIndex,
  SourceType
} from '../city/data-contracts/cityContracts';
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
  readonly buildingTypologies: BuildingTypologyDiagnostics;
  readonly buildingFootprints: BuildingFootprintDiagnostics;
  readonly buildingStructureShells: BuildingStructureShellDiagnostics;
  readonly buildingFacades: BuildingFacadeDiagnostics;
  readonly buildingRoofs: BuildingRoofDiagnostics;
  readonly roadNetwork: RoadNetworkDiagnostics;
  readonly laneRestrictions: LaneRestrictionDiagnostics;
  readonly intersectionBehavior: IntersectionBehaviorDiagnostics;
  readonly crossingDetails: CrossingDetailDiagnostics;
  readonly sidewalkAccessibility: SidewalkAccessibilityDiagnostics;
  readonly trafficCalming: TrafficCalmingDiagnostics;
  readonly waterwayNetwork: WaterwayNetworkDiagnostics;
  readonly waterfrontModel: WaterfrontModelDiagnostics;
  readonly hazardLayer: HazardLayerDiagnostics;
  readonly topography: TopographyDiagnostics;
  readonly soilGeology: SoilGeologyDiagnostics;
  readonly districtCharacter: DistrictCharacterDiagnostics;
  readonly cityMetrics: CityMetricDiagnostics;
  readonly developmentPhasing: DevelopmentPhasingDiagnostics;
  readonly parkExpansion: ParkExpansionDiagnostics;
  readonly plazaModel: PlazaModelDiagnostics;
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
    readonly topographyZones: number;
    readonly soilGeologyZones: number;
    readonly contaminatedSoilZones: number;
    readonly poorDrainageSoilZones: number;
    readonly highRiskSoilZones: number;
    readonly buildingsWithSoilGeology: number;
    readonly parcelsWithSoilGeology: number;
    readonly roadsWithGroundProfiles: number;
    readonly buildingsWithGroundProfiles: number;
    readonly districtUseMixRules: number;
    readonly districtLandmarkTargets: number;
    readonly districtTransitionBuffers: number;
    readonly districtStylePalettes: number;
    readonly cityMetrics: number;
    readonly developmentPhases: number;
    readonly activeDevelopmentPhases: number;
    readonly temporaryRoadClosures: number;
    readonly temporaryPhaseAssets: number;
    readonly parkFeatures: number;
    readonly parkPaths: number;
    readonly parkProgramZones: number;
    readonly parkSidewalkConnections: number;
    readonly plazaZones: number;
    readonly plazaEventCapacity: number;
    readonly plazaActiveEdges: number;
    readonly plazaLinkedFrontages: number;
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
    readonly trafficCalmingDevices: number;
    readonly curbExtensions: number;
    readonly busBulbs: number;
    readonly speedTables: number;
    readonly curbZones: number;
    readonly sidewalkGraphNodes: number;
    readonly sidewalkGraphEdges: number;
    readonly lanes: number;
    readonly sidewalks: number;
    readonly parcels: number;
    readonly buildings: number;
    readonly buildingTypologyKinds: number;
    readonly buildingsWithTypology: number;
    readonly buildingFootprintGrammarKinds: number;
    readonly buildingsWithFootprintGrammar: number;
    readonly offsetBuildingFootprints: number;
    readonly buildingStructuralSystemKinds: number;
    readonly buildingsWithStructureShell: number;
    readonly buildingFloorPlates: number;
    readonly buildingFacadeRhythms: number;
    readonly buildingsWithFacadeGrammar: number;
    readonly buildingFacadeSides: number;
    readonly buildingFacadeWindowModules: number;
    readonly buildingFacadeBalconySides: number;
    readonly buildingFacadeStorefrontModules: number;
    readonly buildingRoofStyles: number;
    readonly buildingsWithRoofGrammar: number;
    readonly roofDetailModules: number;
    readonly roofMechanicalScreens: number;
    readonly roofSolarArrays: number;
    readonly roofGreenRoofs: number;
    readonly roofAntennas: number;
    readonly roofTerraces: number;
    readonly roofAccessCores: number;
    readonly roofHeightExemptions: number;
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

export interface BuildingTypologyDiagnostics {
  readonly total: number;
  readonly buildingsWithTypology: number;
  readonly typologyKinds: number;
  readonly byKind: Readonly<Partial<Record<BuildingTypologyKind, number>>>;
  readonly storefrontEntrances: number;
  readonly yardLoadingBuildings: number;
  readonly scheduleProfiles: readonly string[];
}

export interface BuildingFootprintDiagnostics {
  readonly total: number;
  readonly buildingsWithGrammar: number;
  readonly grammarKinds: number;
  readonly byKind: Readonly<Partial<Record<BuildingFootprintGrammarKind, number>>>;
  readonly offsetFootprints: number;
  readonly podiums: number;
  readonly towers: number;
  readonly courtyards: number;
  readonly waterfrontSetbacks: number;
  readonly hazardConstrained: number;
  readonly averageGroundCoverageRatio: number;
}

export interface BuildingStructureShellDiagnostics {
  readonly total: number;
  readonly buildingsWithShell: number;
  readonly structuralSystemKinds: number;
  readonly bySystem: Readonly<Partial<Record<BuildingStructuralSystemKind, number>>>;
  readonly cores: number;
  readonly floorPlates: number;
  readonly transferLevels: number;
  readonly longSpanBuildings: number;
  readonly averageFloorPlateAreaSqM: number;
}

export interface BuildingFacadeDiagnostics {
  readonly total: number;
  readonly buildingsWithGrammar: number;
  readonly facadeRhythms: number;
  readonly byRhythm: Readonly<Partial<Record<BuildingFacadeRhythm, number>>>;
  readonly facadeSides: number;
  readonly windowModules: number;
  readonly balconySides: number;
  readonly storefrontModules: number;
  readonly atlasSlotIds: readonly string[];
  readonly materialZoneIds: readonly string[];
}

export interface BuildingRoofDiagnostics {
  readonly total: number;
  readonly buildingsWithGrammar: number;
  readonly roofStyles: number;
  readonly byStyle: Readonly<Partial<Record<BuildingRoofStyleKind, number>>>;
  readonly detailModules: number;
  readonly byDetailKind: Readonly<Partial<Record<BuildingRoofDetailKind, number>>>;
  readonly mechanicalScreens: number;
  readonly solarArrays: number;
  readonly greenRoofs: number;
  readonly antennas: number;
  readonly terraces: number;
  readonly roofAccessCores: number;
  readonly heightExemptions: number;
  readonly averageUsableAreaSqM: number;
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

export interface SidewalkAccessibilityDiagnostics {
  readonly sidewalks: number;
  readonly accessibleSidewalks: number;
  readonly graphNodes: number;
  readonly accessibleGraphNodes: number;
  readonly graphEdges: number;
  readonly accessibleGraphEdges: number;
  readonly curbRampAnchors: number;
  readonly tactileCueAnchors: number;
  readonly minimumClearPathMeters: number;
  readonly maximumRunningGradePercent: number;
}

export interface TrafficCalmingDiagnostics {
  readonly total: number;
  readonly byKind: Readonly<Record<string, number>>;
  readonly curbExtensions: number;
  readonly busBulbs: number;
  readonly speedTables: number;
  readonly speedReductionDevices: number;
  readonly minimumTargetSpeedKph: number;
  readonly averageTargetSpeedKph: number;
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

export interface TopographyDiagnostics {
  readonly total: number;
  readonly byKind: Readonly<Record<string, number>>;
  readonly minElevationMeters: number;
  readonly maxElevationMeters: number;
  readonly averageSlopePercent: number;
  readonly maxRoadGradePercent: number;
  readonly maxBuildingFootprintGradePercent: number;
  readonly retainingRequiredZones: number;
  readonly limitedBuildabilityZones: number;
  readonly roadsWithGroundProfiles: number;
  readonly buildingsWithGroundProfiles: number;
}

export interface SoilGeologyDiagnostics {
  readonly total: number;
  readonly bySoilKind: Readonly<Record<string, number>>;
  readonly byFoundationSuitability: Readonly<Record<string, number>>;
  readonly tunnelDifficultyKinds: readonly string[];
  readonly drainageAssumptions: readonly string[];
  readonly contaminatedZones: number;
  readonly remediationRequiredZones: number;
  readonly poorDrainageZones: number;
  readonly highRiskZones: number;
  readonly averageBearingCapacityKpa: number;
  readonly zonesWithTopographyRefs: number;
  readonly zonesWithHazardRefs: number;
  readonly parcelsWithSoilGeology: number;
  readonly buildingsWithSoilGeology: number;
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

export interface DevelopmentPhasingDiagnostics {
  readonly total: number;
  readonly active: number;
  readonly planned: number;
  readonly temporary: number;
  readonly completed: number;
  readonly futureExpansionPhases: number;
  readonly temporaryConditionPhases: number;
  readonly closureRoads: number;
  readonly temporaryRoads: number;
  readonly temporaryParks: number;
  readonly unlockLinks: number;
  readonly maxSequence: number;
  readonly phaseNames: readonly string[];
}

export interface ParkExpansionDiagnostics {
  readonly totalFeatures: number;
  readonly pathFeatures: number;
  readonly programZones: number;
  readonly accessibleFeatures: number;
  readonly connectedParks: number;
  readonly sidewalkConnections: number;
  readonly byKind: Readonly<Record<string, number>>;
  readonly byProgram: Readonly<Record<string, number>>;
}

export interface PlazaModelDiagnostics {
  readonly totalZones: number;
  readonly eventZones: number;
  readonly activeEdges: number;
  readonly linkedActiveFrontages: number;
  readonly eventCapacityPeople: number;
  readonly connectedSidewalks: number;
  readonly byKind: Readonly<Record<string, number>>;
  readonly byPavingTier: Readonly<Record<string, number>>;
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
    trafficCalmingDevices: city.trafficCalmingDevices,
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
  const buildingTypologies = createBuildingTypologyDiagnostics(city);
  const buildingFootprints = createBuildingFootprintDiagnostics(city);
  const buildingStructureShells = createBuildingStructureShellDiagnostics(city);
  const buildingFacades = createBuildingFacadeDiagnostics(city);
  const buildingRoofs = createBuildingRoofDiagnostics(city);
  const roadNetwork = createRoadNetworkDiagnostics(city);
  const laneRestrictions = createLaneRestrictionDiagnostics(city);
  const intersectionBehavior = createIntersectionBehaviorDiagnostics(city);
  const crossingDetails = createCrossingDetailDiagnostics(city);
  const sidewalkAccessibility = createSidewalkAccessibilityDiagnostics(city);
  const trafficCalming = createTrafficCalmingDiagnostics(city);
  const waterwayNetwork = createWaterwayNetworkDiagnostics(city);
  const waterfrontModel = createWaterfrontModelDiagnostics(city);
  const hazardLayer = createHazardLayerDiagnostics(city);
  const topography = createTopographyDiagnostics(city);
  const soilGeology = createSoilGeologyDiagnostics(city);
  const districtCharacter = createDistrictCharacterDiagnostics();
  const cityMetrics = createCityMetricDiagnostics(city);
  const developmentPhasing = createDevelopmentPhasingDiagnostics(city);
  const parkExpansion = createParkExpansionDiagnostics(city);
  const plazaModel = createPlazaModelDiagnostics(city);
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
    buildingTypologies,
    buildingFootprints,
    buildingStructureShells,
    buildingFacades,
    buildingRoofs,
    roadNetwork,
    laneRestrictions,
    intersectionBehavior,
    crossingDetails,
    sidewalkAccessibility,
    trafficCalming,
    waterwayNetwork,
    waterfrontModel,
    hazardLayer,
    topography,
    soilGeology,
    districtCharacter,
    cityMetrics,
    developmentPhasing,
    parkExpansion,
    plazaModel,
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
      topographyZones: topography.total,
      soilGeologyZones: soilGeology.total,
      contaminatedSoilZones: soilGeology.contaminatedZones,
      poorDrainageSoilZones: soilGeology.poorDrainageZones,
      highRiskSoilZones: soilGeology.highRiskZones,
      buildingsWithSoilGeology: soilGeology.buildingsWithSoilGeology,
      parcelsWithSoilGeology: soilGeology.parcelsWithSoilGeology,
      roadsWithGroundProfiles: topography.roadsWithGroundProfiles,
      buildingsWithGroundProfiles: topography.buildingsWithGroundProfiles,
      districtUseMixRules: districtCharacter.useMixRules,
      districtLandmarkTargets: districtCharacter.landmarkTargets,
      districtTransitionBuffers: districtCharacter.transitionBuffers,
      districtStylePalettes: districtCharacter.stylePalettes.length,
      cityMetrics: city.cityMetrics.length,
      developmentPhases: developmentPhasing.total,
      activeDevelopmentPhases: developmentPhasing.active,
      temporaryRoadClosures: developmentPhasing.closureRoads,
      temporaryPhaseAssets: developmentPhasing.temporaryRoads + developmentPhasing.temporaryParks,
      parkFeatures: parkExpansion.totalFeatures,
      parkPaths: parkExpansion.pathFeatures,
      parkProgramZones: parkExpansion.programZones,
      parkSidewalkConnections: parkExpansion.sidewalkConnections,
      plazaZones: plazaModel.totalZones,
      plazaEventCapacity: plazaModel.eventCapacityPeople,
      plazaActiveEdges: plazaModel.activeEdges,
      plazaLinkedFrontages: plazaModel.linkedActiveFrontages,
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
      trafficCalmingDevices: trafficCalming.total,
      curbExtensions: trafficCalming.curbExtensions,
      busBulbs: trafficCalming.busBulbs,
      speedTables: trafficCalming.speedTables,
      curbZones: city.curbZones.length,
      sidewalkGraphNodes: city.sidewalkGraph.nodes.length,
      sidewalkGraphEdges: city.sidewalkGraph.edges.length,
      lanes: objectIndex.countsByKind.lane ?? 0,
      sidewalks: objectIndex.countsByKind.sidewalk ?? 0,
      parcels: city.parcels.length,
      buildings: city.buildings.length,
      buildingTypologyKinds: buildingTypologies.typologyKinds,
      buildingsWithTypology: buildingTypologies.buildingsWithTypology,
      buildingFootprintGrammarKinds: buildingFootprints.grammarKinds,
      buildingsWithFootprintGrammar: buildingFootprints.buildingsWithGrammar,
      offsetBuildingFootprints: buildingFootprints.offsetFootprints,
      buildingStructuralSystemKinds: buildingStructureShells.structuralSystemKinds,
      buildingsWithStructureShell: buildingStructureShells.buildingsWithShell,
      buildingFloorPlates: buildingStructureShells.floorPlates,
      buildingFacadeRhythms: buildingFacades.facadeRhythms,
      buildingsWithFacadeGrammar: buildingFacades.buildingsWithGrammar,
      buildingFacadeSides: buildingFacades.facadeSides,
      buildingFacadeWindowModules: buildingFacades.windowModules,
      buildingFacadeBalconySides: buildingFacades.balconySides,
      buildingFacadeStorefrontModules: buildingFacades.storefrontModules,
      buildingRoofStyles: buildingRoofs.roofStyles,
      buildingsWithRoofGrammar: buildingRoofs.buildingsWithGrammar,
      roofDetailModules: buildingRoofs.detailModules,
      roofMechanicalScreens: buildingRoofs.mechanicalScreens,
      roofSolarArrays: buildingRoofs.solarArrays,
      roofGreenRoofs: buildingRoofs.greenRoofs,
      roofAntennas: buildingRoofs.antennas,
      roofTerraces: buildingRoofs.terraces,
      roofAccessCores: buildingRoofs.roofAccessCores,
      roofHeightExemptions: buildingRoofs.heightExemptions,
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

function createBuildingTypologyDiagnostics(city: GeneratedCity): BuildingTypologyDiagnostics {
  const byKind: Partial<Record<BuildingTypologyKind, number>> = {};
  const scheduleProfiles = new Set<string>();
  let buildingsWithTypology = 0;
  let storefrontEntrances = 0;
  let yardLoadingBuildings = 0;

  for (const building of city.buildings) {
    const typology = building.typology;

    if (!typology) {
      continue;
    }

    buildingsWithTypology += 1;
    byKind[typology.kind] = (byKind[typology.kind] ?? 0) + 1;
    scheduleProfiles.add(typology.scheduleProfileId);

    if (typology.entranceStrategy === 'storefront') {
      storefrontEntrances += 1;
    }
    if (typology.serviceAccess === 'yard-loading') {
      yardLoadingBuildings += 1;
    }
  }

  return {
    total: city.buildings.length,
    buildingsWithTypology,
    typologyKinds: Object.keys(byKind).length,
    byKind,
    storefrontEntrances,
    yardLoadingBuildings,
    scheduleProfiles: [...scheduleProfiles].sort()
  };
}

function createBuildingFootprintDiagnostics(city: GeneratedCity): BuildingFootprintDiagnostics {
  const byKind: Partial<Record<BuildingFootprintGrammarKind, number>> = {};
  let buildingsWithGrammar = 0;
  let offsetFootprints = 0;
  let podiums = 0;
  let towers = 0;
  let courtyards = 0;
  let waterfrontSetbacks = 0;
  let hazardConstrained = 0;
  let groundCoverageTotal = 0;

  for (const building of city.buildings) {
    const grammar = building.footprintGrammar;

    if (!grammar) {
      continue;
    }

    buildingsWithGrammar += 1;
    byKind[grammar.kind] = (byKind[grammar.kind] ?? 0) + 1;
    groundCoverageTotal += grammar.groundCoverageRatio;

    if (Math.abs(grammar.placementOffsetMeters.x) > 0.01 || Math.abs(grammar.placementOffsetMeters.z) > 0.01) {
      offsetFootprints += 1;
    }
    if (grammar.podium) {
      podiums += 1;
    }
    if (grammar.tower) {
      towers += 1;
    }
    if (grammar.courtyard) {
      courtyards += 1;
    }
    if (grammar.waterfrontSetbackApplied) {
      waterfrontSetbacks += 1;
    }
    if (grammar.hazardConstrained) {
      hazardConstrained += 1;
    }
  }

  return {
    total: city.buildings.length,
    buildingsWithGrammar,
    grammarKinds: Object.keys(byKind).length,
    byKind,
    offsetFootprints,
    podiums,
    towers,
    courtyards,
    waterfrontSetbacks,
    hazardConstrained,
    averageGroundCoverageRatio: Number((groundCoverageTotal / Math.max(1, buildingsWithGrammar)).toFixed(4))
  };
}

function createBuildingStructureShellDiagnostics(city: GeneratedCity): BuildingStructureShellDiagnostics {
  const bySystem: Partial<Record<BuildingStructuralSystemKind, number>> = {};
  let buildingsWithShell = 0;
  let cores = 0;
  let floorPlates = 0;
  let transferLevels = 0;
  let longSpanBuildings = 0;
  let floorPlateAreaTotal = 0;

  for (const building of city.buildings) {
    const shell = building.structureShell;

    if (!shell) {
      continue;
    }

    buildingsWithShell += 1;
    bySystem[shell.structuralSystem] = (bySystem[shell.structuralSystem] ?? 0) + 1;
    floorPlates += shell.floorPlates.length;
    transferLevels += shell.transferLevels.length;
    floorPlateAreaTotal += shell.floorPlates.reduce((total, floorPlate) => total + floorPlate.areaSqM, 0);

    if (shell.core) {
      cores += 1;
    }
    if (shell.loadBearingAssumptions.longSpan) {
      longSpanBuildings += 1;
    }
  }

  return {
    total: city.buildings.length,
    buildingsWithShell,
    structuralSystemKinds: Object.keys(bySystem).length,
    bySystem,
    cores,
    floorPlates,
    transferLevels,
    longSpanBuildings,
    averageFloorPlateAreaSqM: Number((floorPlateAreaTotal / Math.max(1, floorPlates)).toFixed(2))
  };
}

function createBuildingFacadeDiagnostics(city: GeneratedCity): BuildingFacadeDiagnostics {
  const byRhythm: Partial<Record<BuildingFacadeRhythm, number>> = {};
  const atlasSlotIds = new Set<string>();
  const materialZoneIds = new Set<string>();
  let buildingsWithGrammar = 0;
  let facadeSides = 0;
  let windowModules = 0;
  let balconySides = 0;
  let storefrontModules = 0;

  for (const building of city.buildings) {
    const grammar = building.facadeGrammar;

    if (!grammar) {
      continue;
    }

    buildingsWithGrammar += 1;
    byRhythm[grammar.rhythm] = (byRhythm[grammar.rhythm] ?? 0) + 1;
    facadeSides += grammar.sides.length;
    atlasSlotIds.add(grammar.atlasSlots.wall);
    atlasSlotIds.add(grammar.atlasSlots.window);
    atlasSlotIds.add(grammar.atlasSlots.frame);
    if (grammar.atlasSlots.balcony) {
      atlasSlotIds.add(grammar.atlasSlots.balcony);
    }
    if (grammar.atlasSlots.storefrontSign) {
      atlasSlotIds.add(grammar.atlasSlots.storefrontSign);
    }
    if (grammar.atlasSlots.awning) {
      atlasSlotIds.add(grammar.atlasSlots.awning);
    }

    for (const side of grammar.sides) {
      windowModules += side.bayCount * side.floorLevels.length;
      if (side.balconyModule.enabled) {
        balconySides += 1;
      }
      if (side.storefrontModule.enabled) {
        storefrontModules += 1;
      }
      for (const materialZone of side.materialZones) {
        materialZoneIds.add(materialZone);
      }
    }
  }

  return {
    total: city.buildings.length,
    buildingsWithGrammar,
    facadeRhythms: Object.keys(byRhythm).length,
    byRhythm,
    facadeSides,
    windowModules,
    balconySides,
    storefrontModules,
    atlasSlotIds: [...atlasSlotIds].sort(),
    materialZoneIds: [...materialZoneIds].sort()
  };
}

function createBuildingRoofDiagnostics(city: GeneratedCity): BuildingRoofDiagnostics {
  const byStyle: Partial<Record<BuildingRoofStyleKind, number>> = {};
  const byDetailKind: Partial<Record<BuildingRoofDetailKind, number>> = {};
  let buildingsWithGrammar = 0;
  let detailModules = 0;
  let heightExemptions = 0;
  let usableAreaTotal = 0;

  for (const building of city.buildings) {
    const grammar = building.roofGrammar;

    if (!grammar) {
      continue;
    }

    buildingsWithGrammar += 1;
    byStyle[grammar.roofStyle] = (byStyle[grammar.roofStyle] ?? 0) + 1;
    detailModules += grammar.details.length;
    heightExemptions += grammar.heightExemptions.length;
    usableAreaTotal += grammar.roofPlane.usableAreaSqM;

    for (const detail of grammar.details) {
      byDetailKind[detail.detailKind] = (byDetailKind[detail.detailKind] ?? 0) + 1;
    }
  }

  return {
    total: city.buildings.length,
    buildingsWithGrammar,
    roofStyles: Object.keys(byStyle).length,
    byStyle,
    detailModules,
    byDetailKind,
    mechanicalScreens: byDetailKind['mechanical-screen'] ?? 0,
    solarArrays: byDetailKind['solar-array'] ?? 0,
    greenRoofs: byDetailKind['green-roof'] ?? 0,
    antennas: byDetailKind.antenna ?? 0,
    terraces: byDetailKind.terrace ?? 0,
    roofAccessCores: byDetailKind['roof-access'] ?? 0,
    heightExemptions,
    averageUsableAreaSqM: Number((usableAreaTotal / Math.max(1, buildingsWithGrammar)).toFixed(2))
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

function createSidewalkAccessibilityDiagnostics(city: GeneratedCity): SidewalkAccessibilityDiagnostics {
  const sidewalks = city.roads.flatMap((road) => road.sidewalks);
  const clearPaths = sidewalks.map((sidewalk) => sidewalk.accessibleClearPathMeters);
  const runningGrades = sidewalks.map((sidewalk) => sidewalk.runningGradePercent);

  return {
    sidewalks: sidewalks.length,
    accessibleSidewalks: sidewalks.filter((sidewalk) => sidewalk.accessibility.wheelchairPassable).length,
    graphNodes: city.sidewalkGraph.nodes.length,
    accessibleGraphNodes: city.sidewalkGraph.nodes.filter((node) => node.accessible).length,
    graphEdges: city.sidewalkGraph.edges.length,
    accessibleGraphEdges: city.sidewalkGraph.edges.filter((edge) => edge.accessible).length,
    curbRampAnchors: city.crossings.reduce((sum, crossing) => sum + crossing.curbRampIds.length, 0),
    tactileCueAnchors: city.crossings.reduce((sum, crossing) => sum + crossing.tactileCueIds.length, 0),
    minimumClearPathMeters: Number(Math.min(...clearPaths).toFixed(1)),
    maximumRunningGradePercent: Number(Math.max(...runningGrades).toFixed(1))
  };
}

function createTrafficCalmingDiagnostics(city: GeneratedCity): TrafficCalmingDiagnostics {
  const byKind: Record<string, number> = {};
  let targetSpeedTotal = 0;
  let minimumTargetSpeedKph = Number.POSITIVE_INFINITY;

  for (const device of city.trafficCalmingDevices) {
    byKind[device.deviceKind] = (byKind[device.deviceKind] ?? 0) + 1;
    targetSpeedTotal += device.targetSpeedKph;
    minimumTargetSpeedKph = Math.min(minimumTargetSpeedKph, device.targetSpeedKph);
  }

  return {
    total: city.trafficCalmingDevices.length,
    byKind,
    curbExtensions: byKind['curb-extension'] ?? 0,
    busBulbs: byKind['bus-bulb'] ?? 0,
    speedTables: byKind['speed-table'] ?? 0,
    speedReductionDevices:
      (byKind.chicane ?? 0) +
      (byKind.pinchpoint ?? 0) +
      (byKind['speed-hump'] ?? 0) +
      (byKind['speed-cushion'] ?? 0) +
      (byKind['neighborhood-gateway'] ?? 0),
    minimumTargetSpeedKph: Number.isFinite(minimumTargetSpeedKph) ? minimumTargetSpeedKph : 0,
    averageTargetSpeedKph: Number((targetSpeedTotal / Math.max(1, city.trafficCalmingDevices.length)).toFixed(1))
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

function createTopographyDiagnostics(city: GeneratedCity): TopographyDiagnostics {
  const byKind: Record<string, number> = {};
  let minElevationMeters = Number.POSITIVE_INFINITY;
  let maxElevationMeters = Number.NEGATIVE_INFINITY;
  let slopeTotal = 0;

  for (const zone of city.topographyZones) {
    byKind[zone.zoneKind] = (byKind[zone.zoneKind] ?? 0) + 1;
    minElevationMeters = Math.min(minElevationMeters, zone.minElevationMeters);
    maxElevationMeters = Math.max(maxElevationMeters, zone.maxElevationMeters);
    slopeTotal += zone.slopePercent;
  }

  const roadGrades = city.roads.flatMap((road) => (road.groundProfile ? [road.groundProfile.maxGradePercent] : []));
  const buildingGrades = city.buildings.flatMap((building) =>
    building.maxFootprintGradePercent !== undefined ? [building.maxFootprintGradePercent] : []
  );

  return {
    total: city.topographyZones.length,
    byKind,
    minElevationMeters: Number((Number.isFinite(minElevationMeters) ? minElevationMeters : 0).toFixed(2)),
    maxElevationMeters: Number((Number.isFinite(maxElevationMeters) ? maxElevationMeters : 0).toFixed(2)),
    averageSlopePercent: Number((slopeTotal / Math.max(1, city.topographyZones.length)).toFixed(2)),
    maxRoadGradePercent: Number(Math.max(0, ...roadGrades).toFixed(2)),
    maxBuildingFootprintGradePercent: Number(Math.max(0, ...buildingGrades).toFixed(2)),
    retainingRequiredZones: city.topographyZones.filter((zone) => zone.retainingCondition === 'required').length,
    limitedBuildabilityZones: city.topographyZones.filter(
      (zone) => zone.buildability === 'limited' || zone.buildability === 'restricted'
    ).length,
    roadsWithGroundProfiles: city.roads.filter((road) => road.groundProfile).length,
    buildingsWithGroundProfiles: city.buildings.filter((building) => building.groundElevationMeters !== undefined).length
  };
}

function createSoilGeologyDiagnostics(city: GeneratedCity): SoilGeologyDiagnostics {
  const bySoilKind: Record<string, number> = {};
  const byFoundationSuitability: Record<string, number> = {};
  const tunnelDifficultyKinds = new Set<string>();
  const drainageAssumptions = new Set<string>();
  let bearingCapacityTotal = 0;

  for (const zone of city.soilGeologyZones) {
    bySoilKind[zone.soilKind] = (bySoilKind[zone.soilKind] ?? 0) + 1;
    byFoundationSuitability[zone.foundationSuitability] = (byFoundationSuitability[zone.foundationSuitability] ?? 0) + 1;
    tunnelDifficultyKinds.add(zone.tunnelDifficulty);
    drainageAssumptions.add(zone.drainageAssumption);
    bearingCapacityTotal += zone.bearingCapacityKpa;
  }

  return {
    total: city.soilGeologyZones.length,
    bySoilKind,
    byFoundationSuitability,
    tunnelDifficultyKinds: [...tunnelDifficultyKinds].sort(),
    drainageAssumptions: [...drainageAssumptions].sort(),
    contaminatedZones: city.soilGeologyZones.filter((zone) => zone.contamination.status !== 'clean').length,
    remediationRequiredZones: city.soilGeologyZones.filter((zone) => zone.contamination.remediationRequired).length,
    poorDrainageZones: city.soilGeologyZones.filter(
      (zone) => zone.drainageAssumption === 'poor-drainage' || zone.drainageAssumption === 'dewatering-required'
    ).length,
    highRiskZones: city.soilGeologyZones.filter((zone) => zone.groundRisk.overall === 'high' || zone.groundRisk.overall === 'critical').length,
    averageBearingCapacityKpa: Number((bearingCapacityTotal / Math.max(1, city.soilGeologyZones.length)).toFixed(1)),
    zonesWithTopographyRefs: city.soilGeologyZones.filter((zone) => zone.topographyZoneIds.length > 0).length,
    zonesWithHazardRefs: city.soilGeologyZones.filter((zone) => zone.hazardZoneIds.length > 0).length,
    parcelsWithSoilGeology: city.parcels.filter((parcel) => parcel.soilGeologyZoneIds?.length).length,
    buildingsWithSoilGeology: city.buildings.filter((building) => building.soilGeologyZoneIds?.length).length
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

function createDevelopmentPhasingDiagnostics(city: GeneratedCity): DevelopmentPhasingDiagnostics {
  const closureRoads = new Set<string>();
  const temporaryRoads = new Set<string>();
  const temporaryParks = new Set<string>();
  let unlockLinks = 0;

  for (const phase of city.developmentPhases) {
    unlockLinks += phase.unlocksAfterPhaseIds.length + phase.unlocksObjectIds.length;

    for (const roadId of phase.closureRoadIds) {
      closureRoads.add(roadId);
    }

    for (const roadId of phase.temporaryRoadIds) {
      temporaryRoads.add(roadId);
    }

    for (const parkId of phase.temporaryParkIds) {
      temporaryParks.add(parkId);
    }
  }

  return {
    total: city.developmentPhases.length,
    active: city.developmentPhases.filter((phase) => phase.status === 'active').length,
    planned: city.developmentPhases.filter((phase) => phase.status === 'planned').length,
    temporary: city.developmentPhases.filter((phase) => phase.status === 'temporary').length,
    completed: city.developmentPhases.filter((phase) => phase.status === 'completed').length,
    futureExpansionPhases: city.developmentPhases.filter((phase) => phase.phaseKind === 'future-expansion').length,
    temporaryConditionPhases: city.developmentPhases.filter((phase) => phase.phaseKind === 'temporary-condition').length,
    closureRoads: closureRoads.size,
    temporaryRoads: temporaryRoads.size,
    temporaryParks: temporaryParks.size,
    unlockLinks,
    maxSequence: Math.max(...city.developmentPhases.map((phase) => phase.sequence)),
    phaseNames: city.developmentPhases.map((phase) => phase.name ?? phase.id)
  };
}

function createParkExpansionDiagnostics(city: GeneratedCity): ParkExpansionDiagnostics {
  const byKind: Record<string, number> = {};
  const byProgram: Record<string, number> = {};
  const sidewalkConnections = new Set<string>();

  for (const feature of city.parkFeatures) {
    byKind[feature.featureKind] = (byKind[feature.featureKind] ?? 0) + 1;
    byProgram[feature.programKind] = (byProgram[feature.programKind] ?? 0) + 1;

    for (const sidewalkId of feature.connectedSidewalkIds) {
      sidewalkConnections.add(`${feature.parkId}:${sidewalkId}`);
    }
  }

  for (const park of city.parks) {
    for (const sidewalkId of park.connectedSidewalkIds) {
      sidewalkConnections.add(`${park.id}:${sidewalkId}`);
    }
  }

  return {
    totalFeatures: city.parkFeatures.length,
    pathFeatures: city.parkFeatures.filter((feature) => feature.featureKind === 'path').length,
    programZones: city.parkFeatures.filter((feature) => feature.featureKind !== 'path').length,
    accessibleFeatures: city.parkFeatures.filter((feature) => feature.accessible).length,
    connectedParks: city.parks.filter((park) => park.connectedSidewalkIds.length > 0).length,
    sidewalkConnections: sidewalkConnections.size,
    byKind,
    byProgram
  };
}

function createPlazaModelDiagnostics(city: GeneratedCity): PlazaModelDiagnostics {
  const byKind: Record<string, number> = {};
  const byPavingTier: Record<string, number> = {};
  const activeFrontages = new Set<string>();
  const connectedSidewalks = new Set<string>();

  for (const zone of city.plazaZones) {
    byKind[zone.zoneKind] = (byKind[zone.zoneKind] ?? 0) + 1;
    byPavingTier[zone.pavingTier] = (byPavingTier[zone.pavingTier] ?? 0) + 1;

    for (const frontageId of zone.activeFrontageIds) {
      activeFrontages.add(frontageId);
    }

    for (const sidewalkId of zone.connectedSidewalkIds) {
      connectedSidewalks.add(`${zone.plazaId}:${sidewalkId}`);
    }
  }

  return {
    totalZones: city.plazaZones.length,
    eventZones: city.plazaZones.filter((zone) => zone.zoneKind === 'event').length,
    activeEdges: city.plazaZones.filter((zone) => zone.zoneKind === 'active-edge').length,
    linkedActiveFrontages: activeFrontages.size,
    eventCapacityPeople: city.plazaZones.reduce((sum, zone) => sum + zone.eventCapacityPeople, 0),
    connectedSidewalks: connectedSidewalks.size,
    byKind,
    byPavingTier
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
