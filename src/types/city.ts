import type {
  AssetDefinition,
  AssetInventoryRecordContract,
  AccessControlContract,
  ActiveFrontageContract,
  AddressPointContract,
  AdministrativeBoundaryContract,
  BikeConflictZoneContract,
  BikeGraphEdgeContract,
  BikeGraphNodeContract,
  BikeParkingContract,
  BikeSegmentContract,
  BikeSignalContract,
  BuildingContract,
  BuildingEntranceContract,
  BuildingFireSafetyProfileContract,
  BuildingFrontageSide,
  CadastreRecordContract,
  BlockContract,
  CivicAnchorContract,
  CommunityAnchorContract,
  CultureAnchorContract,
  EducationAnchorContract,
  EmergencyEquipmentContract,
  EmergencyServiceAnchorContract,
  GovernmentAnchorContract,
  HealthcareAnchorContract,
  CityMetricContract,
  CityObjectIndex,
  CityLodPolicy,
  CityObjectBase,
  DevelopmentPhaseContract,
  ConstraintContract,
  CurbActivationContract,
  CurbZoneContract,
  CrossingContract,
  DetailedStreetSliceContract,
  DistrictContract,
  FreightLoadingDockContract,
  FreightRouteContract,
  GazetteerEntryContract,
  GeospatialFrame,
  GreenCorridorRole,
  GreenStormwaterFeatureContract,
  HazardZoneContract,
  IntersectionContract,
  LandUse,
  LaneContract,
  LaneMarkingContract,
  MaintenanceOperationContract,
  NavigationGraphEdgeContract,
  NavigationGraphNodeContract,
  NavigationRouteContract,
  NamedPlaceContract,
  PermitInspectionRecordContract,
  ParkFeatureContract,
  PlazaZoneContract,
  PerformanceBudget,
  Point2D,
  Polygon2D,
  PublicAmenityContract,
  RenderBinding,
  ResilienceGoalContract,
  RoadSegmentContract,
  ServiceAccessCorridorContract,
  ServiceAlleyContract,
  SidewalkGraphEdgeContract,
  SidewalkGraphNodeContract,
  SidewalkContract,
  SoilGeologyZoneContract,
  SolarShadingSampleContract,
  UrbanHeatZoneContract,
  UtilityEdgeContract,
  UtilityNodeContract,
  StreetFurnitureContract,
  StreetLightContract,
  StreetHierarchy,
  ParcelContract,
  TopographyZoneContract,
  TreeCanopyClass,
  TreePlantingForm,
  TreeSeasonalColor,
  TreeSpecies,
  TrafficVehicleContract,
  TrafficCalmingDeviceContract,
  TransitRouteContract,
  TransitStopContract,
  ValidationResult,
  WeatherPresetContract,
  WaterTransportAccessContract,
  WaterfrontEdgeContract,
  WaterfrontOpenSpaceContract,
  WaterwayContract,
  ZoningDistrictContract
} from '../city/data-contracts/cityContracts';

export const CITY_DISTRICT_KINDS = ['downtown', 'residential', 'industrial', 'waterfront', 'civic'] as const;

export type DistrictKind = (typeof CITY_DISTRICT_KINDS)[number];

export const CITY_QUALITY_PRESETS = ['low', 'medium', 'high', 'debug'] as const;

export type CityQualityPreset = (typeof CITY_QUALITY_PRESETS)[number];

export type RoadOrientation = 'horizontal' | 'vertical';

export type RoofStyle = 'flat' | 'mechanical' | 'green' | 'antenna';

export interface CityConfig {
  seed: string;
  qualityPreset: CityQualityPreset;
  gridSize: number;
  blockSize: number;
  roadWidth: number;
  waterwayWidth: number;
  density: {
    cityDensity: number;
    trafficDensity: number;
    propDensity: number;
    treeDensity: number;
  };
  building: {
    minHeight: number;
    maxHeight: number;
    setback: number;
  };
  districts: Record<
    DistrictKind,
    {
      density: number;
      heightBias: number;
      lotSplit: number;
    }
  >;
}

export interface CityBounds {
  spacing: number;
  span: number;
  halfSpan: number;
}

export interface RoadSegment extends RoadSegmentContract {
  orientation: RoadOrientation;
  center: Point2D;
  centerline: readonly [Point2D, Point2D];
  hierarchy: StreetHierarchy;
  streetProfileId: string;
  length: number;
  width: number;
  widthMeters: number;
  rightOfWayWidthMeters: number;
  designSpeedKph: number;
  corridorId: string;
  corridorName: string;
  continuityGroupId: string;
  transitEligible: boolean;
  laneCount: number;
  lanes: LaneContract[];
  sidewalks: SidewalkContract[];
}

