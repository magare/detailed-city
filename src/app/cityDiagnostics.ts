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
  CivicAnchorServiceType,
  CityObjectIndex,
  CommunityAnchorKind,
  CultureAnchorKind,
  GovernmentAnchorKind,
  SourceType,
  WeatherPresetKind,
  WeatherSeason
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
  readonly cadastreModel: CadastreModelDiagnostics;
  readonly utilityBase: UtilityBaseDiagnostics;
  readonly powerGrid: PowerGridDiagnostics;
  readonly waterSupply: WaterSupplyDiagnostics;
  readonly wastewater: WastewaterDiagnostics;
  readonly stormwater: StormwaterDiagnostics;
  readonly telecom: TelecomDiagnostics;
  readonly zoningModel: ZoningModelDiagnostics;
  readonly buildingTypologies: BuildingTypologyDiagnostics;
  readonly buildingFootprints: BuildingFootprintDiagnostics;
  readonly buildingStructureShells: BuildingStructureShellDiagnostics;
  readonly buildingFacades: BuildingFacadeDiagnostics;
  readonly buildingRoofs: BuildingRoofDiagnostics;
  readonly civicAnchors: CivicAnchorDiagnostics;
  readonly communityAnchors: CommunityAnchorDiagnostics;
  readonly cultureAnchors: CultureAnchorDiagnostics;
  readonly governmentAnchors: GovernmentAnchorDiagnostics;
  readonly roadNetwork: RoadNetworkDiagnostics;
  readonly laneRestrictions: LaneRestrictionDiagnostics;
  readonly intersectionBehavior: IntersectionBehaviorDiagnostics;
  readonly crossingDetails: CrossingDetailDiagnostics;
  readonly sidewalkAccessibility: SidewalkAccessibilityDiagnostics;
  readonly trafficCalming: TrafficCalmingDiagnostics;
  readonly waterwayNetwork: WaterwayNetworkDiagnostics;
  readonly waterfrontModel: WaterfrontModelDiagnostics;
  readonly waterfrontOpenSpace: WaterfrontOpenSpaceDiagnostics;
  readonly hazardLayer: HazardLayerDiagnostics;
  readonly topography: TopographyDiagnostics;
  readonly soilGeology: SoilGeologyDiagnostics;
  readonly districtCharacter: DistrictCharacterDiagnostics;
  readonly cityMetrics: CityMetricDiagnostics;
  readonly climateWeather: ClimateWeatherDiagnostics;
  readonly solarShading: SolarShadingDiagnostics;
  readonly urbanHeat: UrbanHeatDiagnostics;
  readonly developmentPhasing: DevelopmentPhasingDiagnostics;
  readonly parkExpansion: ParkExpansionDiagnostics;
  readonly plazaModel: PlazaModelDiagnostics;
  readonly plantingModel: PlantingModelDiagnostics;
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
    readonly cadastreRecords: number;
    readonly parcelsWithCadastre: number;
    readonly cadastreEasements: number;
    readonly utilityNodes: number;
    readonly utilityEdges: number;
    readonly utilityNetworkTypes: number;
    readonly utilityServiceParcels: number;
    readonly utilityCriticalObjects: number;
    readonly utilityBackupNodes: number;
    readonly utilityHighCriticalityNodes: number;
    readonly powerGridNodes: number;
    readonly powerGridEdges: number;
    readonly powerTransformers: number;
    readonly powerMeters: number;
    readonly powerStreetLightCircuits: number;
    readonly buildingsWithPowerService: number;
    readonly streetLightsWithPowerCircuit: number;
    readonly waterSupplyNodes: number;
    readonly waterSupplyEdges: number;
    readonly waterHydrants: number;
    readonly waterValves: number;
    readonly waterPumps: number;
    readonly waterTanks: number;
    readonly buildingsWithWaterService: number;
    readonly wastewaterNodes: number;
    readonly wastewaterEdges: number;
    readonly wastewaterManholes: number;
    readonly wastewaterLiftStations: number;
    readonly wastewaterOutfalls: number;
    readonly buildingsWithWastewaterService: number;
    readonly stormwaterNodes: number;
    readonly stormwaterEdges: number;
    readonly stormwaterInlets: number;
    readonly stormwaterBioswales: number;
    readonly stormwaterCulverts: number;
    readonly roadsWithStormwaterDrainage: number;
    readonly telecomNodes: number;
    readonly telecomEdges: number;
    readonly telecomCellSites: number;
    readonly telecomAntennas: number;
    readonly buildingsWithTelecomService: number;
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
    readonly waterfrontOpenSpaces: number;
    readonly waterfrontOpenSpaceSeating: number;
    readonly waterfrontOpenSpaceRailings: number;
    readonly waterfrontWaterAccessPoints: number;
    readonly waterfrontEcologicalOpenSpaces: number;
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
    readonly weatherPresets: number;
    readonly activeWeatherPresets: number;
    readonly rainyWeatherPresets: number;
    readonly fogWeatherPresets: number;
    readonly monsoonWeatherPresets: number;
    readonly solarShadingSamples: number;
    readonly roofSolarSamples: number;
    readonly shadeComfortSamples: number;
    readonly urbanHeatZones: number;
    readonly urbanHeatHighRiskZones: number;
    readonly urbanHeatPublicRouteRiskZones: number;
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
    readonly civicAnchors: number;
    readonly civicAnchorServiceTypes: number;
    readonly civicAnchorDailyVisitors: number;
    readonly civicAnchorStaff: number;
    readonly civicAnchorEmergencyAccess: number;
    readonly communityAnchors: number;
    readonly communityAnchorKinds: number;
    readonly communityDailyVisitors: number;
    readonly communityEventCapacity: number;
    readonly communitySocialServiceCapacity: number;
    readonly communityShelterCapacity: number;
    readonly communityCoverageScore: number;
    readonly communityCrowdReadyAnchors: number;
    readonly communityFoodDistributionAnchors: number;
    readonly cultureAnchors: number;
    readonly cultureAnchorKinds: number;
    readonly cultureFootfallDaily: number;
    readonly cultureEventCapacity: number;
    readonly cultureTourismScore: number;
    readonly cultureEveningAnchors: number;
    readonly cultureHeritageAnchors: number;
    readonly governmentAnchors: number;
    readonly governmentAnchorKinds: number;
    readonly governmentServiceCounters: number;
    readonly governmentDailyVisitors: number;
    readonly governmentStaffCapacity: number;
    readonly governmentPlazaLinks: number;
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
    readonly planterTrees: number;
    readonly greenCorridors: number;
    readonly treeCanopyAreaSquareMeters: number;
    readonly treeSoilVolumeCubicMeters: number;
    readonly streetLights: number;
    readonly streetFurniture: number;
    readonly detailedStreetFurniture: number;
    readonly citywideStreetFurniture: number;
    readonly railings: number;
    readonly transitShelters: number;
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

export interface CadastreModelDiagnostics {
  readonly total: number;
  readonly parcelsWithCadastre: number;
  readonly easements: number;
  readonly recordsWithBuildRights: number;
  readonly tenureCounts: Readonly<Record<string, number>>;
  readonly totalAssessedLandValue: number;
}

