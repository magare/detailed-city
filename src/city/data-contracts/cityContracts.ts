import type { CityPlanningLayer } from '../cityPlan';

export const CITY_CONTRACT_SCHEMA_VERSION = 'city-contracts-v1';

export type CityId = string;

export type CityObjectKind =
  | 'asset'
  | 'block'
  | 'building'
  | 'civic-anchor'
  | 'crossing'
  | 'district'
  | 'economy-anchor'
  | 'facade'
  | 'lane'
  | 'lane-marking'
  | 'parcel'
  | 'park'
  | 'road-segment'
  | 'sensor'
  | 'sidewalk'
  | 'street-furniture'
  | 'street-light'
  | 'traffic-vehicle'
  | 'tree-planting'
  | 'utility-edge'
  | 'utility-node'
  | 'waterway';

export type LandUse =
  | 'civic'
  | 'education'
  | 'hospitality'
  | 'industrial'
  | 'mixed-use'
  | 'office'
  | 'open-space'
  | 'residential'
  | 'retail'
  | 'transport'
  | 'utility'
  | 'water';

export type LodTier = 'lod0' | 'lod1' | 'lod2' | 'lod3' | 'lod4';

export type SourceType = 'procedural' | 'authored' | 'imported' | 'simulated';

export interface Point2D {
  readonly x: number;
  readonly z: number;
}

export interface Point3D extends Point2D {
  readonly y: number;
}

export type Polyline2D = readonly Point2D[];
export type Polygon2D = readonly Point2D[];

export interface SourceMetadata {
  readonly sourceType: SourceType;
  readonly sourceId?: string;
  readonly confidence: number;
  readonly author?: string;
  readonly license?: string;
  readonly updatedAt?: string;
}

export interface CityObjectBase<Kind extends CityObjectKind = CityObjectKind> {
  readonly id: CityId;
  readonly kind: Kind;
  readonly ownerDomain: CityPlanningLayer;
  readonly parentId?: CityId;
  readonly name?: string;
  readonly lod: LodTier;
  readonly tags?: Readonly<Record<string, string | number | boolean>>;
  readonly metadata?: SourceMetadata;
}

export interface GeospatialFrame {
  readonly unit: 'meter';
  readonly coordinateSystem: 'local-xz';
  readonly origin: Point3D;
  readonly heightDatum: 'local-ground-plane';
  readonly precisionMeters: number;
  readonly importProjection?: string;
}

export const LOCAL_CITY_FRAME: GeospatialFrame = {
  unit: 'meter',
  coordinateSystem: 'local-xz',
  origin: { x: 0, y: 0, z: 0 },
  heightDatum: 'local-ground-plane',
  precisionMeters: 0.01
};

export interface ObjectLodRule {
  readonly tier: LodTier;
  readonly maxDistanceMeters: number;
  readonly geometry: string;
  readonly materials: string;
  readonly behavior: string;
}

export interface CityLodPolicy {
  readonly rules: readonly ObjectLodRule[];
}

export const DEFAULT_CITY_LOD_POLICY: CityLodPolicy = {
  rules: [
    {
      tier: 'lod0',
      maxDistanceMeters: 1200,
      geometry: 'terrain and district masses only',
      materials: 'flat semantic colors',
      behavior: 'no agents'
    },
    {
      tier: 'lod1',
      maxDistanceMeters: 700,
      geometry: 'blocks, road ribbons, building masses, parks, waterways',
      materials: 'shared materials and instance colors',
      behavior: 'pooled vehicles'
    },
    {
      tier: 'lod2',
      maxDistanceMeters: 320,
      geometry: 'sidewalks, crossings, roof equipment, street trees, large props',
      materials: 'atlas-ready semantic materials',
      behavior: 'route-aware vehicles and coarse pedestrians'
    },
    {
      tier: 'lod3',
      maxDistanceMeters: 140,
      geometry: 'facade modules, signs, lamps, benches, curbs, storefronts',
      materials: 'facade and public-realm atlases',
      behavior: 'pedestrian and signal simulation'
    },
    {
      tier: 'lod4',
      maxDistanceMeters: 45,
      geometry: 'entrances, interiors, fixtures, readable signs, asset variants',
      materials: 'high-detail material variants',
      behavior: 'inspectable objects and debug metadata'
    }
  ]
};

