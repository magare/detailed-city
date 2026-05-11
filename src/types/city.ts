import type {
  AssetDefinition,
  ActiveFrontageContract,
  BuildingContract,
  BuildingFrontageSide,
  BlockContract,
  CityObjectIndex,
  CityLodPolicy,
  CityObjectBase,
  ConstraintContract,
  CurbZoneContract,
  CrossingContract,
  DetailedStreetSliceContract,
  DistrictContract,
  GeospatialFrame,
  IntersectionContract,
  LandUse,
  LaneContract,
  LaneMarkingContract,
  PerformanceBudget,
  Point2D,
  Polygon2D,
  RenderBinding,
  ResilienceGoalContract,
  RoadSegmentContract,
  SidewalkGraphEdgeContract,
  SidewalkGraphNodeContract,
  SidewalkContract,
  StreetFurnitureContract,
  StreetLightContract,
  StreetHierarchy,
  ParcelContract,
  TrafficVehicleContract,
  ValidationResult
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
  intersectionId: string;
  roadId: string;
  roadOrientation: RoadOrientation;
}

export interface CurbZone extends CurbZoneContract {}

export interface StreetLight extends StreetLightContract {}

export interface StreetFurniture extends StreetFurnitureContract {}

export interface SidewalkGraphNode extends SidewalkGraphNodeContract {
  intersectionId: string;
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

export interface BuildingPlan extends BuildingContract {
  center: Point2D;
  size: { x: number; z: number };
  district: DistrictKind;
  roofStyle: RoofStyle;
}

export interface ActiveFrontage extends ActiveFrontageContract {
  frontageSide: BuildingFrontageSide;
}

export interface DetailedStreetSlice extends DetailedStreetSliceContract {}

export interface ConstraintPlan extends ConstraintContract {}

export interface ResilienceGoalPlan extends ResilienceGoalContract {}

export interface ParkPatch extends CityObjectBase<'park'> {
  center: Point2D;
  size: { x: number; z: number };
  boundary: Polygon2D;
}

export interface Waterway extends CityObjectBase<'waterway'> {
  center: Point2D;
  length: number;
  width: number;
  boundary: Polygon2D;
}

export interface TreePlanting extends CityObjectBase<'tree-planting'> {
  plantingContext: 'park' | 'street';
  parkId?: string;
  sliceId?: string;
  roadId?: string;
  sidewalkId?: string;
  curbZoneId?: string;
  center: Point2D;
  species: 'plane' | 'rain-tree' | 'palm' | 'jacaranda';
  height: number;
  canopyDiameter: number;
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

export type GeneratedCityObject =
  | AssetDefinition
  | DetailedStreetSlice
  | ConstraintPlan
  | ResilienceGoalPlan
  | DistrictPlan
  | BlockPlan
  | RoadSegment
  | IntersectionPlan
  | CrossingPlan
  | CurbZone
  | StreetLight
  | StreetFurniture
  | SidewalkGraphNode
  | SidewalkGraphEdge
  | LaneContract
  | SidewalkContract
  | Parcel
  | BuildingPlan
  | ActiveFrontage
  | ParkPatch
  | Waterway
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
  districts: DistrictPlan[];
  constraints: ConstraintPlan[];
  resilienceGoals: ResilienceGoalPlan[];
  blocks: BlockPlan[];
  verticalSlices: DetailedStreetSlice[];
  roads: RoadSegment[];
  intersections: IntersectionPlan[];
  crossings: CrossingPlan[];
  curbZones: CurbZone[];
  streetLights: StreetLight[];
  streetFurniture: StreetFurniture[];
  sidewalkGraph: SidewalkGraph;
  parcels: Parcel[];
  buildings: BuildingPlan[];
  activeFrontages: ActiveFrontage[];
  parks: ParkPatch[];
  waterways: Waterway[];
  trees: TreePlanting[];
  objectIndex: CityObjectIndex<GeneratedCityObject>;
  assetCatalog: AssetDefinition[];
  assetBindings: RenderBinding[];
  validation: ValidationResult;
}

export interface Updatable {
  update(deltaSeconds: number, elapsedSeconds: number): void;
}
