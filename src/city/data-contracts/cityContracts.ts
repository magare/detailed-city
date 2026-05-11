import type { CityPlanningLayer } from '../cityPlan';

export const CITY_CONTRACT_SCHEMA_VERSION = 'city-contracts-v1';

export type CityId = string;

export type CityObjectKind =
  | 'asset'
  | 'block'
  | 'building'
  | 'civic-anchor'
  | 'crossing'
  | 'curb-zone'
  | 'district'
  | 'economy-anchor'
  | 'facade'
  | 'intersection'
  | 'lane'
  | 'lane-marking'
  | 'parcel'
  | 'park'
  | 'road-segment'
  | 'sensor'
  | 'sidewalk'
  | 'sidewalk-graph-edge'
  | 'sidewalk-graph-node'
  | 'street-furniture'
  | 'street-light'
  | 'traffic-vehicle'
  | 'tree-planting'
  | 'utility-edge'
  | 'utility-node'
  | 'vertical-slice'
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

export type SourceReviewStatus = 'generated' | 'draft' | 'reviewed' | 'external-unverified';

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
  readonly licenseUrl?: string;
  readonly attribution?: string;
  readonly reviewStatus?: SourceReviewStatus;
  readonly generationStep?: string;
  readonly sourceVersion?: string;
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

export interface CityObjectIndex<ObjectType extends CityObjectBase = CityObjectBase> {
  readonly objects: readonly ObjectType[];
  readonly objectIds: readonly CityId[];
  readonly objectsById: Readonly<Record<CityId, ObjectType>>;
  readonly duplicateIds: readonly CityId[];
  readonly childrenByParentId: Readonly<Record<CityId, readonly CityId[]>>;
  readonly countsByKind: Readonly<Partial<Record<CityObjectKind, number>>>;
}

export interface LocalOriginMetadata {
  readonly id: CityId;
  readonly name: string;
  readonly description: string;
  readonly sourceType: SourceType;
}

export interface CoordinatePrecisionRules {
  readonly coordinatePrecisionMeters: number;
  readonly horizontalToleranceMeters: number;
  readonly verticalToleranceMeters: number;
}

export interface LocalCoordinateBounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
}

export interface HeightDatumRules {
  readonly id: 'local-ground-plane';
  readonly name: string;
  readonly verticalUnit: 'meter';
  readonly groundElevationMeters: number;
  readonly minElevationMeters: number;
  readonly maxElevationMeters: number;
}

export interface ImportProjectionMetadata {
  readonly status: 'not-configured' | 'configured';
  readonly expectedUnit: 'meter';
  readonly supportedAuthorities: readonly ('EPSG' | 'LOCAL' | 'OGC')[];
  readonly authority?: string;
  readonly code?: string;
  readonly notes: string;
}

export interface GeospatialFrame {
  readonly unit: 'meter';
  readonly coordinateSystem: 'local-xz';
  readonly axisMapping: {
    readonly x: 'local-east-west';
    readonly y: 'local-up';
    readonly z: 'local-north-south';
  };
  readonly origin: Point3D;
  readonly originMetadata: LocalOriginMetadata;
  readonly heightDatum: HeightDatumRules;
  readonly localBounds: LocalCoordinateBounds;
  readonly precision: CoordinatePrecisionRules;
  readonly precisionMeters: number;
  readonly importProjection: ImportProjectionMetadata;
}

export const LOCAL_CITY_FRAME: GeospatialFrame = {
  unit: 'meter',
  coordinateSystem: 'local-xz',
  axisMapping: {
    x: 'local-east-west',
    y: 'local-up',
    z: 'local-north-south'
  },
  origin: { x: 0, y: 0, z: 0 },
  originMetadata: {
    id: 'local-origin-detailed-city-v1',
    name: 'Detailed City Local Origin',
    description: 'Procedural local meter origin at the center of the generated city ground plane.',
    sourceType: 'procedural'
  },
  heightDatum: {
    id: 'local-ground-plane',
    name: 'Local Ground Plane',
    verticalUnit: 'meter',
    groundElevationMeters: 0,
    minElevationMeters: -5,
    maxElevationMeters: 180
  },
  localBounds: {
    minX: -700,
    maxX: 700,
    minZ: -700,
    maxZ: 700
  },
  precision: {
    coordinatePrecisionMeters: 0.01,
    horizontalToleranceMeters: 0.01,
    verticalToleranceMeters: 0.01
  },
  precisionMeters: 0.01,
  importProjection: {
    status: 'not-configured',
    expectedUnit: 'meter',
    supportedAuthorities: ['EPSG', 'LOCAL', 'OGC'],
    notes: 'Imported coordinates must be projected into local x/z meters before becoming generated city objects.'
  }
};