export interface IntersectionPlan extends IntersectionContract {
  grid: { x: number; z: number };
  verticalRoadId: string;
  horizontalRoadId: string;
}

export interface CrossingPlan extends CrossingContract {
  intersectionId?: string;
  roadId: string;
  roadOrientation: RoadOrientation;
}

export interface CurbZone extends CurbZoneContract {}

export interface CurbActivation extends CurbActivationContract {}

export interface PublicAmenity extends PublicAmenityContract {}

export interface StreetLight extends StreetLightContract {}

export interface StreetFurniture extends StreetFurnitureContract {}

export interface SidewalkGraphNode extends SidewalkGraphNodeContract {
  intersectionId?: string;
  crossingId?: string;
  sidewalkId: string;
}

export interface SidewalkGraphEdge extends SidewalkGraphEdgeContract {
  fromNodeId: string;
  toNodeId: string;
  crossingId?: string;
  sidewalkId?: string;
}

export interface SidewalkGraph {
  nodes: SidewalkGraphNode[];
  edges: SidewalkGraphEdge[];
}

export interface DistrictPlan extends DistrictContract {
  district: DistrictKind;
}

export interface AdministrativeBoundaryPlan extends AdministrativeBoundaryContract {}

export interface ZoningDistrictPlan extends ZoningDistrictContract {}

export interface BlockPlan extends BlockContract {
  grid: { x: number; z: number };
  center: Point2D;
  size: { x: number; z: number };
  district: DistrictKind;
}

export interface Parcel extends ParcelContract {
  block: { x: number; z: number };
  center: Point2D;
  size: { x: number; z: number };
  boundary: Polygon2D;
  district: DistrictKind;
  districtId: string;
  blockId: string;
  frontageRoadIds: string[];
  allowedUses: LandUse[];
  density: number;
  maxHeightMeters: number;
  maxCoverageRatio: number;
}

export interface CadastreRecord extends CadastreRecordContract {}

export interface AssetInventoryRecord extends AssetInventoryRecordContract {}

export interface BuildingPlan extends BuildingContract {
  center: Point2D;
  size: { x: number; z: number };
  district: DistrictKind;
  roofStyle: RoofStyle;
}

export interface BuildingEntrance extends BuildingEntranceContract {}

export interface BuildingFireSafetyProfile extends BuildingFireSafetyProfileContract {}

export interface AddressPoint extends AddressPointContract {}

export interface NamedPlace extends NamedPlaceContract {}

export interface GazetteerEntry extends GazetteerEntryContract {}

export interface CivicAnchor extends CivicAnchorContract {}

export interface CommunityAnchor extends CommunityAnchorContract {}

export interface CultureAnchor extends CultureAnchorContract {}

export interface GovernmentAnchor extends GovernmentAnchorContract {}

export interface EducationAnchor extends EducationAnchorContract {}

export interface EmergencyEquipment extends EmergencyEquipmentContract {}

export interface EmergencyServiceAnchor extends EmergencyServiceAnchorContract {}

export interface HealthcareAnchor extends HealthcareAnchorContract {}

export interface WaterTransportAccess extends WaterTransportAccessContract {}

export interface ActiveFrontage extends ActiveFrontageContract {
  frontageSide: BuildingFrontageSide;
}

export interface DetailedStreetSlice extends DetailedStreetSliceContract {}

export interface ConstraintPlan extends ConstraintContract {}

export interface HazardZonePlan extends HazardZoneContract {}

export interface ResilienceGoalPlan extends ResilienceGoalContract {}

export interface CityMetricPlan extends CityMetricContract {}

export interface TopographyZonePlan extends TopographyZoneContract {}

export interface SoilGeologyZonePlan extends SoilGeologyZoneContract {}

export interface DevelopmentPhasePlan extends DevelopmentPhaseContract {}

export interface ParkPatch extends CityObjectBase<'park'> {
  center: Point2D;
  size: { x: number; z: number };
  boundary: Polygon2D;
  connectedSidewalkIds: string[];
  programZoneIds: string[];
  pathFeatureIds: string[];
}

export interface ParkFeature extends ParkFeatureContract {}

export interface PlazaZone extends PlazaZoneContract {}

export interface GreenStormwaterFeature extends GreenStormwaterFeatureContract {}

export interface Waterway extends WaterwayContract {}

export interface WaterfrontEdge extends WaterfrontEdgeContract {}

export interface WaterfrontOpenSpace extends WaterfrontOpenSpaceContract {}