export interface UtilityBaseDiagnostics {
  readonly nodes: number;
  readonly edges: number;
  readonly networkTypes: number;
  readonly serviceParcels: number;
  readonly criticalObjects: number;
  readonly backupNodes: number;
  readonly highCriticalityNodes: number;
  readonly totalCapacityByUnit: Readonly<Record<string, number>>;
  readonly serviceAreaBoundaryIds: readonly string[];
  readonly ownerEntityIds: readonly string[];
}

export interface PowerGridDiagnostics {
  readonly nodes: number;
  readonly edges: number;
  readonly transformers: number;
  readonly switchgear: number;
  readonly meters: number;
  readonly streetLightCircuits: number;
  readonly backupSupplyNodes: number;
  readonly buildingsServed: number;
  readonly streetLightsServed: number;
  readonly totalCapacityKva: number;
  readonly circuitIds: readonly string[];
  readonly outageDomainIds: readonly string[];
}

export interface WaterSupplyDiagnostics {
  readonly nodes: number;
  readonly edges: number;
  readonly hydrants: number;
  readonly valves: number;
  readonly pumps: number;
  readonly tanks: number;
  readonly meters: number;
  readonly pressureZones: number;
  readonly buildingsServed: number;
  readonly totalCapacityLitersPerSecond: number;
  readonly pressureZoneIds: readonly string[];
  readonly outageDomainIds: readonly string[];
}

export interface WastewaterDiagnostics {
  readonly nodes: number;
  readonly edges: number;
  readonly manholes: number;
  readonly liftStations: number;
  readonly outfalls: number;
  readonly serviceConnections: number;
  readonly treatmentPlants: number;
  readonly buildingsServed: number;
  readonly pretreatmentBuildings: number;
  readonly totalCapacityLitersPerSecond: number;
  readonly sewerBasinIds: readonly string[];
  readonly receivingWaterwayIds: readonly string[];
  readonly outageDomainIds: readonly string[];
}

export interface StormwaterDiagnostics {
  readonly nodes: number;
  readonly edges: number;
  readonly inlets: number;
  readonly drains: number;
  readonly bioswales: number;
  readonly detentionBasins: number;
  readonly culverts: number;
  readonly outfalls: number;
  readonly perviousAreas: number;
  readonly roadsDrained: number;
  readonly hazardZonesReferenced: number;
  readonly totalCapacityLitersPerSecond: number;
  readonly catchmentIds: readonly string[];
  readonly receivingWaterwayIds: readonly string[];
  readonly outageDomainIds: readonly string[];
}