export type StreetHierarchy = 'arterial' | 'collector' | 'local' | 'alley' | 'promenade' | 'transit-corridor';
export type BikeLaneKind = 'none' | 'painted' | 'protected' | 'cycle-track';
export type ParkingKind = 'none' | 'one-side' | 'two-side' | 'loading-only';

export interface StreetProfile {
  readonly id: string;
  readonly hierarchy: StreetHierarchy;
  readonly totalWidthMeters: number;
  readonly vehicleLanes: number;
  readonly laneWidthMeters: number;
  readonly sidewalkWidthMeters: number;
  readonly bikeLane: BikeLaneKind;
  readonly parking: ParkingKind;
  readonly median: boolean;
  readonly treeZone: boolean;
  readonly transitLane: boolean;
  readonly designSpeedKph: number;
}

export const DEFAULT_STREET_PROFILES = [
  {
    id: 'grand-avenue',
    hierarchy: 'arterial',
    totalWidthMeters: 34,
    vehicleLanes: 4,
    laneWidthMeters: 3.2,
    sidewalkWidthMeters: 5.2,
    bikeLane: 'protected',
    parking: 'loading-only',
    median: true,
    treeZone: true,
    transitLane: true,
    designSpeedKph: 40
  },
  {
    id: 'main-street',
    hierarchy: 'collector',
    totalWidthMeters: 24,
    vehicleLanes: 2,
    laneWidthMeters: 3,
    sidewalkWidthMeters: 4.5,
    bikeLane: 'painted',
    parking: 'two-side',
    median: false,
    treeZone: true,
    transitLane: false,
    designSpeedKph: 30
  },
  {
    id: 'residential-street',
    hierarchy: 'local',
    totalWidthMeters: 18,
    vehicleLanes: 2,
    laneWidthMeters: 2.8,
    sidewalkWidthMeters: 3,
    bikeLane: 'none',
    parking: 'one-side',
    median: false,
    treeZone: true,
    transitLane: false,
    designSpeedKph: 25
  },
  {
    id: 'service-alley',
    hierarchy: 'alley',
    totalWidthMeters: 8,
    vehicleLanes: 1,
    laneWidthMeters: 4,
    sidewalkWidthMeters: 0,
    bikeLane: 'none',
    parking: 'loading-only',
    median: false,
    treeZone: false,
    transitLane: false,
    designSpeedKph: 15
  },
  {
    id: 'waterfront-promenade',
    hierarchy: 'promenade',
    totalWidthMeters: 20,
    vehicleLanes: 0,
    laneWidthMeters: 0,
    sidewalkWidthMeters: 10,
    bikeLane: 'cycle-track',
    parking: 'none',
    median: false,
    treeZone: true,
    transitLane: false,
    designSpeedKph: 10
  }
] as const satisfies readonly StreetProfile[];

export interface DistrictContract extends CityObjectBase<'district'> {
  readonly boundary: Polygon2D;
  readonly density: 'low' | 'medium' | 'high' | 'super-tall';
  readonly primaryUses: readonly LandUse[];
  readonly heightRangeMeters: readonly [number, number];
  readonly allowedStreetProfiles: readonly string[];
}

export interface BlockContract extends CityObjectBase<'block'> {
  readonly boundary: Polygon2D;
  readonly districtId: CityId;
  readonly permeability: 'low' | 'medium' | 'high';
}