export interface ObjectLodRule {
  readonly tier: LodTier;
  readonly maxDistanceMeters: number;
  readonly geometry: string;
  readonly materials: string;
  readonly behavior: string;
}

export type LodPolicyScope =
  | 'agent'
  | 'asset'
  | 'building'
  | 'facade'
  | 'interior'
  | 'land'
  | 'network'
  | 'overlay'
  | 'public-realm-prop'
  | 'terrain'
  | 'utility';

export interface CityObjectLodPolicy {
  readonly objectKind: CityObjectKind;
  readonly scope: LodPolicyScope;
  readonly defaultTier: LodTier;
  readonly allowedTiers: readonly LodTier[];
  readonly description: string;
}

export interface CityLodPolicy {
  readonly rules: readonly ObjectLodRule[];
  readonly objectPolicies: readonly CityObjectLodPolicy[];
}

export const CITY_LOD_TIERS = ['lod0', 'lod1', 'lod2', 'lod3', 'lod4'] as const satisfies readonly LodTier[];

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
  ],
  objectPolicies: [
    {
      objectKind: 'asset',
      scope: 'asset',
      defaultTier: 'lod1',
      allowedTiers: CITY_LOD_TIERS,
      description: 'Renderable asset definitions may provide primitive or future binary variants at any LOD.'
    },
    {
      objectKind: 'block',
      scope: 'land',
      defaultTier: 'lod1',
      allowedTiers: ['lod1'],
      description: 'Blocks are coarse land units used for city massing and overlays.'
    },
    {
      objectKind: 'building',
      scope: 'building',
      defaultTier: 'lod1',
      allowedTiers: ['lod1', 'lod2', 'lod3'],
      description: 'Building massing starts at LOD1 and can gain roof/facade detail at nearer tiers.'
    },
    {
      objectKind: 'civic-anchor',
      scope: 'building',
      defaultTier: 'lod1',
      allowedTiers: ['lod1', 'lod2', 'lod3'],
      description: 'Civic anchors render as named building or place markers until dedicated assets exist.'
    },
    {
      objectKind: 'crossing',
      scope: 'network',
      defaultTier: 'lod2',
      allowedTiers: ['lod2', 'lod3'],
      description: 'Crossings need enough detail for sidewalk graph and crosswalk rendering.'
    },
    {
      objectKind: 'curb-zone',
      scope: 'network',
      defaultTier: 'lod3',
      allowedTiers: ['lod3'],
      description: 'Curb allocation is human-scale street detail.'
    },
    {
      objectKind: 'district',
      scope: 'land',
      defaultTier: 'lod0',
      allowedTiers: ['lod0'],
      description: 'Districts are coarse planning masses and overlays.'
    },
    {
      objectKind: 'economy-anchor',
      scope: 'building',
      defaultTier: 'lod1',
      allowedTiers: ['lod1', 'lod2', 'lod3'],
      description: 'Economy anchors render as named buildings or destinations.'
    },
    {
      objectKind: 'facade',
      scope: 'facade',
      defaultTier: 'lod3',
      allowedTiers: ['lod3', 'lod4'],
      description: 'Facade modules and active frontages appear near the street and can expose close inspection detail.'
    },
    {
      objectKind: 'intersection',
      scope: 'network',
      defaultTier: 'lod2',
      allowedTiers: ['lod2'],
      description: 'Intersections are route graph nodes and crossing anchors.'
    },
    {
      objectKind: 'lane',
      scope: 'network',
      defaultTier: 'lod2',
      allowedTiers: ['lod2'],
      description: 'Lanes drive routing and road markings at network detail.'
    },
    {
      objectKind: 'lane-marking',
      scope: 'network',
      defaultTier: 'lod2',
      allowedTiers: ['lod2', 'lod3'],
      description: 'Lane dashes render at LOD2 while tactile paving and close crosswalk detail can use LOD3.'
    },
    {
      objectKind: 'parcel',
      scope: 'land',
      defaultTier: 'lod1',
      allowedTiers: ['lod1'],
      description: 'Parcels are land subdivision data used for generated buildings and overlays.'
    },
    {
      objectKind: 'park',
      scope: 'terrain',
      defaultTier: 'lod1',
      allowedTiers: ['lod1', 'lod2'],
      description: 'Parks render as terrain patches with optional close planting detail.'
    },
    {
      objectKind: 'road-segment',
      scope: 'network',
      defaultTier: 'lod1',
      allowedTiers: ['lod1', 'lod2'],
      description: 'Road ribbons are visible at LOD1 and support closer lane/sidewalk detail.'
    },
    {
      objectKind: 'sensor',
      scope: 'utility',
      defaultTier: 'lod3',
      allowedTiers: ['lod3', 'lod4'],
      description: 'Sensors are small utility/operations objects shown only near inspection range.'
    },
    {
      objectKind: 'sidewalk',
      scope: 'network',
      defaultTier: 'lod2',
      allowedTiers: ['lod2', 'lod3'],
      description: 'Sidewalks need route and furnishing-zone detail near roads.'
    },
    {
      objectKind: 'sidewalk-graph-edge',
      scope: 'network',
      defaultTier: 'lod2',
      allowedTiers: ['lod2'],
      description: 'Sidewalk graph edges are inspectable route metadata rather than decorative geometry.'
    },
    {
      objectKind: 'sidewalk-graph-node',
      scope: 'network',
      defaultTier: 'lod2',
      allowedTiers: ['lod2'],
      description: 'Sidewalk graph nodes anchor pedestrian routing at network detail.'
    },
    {
      objectKind: 'street-furniture',
      scope: 'public-realm-prop',
      defaultTier: 'lod3',
      allowedTiers: ['lod3', 'lod4'],
      description: 'Benches, bins, shelters, kiosks, signs, and racks render as human-scale public-realm props.'
    },
    {
      objectKind: 'street-light',
      scope: 'public-realm-prop',
      defaultTier: 'lod3',
      allowedTiers: ['lod3'],
      description: 'Street light poles and fixtures appear near public-realm inspection range.'
    },
    {
      objectKind: 'traffic-vehicle',
      scope: 'agent',
      defaultTier: 'lod2',
      allowedTiers: ['lod2', 'lod3'],
      description: 'Traffic agents render at route-aware network detail and can gain near-view variants later.'
    },
    {
      objectKind: 'tree-planting',
      scope: 'public-realm-prop',
      defaultTier: 'lod2',
      allowedTiers: ['lod2', 'lod3'],
      description: 'Trees render as park or detailed-street plantings depending on context.'
    },
    {
      objectKind: 'utility-edge',
      scope: 'utility',
      defaultTier: 'lod2',
      allowedTiers: ['lod2', 'lod3'],
      description: 'Utility network edges are service graph data with optional debug overlay rendering.'
    },
    {
      objectKind: 'utility-node',
      scope: 'utility',
      defaultTier: 'lod2',
      allowedTiers: ['lod2', 'lod3'],
      description: 'Utility network nodes become visible when service coverage and operations layers are enabled.'
    },
    {
      objectKind: 'vertical-slice',
      scope: 'overlay',
      defaultTier: 'lod0',
      allowedTiers: ['lod0'],
      description: 'Vertical slices are planning/debug selection envelopes.'
    },
    {
      objectKind: 'waterway',
      scope: 'terrain',
      defaultTier: 'lod1',
      allowedTiers: ['lod1', 'lod2'],
      description: 'Waterways render as terrain surfaces with closer edge detail later.'
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

export type RoadMarkingOrientation = 'horizontal' | 'vertical';

export type LaneMarkingType =
  | 'lane-dash'
  | 'refuge-island'
  | 'stop-bar'
  | 'tactile-paving'
  | 'turn-arrow'
  | 'zebra-crossing-stripe';

export interface LaneMarkingContract extends CityObjectBase<'lane-marking'> {
  readonly roadId: CityId;
  readonly laneId?: CityId;
  readonly crossingId?: CityId;
  readonly intersectionId?: CityId;
  readonly center: Point2D;
  readonly orientation: RoadMarkingOrientation;
  readonly size: {
    readonly x: number;
    readonly z: number;
  };
  readonly markingType: LaneMarkingType;
  readonly surfaceMaterial: 'paint' | 'tactile' | 'raised-concrete';
  readonly assetBindingId: CityId;
  readonly stripeIndex?: number;
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

export type IntersectionControlExpectation = 'signalized' | 'stop-controlled' | 'uncontrolled';

export interface IntersectionContract extends CityObjectBase<'intersection'> {
  readonly center: Point2D;
  readonly connectedRoadIds: readonly CityId[];
  readonly hierarchyMix: readonly StreetHierarchy[];
  readonly signalExpectation: IntersectionControlExpectation;
}

export interface CrossingContract extends CityObjectBase<'crossing'> {
  readonly intersectionId: CityId;
  readonly roadId: CityId;
  readonly center: Point2D;
  readonly connectedSidewalkIds: readonly [CityId, CityId];
  readonly widthMeters: number;
  readonly lengthMeters: number;
  readonly signalized: boolean;
}

export interface SidewalkGraphNodeContract extends CityObjectBase<'sidewalk-graph-node'> {
  readonly intersectionId: CityId;
  readonly sidewalkId: CityId;
  readonly position: Point2D;
}

export type SidewalkGraphEdgeMode = 'sidewalk' | 'crossing';

export interface SidewalkGraphEdgeContract extends CityObjectBase<'sidewalk-graph-edge'> {
  readonly fromNodeId: CityId;
  readonly toNodeId: CityId;
  readonly mode: SidewalkGraphEdgeMode;
  readonly lengthMeters: number;
  readonly crossingId?: CityId;
  readonly sidewalkId?: CityId;
}

export type BuildingFrontageSide = 'north' | 'east' | 'south' | 'west';

export interface BuildingContract extends CityObjectBase<'building'> {
  readonly parcelId: CityId;
  readonly footprint: Polygon2D;
  readonly uses: readonly LandUse[];
  readonly heightMeters: number;
  readonly floorCount: number;
  readonly facadeGrammarId: string;
  readonly roofGrammarId: string;
  readonly primaryFrontageRoadId: CityId;
  readonly primaryFrontageSide: BuildingFrontageSide;
  readonly entranceIds: readonly CityId[];
  readonly publicEntranceIds: readonly CityId[];
}

export type ActiveFrontageUse = Extract<LandUse, 'hospitality' | 'mixed-use' | 'retail'>;

export interface ActiveFrontageContract extends CityObjectBase<'facade'> {
  readonly facadeType: 'active-frontage';
  readonly sliceId: CityId;
  readonly buildingId: CityId;
  readonly parcelId: CityId;
  readonly roadId: CityId;
  readonly sidewalkId: CityId;
  readonly frontageSide: BuildingFrontageSide;
  readonly roadSide: CurbSide;
  readonly position: Point2D;
  readonly widthMeters: number;
  readonly heightMeters: number;
  readonly groundFloorHeightMeters: number;
  readonly facingDirectionRadians: number;
  readonly activeUses: readonly ActiveFrontageUse[];
  readonly publicEntranceIds: readonly CityId[];
  readonly storefront: {
    readonly displayWindowCount: number;
    readonly transparencyRatio: number;
    readonly signTextCode: string;
    readonly awning: {
      readonly enabled: boolean;
      readonly depthMeters: number;
      readonly colorCode: 'brick' | 'charcoal' | 'ochre' | 'teal';
    };
    readonly nightWindows: {
      readonly enabledByDefault: boolean;
      readonly litWindowCount: number;
      readonly emissiveIntensity: number;
    };
  };
  readonly assetBindingIds: {
    readonly storefrontWindow: CityId;
    readonly awning: CityId;
    readonly sign: CityId;
    readonly entranceDoor: CityId;
    readonly nightWindow: CityId;
  };
}

export interface DetailedStreetSliceContract extends CityObjectBase<'vertical-slice'> {
  readonly sliceKind: 'detailed-street';
  readonly corridorRoadId: CityId;
  readonly streetProfileId: string;
  readonly hierarchy: StreetHierarchy;
  readonly roadIds: readonly CityId[];
  readonly crossStreetRoadIds: readonly CityId[];
  readonly sidewalkIds: readonly CityId[];
  readonly intersectionIds: readonly CityId[];
  readonly crossingIds: readonly CityId[];
  readonly curbZoneIds: readonly CityId[];
  readonly sidewalkGraphNodeIds: readonly CityId[];
  readonly sidewalkGraphEdgeIds: readonly CityId[];
  readonly parcelIds: readonly CityId[];
  readonly buildingIds: readonly CityId[];
  readonly cameraTarget: Point3D;
  readonly cameraPosition: Point3D;
}

export type CurbZoneUse = 'parking' | 'loading' | 'ride-hail' | 'bus-stop' | 'emergency' | 'no-stopping';
export type CurbSide = 'left' | 'right';

export interface CurbZoneContract extends CityObjectBase<'curb-zone'> {
  readonly sliceId: CityId;
  readonly roadId: CityId;
  readonly sidewalkId: CityId;
  readonly side: CurbSide;
  readonly curbUse: CurbZoneUse;
  readonly streetProfileId: string;
  readonly startMeters: number;
  readonly endMeters: number;
  readonly lengthMeters: number;
  readonly widthMeters: number;
  readonly center: Point2D;
  readonly crossingClearanceMeters: number;
}

export interface StreetLightContract extends CityObjectBase<'street-light'> {
  readonly sliceId: CityId;
  readonly roadId: CityId;
  readonly sidewalkId: CityId;
  readonly curbZoneId: CityId;
  readonly position: Point2D;
  readonly side: CurbSide;
  readonly heightMeters: number;
  readonly poleRadiusMeters: number;
  readonly armLengthMeters: number;
  readonly fixtureLengthMeters: number;
  readonly coverageRadiusMeters: number;
  readonly colorTemperatureKelvin: number;
  readonly powerCircuitId?: CityId;
  readonly nightLighting: {
    readonly enabledByDefault: boolean;
    readonly emissiveIntensity: number;
    readonly castsDynamicLight: boolean;
  };
}

export type StreetFurnitureType =
  | 'bench'
  | 'bin'
  | 'bike-rack'
  | 'bollard'
  | 'bus-shelter'
  | 'kiosk'
  | 'regulatory-sign'
  | 'street-name-sign'
  | 'wayfinding-sign';

export type StreetFurniturePlacementZone = 'curb-edge' | 'furnishing-zone' | 'frontage-zone';

export interface StreetFurnitureContract extends CityObjectBase<'street-furniture'> {
  readonly sliceId: CityId;
  readonly roadId: CityId;
  readonly sidewalkId: CityId;
  readonly curbZoneId: CityId;
  readonly side: CurbSide;
  readonly furnitureType: StreetFurnitureType;
  readonly placementZone: StreetFurniturePlacementZone;
  readonly position: Point2D;
  readonly alongRoadMeters: number;
  readonly offsetFromRoadEdgeMeters: number;
  readonly orientationRadians: number;
  readonly dimensions: {
    readonly widthMeters: number;
    readonly lengthMeters: number;
    readonly heightMeters: number;
  };
  readonly clearanceEnvelope: {
    readonly widthMeters: number;
    readonly lengthMeters: number;
  };
  readonly assetBindingId: CityId;
  readonly signFace?: {
    readonly signRole: 'regulatory' | 'street-name' | 'wayfinding';
    readonly textCode: string;
    readonly facing: 'road' | 'sidewalk';
  };
}

export interface TrafficVehicleStopBehavior {
  readonly stopZoneOffsetsMeters: readonly number[];
  readonly stopDurationSeconds: number;
  readonly stopLookAheadMeters: number;
}

export interface TrafficVehicleRoute {
  readonly nodeIds: readonly CityId[];
  readonly spawnNodeId: CityId;
  readonly destinationNodeId: CityId;
  readonly startOffsetMeters: number;
  readonly endOffsetMeters: number;
  readonly lengthMeters: number;
}

export interface TrafficVehicleContract extends CityObjectBase<'traffic-vehicle'> {
  readonly roadId: CityId;
  readonly laneId: CityId;
  readonly axis: 'x' | 'z';
  readonly direction: 1 | -1;
  readonly speed: number;
  readonly speedLimitKph: number;
  readonly routeOffsetMeters: number;
  readonly position: Point2D;
  readonly size: {
    readonly x: number;
    readonly z: number;
  };
  readonly min: number;
  readonly max: number;
  readonly route: TrafficVehicleRoute;
  readonly stopBehavior: TrafficVehicleStopBehavior;
  readonly incidentHookIds: readonly CityId[];
}

export type AssetFormat = 'glb' | 'gltf' | 'png' | 'jpg' | 'webp' | 'ktx2' | 'hdr' | 'exr' | 'procedural';

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
  readonly url?: string;
  readonly format: AssetFormat;
  readonly scaleMeters: number;
  readonly tags: Readonly<Record<string, string | number | boolean>>;
  readonly lodVariants?: Partial<Record<LodTier, CityId>>;
  readonly attribution?: string;
  readonly license?: string;
}

export interface RenderBinding {
  readonly id: CityId;
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
    | 'config'
    | 'graph'
    | 'geometry'
    | 'identifier'
    | 'import-export'
    | 'lod'
    | 'metadata'
    | 'performance'
    | 'simulation'
    | 'utility-coverage'
    | 'zoning';
  readonly objectId?: CityId;
  readonly affectedPoint?: Point2D;
  readonly affectedBoundary?: Polygon2D;
  readonly suggestedFix?: string;
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