export interface TelecomDiagnostics {
  readonly nodes: number;
  readonly edges: number;
  readonly fiberHubs: number;
  readonly cabinets: number;
  readonly ductBanks: number;
  readonly cellSites: number;
  readonly antennas: number;
  readonly buildingsServed: number;
  readonly criticalBuildingsServed: number;
  readonly totalCapacityMbps: number;
  readonly networkZoneIds: readonly string[];
  readonly coverageAssumptionIds: readonly string[];
  readonly outageDomainIds: readonly string[];
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

export interface CivicAnchorDiagnostics {
  readonly total: number;
  readonly byServiceType: Readonly<Partial<Record<CivicAnchorServiceType, number>>>;
  readonly serviceTypes: number;
  readonly dailyVisitors: number;
  readonly staff: number;
  readonly emergencyAccessAnchors: number;
  readonly arrivalModes: readonly string[];
  readonly scheduleProfiles: readonly string[];
  readonly averageCatchmentRadiusMeters: number;
}

export interface GovernmentAnchorDiagnostics {
  readonly total: number;
  readonly byKind: Readonly<Partial<Record<GovernmentAnchorKind, number>>>;
  readonly anchorKinds: number;
  readonly serviceCounters: number;
  readonly dailyVisitors: number;
  readonly staffCapacity: number;
  readonly queueCapacityPeople: number;
  readonly ceremonialCapacityPeople: number;
  readonly plazaLinkedAnchors: number;
  readonly securityScreenedAnchors: number;
  readonly publicAccessAnchors: number;
}

export interface CultureAnchorDiagnostics {
  readonly total: number;
  readonly byKind: Readonly<Partial<Record<CultureAnchorKind, number>>>;
  readonly anchorKinds: number;
  readonly culturalFootfallDaily: number;
  readonly staffCapacity: number;
  readonly eventCapacityPeople: number;
  readonly tourismAttractionScore: number;
  readonly eveningActivityAnchors: number;
  readonly heritageAnchors: number;
  readonly plazaLinkedAnchors: number;
  readonly scheduleProfiles: readonly string[];
}

export interface CommunityAnchorDiagnostics {
  readonly total: number;
  readonly byKind: Readonly<Partial<Record<CommunityAnchorKind, number>>>;
  readonly anchorKinds: number;
  readonly dailyVisitors: number;
  readonly staffCapacity: number;
  readonly eventCapacityPeople: number;
  readonly socialServiceCapacityPeople: number;
  readonly shelterCapacityPeople: number;
  readonly communityCoverageScore: number;
  readonly crowdEventReadyAnchors: number;
  readonly foodDistributionAnchors: number;
  readonly cemeteryCapacityPlots: number;
  readonly plazaLinkedAnchors: number;
  readonly scheduleProfiles: readonly string[];
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

export interface WaterfrontOpenSpaceDiagnostics {
  readonly total: number;
  readonly byKind: Readonly<Record<string, number>>;
  readonly publicAccessSpaces: number;
  readonly accessibleSpaces: number;
  readonly seatingCapacity: number;
  readonly railingLengthMeters: number;
  readonly waterAccessPoints: number;
  readonly ecologicalSpaces: number;
  readonly linkedRoads: number;
  readonly linkedParks: number;
  readonly linkedFurniture: number;
  readonly linkedShadeTrees: number;
  readonly surfaces: readonly string[];
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

export interface ClimateWeatherDiagnostics {
  readonly total: number;
  readonly activePresetId: string;
  readonly activePresetKind: WeatherPresetKind;
  readonly activeSeason: WeatherSeason;
  readonly activeVisibilityMeters: number;
  readonly activeSurfaceWetness: number;
  readonly activeTrafficSpeedMultiplier: number;
  readonly rainyPresets: number;
  readonly fogPresets: number;
  readonly monsoonPresets: number;
  readonly seasons: readonly WeatherSeason[];
  readonly maxCloudCover: number;
  readonly maxSurfaceWetness: number;
  readonly maxPuddleCoverage: number;
  readonly minVisibilityMeters: number;
  readonly maxWindSpeedKph: number;
  readonly highDrainagePresets: number;
}

export interface SolarShadingDiagnostics {
  readonly total: number;
  readonly roofSolarSamples: number;
  readonly shadeComfortSamples: number;
  readonly highGlareSamples: number;
  readonly averageComfortScore: number;
  readonly averageShadeCoverage: number;
  readonly totalSolarPotentialKwhPerDay: number;
  readonly maxRoofSuitabilityScore: number;
  readonly peakSunHour: number;
  readonly weatherPresetIds: readonly string[];
}

export interface UrbanHeatDiagnostics {
  readonly total: number;
  readonly heatIslandZones: number;
  readonly coolRoofZones: number;
  readonly canopyCoolingZones: number;
  readonly waterCoolingZones: number;
  readonly publicRouteRiskZones: number;
  readonly highRiskZones: number;
  readonly criticalRiskZones: number;
  readonly averageHeatRiskScore: number;
  readonly averageMitigationEffectScore: number;
  readonly averageShadeCoverage: number;
  readonly averageTreeCanopyCoolingScore: number;
  readonly averageWaterCoolingScore: number;
  readonly maxDaytimeTemperatureDeltaCelsius: number;
  readonly weatherPresetIds: readonly string[];
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

export interface PlantingModelDiagnostics {
  readonly totalTrees: number;
  readonly streetTrees: number;
  readonly parkTrees: number;
  readonly planterTrees: number;
  readonly greenCorridors: number;
  readonly canopyAreaSquareMeters: number;
  readonly soilVolumeCubicMeters: number;
  readonly averageHeatMitigationScore: number;
  readonly averageEcologyScore: number;
  readonly bySpecies: Readonly<Record<string, number>>;
  readonly bySeasonalColor: Readonly<Record<string, number>>;
  readonly byCorridorRole: Readonly<Record<string, number>>;
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
  const cadastreModel = createCadastreModelDiagnostics(city);
  const utilityBase = createUtilityBaseDiagnostics(city);
  const powerGrid = createPowerGridDiagnostics(city);
  const waterSupply = createWaterSupplyDiagnostics(city);
  const wastewater = createWastewaterDiagnostics(city);
  const stormwater = createStormwaterDiagnostics(city);
  const telecom = createTelecomDiagnostics(city);
  const zoningModel = createZoningModelDiagnostics(city);
  const buildingTypologies = createBuildingTypologyDiagnostics(city);
  const buildingFootprints = createBuildingFootprintDiagnostics(city);
  const buildingStructureShells = createBuildingStructureShellDiagnostics(city);
  const buildingFacades = createBuildingFacadeDiagnostics(city);
  const buildingRoofs = createBuildingRoofDiagnostics(city);
  const civicAnchors = createCivicAnchorDiagnostics(city);
  const communityAnchors = createCommunityAnchorDiagnostics(city);
  const cultureAnchors = createCultureAnchorDiagnostics(city);
  const governmentAnchors = createGovernmentAnchorDiagnostics(city);
  const roadNetwork = createRoadNetworkDiagnostics(city);
  const laneRestrictions = createLaneRestrictionDiagnostics(city);
  const intersectionBehavior = createIntersectionBehaviorDiagnostics(city);
  const crossingDetails = createCrossingDetailDiagnostics(city);
  const sidewalkAccessibility = createSidewalkAccessibilityDiagnostics(city);
  const trafficCalming = createTrafficCalmingDiagnostics(city);
  const waterwayNetwork = createWaterwayNetworkDiagnostics(city);
  const waterfrontModel = createWaterfrontModelDiagnostics(city);
  const waterfrontOpenSpace = createWaterfrontOpenSpaceDiagnostics(city);
  const hazardLayer = createHazardLayerDiagnostics(city);
  const topography = createTopographyDiagnostics(city);
  const soilGeology = createSoilGeologyDiagnostics(city);
  const districtCharacter = createDistrictCharacterDiagnostics();
  const cityMetrics = createCityMetricDiagnostics(city);
  const climateWeather = createClimateWeatherDiagnostics(city);
  const solarShading = createSolarShadingDiagnostics(city);
  const urbanHeat = createUrbanHeatDiagnostics(city);
  const developmentPhasing = createDevelopmentPhasingDiagnostics(city);
  const parkExpansion = createParkExpansionDiagnostics(city);
  const plazaModel = createPlazaModelDiagnostics(city);
  const plantingModel = createPlantingModelDiagnostics(city);
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
    cadastreModel,
    utilityBase,
    powerGrid,
    waterSupply,
    wastewater,
    stormwater,
    telecom,
    zoningModel,
    buildingTypologies,
    buildingFootprints,
    buildingStructureShells,
    buildingFacades,
    buildingRoofs,
    civicAnchors,
    communityAnchors,
    cultureAnchors,
    governmentAnchors,
    roadNetwork,
    laneRestrictions,
    intersectionBehavior,
    crossingDetails,
    sidewalkAccessibility,
    trafficCalming,
    waterwayNetwork,
    waterfrontModel,
    waterfrontOpenSpace,
    hazardLayer,
    topography,
    soilGeology,
    districtCharacter,
    cityMetrics,
    climateWeather,
    solarShading,
    urbanHeat,
    developmentPhasing,
    parkExpansion,
    plazaModel,
    plantingModel,
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
      cadastreRecords: cadastreModel.total,
      parcelsWithCadastre: cadastreModel.parcelsWithCadastre,
      cadastreEasements: cadastreModel.easements,
      utilityNodes: utilityBase.nodes,
      utilityEdges: utilityBase.edges,
      utilityNetworkTypes: utilityBase.networkTypes,
      utilityServiceParcels: utilityBase.serviceParcels,
      utilityCriticalObjects: utilityBase.criticalObjects,
      utilityBackupNodes: utilityBase.backupNodes,
      utilityHighCriticalityNodes: utilityBase.highCriticalityNodes,
      powerGridNodes: powerGrid.nodes,
      powerGridEdges: powerGrid.edges,
      powerTransformers: powerGrid.transformers,
      powerMeters: powerGrid.meters,
      powerStreetLightCircuits: powerGrid.streetLightCircuits,
      buildingsWithPowerService: powerGrid.buildingsServed,
      streetLightsWithPowerCircuit: powerGrid.streetLightsServed,
      waterSupplyNodes: waterSupply.nodes,
      waterSupplyEdges: waterSupply.edges,
      waterHydrants: waterSupply.hydrants,
      waterValves: waterSupply.valves,
      waterPumps: waterSupply.pumps,
      waterTanks: waterSupply.tanks,
      buildingsWithWaterService: waterSupply.buildingsServed,
      wastewaterNodes: wastewater.nodes,
      wastewaterEdges: wastewater.edges,
      wastewaterManholes: wastewater.manholes,
      wastewaterLiftStations: wastewater.liftStations,
      wastewaterOutfalls: wastewater.outfalls,
      buildingsWithWastewaterService: wastewater.buildingsServed,
      stormwaterNodes: stormwater.nodes,
      stormwaterEdges: stormwater.edges,
      stormwaterInlets: stormwater.inlets,
      stormwaterBioswales: stormwater.bioswales,
      stormwaterCulverts: stormwater.culverts,
      roadsWithStormwaterDrainage: stormwater.roadsDrained,
      telecomNodes: telecom.nodes,
      telecomEdges: telecom.edges,
      telecomCellSites: telecom.cellSites,
      telecomAntennas: telecom.antennas,
      buildingsWithTelecomService: telecom.buildingsServed,
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
      waterfrontOpenSpaces: waterfrontOpenSpace.total,
      waterfrontOpenSpaceSeating: waterfrontOpenSpace.seatingCapacity,
      waterfrontOpenSpaceRailings: waterfrontOpenSpace.railingLengthMeters,
      waterfrontWaterAccessPoints: waterfrontOpenSpace.waterAccessPoints,
      waterfrontEcologicalOpenSpaces: waterfrontOpenSpace.ecologicalSpaces,
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
      weatherPresets: climateWeather.total,
      activeWeatherPresets: city.weatherPresets.filter((preset) => preset.active).length,
      rainyWeatherPresets: climateWeather.rainyPresets,
      fogWeatherPresets: climateWeather.fogPresets,
      monsoonWeatherPresets: climateWeather.monsoonPresets,
      solarShadingSamples: solarShading.total,
      roofSolarSamples: solarShading.roofSolarSamples,
      shadeComfortSamples: solarShading.shadeComfortSamples,
      urbanHeatZones: urbanHeat.total,
      urbanHeatHighRiskZones: urbanHeat.highRiskZones,
      urbanHeatPublicRouteRiskZones: urbanHeat.publicRouteRiskZones,
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
      civicAnchors: civicAnchors.total,
      civicAnchorServiceTypes: civicAnchors.serviceTypes,
      civicAnchorDailyVisitors: civicAnchors.dailyVisitors,
      civicAnchorStaff: civicAnchors.staff,
      civicAnchorEmergencyAccess: civicAnchors.emergencyAccessAnchors,
      communityAnchors: communityAnchors.total,
      communityAnchorKinds: communityAnchors.anchorKinds,
      communityDailyVisitors: communityAnchors.dailyVisitors,
      communityEventCapacity: communityAnchors.eventCapacityPeople,
      communitySocialServiceCapacity: communityAnchors.socialServiceCapacityPeople,
      communityShelterCapacity: communityAnchors.shelterCapacityPeople,
      communityCoverageScore: communityAnchors.communityCoverageScore,
      communityCrowdReadyAnchors: communityAnchors.crowdEventReadyAnchors,
      communityFoodDistributionAnchors: communityAnchors.foodDistributionAnchors,
      cultureAnchors: cultureAnchors.total,
      cultureAnchorKinds: cultureAnchors.anchorKinds,
      cultureFootfallDaily: cultureAnchors.culturalFootfallDaily,
      cultureEventCapacity: cultureAnchors.eventCapacityPeople,
      cultureTourismScore: cultureAnchors.tourismAttractionScore,
      cultureEveningAnchors: cultureAnchors.eveningActivityAnchors,
      cultureHeritageAnchors: cultureAnchors.heritageAnchors,
      governmentAnchors: governmentAnchors.total,
      governmentAnchorKinds: governmentAnchors.anchorKinds,
      governmentServiceCounters: governmentAnchors.serviceCounters,
      governmentDailyVisitors: governmentAnchors.dailyVisitors,
      governmentStaffCapacity: governmentAnchors.staffCapacity,
      governmentPlazaLinks: governmentAnchors.plazaLinkedAnchors,
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
      planterTrees: plantingModel.planterTrees,
      greenCorridors: plantingModel.greenCorridors,
      treeCanopyAreaSquareMeters: plantingModel.canopyAreaSquareMeters,
      treeSoilVolumeCubicMeters: plantingModel.soilVolumeCubicMeters,
      streetLights: city.streetLights.length,
      streetFurniture: city.streetFurniture.length,
      detailedStreetFurniture: city.streetFurniture.filter((item) => item.placementContext === 'detailed-street').length,
      citywideStreetFurniture: city.streetFurniture.filter((item) => item.placementContext === 'citywide-street').length,
      railings: city.streetFurniture.filter((item) => item.furnitureType === 'railing').length,
      transitShelters: city.streetFurniture.filter((item) => item.furnitureType === 'bus-shelter').length,
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

function createCadastreModelDiagnostics(city: GeneratedCity): CadastreModelDiagnostics {
  const tenureCounts: Record<string, number> = {};
  const recordIds = new Set(city.cadastreRecords.map((record) => record.id));

  for (const record of city.cadastreRecords) {
    tenureCounts[record.tenure] = (tenureCounts[record.tenure] ?? 0) + 1;
  }

  return {
    total: city.cadastreRecords.length,
    parcelsWithCadastre: city.parcels.filter((parcel) => recordIds.has(parcel.cadastreRecordId)).length,
    easements: city.cadastreRecords.reduce((sum, record) => sum + record.easements.length, 0),
    recordsWithBuildRights: city.cadastreRecords.filter((record) =>
      record.rights.some((right) => right.rightKind === 'build')
    ).length,
    tenureCounts,
    totalAssessedLandValue: city.cadastreRecords.reduce((sum, record) => sum + record.assessedLandValue, 0)
  };
}

function createUtilityBaseDiagnostics(city: GeneratedCity): UtilityBaseDiagnostics {
  const networkTypes = new Set<string>();
  const serviceParcels = new Set<string>();
  const criticalObjects = new Set<string>();
  const serviceAreaBoundaryIds = new Set<string>();
  const ownerEntityIds = new Set<string>();
  const totalCapacityByUnit: Record<string, number> = {};

  let backupNodes = 0;
  let highCriticalityNodes = 0;

  for (const node of city.utilityNodes) {
    networkTypes.add(node.utilityType);
    serviceAreaBoundaryIds.add(node.serviceArea.serviceAreaBoundaryId);
    ownerEntityIds.add(node.ownerEntityId);
    totalCapacityByUnit[node.capacity.unit] = (totalCapacityByUnit[node.capacity.unit] ?? 0) + node.capacity.value;

    for (const parcelId of node.serviceArea.parcelIds) {
      serviceParcels.add(parcelId);
    }
    for (const objectId of node.serviceArea.criticalObjectIds) {
      criticalObjects.add(objectId);
    }
    if (node.outage.backupAvailable) {
      backupNodes += 1;
    }
    if (node.outage.criticality === 'high') {
      highCriticalityNodes += 1;
    }
  }

  for (const edge of city.utilityEdges) {
    networkTypes.add(edge.utilityType);
    serviceAreaBoundaryIds.add(edge.serviceAreaBoundaryId);
    ownerEntityIds.add(edge.ownerEntityId);
  }

  return {
    nodes: city.utilityNodes.length,
    edges: city.utilityEdges.length,
    networkTypes: networkTypes.size,
    serviceParcels: serviceParcels.size,
    criticalObjects: criticalObjects.size,
    backupNodes,
    highCriticalityNodes,
    totalCapacityByUnit,
    serviceAreaBoundaryIds: [...serviceAreaBoundaryIds].sort(),
    ownerEntityIds: [...ownerEntityIds].sort()
  };
}

function createPowerGridDiagnostics(city: GeneratedCity): PowerGridDiagnostics {
  const powerNodes = city.utilityNodes.filter((node) => node.utilityType === 'power');
  const powerEdges = city.utilityEdges.filter((edge) => edge.utilityType === 'power');
  const circuitIds = new Set<string>();
  const outageDomainIds = new Set<string>();

  for (const node of powerNodes) {
    if (node.powerGrid) {
      circuitIds.add(node.powerGrid.circuitId);
    }
    outageDomainIds.add(node.outage.outageDomainId);
  }
  for (const edge of powerEdges) {
    if (edge.powerGrid) {
      circuitIds.add(edge.powerGrid.circuitId);
    }
    outageDomainIds.add(edge.outageDomainId);
  }

  return {
    nodes: powerNodes.length,
    edges: powerEdges.length,
    transformers: powerNodes.filter((node) => node.powerGrid?.equipmentKind === 'transformer').length,
    switchgear: powerNodes.filter((node) => node.powerGrid?.equipmentKind === 'switchgear').length,
    meters: powerNodes.filter((node) => node.powerGrid?.equipmentKind === 'meter').length,
    streetLightCircuits: powerNodes.filter((node) => node.powerGrid?.equipmentKind === 'street-light-circuit').length,
    backupSupplyNodes: powerNodes.filter((node) => node.powerGrid?.equipmentKind === 'backup-supply').length,
    buildingsServed: city.buildings.filter((building) => Boolean(building.powerService)).length,
    streetLightsServed: city.streetLights.filter((light) => light.powerCircuitId && circuitIds.has(light.powerCircuitId)).length,
    totalCapacityKva: powerNodes.reduce((sum, node) => sum + (node.capacity.unit === 'kva' ? node.capacity.value : 0), 0),
    circuitIds: [...circuitIds].sort(),
    outageDomainIds: [...outageDomainIds].sort()
  };
}

function createWaterSupplyDiagnostics(city: GeneratedCity): WaterSupplyDiagnostics {
  const waterNodes = city.utilityNodes.filter((node) => node.utilityType === 'water');
  const waterEdges = city.utilityEdges.filter((edge) => edge.utilityType === 'water');
  const pressureZoneIds = new Set<string>();
  const outageDomainIds = new Set<string>();

  for (const node of waterNodes) {
    if (node.waterSupply) {
      pressureZoneIds.add(node.waterSupply.pressureZoneId);
    }
    outageDomainIds.add(node.outage.outageDomainId);
  }
  for (const edge of waterEdges) {
    if (edge.waterSupply) {
      pressureZoneIds.add(edge.waterSupply.pressureZoneId);
    }
    outageDomainIds.add(edge.outageDomainId);
  }

  return {
    nodes: waterNodes.length,
    edges: waterEdges.length,
    hydrants: waterNodes.filter((node) => node.waterSupply?.equipmentKind === 'hydrant').length,
    valves: waterNodes.filter((node) => node.waterSupply?.equipmentKind === 'valve').length,
    pumps: waterNodes.filter((node) => node.waterSupply?.equipmentKind === 'pump').length,
    tanks: waterNodes.filter((node) => node.waterSupply?.equipmentKind === 'tank').length,
    meters: waterNodes.filter((node) => node.waterSupply?.equipmentKind === 'meter').length,
    pressureZones: waterNodes.filter((node) => node.waterSupply?.equipmentKind === 'pressure-zone').length,
    buildingsServed: city.buildings.filter((building) => Boolean(building.waterService)).length,
    totalCapacityLitersPerSecond: waterNodes.reduce(
      (sum, node) => sum + (node.capacity.unit === 'liters-per-second' ? node.capacity.value : 0),
      0
    ),
    pressureZoneIds: [...pressureZoneIds].sort(),
    outageDomainIds: [...outageDomainIds].sort()
  };
}

function createWastewaterDiagnostics(city: GeneratedCity): WastewaterDiagnostics {
  const wastewaterNodes = city.utilityNodes.filter((node) => node.utilityType === 'wastewater');
  const wastewaterEdges = city.utilityEdges.filter((edge) => edge.utilityType === 'wastewater');
  const sewerBasinIds = new Set<string>();
  const receivingWaterwayIds = new Set<string>();
  const outageDomainIds = new Set<string>();

  for (const node of wastewaterNodes) {
    if (node.wastewater) {
      sewerBasinIds.add(node.wastewater.sewerBasinId);
      if (node.wastewater.receivingWaterwayId) {
        receivingWaterwayIds.add(node.wastewater.receivingWaterwayId);
      }
    }
    outageDomainIds.add(node.outage.outageDomainId);
  }
  for (const edge of wastewaterEdges) {
    if (edge.wastewater) {
      sewerBasinIds.add(edge.wastewater.sewerBasinId);
      if (edge.wastewater.receivingWaterwayId) {
        receivingWaterwayIds.add(edge.wastewater.receivingWaterwayId);
      }
    }
    outageDomainIds.add(edge.outageDomainId);
  }

  return {
    nodes: wastewaterNodes.length,
    edges: wastewaterEdges.length,
    manholes: wastewaterNodes.filter((node) => node.wastewater?.equipmentKind === 'manhole').length,
    liftStations: wastewaterNodes.filter((node) => node.wastewater?.equipmentKind === 'lift-station').length,
    outfalls: wastewaterNodes.filter((node) => node.wastewater?.equipmentKind === 'outfall').length,
    serviceConnections: wastewaterNodes.filter((node) => node.wastewater?.equipmentKind === 'service-connection').length,
    treatmentPlants: wastewaterNodes.filter((node) => node.wastewater?.equipmentKind === 'treatment-plant').length,
    buildingsServed: city.buildings.filter((building) => Boolean(building.wastewaterService)).length,
    pretreatmentBuildings: city.buildings.filter((building) => Boolean(building.wastewaterService?.pretreatmentRequired)).length,
    totalCapacityLitersPerSecond: wastewaterNodes.reduce(
      (sum, node) => sum + (node.capacity.unit === 'liters-per-second' ? node.capacity.value : 0),
      0
    ),
    sewerBasinIds: [...sewerBasinIds].sort(),
    receivingWaterwayIds: [...receivingWaterwayIds].sort(),
    outageDomainIds: [...outageDomainIds].sort()
  };
}

function createStormwaterDiagnostics(city: GeneratedCity): StormwaterDiagnostics {
  const stormwaterNodes = city.utilityNodes.filter((node) => node.utilityType === 'stormwater');
  const stormwaterEdges = city.utilityEdges.filter((edge) => edge.utilityType === 'stormwater');
  const catchmentIds = new Set<string>();
  const receivingWaterwayIds = new Set<string>();
  const outageDomainIds = new Set<string>();
  const hazardZoneIds = new Set<string>();

  for (const node of stormwaterNodes) {
    if (node.stormwater) {
      catchmentIds.add(node.stormwater.drainageCatchmentId);
      if (node.stormwater.receivingWaterwayId) {
        receivingWaterwayIds.add(node.stormwater.receivingWaterwayId);
      }
      for (const hazardZoneId of node.stormwater.servedHazardZoneIds) {
        hazardZoneIds.add(hazardZoneId);
      }
    }
    outageDomainIds.add(node.outage.outageDomainId);
  }
  for (const edge of stormwaterEdges) {
    if (edge.stormwater) {
      catchmentIds.add(edge.stormwater.drainageCatchmentId);
      if (edge.stormwater.receivingWaterwayId) {
        receivingWaterwayIds.add(edge.stormwater.receivingWaterwayId);
      }
    }
    outageDomainIds.add(edge.outageDomainId);
  }
  for (const road of city.roads) {
    for (const hazardZoneId of road.stormwaterDrainage?.floodHazardZoneIds ?? []) {
      hazardZoneIds.add(hazardZoneId);
    }
  }

  return {
    nodes: stormwaterNodes.length,
    edges: stormwaterEdges.length,
    inlets: stormwaterNodes.filter((node) => node.stormwater?.equipmentKind === 'inlet').length,
    drains: stormwaterNodes.filter((node) => node.stormwater?.equipmentKind === 'drain').length,
    bioswales: stormwaterNodes.filter((node) => node.stormwater?.equipmentKind === 'bioswale').length,
    detentionBasins: stormwaterNodes.filter((node) => node.stormwater?.equipmentKind === 'detention-basin').length,
    culverts: stormwaterNodes.filter((node) => node.stormwater?.equipmentKind === 'culvert').length,
    outfalls: stormwaterNodes.filter((node) => node.stormwater?.equipmentKind === 'outfall').length,
    perviousAreas: stormwaterNodes.filter((node) => node.stormwater?.equipmentKind === 'pervious-area').length,
    roadsDrained: city.roads.filter((road) => Boolean(road.stormwaterDrainage)).length,
    hazardZonesReferenced: hazardZoneIds.size,
    totalCapacityLitersPerSecond: stormwaterNodes.reduce(
      (sum, node) => sum + (node.capacity.unit === 'liters-per-second' ? node.capacity.value : 0),
      0
    ),
    catchmentIds: [...catchmentIds].sort(),
    receivingWaterwayIds: [...receivingWaterwayIds].sort(),
    outageDomainIds: [...outageDomainIds].sort()
  };
}

function createTelecomDiagnostics(city: GeneratedCity): TelecomDiagnostics {
  const telecomNodes = city.utilityNodes.filter((node) => node.utilityType === 'telecom');
  const telecomEdges = city.utilityEdges.filter((edge) => edge.utilityType === 'telecom');
  const networkZoneIds = new Set<string>();
  const coverageAssumptionIds = new Set<string>();
  const outageDomainIds = new Set<string>();

  for (const node of telecomNodes) {
    if (node.telecom) {
      networkZoneIds.add(node.telecom.networkZoneId);
      coverageAssumptionIds.add(node.telecom.coverageAssumptionId);
    }
    outageDomainIds.add(node.outage.outageDomainId);
  }
  for (const edge of telecomEdges) {
    if (edge.telecom) {
      coverageAssumptionIds.add(edge.telecom.coverageAssumptionId);
    }
    outageDomainIds.add(edge.outageDomainId);
  }

  return {
    nodes: telecomNodes.length,
    edges: telecomEdges.length,
    fiberHubs: telecomNodes.filter((node) => node.telecom?.equipmentKind === 'fiber-hub').length,
    cabinets: telecomNodes.filter((node) => node.telecom?.equipmentKind === 'cabinet').length,
    ductBanks: telecomNodes.filter((node) => node.telecom?.equipmentKind === 'duct-bank').length,
    cellSites: telecomNodes.filter((node) => node.telecom?.equipmentKind === 'cell-site').length,
    antennas: telecomNodes.filter((node) => node.telecom?.equipmentKind === 'antenna').length,
    buildingsServed: city.buildings.filter((building) => Boolean(building.telecomService)).length,
    criticalBuildingsServed: city.buildings.filter(
      (building) => isCriticalFacilityBuilding(building) && building.telecomService?.redundancyTier === 'critical-facility'
    ).length,
    totalCapacityMbps: telecomNodes.reduce((sum, node) => sum + (node.capacity.unit === 'mbps' ? node.capacity.value : 0), 0),
    networkZoneIds: [...networkZoneIds].sort(),
    coverageAssumptionIds: [...coverageAssumptionIds].sort(),
    outageDomainIds: [...outageDomainIds].sort()
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

function createCivicAnchorDiagnostics(city: GeneratedCity): CivicAnchorDiagnostics {
  const byServiceType: Partial<Record<CivicAnchorServiceType, number>> = {};
  const arrivalModes = new Set<string>();
  const scheduleProfiles = new Set<string>();
  let dailyVisitors = 0;
  let staff = 0;
  let emergencyAccessAnchors = 0;
  let catchmentRadiusTotal = 0;

  for (const anchor of city.civicAnchors) {
    byServiceType[anchor.serviceType] = (byServiceType[anchor.serviceType] ?? 0) + 1;
    dailyVisitors += anchor.capacity.dailyVisitors;
    staff += anchor.capacity.staff;
    catchmentRadiusTotal += anchor.catchment.radiusMeters;
    scheduleProfiles.add(anchor.schedule.scheduleProfileId);

    if (anchor.schedule.emergencyAccess) {
      emergencyAccessAnchors += 1;
    }

    for (const mode of anchor.arrivalModes) {
      arrivalModes.add(mode);
    }
  }

  return {
    total: city.civicAnchors.length,
    byServiceType,
    serviceTypes: Object.keys(byServiceType).length,
    dailyVisitors,
    staff,
    emergencyAccessAnchors,
    arrivalModes: [...arrivalModes].sort(),
    scheduleProfiles: [...scheduleProfiles].sort(),
    averageCatchmentRadiusMeters: Number((catchmentRadiusTotal / Math.max(1, city.civicAnchors.length)).toFixed(2))
  };
}

function createGovernmentAnchorDiagnostics(city: GeneratedCity): GovernmentAnchorDiagnostics {
  const byKind: Partial<Record<GovernmentAnchorKind, number>> = {};
  let serviceCounters = 0;
  let dailyVisitors = 0;
  let staffCapacity = 0;
  let queueCapacityPeople = 0;
  let ceremonialCapacityPeople = 0;
  let plazaLinkedAnchors = 0;
  let securityScreenedAnchors = 0;
  let publicAccessAnchors = 0;

  for (const anchor of city.governmentAnchors) {
    byKind[anchor.anchorKind] = (byKind[anchor.anchorKind] ?? 0) + 1;
    serviceCounters += anchor.serviceCounterCount;
    dailyVisitors += anchor.dailyVisitors;
    staffCapacity += anchor.staffCapacity;
    queueCapacityPeople += anchor.queueCapacityPeople;
    ceremonialCapacityPeople += anchor.ceremonialCapacityPeople;

    if (anchor.plazaZoneIds.length > 0) {
      plazaLinkedAnchors += 1;
    }

    if (anchor.securityScreening) {
      securityScreenedAnchors += 1;
    }

    if (anchor.publicAccess) {
      publicAccessAnchors += 1;
    }
  }

  return {
    total: city.governmentAnchors.length,
    byKind,
    anchorKinds: Object.keys(byKind).length,
    serviceCounters,
    dailyVisitors,
    staffCapacity,
    queueCapacityPeople,
    ceremonialCapacityPeople,
    plazaLinkedAnchors,
    securityScreenedAnchors,
    publicAccessAnchors
  };
}

function createCultureAnchorDiagnostics(city: GeneratedCity): CultureAnchorDiagnostics {
  const byKind: Partial<Record<CultureAnchorKind, number>> = {};
  const scheduleProfiles = new Set<string>();
  let culturalFootfallDaily = 0;
  let staffCapacity = 0;
  let eventCapacityPeople = 0;
  let tourismAttractionScore = 0;
  let eveningActivityAnchors = 0;
  let heritageAnchors = 0;
  let plazaLinkedAnchors = 0;

  for (const anchor of city.cultureAnchors) {
    byKind[anchor.anchorKind] = (byKind[anchor.anchorKind] ?? 0) + 1;
    culturalFootfallDaily += anchor.culturalFootfallDaily;
    staffCapacity += anchor.staffCapacity;
    eventCapacityPeople += anchor.eventCapacityPeople;
    tourismAttractionScore += anchor.tourismAttractionScore;
    scheduleProfiles.add(anchor.scheduleProfileId);

    if (anchor.eveningActivity) {
      eveningActivityAnchors += 1;
    }

    if (anchor.heritageProtected) {
      heritageAnchors += 1;
    }

    if (anchor.plazaZoneIds.length > 0) {
      plazaLinkedAnchors += 1;
    }
  }

  return {
    total: city.cultureAnchors.length,
    byKind,
    anchorKinds: Object.keys(byKind).length,
    culturalFootfallDaily,
    staffCapacity,
    eventCapacityPeople,
    tourismAttractionScore,
    eveningActivityAnchors,
    heritageAnchors,
    plazaLinkedAnchors,
    scheduleProfiles: [...scheduleProfiles].sort()
  };
}

function createCommunityAnchorDiagnostics(city: GeneratedCity): CommunityAnchorDiagnostics {
  const byKind: Partial<Record<CommunityAnchorKind, number>> = {};
  const scheduleProfiles = new Set<string>();
  let dailyVisitors = 0;
  let staffCapacity = 0;
  let eventCapacityPeople = 0;
  let socialServiceCapacityPeople = 0;
  let shelterCapacityPeople = 0;
  let communityCoverageScore = 0;
  let crowdEventReadyAnchors = 0;
  let foodDistributionAnchors = 0;
  let cemeteryCapacityPlots = 0;
  let plazaLinkedAnchors = 0;

  for (const anchor of city.communityAnchors) {
    byKind[anchor.anchorKind] = (byKind[anchor.anchorKind] ?? 0) + 1;
    dailyVisitors += anchor.dailyVisitors;
    staffCapacity += anchor.staffCapacity;
    eventCapacityPeople += anchor.eventCapacityPeople;
    socialServiceCapacityPeople += anchor.socialServiceCapacityPeople;
    shelterCapacityPeople += anchor.shelterCapacityPeople;
    communityCoverageScore += anchor.communityCoverageScore;
    cemeteryCapacityPlots += anchor.cemeteryCapacityPlots;
    scheduleProfiles.add(anchor.scheduleProfileId);

    if (anchor.crowdEventReady) {
      crowdEventReadyAnchors += 1;
    }

    if (anchor.foodDistribution) {
      foodDistributionAnchors += 1;
    }

    if (anchor.plazaZoneIds.length > 0) {
      plazaLinkedAnchors += 1;
    }
  }

  return {
    total: city.communityAnchors.length,
    byKind,
    anchorKinds: Object.keys(byKind).length,
    dailyVisitors,
    staffCapacity,
    eventCapacityPeople,
    socialServiceCapacityPeople,
    shelterCapacityPeople,
    communityCoverageScore,
    crowdEventReadyAnchors,
    foodDistributionAnchors,
    cemeteryCapacityPlots,
    plazaLinkedAnchors,
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

function createWaterfrontOpenSpaceDiagnostics(city: GeneratedCity): WaterfrontOpenSpaceDiagnostics {
  const byKind: Record<string, number> = {};
  const linkedRoads = new Set<string>();
  const linkedParks = new Set<string>();
  const linkedFurniture = new Set<string>();
  const linkedShadeTrees = new Set<string>();

  for (const openSpace of city.waterfrontOpenSpaces) {
    byKind[openSpace.openSpaceKind] = (byKind[openSpace.openSpaceKind] ?? 0) + 1;

    for (const roadId of openSpace.connectedRoadIds) {
      linkedRoads.add(roadId);
    }

    for (const parkId of openSpace.connectedParkIds) {
      linkedParks.add(parkId);
    }

    for (const furnitureId of openSpace.nearbyFurnitureIds) {
      linkedFurniture.add(furnitureId);
    }

    for (const treeId of openSpace.shadeTreeIds) {
      linkedShadeTrees.add(treeId);
    }
  }

  return {
    total: city.waterfrontOpenSpaces.length,
    byKind,
    publicAccessSpaces: city.waterfrontOpenSpaces.filter((openSpace) => openSpace.publicAccess).length,
    accessibleSpaces: city.waterfrontOpenSpaces.filter((openSpace) => openSpace.accessible).length,
    seatingCapacity: city.waterfrontOpenSpaces.reduce((sum, openSpace) => sum + openSpace.seatingCapacity, 0),
    railingLengthMeters: city.waterfrontOpenSpaces.reduce((sum, openSpace) => sum + openSpace.railingLengthMeters, 0),
    waterAccessPoints: city.waterfrontOpenSpaces.filter((openSpace) => openSpace.waterAccessPoint).length,
    ecologicalSpaces: city.waterfrontOpenSpaces.filter((openSpace) => openSpace.openSpaceKind === 'ecological-edge').length,
    linkedRoads: linkedRoads.size,
    linkedParks: linkedParks.size,
    linkedFurniture: linkedFurniture.size,
    linkedShadeTrees: linkedShadeTrees.size,
    surfaces: [...new Set(city.waterfrontOpenSpaces.map((openSpace) => openSpace.surface))].sort()
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

function createClimateWeatherDiagnostics(city: GeneratedCity): ClimateWeatherDiagnostics {
  const seasons = new Set<WeatherSeason>();
  let maxCloudCover = 0;
  let maxSurfaceWetness = 0;
  let maxPuddleCoverage = 0;
  let minVisibilityMeters = Number.POSITIVE_INFINITY;
  let maxWindSpeedKph = 0;
  let highDrainagePresets = 0;

  for (const preset of city.weatherPresets) {
    seasons.add(preset.season);
    maxCloudCover = Math.max(maxCloudCover, preset.cloudCover);
    maxSurfaceWetness = Math.max(maxSurfaceWetness, preset.surfaceWetness);
    maxPuddleCoverage = Math.max(maxPuddleCoverage, preset.puddleCoverage);
    minVisibilityMeters = Math.min(minVisibilityMeters, preset.visibilityMeters);
    maxWindSpeedKph = Math.max(maxWindSpeedKph, preset.windSpeedKph);
    if (preset.simulationHooks.drainageLoad === 'high') {
      highDrainagePresets += 1;
    }
  }

  const activePreset = city.weatherPresets.find((preset) => preset.active) ?? city.weatherPresets[0];

  return {
    total: city.weatherPresets.length,
    activePresetId: activePreset?.id ?? '',
    activePresetKind: activePreset?.presetKind ?? 'clear',
    activeSeason: activePreset?.season ?? 'summer',
    activeVisibilityMeters: activePreset?.visibilityMeters ?? 0,
    activeSurfaceWetness: activePreset?.surfaceWetness ?? 0,
    activeTrafficSpeedMultiplier: activePreset?.simulationHooks.trafficSpeedMultiplier ?? 1,
    rainyPresets: city.weatherPresets.filter((preset) => preset.precipitation !== 'none').length,
    fogPresets: city.weatherPresets.filter((preset) => preset.presetKind === 'fog').length,
    monsoonPresets: city.weatherPresets.filter((preset) => preset.presetKind === 'monsoon').length,
    seasons: [...seasons].sort(),
    maxCloudCover,
    maxSurfaceWetness,
    maxPuddleCoverage,
    minVisibilityMeters: Number.isFinite(minVisibilityMeters) ? minVisibilityMeters : 0,
    maxWindSpeedKph,
    highDrainagePresets
  };
}

function createSolarShadingDiagnostics(city: GeneratedCity): SolarShadingDiagnostics {
  const total = city.solarShadingSamples.length;
  const roofSolarSamples = city.solarShadingSamples.filter((sample) => sample.sampleKind === 'roof-solar').length;
  const shadeComfortSamples = city.solarShadingSamples.filter((sample) => sample.sampleKind !== 'roof-solar').length;
  const weatherPresetIds = new Set<string>();
  let comfortScore = 0;
  let shadeCoverage = 0;
  let totalSolarPotentialKwhPerDay = 0;
  let maxRoofSuitabilityScore = 0;
  let peakSunHour = 0;

  for (const sample of city.solarShadingSamples) {
    weatherPresetIds.add(sample.weatherPresetId);
    comfortScore += sample.comfortScore;
    shadeCoverage += sample.shadeCoverageRatio;
    totalSolarPotentialKwhPerDay += sample.solarPotentialKwhPerDay;
    maxRoofSuitabilityScore = Math.max(maxRoofSuitabilityScore, sample.roofSuitabilityScore);
    peakSunHour = Math.max(peakSunHour, sample.peakSunHour);
  }

  return {
    total,
    roofSolarSamples,
    shadeComfortSamples,
    highGlareSamples: city.solarShadingSamples.filter((sample) => sample.glareRisk === 'high').length,
    averageComfortScore: roundDiagnosticRatio(comfortScore / Math.max(1, total)),
    averageShadeCoverage: roundDiagnosticRatio(shadeCoverage / Math.max(1, total)),
    totalSolarPotentialKwhPerDay: Math.round(totalSolarPotentialKwhPerDay * 100) / 100,
    maxRoofSuitabilityScore: roundDiagnosticRatio(maxRoofSuitabilityScore),
    peakSunHour,
    weatherPresetIds: [...weatherPresetIds].sort()
  };
}

function createUrbanHeatDiagnostics(city: GeneratedCity): UrbanHeatDiagnostics {
  const total = city.urbanHeatZones.length;
  const weatherPresetIds = new Set<string>();
  let heatRiskScore = 0;
  let mitigationEffectScore = 0;
  let shadeCoverage = 0;
  let treeCanopyCooling = 0;
  let waterCooling = 0;
  let maxDaytimeTemperatureDeltaCelsius = 0;

  for (const zone of city.urbanHeatZones) {
    weatherPresetIds.add(zone.weatherPresetId);
    heatRiskScore += zone.heatRiskScore;
    mitigationEffectScore += zone.mitigationEffectScore;
    shadeCoverage += zone.shadeCoverageRatio;
    treeCanopyCooling += zone.treeCanopyCoolingScore;
    waterCooling += zone.waterCoolingScore;
    maxDaytimeTemperatureDeltaCelsius = Math.max(maxDaytimeTemperatureDeltaCelsius, zone.daytimeTemperatureDeltaCelsius);
  }

  return {
    total,
    heatIslandZones: city.urbanHeatZones.filter((zone) => zone.zoneKind === 'heat-island').length,
    coolRoofZones: city.urbanHeatZones.filter((zone) => zone.zoneKind === 'cool-roof').length,
    canopyCoolingZones: city.urbanHeatZones.filter((zone) => zone.zoneKind === 'canopy-cooling').length,
    waterCoolingZones: city.urbanHeatZones.filter((zone) => zone.zoneKind === 'water-cooling').length,
    publicRouteRiskZones: city.urbanHeatZones.filter((zone) => zone.zoneKind === 'public-route-risk').length,
    highRiskZones: city.urbanHeatZones.filter((zone) => zone.riskLevel === 'high' || zone.riskLevel === 'critical').length,
    criticalRiskZones: city.urbanHeatZones.filter((zone) => zone.riskLevel === 'critical').length,
    averageHeatRiskScore: roundDiagnosticRatio(heatRiskScore / Math.max(1, total)),
    averageMitigationEffectScore: roundDiagnosticRatio(mitigationEffectScore / Math.max(1, total)),
    averageShadeCoverage: roundDiagnosticRatio(shadeCoverage / Math.max(1, total)),
    averageTreeCanopyCoolingScore: roundDiagnosticRatio(treeCanopyCooling / Math.max(1, total)),
    averageWaterCoolingScore: roundDiagnosticRatio(waterCooling / Math.max(1, total)),
    maxDaytimeTemperatureDeltaCelsius: Math.round(maxDaytimeTemperatureDeltaCelsius * 10) / 10,
    weatherPresetIds: [...weatherPresetIds].sort()
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

function createPlantingModelDiagnostics(city: GeneratedCity): PlantingModelDiagnostics {
  const bySpecies: Record<string, number> = {};
  const bySeasonalColor: Record<string, number> = {};
  const byCorridorRole: Record<string, number> = {};
  const greenCorridors = new Set<string>();

  for (const tree of city.trees) {
    bySpecies[tree.species] = (bySpecies[tree.species] ?? 0) + 1;
    bySeasonalColor[tree.seasonalColor] = (bySeasonalColor[tree.seasonalColor] ?? 0) + 1;
    byCorridorRole[tree.greenCorridorRole] = (byCorridorRole[tree.greenCorridorRole] ?? 0) + 1;
    greenCorridors.add(tree.greenCorridorId);
  }

  const canopyAreaSquareMeters = Math.round(
    city.trees.reduce((sum, tree) => {
      const radius = tree.canopySpreadMeters / 2;
      return sum + Math.PI * radius * radius;
    }, 0)
  );
  const soilVolumeCubicMeters = Math.round(city.trees.reduce((sum, tree) => sum + tree.soilVolumeCubicMeters, 0));
  const averageHeatMitigationScore = city.trees.length === 0
    ? 0
    : Math.round((city.trees.reduce((sum, tree) => sum + tree.heatMitigationScore, 0) / city.trees.length) * 100) / 100;
  const averageEcologyScore = city.trees.length === 0
    ? 0
    : Math.round((city.trees.reduce((sum, tree) => sum + tree.ecologyScore, 0) / city.trees.length) * 100) / 100;

  return {
    totalTrees: city.trees.length,
    streetTrees: city.trees.filter((tree) => tree.plantingContext === 'street').length,
    parkTrees: city.trees.filter((tree) => tree.plantingContext === 'park').length,
    planterTrees: city.trees.filter((tree) => tree.plantingForm === 'raised-planter').length,
    greenCorridors: greenCorridors.size,
    canopyAreaSquareMeters,
    soilVolumeCubicMeters,
    averageHeatMitigationScore,
    averageEcologyScore,
    bySpecies,
    bySeasonalColor,
    byCorridorRole
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

function roundDiagnosticRatio(value: number): number {
  return Math.round(value * 100) / 100;
}

function isCriticalFacilityBuilding(building: GeneratedCity['buildings'][number]): boolean {
  return building.uses.some((use) => use === 'civic' || use === 'education' || use === 'transport' || use === 'utility');
}