export interface TreePlanting extends CityObjectBase<'tree-planting'> {
  plantingContext: 'park' | 'street';
  plantingForm: TreePlantingForm;
  parkId?: string;
  sliceId?: string;
  roadId?: string;
  sidewalkId?: string;
  curbZoneId?: string;
  center: Point2D;
  species: TreeSpecies;
  height: number;
  canopyDiameter: number;
  canopyClass: TreeCanopyClass;
  canopySpreadMeters: number;
  soilVolumeCubicMeters: number;
  seasonalColor: TreeSeasonalColor;
  greenCorridorId: string;
  greenCorridorRole: GreenCorridorRole;
  heatMitigationScore: number;
  ecologyScore: number;
  treePit?: {
    widthMeters: number;
    lengthMeters: number;
    surface: 'open-soil' | 'grate';
  };
  offsetFromRoadEdgeMeters?: number;
}

export interface LaneMarkingPlan extends LaneMarkingContract {
  roadId: string;
  center: Point2D;
  orientation: RoadOrientation;
  size: { x: number; z: number };
}

export interface TrafficVehiclePlan extends TrafficVehicleContract {}

export interface TrafficCalmingDevice extends TrafficCalmingDeviceContract {}
export interface AccessControl extends AccessControlContract {}
export interface TransitStop extends TransitStopContract {}
export interface TransitRoute extends TransitRouteContract {}
export interface BikeSegment extends BikeSegmentContract {}
export interface BikeGraphNode extends BikeGraphNodeContract {}
export interface BikeGraphEdge extends BikeGraphEdgeContract {}
export interface BikeParking extends BikeParkingContract {}
export interface BikeSignal extends BikeSignalContract {}
export interface BikeConflictZone extends BikeConflictZoneContract {}
export interface NavigationGraphNode extends NavigationGraphNodeContract {}
export interface NavigationGraphEdge extends NavigationGraphEdgeContract {}
export interface NavigationRoute extends NavigationRouteContract {}
export interface MaintenanceOperation extends MaintenanceOperationContract {}
export interface PermitInspectionRecord extends PermitInspectionRecordContract {}
export interface FreightLoadingDock extends FreightLoadingDockContract {}
export interface FreightRoute extends FreightRouteContract {}
export interface ServiceAlley extends ServiceAlleyContract {}
export interface ServiceAccessCorridor extends ServiceAccessCorridorContract {}

export interface WeatherPreset extends WeatherPresetContract {}
export interface SolarShadingSample extends SolarShadingSampleContract {}
export interface UrbanHeatZone extends UrbanHeatZoneContract {}
export interface UtilityNode extends UtilityNodeContract {}
export interface UtilityEdge extends UtilityEdgeContract {}

export type GeneratedCityObject =
  | AssetDefinition
  | AddressPoint
  | GazetteerEntry
  | AdministrativeBoundaryPlan
  | DetailedStreetSlice
  | CityMetricPlan
  | DevelopmentPhasePlan
  | ConstraintPlan
  | HazardZonePlan
  | TopographyZonePlan
  | SoilGeologyZonePlan
  | ResilienceGoalPlan
  | DistrictPlan
  | ZoningDistrictPlan
  | BlockPlan
  | RoadSegment
  | IntersectionPlan
  | CrossingPlan
  | CurbZone
  | CurbActivation
  | PublicAmenity
  | StreetLight
  | StreetFurniture
  | TrafficCalmingDevice
  | AccessControl
  | TransitStop
  | TransitRoute
  | BikeSegment
  | BikeGraphNode
  | BikeGraphEdge
  | BikeParking
  | BikeSignal
  | BikeConflictZone
  | NavigationGraphNode
  | NavigationGraphEdge
  | NavigationRoute
  | MaintenanceOperation
  | PermitInspectionRecord
  | NamedPlace
  | FreightLoadingDock
  | FreightRoute
  | ServiceAlley
  | ServiceAccessCorridor
  | WeatherPreset
  | SolarShadingSample
  | UrbanHeatZone
  | UtilityNode
  | UtilityEdge
  | SidewalkGraphNode
  | SidewalkGraphEdge
  | LaneContract
  | SidewalkContract
  | Parcel
  | BuildingPlan
  | BuildingEntrance
  | BuildingFireSafetyProfile
  | CadastreRecord
  | AssetInventoryRecord
  | CivicAnchor
  | CommunityAnchor
  | CultureAnchor
  | GovernmentAnchor
  | EducationAnchor
  | EmergencyEquipment
  | EmergencyServiceAnchor
  | HealthcareAnchor
  | WaterTransportAccess
  | ActiveFrontage
  | ParkPatch
  | ParkFeature
  | PlazaZone
  | GreenStormwaterFeature
  | Waterway
  | WaterfrontEdge
  | WaterfrontOpenSpace
  | TreePlanting;