export interface ParcelContract extends CityObjectBase<'parcel'> {
  readonly boundary: Polygon2D;
  readonly districtId: CityId;
  readonly blockId: CityId;
  readonly frontageRoadIds: readonly CityId[];
  readonly allowedUses: readonly LandUse[];
  readonly maxHeightMeters: number;
  readonly maxCoverageRatio: number;
}

export interface LaneContract extends CityObjectBase<'lane'> {
  readonly roadSegmentId: CityId;
  readonly allowedModes: readonly ('vehicle' | 'bus' | 'bike' | 'freight' | 'emergency')[];
  readonly widthMeters: number;
  readonly direction: 'forward' | 'backward';
}

export interface SidewalkContract extends CityObjectBase<'sidewalk'> {
  readonly roadSegmentId: CityId;
  readonly clearWidthMeters: number;
  readonly frontageZoneMeters: number;
  readonly furnishingZoneMeters: number;
}

export interface RoadSegmentContract extends CityObjectBase<'road-segment'> {
  readonly centerline: Polyline2D;
  readonly hierarchy: StreetHierarchy;
  readonly streetProfileId: string;
  readonly widthMeters: number;
  readonly lanes: readonly LaneContract[];
  readonly sidewalks: readonly SidewalkContract[];
}

export interface BuildingContract extends CityObjectBase<'building'> {
  readonly parcelId: CityId;
  readonly footprint: Polygon2D;
  readonly uses: readonly LandUse[];
  readonly heightMeters: number;
  readonly floorCount: number;
  readonly facadeGrammarId: string;
  readonly roofGrammarId: string;
  readonly entranceIds: readonly CityId[];
}

export interface AssetDefinition extends CityObjectBase<'asset'> {
  readonly category:
    | 'building'
    | 'effect'
    | 'icon'
    | 'nature'
    | 'road'
    | 'street-prop'
    | 'texture'
    | 'transit'
    | 'utility'
    | 'vehicle';
  readonly url: string;
  readonly format: 'glb' | 'gltf' | 'png' | 'jpg' | 'webp' | 'ktx2' | 'hdr' | 'exr';
  readonly scaleMeters: number;
  readonly tags: Readonly<Record<string, string | number | boolean>>;
  readonly lodVariants?: Partial<Record<LodTier, CityId>>;
  readonly attribution?: string;
  readonly license?: string;
}

export interface RenderBinding {
  readonly objectKind: CityObjectKind;
  readonly semanticTag?: string;
  readonly assetId?: CityId;
  readonly materialZone?: string;
  readonly fallbackMaterial: string;
  readonly fallbackGeometry: string;
}

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  readonly id: CityId;
  readonly severity: ValidationSeverity;
  readonly category:
    | 'asset'
    | 'graph'
    | 'geometry'
    | 'identifier'
    | 'lod'
    | 'performance'
    | 'simulation'
    | 'utility-coverage'
    | 'zoning';
  readonly objectId?: CityId;
  readonly message: string;
}

export interface ValidationResult {
  readonly passed: boolean;
  readonly issues: readonly ValidationIssue[];
}

export interface PerformanceBudget {
  readonly initialLoadSeconds: number;
  readonly targetFps: number;
  readonly minimumFps: number;
  readonly visibleDrawCalls: number;
  readonly visibleTriangles: number;
  readonly textureMemoryMb: number;
  readonly dynamicAgents: number;
  readonly shadowCastingLights: number;
  readonly chunkSizeMeters: number;
  readonly loadRadiusChunks: number;
  readonly unloadRadiusChunks: number;
}

export const DEFAULT_PERFORMANCE_BUDGET: PerformanceBudget = {
  initialLoadSeconds: 8,
  targetFps: 60,
  minimumFps: 30,
  visibleDrawCalls: 450,
  visibleTriangles: 1_200_000,
  textureMemoryMb: 512,
  dynamicAgents: 300,
  shadowCastingLights: 1,
  chunkSizeMeters: 180,
  loadRadiusChunks: 3,
  unloadRadiusChunks: 4
};
