import type {
  BuildingContract,
  BlockContract,
  CityLodPolicy,
  CityObjectBase,
  DistrictContract,
  GeospatialFrame,
  LandUse,
  LaneContract,
  PerformanceBudget,
  Point2D,
  Polygon2D,
  RenderBinding,
  RoadSegmentContract,
  SidewalkContract,
  StreetHierarchy,
  ParcelContract,
  ValidationResult
} from '../city/data-contracts/cityContracts';

export type DistrictKind = 'downtown' | 'residential' | 'industrial' | 'waterfront' | 'civic';

export type RoadOrientation = 'horizontal' | 'vertical';

export type RoofStyle = 'flat' | 'mechanical' | 'green' | 'antenna';

export interface CityConfig {
  seed: string;
  gridSize: number;
  blockSize: number;
  roadWidth: number;
  waterwayWidth: number;
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
  parkId: string;
  center: Point2D;
  species: 'plane' | 'rain-tree' | 'palm' | 'jacaranda';
  height: number;
  canopyDiameter: number;
}

export interface LaneMarkingPlan extends CityObjectBase<'lane-marking'> {
  roadId: string;
  center: Point2D;
  orientation: RoadOrientation;
  size: { x: number; z: number };
}

export interface TrafficVehiclePlan extends CityObjectBase<'traffic-vehicle'> {
  roadId: string;
  axis: 'x' | 'z';
  direction: 1 | -1;
  speed: number;
  position: Point2D;
  size: { x: number; z: number };
  min: number;
  max: number;
}

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
  blocks: BlockPlan[];
  roads: RoadSegment[];
  parcels: Parcel[];
  buildings: BuildingPlan[];
  parks: ParkPatch[];
  waterways: Waterway[];
  trees: TreePlanting[];
  assetBindings: RenderBinding[];
  validation: ValidationResult;
}

export interface Updatable {
  update(deltaSeconds: number, elapsedSeconds: number): void;
}