export type GeneratedRuntimeCityObject = GeneratedCityObject | LaneMarkingPlan | TrafficVehiclePlan;

export interface TrafficPlan {
  markings: LaneMarkingPlan[];
  vehicles: TrafficVehiclePlan[];
}

export interface GeneratedCity {
  schemaVersion: string;
  geospatial: GeospatialFrame;
  lodPolicy: CityLodPolicy;
  performanceBudget: PerformanceBudget;
  bounds: CityBounds;
  administrativeBoundaries: AdministrativeBoundaryPlan[];
  districts: DistrictPlan[];
  zoningDistricts: ZoningDistrictPlan[];
  constraints: ConstraintPlan[];
  hazardZones: HazardZonePlan[];
  resilienceGoals: ResilienceGoalPlan[];
  cityMetrics: CityMetricPlan[];
  developmentPhases: DevelopmentPhasePlan[];
  topographyZones: TopographyZonePlan[];
  soilGeologyZones: SoilGeologyZonePlan[];
  blocks: BlockPlan[];
  verticalSlices: DetailedStreetSlice[];
  roads: RoadSegment[];
  intersections: IntersectionPlan[];
  crossings: CrossingPlan[];
  curbZones: CurbZone[];
  curbActivations: CurbActivation[];
  publicAmenities: PublicAmenity[];
  streetLights: StreetLight[];
  streetFurniture: StreetFurniture[];
  trafficCalmingDevices: TrafficCalmingDevice[];
  accessControls: AccessControl[];
  transitStops: TransitStop[];
  transitRoutes: TransitRoute[];
  bikeSegments: BikeSegment[];
  bikeGraphNodes: BikeGraphNode[];
  bikeGraphEdges: BikeGraphEdge[];
  bikeParking: BikeParking[];
  bikeSignals: BikeSignal[];
  bikeConflictZones: BikeConflictZone[];
  navigationGraphNodes: NavigationGraphNode[];
  navigationGraphEdges: NavigationGraphEdge[];
  navigationRoutes: NavigationRoute[];
  maintenanceOperations: MaintenanceOperation[];
  permitInspectionRecords: PermitInspectionRecord[];
  freightLoadingDocks: FreightLoadingDock[];
  freightRoutes: FreightRoute[];
  serviceAlleys: ServiceAlley[];
  serviceAccessCorridors: ServiceAccessCorridor[];
  buildingEntrances: BuildingEntrance[];
  buildingFireSafetyProfiles: BuildingFireSafetyProfile[];
  addressPoints: AddressPoint[];
  namedPlaces: NamedPlace[];
  gazetteerEntries: GazetteerEntry[];
  weatherPresets: WeatherPreset[];
  solarShadingSamples: SolarShadingSample[];
  urbanHeatZones: UrbanHeatZone[];
  utilityNodes: UtilityNode[];
  utilityEdges: UtilityEdge[];
  sidewalkGraph: SidewalkGraph;
  parcels: Parcel[];
  cadastreRecords: CadastreRecord[];
  assetInventoryRecords: AssetInventoryRecord[];
  buildings: BuildingPlan[];
  civicAnchors: CivicAnchor[];
  communityAnchors: CommunityAnchor[];
  cultureAnchors: CultureAnchor[];
  governmentAnchors: GovernmentAnchor[];
  educationAnchors: EducationAnchor[];
  emergencyEquipment: EmergencyEquipment[];
  emergencyServiceAnchors: EmergencyServiceAnchor[];
  healthcareAnchors: HealthcareAnchor[];
  waterTransportAccess: WaterTransportAccess[];
  activeFrontages: ActiveFrontage[];
  parks: ParkPatch[];
  parkFeatures: ParkFeature[];
  plazaZones: PlazaZone[];
  greenStormwaterFeatures: GreenStormwaterFeature[];
  waterways: Waterway[];
  waterfrontEdges: WaterfrontEdge[];
  waterfrontOpenSpaces: WaterfrontOpenSpace[];
  trees: TreePlanting[];
  objectIndex: CityObjectIndex<GeneratedCityObject>;
  assetCatalog: AssetDefinition[];
  assetBindings: RenderBinding[];
  validation: ValidationResult;
}

export interface Updatable {
  update(deltaSeconds: number, elapsedSeconds: number): void;
}
