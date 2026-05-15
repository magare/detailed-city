import type { CityPlanningLayer } from '../cityPlan';

export const CITY_CONTRACT_SCHEMA_VERSION = 'city-contracts-v1';

export type CityId = string;

export type CityObjectKind =
  | 'access-control'
  | 'administrative-boundary'
  | 'asset'
  | 'asset-inventory-record'
  | 'block'
  | 'address-point'
  | 'building'
  | 'building-entrance'
  | 'building-fire-safety'
  | 'cadastre-record'
  | 'city-metric'
  | 'civic-anchor'
  | 'community-anchor'
  | 'constraint'
  | 'crossing'
  | 'curb-activation'
  | 'curb-zone'
  | 'culture-anchor'
  | 'development-phase'
  | 'district'
  | 'economy-anchor'
  | 'emergency-service-anchor'
  | 'facade'
  | 'gazetteer-entry'
  | 'green-stormwater-feature'
  | 'bike-conflict-zone'
  | 'bike-graph-edge'
  | 'bike-graph-node'
  | 'bike-parking'
  | 'bike-segment'
  | 'bike-signal'
  | 'freight-loading-dock'
  | 'freight-route'
  | 'government-anchor'
  | 'healthcare-anchor'
  | 'hazard-zone'
  | 'intersection'
  | 'lane'
  | 'lane-marking'
  | 'maintenance-operation'
  | 'navigation-graph-edge'
  | 'navigation-graph-node'
  | 'navigation-route'
  | 'named-place'
  | 'parcel'
  | 'permit-inspection-record'
  | 'park'
  | 'park-feature'
  | 'plaza-zone'
  | 'public-amenity'
  | 'resilience-goal'
  | 'road-segment'
  | 'sensor'
  | 'service-access-corridor'
  | 'sidewalk'
  | 'sidewalk-graph-edge'
  | 'sidewalk-graph-node'
  | 'service-alley'
  | 'solar-shading-sample'
  | 'soil-geology-zone'
  | 'street-furniture'
  | 'street-light'
  | 'topography-zone'
  | 'traffic-vehicle'
  | 'traffic-calming-device'
  | 'transit-route'
  | 'transit-stop'
  | 'tree-planting'
  | 'urban-heat-zone'
  | 'utility-edge'
  | 'utility-node'
  | 'vertical-slice'
  | 'water-transport-access'
  | 'waterfront-edge'
  | 'waterfront-open-space'
  | 'waterway'
  | 'weather-preset'
  | 'zoning-district';

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

export type AssetInventoryScope = 'civic' | 'public-realm' | 'utility';
export type AssetLifecycleStage = 'commissioned' | 'in-service' | 'renewal-due' | 'retired';
export type AssetConditionRating = 'excellent' | 'good' | 'fair' | 'poor';
export type AssetOperationalStatus = 'active' | 'maintenance-watch' | 'out-of-service';
export type AssetCriticality = 'low' | 'medium' | 'high';

export interface AssetInventoryRecordContract extends CityObjectBase<'asset-inventory-record'> {
  readonly assetObjectId: CityId;
  readonly assetObjectKind: CityObjectKind;
  readonly assetLookupKey: string;
  readonly inventoryScope: AssetInventoryScope;
  readonly ownerEntityId: CityId;
  readonly responsibleDepartmentId: CityId;
  readonly renderBindingId: CityId;
  readonly renderAssetId: CityId;
  readonly lifecycle: {
    readonly stage: AssetLifecycleStage;
    readonly installedYear: number;
    readonly expectedServiceLifeYears: number;
    readonly replacementYear: number;
  };
  readonly warranty: {
    readonly providerEntityId: CityId;
    readonly expiresYear: number;
    readonly coverage: 'parts' | 'parts-and-labor' | 'structural';
  };
  readonly replacementCost: {
    readonly amountUsd: number;
    readonly estimateYear: number;
  };
  readonly condition: {
    readonly rating: AssetConditionRating;
    readonly score: number;
    readonly lastInspectionYear: number;
    readonly nextInspectionYear: number;
  };
  readonly operationalStatus: AssetOperationalStatus;
  readonly criticality: AssetCriticality;
  readonly source: {
    readonly sourceType: SourceType;
    readonly sourceId: string;
    readonly generationStep: string;
  };
  readonly inspectionAccessObjectIds: readonly CityId[];
}

export type MaintenanceOperationKind = 'inspection' | 'repair' | 'replacement' | 'street-work' | 'temporary-closure';
export type MaintenanceOperationStatus = 'scheduled' | 'queued' | 'in-progress' | 'completed';
export type MaintenancePriority = 'low' | 'normal' | 'urgent';

export interface MaintenanceOperationContract extends CityObjectBase<'maintenance-operation'> {
  readonly assetInventoryRecordId: CityId;
  readonly assetObjectId: CityId;
  readonly assetObjectKind: CityObjectKind;
  readonly operationKind: MaintenanceOperationKind;
  readonly status: MaintenanceOperationStatus;
  readonly priority: MaintenancePriority;
  readonly responsibleDepartmentId: CityId;
  readonly scheduledWindow: {
    readonly startDay: number;
    readonly endDay: number;
    readonly recurrenceDays?: number;
  };
  readonly repairQueue: {
    readonly queueId: CityId;
    readonly sequence: number;
    readonly estimatedCrewHours: number;
  };
  readonly conditionUpdate: {
    readonly fromScore: number;
    readonly projectedScore: number;
    readonly projectedRating: AssetConditionRating;
  };
  readonly replacement: {
    readonly dueYear: number;
    readonly estimatedCostUsd: number;
  };
  readonly navigationRouteId: CityId;
  readonly serviceAccessObjectIds: readonly CityId[];
  readonly closureRoadIds: readonly CityId[];
  readonly closureNavigationEdgeIds: readonly CityId[];
  readonly temporaryRestrictionIds: readonly CityId[];
  readonly createsTemporaryClosure: boolean;
}

export type PermitInspectionRecordKind =
  | 'development-permit'
  | 'temporary-closure-permit'
  | 'code-check'
  | 'approval'
  | 'inspection'
  | 'compliance-review';
export type PermitInspectionStatus = 'draft' | 'submitted' | 'under-review' | 'approved' | 'active' | 'closed' | 'failed';
export type PermitComplianceCode = 'zoning' | 'traffic-control' | 'accessibility' | 'fire-safety' | 'operations';

export interface PermitInspectionRecordContract extends CityObjectBase<'permit-inspection-record'> {
  readonly recordKind: PermitInspectionRecordKind;
  readonly status: PermitInspectionStatus;
  readonly applicantEntityId: CityId;
  readonly responsibleDepartmentId: CityId;
  readonly cadastreRecordId?: CityId;
  readonly parcelId?: CityId;
  readonly maintenanceOperationId?: CityId;
  readonly relatedObjectIds: readonly CityId[];
  readonly closureRoadIds: readonly CityId[];
  readonly temporaryRestrictionIds: readonly CityId[];
  readonly submittedDay: number;
  readonly validFromDay: number;
  readonly validToDay: number;
  readonly approval: {
    readonly required: boolean;
    readonly approvedByDepartmentId?: CityId;
    readonly approvalDay?: number;
  };
  readonly inspection: {
    readonly required: boolean;
    readonly scheduledDay?: number;
    readonly inspectorDepartmentId?: CityId;
    readonly passed?: boolean;
  };
  readonly compliance: {
    readonly code: PermitComplianceCode;
    readonly passed: boolean;
    readonly outstandingIssueCount: number;
  };
}

export type DevelopmentPhaseKind = 'baseline' | 'future-expansion' | 'temporary-condition';
export type DevelopmentPhaseStatus = 'active' | 'planned' | 'temporary' | 'completed';

export interface DevelopmentPhaseContract extends CityObjectBase<'development-phase'> {
  readonly phaseKind: DevelopmentPhaseKind;
  readonly status: DevelopmentPhaseStatus;
  readonly sequence: number;
  readonly startYear: number;
  readonly targetYear: number;
  readonly focusPoint: Point2D;
  readonly boundary: Polygon2D;
  readonly description: string;
  readonly unlocksAfterPhaseIds: readonly CityId[];
  readonly unlocksObjectIds: readonly CityId[];
  readonly temporaryRoadIds: readonly CityId[];
  readonly temporaryParkIds: readonly CityId[];
  readonly closureRoadIds: readonly CityId[];
  readonly masterPlanGrowthBoundaryIds: readonly CityId[];
  readonly operationsHooks: {
    readonly closureIds: readonly CityId[];
    readonly simulationScenarioIds: readonly CityId[];
  };
}

export type ParkFeatureKind = 'lawn' | 'path' | 'planting' | 'sports' | 'seating' | 'water-feature' | 'shade';
export type ParkProgramKind =
  | 'active-recreation'
  | 'civic-gathering'
  | 'ecological-buffer'
  | 'passive-recreation'
  | 'waterfront-open-space';
export type ParkFeatureSurface =
  | 'compacted-gravel'
  | 'grass'
  | 'planting-bed'
  | 'paving'
  | 'play-surface'
  | 'timber'
  | 'water';

export interface ParkFeatureContract extends CityObjectBase<'park-feature'> {
  readonly parkId: CityId;
  readonly featureKind: ParkFeatureKind;
  readonly programKind: ParkProgramKind;
  readonly center: Point2D;
  readonly size: {
    readonly x: number;
    readonly z: number;
  };
  readonly boundary: Polygon2D;
  readonly surface: ParkFeatureSurface;
  readonly accessible: boolean;
  readonly connectedSidewalkIds: readonly CityId[];
  readonly capacityPeople?: number;
  readonly shadeTreeIds: readonly CityId[];
  readonly assetBindingId: CityId;
}

export type PlazaZoneKind = 'active-edge' | 'event' | 'hardscape' | 'paving' | 'seating' | 'shade';
export type PlazaPavingTier = 'primary' | 'secondary' | 'accent';
export type PlazaGatheringBehavior = 'circulation' | 'linger' | 'programmed-event' | 'threshold';
export type PlazaZoneSurface = 'stone-paver' | 'permeable-paver' | 'timber' | 'shade-canopy';
export type GreenStormwaterFeatureKind =
  | 'bioswale'
  | 'curb-cut'
  | 'flow-through-planter'
  | 'permeable-pavement'
  | 'pervious-strip'
  | 'rain-garden'
  | 'tree-trench';
export type GreenStormwaterSurface =
  | 'curb-cut-concrete'
  | 'engineered-soil'
  | 'permeable-paver'
  | 'planting-bed'
  | 'stone-check-dam';
export type TreeSpecies = 'plane' | 'rain-tree' | 'palm' | 'jacaranda';
export type TreePlantingForm = 'street-tree' | 'park-grove' | 'raised-planter';
export type TreeCanopyClass = 'narrow' | 'medium' | 'broad' | 'palm';
export type TreeSeasonalColor = 'evergreen' | 'spring-purple' | 'summer-green' | 'autumn-gold';
export type GreenCorridorRole = 'shade-corridor' | 'park-grove' | 'waterfront-cooling' | 'civic-canopy';

export interface PlazaZoneContract extends CityObjectBase<'plaza-zone'> {
  readonly plazaId: CityId;
  readonly zoneKind: PlazaZoneKind;
  readonly center: Point2D;
  readonly size: {
    readonly x: number;
    readonly z: number;
  };
  readonly boundary: Polygon2D;
  readonly surface: PlazaZoneSurface;
  readonly pavingTier: PlazaPavingTier;
  readonly gatheringBehavior: PlazaGatheringBehavior;
  readonly connectedSidewalkIds: readonly CityId[];
  readonly activeFrontageIds: readonly CityId[];
  readonly parkFeatureIds: readonly CityId[];
  readonly capacityPeople: number;
  readonly eventCapacityPeople: number;
  readonly shadeCoveragePercent: number;
  readonly assetBindingId: CityId;
}

export interface GreenStormwaterFeatureContract extends CityObjectBase<'green-stormwater-feature'> {
  readonly featureKind: GreenStormwaterFeatureKind;
  readonly roadId: CityId;
  readonly sidewalkId: CityId;
  readonly utilityNodeIds: readonly CityId[];
  readonly runoffPathEdgeIds: readonly CityId[];
  readonly treeIds: readonly CityId[];
  readonly maintenanceOwnerEntityId: CityId;
  readonly center: Point2D;
  readonly size: {
    readonly x: number;
    readonly z: number;
  };
  readonly boundary: Polygon2D;
  readonly surface: GreenStormwaterSurface;
  readonly storageVolumeCubicMeters: number;
  readonly treatmentVolumeCubicMeters: number;
  readonly designStormMmPerHour: number;
  readonly clearPathMeters: number;
  readonly curbCutCount: number;
  readonly runoffCapturePercent: number;
  readonly maintenanceAccessMeters: number;
  readonly assetBindingId: CityId;
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
  | 'operations'
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
      objectKind: 'access-control',
      scope: 'network',
      defaultTier: 'lod3',
      allowedTiers: ['lod2', 'lod3', 'lod4'],
      description: 'Access controls expose walls, fences, guardrails, bollards, gates, turnstiles, and checkpoints that constrain public, private, service, and emergency movement.'
    },
    {
      objectKind: 'administrative-boundary',
      scope: 'land',
      defaultTier: 'lod0',
      allowedTiers: ['lod0'],
      description: 'Administrative boundaries define city limits, wards, neighborhoods, service areas, ownership zones, and jurisdiction overlays.'
    },
    {
      objectKind: 'address-point',
      scope: 'building',
      defaultTier: 'lod2',
      allowedTiers: ['lod2', 'lod3', 'lod4'],
      description: 'Address points bind buildings, entrances, street names, numbers, and active frontage lookup metadata.'
    },
    {
      objectKind: 'asset',
      scope: 'asset',
      defaultTier: 'lod1',
      allowedTiers: CITY_LOD_TIERS,
      description: 'Renderable asset definitions may provide primitive or future binary variants at any LOD.'
    },
    {
      objectKind: 'asset-inventory-record',
      scope: 'asset',
      defaultTier: 'lod1',
      allowedTiers: ['lod1'],
      description: 'Operations-owned inventory records expose ownership, lifecycle, warranty, condition, replacement cost, status, and source lookup for renderable civic, public-realm, and utility assets.'
    },
    {
      objectKind: 'maintenance-operation',
      scope: 'operations',
      defaultTier: 'lod1',
      allowedTiers: ['lod1'],
      description: 'Operations-owned maintenance work orders schedule inspections, repairs, replacements, street works, and temporary closures for inventory assets.'
    },
    {
      objectKind: 'permit-inspection-record',
      scope: 'operations',
      defaultTier: 'lod1',
      allowedTiers: ['lod1'],
      description: 'Operations-owned permits, approvals, code checks, inspections, compliance reviews, and temporary closure approvals bind land and maintenance changes to inspectable records.'
    },
    {
      objectKind: 'block',
      scope: 'land',
      defaultTier: 'lod1',
      allowedTiers: ['lod1'],
      description: 'Blocks are coarse land units used for city massing and overlays.'
    },
    {
      objectKind: 'zoning-district',
      scope: 'land',
      defaultTier: 'lod0',
      allowedTiers: ['lod0'],
      description: 'Zoning districts define allowed uses, height, FAR, coverage, buffers, frontage rules, and form controls for parcels and buildings.'
    },
    {
      objectKind: 'building',
      scope: 'building',
      defaultTier: 'lod1',
      allowedTiers: ['lod1', 'lod2', 'lod3'],
      description: 'Building massing starts at LOD1 and can gain roof/facade detail at nearer tiers.'
    },
    {
      objectKind: 'building-entrance',
      scope: 'building',
      defaultTier: 'lod4',
      allowedTiers: ['lod3', 'lod4'],
      description: 'Building entrances expose public doors, lobbies, ramps, service entries, and loading doors for address and access validation.'
    },
    {
      objectKind: 'building-fire-safety',
      scope: 'building',
      defaultTier: 'lod4',
      allowedTiers: ['lod3', 'lod4'],
      description: 'Building fire-safety profiles bind egress, fire lanes, hydrant reach, sprinkler service, refuge areas, and emergency access to each building.'
    },
    {
      objectKind: 'civic-anchor',
      scope: 'building',
      defaultTier: 'lod1',
      allowedTiers: ['lod1', 'lod2', 'lod3'],
      description: 'Civic anchors render as named building or place markers until dedicated assets exist.'
    },
    {
      objectKind: 'culture-anchor',
      scope: 'building',
      defaultTier: 'lod2',
      allowedTiers: ['lod2', 'lod3'],
      description: 'Culture anchors expose museums, theaters, galleries, venues, heritage sites, and event spaces for tourism and event hooks.'
    },
    {
      objectKind: 'community-anchor',
      scope: 'building',
      defaultTier: 'lod2',
      allowedTiers: ['lod2', 'lod3'],
      description: 'Community anchors expose worship places, cemeteries, processional space, social services, recreation centers, food banks, shelters, and community halls.'
    },
    {
      objectKind: 'government-anchor',
      scope: 'building',
      defaultTier: 'lod2',
      allowedTiers: ['lod2', 'lod3'],
      description: 'Government anchors expose city hall, administrative, court, service counter, and civic plaza public-administration nodes.'
    },
    {
      objectKind: 'healthcare-anchor',
      scope: 'building',
      defaultTier: 'lod3',
      allowedTiers: ['lod2', 'lod3'],
      description: 'Healthcare anchors expose hospitals, clinics, pharmacies, urgent care, ambulance bays, patient arrival demand, and coverage route hooks.'
    },
    {
      objectKind: 'emergency-service-anchor',
      scope: 'building',
      defaultTier: 'lod3',
      allowedTiers: ['lod2', 'lod3', 'lod4'],
      description: 'Emergency service anchors expose fire, police, ambulance, shelter, command, and staging bases with dispatch coverage and access references.'
    },
    {
      objectKind: 'cadastre-record',
      scope: 'land',
      defaultTier: 'lod1',
      allowedTiers: ['lod1'],
      description: 'Cadastre records are inspectable land ownership, rights, and easement metadata for parcels.'
    },
    {
      objectKind: 'city-metric',
      scope: 'overlay',
      defaultTier: 'lod0',
      allowedTiers: ['lod0'],
      description: 'City metrics are blueprint-owned computed scorecards for walkability, density, services, traffic, energy, emissions, and quality.'
    },
    {
      objectKind: 'development-phase',
      scope: 'overlay',
      defaultTier: 'lod0',
      allowedTiers: ['lod0', 'lod1'],
      description: 'Development phases expose construction staging, temporary closures, future expansion areas, and unlock order for operations and simulation.'
    },
    {
      objectKind: 'constraint',
      scope: 'overlay',
      defaultTier: 'lod0',
      allowedTiers: ['lod0'],
      description: 'Planning constraints are inspectable overlay contracts that gate land, road, and building validity.'
    },
    {
      objectKind: 'hazard-zone',
      scope: 'overlay',
      defaultTier: 'lod0',
      allowedTiers: ['lod0'],
      description: 'Hazard zones describe flood, slope, heat, restricted, and contamination risk surfaces consumed by land validation.'
    },
    {
      objectKind: 'resilience-goal',
      scope: 'overlay',
      defaultTier: 'lod0',
      allowedTiers: ['lod0'],
      description: 'Resilience goals are blueprint overlay contracts for emergency, flood, continuity, and recovery targets.'
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
      objectKind: 'curb-activation',
      scope: 'public-realm-prop',
      defaultTier: 'lod3',
      allowedTiers: ['lod3', 'lod4'],
      description: 'Curb activations expose parklets, outdoor dining, temporary decks, interim plazas, barriers, permits, and seasonal removal metadata.'
    },
    {
      objectKind: 'public-amenity',
      scope: 'public-realm-prop',
      defaultTier: 'lod3',
      allowedTiers: ['lod3', 'lod4'],
      description: 'Public amenities expose comfort fixtures, accessibility, utility service, and maintenance access for public-space use.'
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
      objectKind: 'gazetteer-entry',
      scope: 'overlay',
      defaultTier: 'lod2',
      allowedTiers: ['lod2', 'lod3', 'lod4'],
      description: 'Gazetteer entries index addresses, named places, streets, and anchors for search, imports, and reverse lookup.'
    },
    {
      objectKind: 'bike-conflict-zone',
      scope: 'network',
      defaultTier: 'lod2',
      allowedTiers: ['lod2', 'lod3'],
      description: 'Bike conflict zones identify turning, door-zone, transit-stop, and driveway conflicts requiring mitigation.'
    },
    {
      objectKind: 'bike-graph-edge',
      scope: 'network',
      defaultTier: 'lod2',
      allowedTiers: ['lod2'],
      description: 'Bike graph edges describe deterministic cycling route continuity.'
    },
    {
      objectKind: 'bike-graph-node',
      scope: 'network',
      defaultTier: 'lod2',
      allowedTiers: ['lod2'],
      description: 'Bike graph nodes connect cycling segments at intersections, parking, and transit access points.'
    },
    {
      objectKind: 'bike-parking',
      scope: 'public-realm-prop',
      defaultTier: 'lod3',
      allowedTiers: ['lod2', 'lod3', 'lod4'],
      description: 'Bike parking exposes rack, dock, and corral capacity linked to cycling routes and transit access.'
    },
    {
      objectKind: 'bike-segment',
      scope: 'network',
      defaultTier: 'lod2',
      allowedTiers: ['lod1', 'lod2', 'lod3'],
      description: 'Bike segments describe protected lanes, painted lanes, cycle tracks, and shared streets by road side.'
    },
    {
      objectKind: 'bike-signal',
      scope: 'network',
      defaultTier: 'lod3',
      allowedTiers: ['lod2', 'lod3'],
      description: 'Bike signals expose protected or leading bike phases at cycling conflict intersections.'
    },
    {
      objectKind: 'freight-loading-dock',
      scope: 'network',
      defaultTier: 'lod3',
      allowedTiers: ['lod2', 'lod3', 'lod4'],
      description: 'Freight loading docks attach buildings to loading curbs, service alleys, and last-mile delivery routes.'
    },
    {
      objectKind: 'freight-route',
      scope: 'network',
      defaultTier: 'lod2',
      allowedTiers: ['lod1', 'lod2'],
      description: 'Freight routes describe truck-capable road paths, delivery windows, and route restrictions.'
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
      objectKind: 'navigation-graph-edge',
      scope: 'network',
      defaultTier: 'lod1',
      allowedTiers: ['lod1', 'lod2'],
      description: 'Navigation graph edges expose routeable continuity for vehicles, pedestrians, bikes, transit, service, emergency, and freight modes.'
    },
    {
      objectKind: 'navigation-graph-node',
      scope: 'network',
      defaultTier: 'lod1',
      allowedTiers: ['lod1', 'lod2'],
      description: 'Navigation graph nodes normalize route endpoints across road, sidewalk, bike, transit, service, emergency, and freight sources.'
    },
    {
      objectKind: 'navigation-route',
      scope: 'network',
      defaultTier: 'lod1',
      allowedTiers: ['lod1', 'lod2'],
      description: 'Navigation routes are deterministic route requests that agents and operations can resolve by mode.'
    },
    {
      objectKind: 'named-place',
      scope: 'land',
      defaultTier: 'lod2',
      allowedTiers: ['lod1', 'lod2', 'lod3'],
      description: 'Named places bind neighborhoods, wards, streets, parks, and civic anchors to stable searchable place metadata.'
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
      objectKind: 'green-stormwater-feature',
      scope: 'public-realm-prop',
      defaultTier: 'lod3',
      allowedTiers: ['lod2', 'lod3'],
      description: 'Green stormwater public-realm features show rain gardens, bioswales, planters, pervious strips, permeable paving, curb cuts, and tree trenches tied to drainage infrastructure.'
    },
    {
      objectKind: 'park-feature',
      scope: 'public-realm-prop',
      defaultTier: 'lod2',
      allowedTiers: ['lod1', 'lod2', 'lod3'],
      description: 'Park features describe paths, lawns, planting, sports, seating, water, and shade zones inside park boundaries.'
    },
    {
      objectKind: 'plaza-zone',
      scope: 'public-realm-prop',
      defaultTier: 'lod2',
      allowedTiers: ['lod1', 'lod2', 'lod3'],
      description: 'Plaza zones describe hardscape, seating, active edges, shade, event areas, and paving hierarchy.'
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
      objectKind: 'service-alley',
      scope: 'network',
      defaultTier: 'lod2',
      allowedTiers: ['lod2', 'lod3'],
      description: 'Service alleys describe controlled rear or side access for freight docks and building service yards.'
    },
    {
      objectKind: 'service-access-corridor',
      scope: 'utility',
      defaultTier: 'lod2',
      allowedTiers: ['lod2', 'lod3'],
      description: 'Service access corridors expose utility easements, vault access, maintenance paths, service yards, and restricted utility operations zones.'
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
      objectKind: 'soil-geology-zone',
      scope: 'terrain',
      defaultTier: 'lod0',
      allowedTiers: ['lod0', 'lod1'],
      description: 'Soil and geology zones define foundation suitability, tunnel difficulty, drainage assumptions, contamination hints, and ground risk.'
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
      objectKind: 'topography-zone',
      scope: 'terrain',
      defaultTier: 'lod0',
      allowedTiers: ['lod0', 'lod1'],
      description: 'Topography zones define elevation bands, slopes, retaining conditions, and buildability hooks for land, roads, and buildings.'
    },
    {
      objectKind: 'traffic-calming-device',
      scope: 'network',
      defaultTier: 'lod3',
      allowedTiers: ['lod2', 'lod3'],
      description: 'Traffic calming devices are human-scale network details that slow approaches and improve crossing safety.'
    },
    {
      objectKind: 'transit-route',
      scope: 'network',
      defaultTier: 'lod1',
      allowedTiers: ['lod1', 'lod2'],
      description: 'Transit routes bind bus service to eligible road corridors, route lanes, stops, headways, and passenger demand seeds.'
    },
    {
      objectKind: 'transit-stop',
      scope: 'network',
      defaultTier: 'lod3',
      allowedTiers: ['lod2', 'lod3', 'lod4'],
      description: 'Transit stops are sidewalk-attached passenger access points with shelter, accessibility, transfer, and route metadata.'
    },
    {
      objectKind: 'water-transport-access',
      scope: 'network',
      defaultTier: 'lod3',
      allowedTiers: ['lod2', 'lod3', 'lod4'],
      description: 'Water transport access objects expose ferry stops, piers, service docks, small port edges, and emergency helipads linked to waterfront and navigation data.'
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
    },
    {
      objectKind: 'waterfront-edge',
      scope: 'public-realm-prop',
      defaultTier: 'lod2',
      allowedTiers: ['lod2', 'lod3'],
      description: 'Waterfront edge objects render promenades, quays, piers, flood walls, and ecological banks.'
    },
    {
      objectKind: 'waterfront-open-space',
      scope: 'public-realm-prop',
      defaultTier: 'lod3',
      allowedTiers: ['lod2', 'lod3'],
      description: 'Waterfront open spaces describe public promenades, overlooks, boardwalks, ecological terraces, seating, railings, and water access.'
    },
    {
      objectKind: 'solar-shading-sample',
      scope: 'overlay',
      defaultTier: 'lod0',
      allowedTiers: ['lod0'],
      description: 'Solar and shading samples expose sun path, shade comfort, glare, and roof solar suitability for debug overlays and environmental simulation.'
    },
    {
      objectKind: 'urban-heat-zone',
      scope: 'overlay',
      defaultTier: 'lod0',
      allowedTiers: ['lod0'],
      description: 'Urban heat zones expose heat islands, cool roofs, canopy and water cooling, albedo, and route heat risk for environmental overlays.'
    },
    {
      objectKind: 'weather-preset',
      scope: 'overlay',
      defaultTier: 'lod0',
      allowedTiers: ['lod0'],
      description: 'Weather presets define deterministic climate state, visibility, surface wetness, and rendering hooks for readable environment changes.'
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
    totalWidthMeters: 12,
    vehicleLanes: 2,
    laneWidthMeters: 3,
    sidewalkWidthMeters: 2,
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
    vehicleLanes: 2,
    laneWidthMeters: 2.8,
    sidewalkWidthMeters: 8,
    bikeLane: 'cycle-track',
    parking: 'none',
    median: false,
    treeZone: true,
    transitLane: false,
    designSpeedKph: 10
  },
  {
    id: 'transit-corridor',
    hierarchy: 'transit-corridor',
    totalWidthMeters: 30,
    vehicleLanes: 4,
    laneWidthMeters: 3.2,
    sidewalkWidthMeters: 4.8,
    bikeLane: 'protected',
    parking: 'loading-only',
    median: true,
    treeZone: true,
    transitLane: true,
    designSpeedKph: 35
  }
] as const satisfies readonly StreetProfile[];

export interface DistrictContract extends CityObjectBase<'district'> {
  readonly boundary: Polygon2D;
  readonly density: 'low' | 'medium' | 'high' | 'super-tall';
  readonly primaryUses: readonly LandUse[];
  readonly useMix: readonly DistrictUseMixRule[];
  readonly heightRangeMeters: readonly [number, number];
  readonly densityGradient: DistrictDensityGradient;
  readonly allowedStreetProfiles: readonly string[];
  readonly landmarkTargets: readonly DistrictLandmarkTarget[];
  readonly transitionBuffers: readonly DistrictTransitionBuffer[];
  readonly styleHints: DistrictStyleHints;
}

export interface DistrictUseMixRule {
  readonly use: LandUse;
  readonly share: number;
}

export interface DistrictLandmarkTarget {
  readonly id: CityId;
  readonly landmarkKind: 'civic-marker' | 'employment-node' | 'neighborhood-node' | 'skyline-peak' | 'waterfront-marker';
  readonly targetCount: number;
  readonly centerId?: CityId;
}

export interface DistrictDensityGradient {
  readonly centerId: CityId;
  readonly coreIntensity: number;
  readonly edgeIntensity: number;
  readonly heightMultiplierAtCore: number;
  readonly heightMultiplierAtEdge: number;
}

export interface DistrictTransitionBuffer {
  readonly adjacentDistrictId: CityId;
  readonly widthBlocks: number;
  readonly transitionKind: 'active-edge' | 'civic-buffer' | 'employment-buffer' | 'green-buffer' | 'mixed-use-buffer';
}

export interface DistrictStyleHints {
  readonly materialPalette: string;
  readonly facadeRhythm: 'civic-formal' | 'fine-grain' | 'industrial-large-bay' | 'mid-rise-waterfront' | 'residential-regular';
  readonly roofline: 'civic-cornice' | 'flat-varied' | 'green-lowrise' | 'mechanical-sawtooth' | 'tower-stepped';
  readonly publicRealmCharacter: string;
  readonly preferredMaterialZones: readonly string[];
}

export const CITY_ADMINISTRATIVE_BOUNDARY_KINDS = [
  'city-limit',
  'ward',
  'neighborhood',
  'service-area',
  'ownership-zone',
  'jurisdiction-overlay'
] as const;

export type AdministrativeBoundaryKind = (typeof CITY_ADMINISTRATIVE_BOUNDARY_KINDS)[number];
export type AdministrativeBoundaryAuthority =
  | 'city-government'
  | 'planning-department'
  | 'public-works'
  | 'parks-department'
  | 'port-authority'
  | 'private-owner';

export interface AdministrativeBoundaryContract extends CityObjectBase<'administrative-boundary'> {
  readonly boundaryKind: AdministrativeBoundaryKind;
  readonly authority: AdministrativeBoundaryAuthority;
  readonly boundary: Polygon2D;
  readonly center: Point2D;
  readonly districtIds: readonly CityId[];
  readonly blockIds: readonly CityId[];
  readonly parcelIds: readonly CityId[];
  readonly serviceTypes: readonly ('emergency' | 'parks' | 'planning' | 'public-works' | 'utilities')[];
  readonly ownershipClass: 'public' | 'private' | 'mixed';
  readonly jurisdictionLevel: 'city' | 'district' | 'ward' | 'service' | 'ownership' | 'overlay';
}

export type WaterwayKind = 'river' | 'canal' | 'channel';
export type WaterwayEdgeSide = 'north' | 'south' | 'east' | 'west';
export type WaterwayEdgeKind = 'promenade' | 'quay' | 'ecological-bank' | 'service-edge';
export type WaterwayCrossingKind = 'bridge' | 'culvert';
export type WaterwayChannelKind = 'main-channel' | 'canal' | 'drainage-channel';
export type WaterwayDockUse = 'ferry' | 'service' | 'recreation';
export type WaterwayOutfallSource = 'stormwater' | 'treated-water' | 'overflow';

export interface WaterwayEdgeSegmentContract {
  readonly id: CityId;
  readonly side: WaterwayEdgeSide;
  readonly edgeKind: WaterwayEdgeKind;
  readonly centerline: readonly [Point2D, Point2D];
  readonly lengthMeters: number;
  readonly connectedSegmentIds: readonly CityId[];
  readonly publicAccess: boolean;
  readonly districtIds: readonly CityId[];
}

export interface WaterwayChannelContract {
  readonly id: CityId;
  readonly channelKind: WaterwayChannelKind;
  readonly centerline: readonly [Point2D, Point2D];
  readonly widthMeters: number;
  readonly connectsToEdgeSegmentIds: readonly CityId[];
  readonly navigable: boolean;
}

export interface WaterwayCrossingRefContract {
  readonly id: CityId;
  readonly crossingKind: WaterwayCrossingKind;
  readonly roadId: CityId;
  readonly center: Point2D;
  readonly edgeSegmentIds: readonly [CityId, CityId];
  readonly clearanceMeters: number;
}

export interface WaterwayCulvertContract {
  readonly id: CityId;
  readonly roadId: CityId;
  readonly center: Point2D;
  readonly inletEdgeSegmentId: CityId;
  readonly outletEdgeSegmentId: CityId;
  readonly diameterMeters: number;
  readonly outfallIds: readonly CityId[];
}

export interface WaterwayDockContract {
  readonly id: CityId;
  readonly edgeSegmentId: CityId;
  readonly center: Point2D;
  readonly use: WaterwayDockUse;
  readonly lengthMeters: number;
  readonly widthMeters: number;
  readonly accessRoadId?: CityId;
}

export interface WaterwayOutfallContract {
  readonly id: CityId;
  readonly edgeSegmentId: CityId;
  readonly center: Point2D;
  readonly source: WaterwayOutfallSource;
  readonly receivingWaterwayId: CityId;
  readonly diameterMeters: number;
}

export interface WaterwayContract extends CityObjectBase<'waterway'> {
  readonly waterwayKind: WaterwayKind;
  readonly center: Point2D;
  readonly length: number;
  readonly width: number;
  readonly boundary: Polygon2D;
  readonly flowDirection: 'eastbound' | 'westbound' | 'northbound' | 'southbound';
  readonly edgeSegments: readonly WaterwayEdgeSegmentContract[];
  readonly channels: readonly WaterwayChannelContract[];
  readonly crossingRefs: readonly WaterwayCrossingRefContract[];
  readonly culverts: readonly WaterwayCulvertContract[];
  readonly docks: readonly WaterwayDockContract[];
  readonly outfalls: readonly WaterwayOutfallContract[];
  readonly connectedWaterwayIds: readonly CityId[];
}

export type WaterfrontEdgeKind = 'ecological-edge' | 'flood-wall' | 'pier' | 'promenade' | 'public-access' | 'quay';
export type WaterfrontFloodProtectionKind = 'berm' | 'flood-wall' | 'none';
export type WaterfrontMaterialHint = 'boardwalk' | 'concrete-promenade' | 'ecological-planting' | 'stone-quay';

export interface WaterfrontEdgeContract extends CityObjectBase<'waterfront-edge'> {
  readonly waterfrontKind: WaterfrontEdgeKind;
  readonly waterwayId: CityId;
  readonly waterwayEdgeSegmentId?: CityId;
  readonly dockId?: CityId;
  readonly boundary: Polygon2D;
  readonly center: Point2D;
  readonly centerline: readonly [Point2D, Point2D];
  readonly lengthMeters: number;
  readonly widthMeters: number;
  readonly elevationMeters: number;
  readonly publicAccess: boolean;
  readonly publicAccessPoint?: Point2D;
  readonly connectedPublicRealmIds: readonly CityId[];
  readonly connectedRoadIds: readonly CityId[];
  readonly connectedWaterwayComponentIds: readonly CityId[];
  readonly floodProtection: {
    readonly kind: WaterfrontFloodProtectionKind;
    readonly crestElevationMeters?: number;
  };
  readonly materialHint: WaterfrontMaterialHint;
}

export type WaterfrontOpenSpaceKind =
  | 'boardwalk'
  | 'ecological-edge'
  | 'overlook'
  | 'pier-landing'
  | 'promenade'
  | 'water-access';
export type WaterfrontOpenSpaceSurface = 'concrete-promenade' | 'ecological-planting' | 'stone-quay' | 'timber-boardwalk';

export interface WaterfrontOpenSpaceContract extends CityObjectBase<'waterfront-open-space'> {
  readonly openSpaceKind: WaterfrontOpenSpaceKind;
  readonly waterfrontEdgeId: CityId;
  readonly waterwayId: CityId;
  readonly boundary: Polygon2D;
  readonly center: Point2D;
  readonly lengthMeters: number;
  readonly widthMeters: number;
  readonly elevationMeters: number;
  readonly surface: WaterfrontOpenSpaceSurface;
  readonly accessible: boolean;
  readonly publicAccess: boolean;
  readonly connectedRoadIds: readonly CityId[];
  readonly connectedParkIds: readonly CityId[];
  readonly seatingCapacity: number;
  readonly railingLengthMeters: number;
  readonly shadeTreeIds: readonly CityId[];
  readonly nearbyFurnitureIds: readonly CityId[];
  readonly waterAccessPoint?: Point2D;
  readonly comfort: {
    readonly shadeCoverageRatio: number;
    readonly ecologyScore: number;
    readonly overlook: boolean;
    readonly eventCapacityPeople: number;
  };
  readonly assetBindingId: CityId;
}

export type WaterTransportAccessKind =
  | 'emergency-helipad'
  | 'ferry-pier'
  | 'ferry-stop'
  | 'port-logistics-edge'
  | 'service-dock'
  | 'small-port';
export type WaterTransportArrivalMode = 'ferry' | 'freight-barge' | 'helicopter' | 'service-vessel' | 'water-taxi';

export interface WaterTransportAccessContract extends CityObjectBase<'water-transport-access'> {
  readonly accessKind: WaterTransportAccessKind;
  readonly arrivalMode: WaterTransportArrivalMode;
  readonly waterwayId?: CityId;
  readonly waterfrontEdgeId?: CityId;
  readonly waterfrontOpenSpaceId?: CityId;
  readonly dockId?: CityId;
  readonly emergencyServiceAnchorId?: CityId;
  readonly freightRouteId?: CityId;
  readonly roadId?: CityId;
  readonly center: Point2D;
  readonly boundary: Polygon2D;
  readonly capacity: {
    readonly berths: number;
    readonly passengersPerHour: number;
    readonly cargoTonnesPerDay: number;
    readonly emergencySlotsPerHour: number;
  };
  readonly constraints: {
    readonly maxVesselLengthMeters?: number;
    readonly minChannelWidthMeters?: number;
    readonly requiredClearanceMeters?: number;
    readonly maxApproachGradePercent: number;
    readonly weatherLimited: boolean;
    readonly hazmatAllowed: boolean;
    readonly nightOperations: boolean;
    readonly emergencyPriority: boolean;
  };
  readonly routing: {
    readonly navigationNodeIds: readonly CityId[];
    readonly navigationEdgeIds: readonly CityId[];
    readonly connectedRoadIds: readonly CityId[];
    readonly connectedWaterwayComponentIds: readonly CityId[];
    readonly transferObjectIds: readonly CityId[];
  };
  readonly scheduleProfileId: CityId;
  readonly renderBindingId: CityId;
}

export const CITY_CONSTRAINT_KINDS = [
  'setback',
  'protected-corridor',
  'easement',
  'clearance',
  'no-build-zone',
  'hazard-buffer',
  'view-corridor',
  'waterfront-buffer',
  'emergency-access-corridor'
] as const;

export type ConstraintKind = (typeof CITY_CONSTRAINT_KINDS)[number];
export type ConstraintPriority = 'low' | 'medium' | 'high' | 'critical';

export interface ConstraintContract extends CityObjectBase<'constraint'> {
  readonly constraintKind: ConstraintKind;
  readonly priority: ConstraintPriority;
  readonly description: string;
  readonly boundary: Polygon2D;
  readonly affectedObjectKinds: readonly CityObjectKind[];
  readonly prohibitedObjectKinds: readonly CityObjectKind[];
  readonly requiredObjectIds: readonly CityId[];
  readonly relatedObjectIds: readonly CityId[];
  readonly minSetbackMeters?: number;
  readonly minClearanceMeters?: number;
  readonly maxHeightMeters?: number;
}

export const CITY_HAZARD_ZONE_KINDS = [
  'contamination',
  'flood-plain',
  'heat-exposure',
  'landslide-risk',
  'restricted-area'
] as const;

export type HazardZoneKind = (typeof CITY_HAZARD_ZONE_KINDS)[number];
export type HazardSeverity = 'low' | 'medium' | 'high' | 'critical';
export type HazardMitigationKind =
  | 'access-control'
  | 'cooling-canopy'
  | 'flood-proofing'
  | 'remediation'
  | 'setback'
  | 'slope-stabilization';

export interface HazardZoneContract extends CityObjectBase<'hazard-zone'> {
  readonly hazardKind: HazardZoneKind;
  readonly severity: HazardSeverity;
  readonly description: string;
  readonly boundary: Polygon2D;
  readonly focusPoint: Point2D;
  readonly affectedObjectKinds: readonly CityObjectKind[];
  readonly prohibitedObjectKinds: readonly CityObjectKind[];
  readonly mitigationKinds: readonly HazardMitigationKind[];
  readonly relatedConstraintIds: readonly CityId[];
  readonly relatedWaterwayIds: readonly CityId[];
  readonly relatedZoningDistrictIds: readonly CityId[];
  readonly relatedRoadIds: readonly CityId[];
  readonly requiresMitigation: boolean;
}

export const CITY_RESILIENCE_GOAL_KINDS = [
  'redundancy',
  'climate-adaptation',
  'evacuation-route',
  'emergency-access',
  'continuity',
  'shelter',
  'recovery-priority'
] as const;

export type ResilienceGoalKind = (typeof CITY_RESILIENCE_GOAL_KINDS)[number];
export type ResiliencePriority = ConstraintPriority;

export type ResilienceContinuityTarget =
  | 'emergency-response'
  | 'mobility-network'
  | 'public-shelter'
  | 'stormwater-readiness'
  | 'waterfront-access';

export type ResilienceGoalMetric =
  | 'adaptation-constraint-count'
  | 'continuity-system-count'
  | 'emergency-access-corridor-count'
  | 'evacuation-route-count'
  | 'recovery-anchor-count'
  | 'redundant-corridor-count'
  | 'shelter-candidate-count';

export interface ResilienceGoalTarget {
  readonly metric: ResilienceGoalMetric;
  readonly minimumCount: number;
  readonly unit: 'count';
}

export interface ResilienceGoalContract extends CityObjectBase<'resilience-goal'> {
  readonly goalKind: ResilienceGoalKind;
  readonly priority: ResiliencePriority;
  readonly description: string;
  readonly target: ResilienceGoalTarget;
  readonly targetDistrictIds: readonly CityId[];
  readonly requiredObjectIds: readonly CityId[];
  readonly relatedObjectIds: readonly CityId[];
  readonly routeRoadIds: readonly CityId[];
  readonly shelterObjectIds: readonly CityId[];
  readonly coveredConstraintIds: readonly CityId[];
  readonly continuityTargets: readonly ResilienceContinuityTarget[];
  readonly adaptationActions: readonly string[];
  readonly recoveryPriority: number;
  readonly focusPoint: Point2D;
  readonly focusBoundary?: Polygon2D;
}

export const CITY_METRIC_KINDS = [
  'walkability',
  'density',
  'open-space-access',
  'service-coverage',
  'traffic',
  'energy',
  'emissions',
  'quality-checks'
] as const;

export type CityMetricKind = (typeof CITY_METRIC_KINDS)[number];
export type CityMetricStatus = 'pass' | 'warn' | 'fail';
export type CityMetricUnit =
  | 'score'
  | 'ratio'
  | 'objects-per-square-kilometer'
  | 'vehicles-per-kilometer'
  | 'megawatt-hours-per-day'
  | 'kilograms-co2e-per-day';

export interface CityMetricTarget {
  readonly min?: number;
  readonly max?: number;
  readonly idealDirection: 'higher' | 'lower' | 'range';
}

export interface CityMetricContract extends CityObjectBase<'city-metric'> {
  readonly metricKind: CityMetricKind;
  readonly description: string;
  readonly value: number;
  readonly unit: CityMetricUnit;
  readonly status: CityMetricStatus;
  readonly target: CityMetricTarget;
  readonly computedFromObjectIds: readonly CityId[];
  readonly relatedMetricIds: readonly CityId[];
  readonly focusPoint: Point2D;
}

export type BlockFrontageSide = 'west' | 'east' | 'south' | 'north';
export type BlockFrontageClass = 'primary' | 'secondary' | 'service' | 'waterfront' | 'industrial';
export type BlockInternalAccessMode = 'none' | 'alley' | 'service-lane' | 'pedestrian-passage';

export interface BlockInternalAccessContract {
  readonly id: CityId;
  readonly mode: BlockInternalAccessMode;
  readonly connectedRoadIds: readonly CityId[];
  readonly widthMeters: number;
  readonly centerline: readonly [Point2D, Point2D];
}

export interface BlockBuildableEnvelopeContract {
  readonly id: CityId;
  readonly boundary: Polygon2D;
  readonly minSetbackMeters: number;
  readonly maxCoverageRatio: number;
  readonly parcelFit: 'regular-grid' | 'deep-lots' | 'large-lot';
}

export interface BlockFrontageContract {
  readonly side: BlockFrontageSide;
  readonly roadId: CityId;
  readonly frontageClass: BlockFrontageClass;
  readonly lengthMeters: number;
}

export interface BlockSubdivisionConstraintsContract {
  readonly preferredLotSplit: number;
  readonly maxParcelCount: number;
  readonly minParcelWidthMeters: number;
  readonly minParcelDepthMeters: number;
  readonly allowLotMerging: boolean;
}

export interface BlockPermeabilityMetricsContract {
  readonly score: number;
  readonly throughAccessCount: number;
  readonly frontageContinuityRatio: number;
  readonly averageParcelFrontageMeters: number;
}

export interface ParcelSetbackContract {
  readonly frontMeters: number;
  readonly sideMeters: number;
  readonly rearMeters: number;
}

export interface ParcelLotSplitContract {
  readonly splitGrid: readonly [number, number];
  readonly lotIndex: readonly [number, number];
  readonly isEdgeLot: boolean;
  readonly canMerge: boolean;
}

export interface ParcelDevelopmentRightsContract {
  readonly maxFloorAreaRatio: number;
  readonly maxFloorAreaSqM: number;
  readonly maxCoverageRatio: number;
  readonly maxHeightMeters: number;
  readonly transferable: boolean;
  readonly status: 'as-of-right' | 'limited' | 'constrained';
}

export type CadastreTenureKind = 'public-freehold' | 'private-freehold' | 'leasehold' | 'civic-trust';
export type CadastreRightKind = 'build' | 'access' | 'service' | 'transfer' | 'operate';
export type CadastreEasementKind = 'access' | 'drainage' | 'utility' | 'view-corridor';

export interface CadastreRightContract {
  readonly rightKind: CadastreRightKind;
  readonly holderId: CityId;
  readonly transferable: boolean;
  readonly expiresYear?: number;
}

export interface CadastreEasementContract {
  readonly id: CityId;
  readonly easementKind: CadastreEasementKind;
  readonly beneficiaryId: CityId;
  readonly widthMeters: number;
  readonly boundary: Polygon2D;
}

export interface CadastreRecordContract extends CityObjectBase<'cadastre-record'> {
  readonly parcelId: CityId;
  readonly districtId: CityId;
  readonly blockId: CityId;
  readonly tenure: CadastreTenureKind;
  readonly ownerEntityId: CityId;
  readonly ownerName: string;
  readonly legalDescription: string;
  readonly titleReference: string;
  readonly assessedLandValue: number;
  readonly rights: readonly CadastreRightContract[];
  readonly easements: readonly CadastreEasementContract[];
  readonly developmentRightStatus: ParcelDevelopmentRightsContract['status'];
  readonly permitReferenceIds: readonly CityId[];
}

export type UtilityNetworkKind =
  | 'district-energy'
  | 'gas'
  | 'power'
  | 'stormwater'
  | 'telecom'
  | 'waste'
  | 'wastewater'
  | 'water';
export type UtilityNodeRole =
  | 'antenna'
  | 'bioswale'
  | 'cabinet'
  | 'cell-site'
  | 'collection-point'
  | 'culvert'
  | 'detention'
  | 'distribution-node'
  | 'drain'
  | 'duct-bank'
  | 'fiber-node'
  | 'heat-exchanger'
  | 'hydrant'
  | 'inlet'
  | 'lift-station'
  | 'manhole'
  | 'meter-bank'
  | 'outfall'
  | 'plant'
  | 'pressure-zone'
  | 'pump'
  | 'substation'
  | 'tank'
  | 'thermal-storage'
  | 'valve';
export type UtilityEdgeRole =
  | 'collection-route'
  | 'conduit'
  | 'drain'
  | 'feeder'
  | 'fiber-route'
  | 'main'
  | 'runoff-path'
  | 'service-lateral'
  | 'thermal-loop';
export type UtilityAccessPointKind = 'building-service' | 'parcel-easement' | 'roadside-vault' | 'surface-cover';
export type UtilityCapacityUnit = 'kj-per-hour' | 'kva' | 'kw-thermal' | 'liters-per-second' | 'mbps' | 'tons-per-day';
export type ServiceAccessCorridorKind =
  | 'maintenance-path'
  | 'restricted-corridor'
  | 'service-yard'
  | 'utility-easement'
  | 'vault-access';
export type ServiceAccessSurfaceKind = 'asphalt' | 'concrete' | 'gravel' | 'paver' | 'reinforced-lawn';
export type ServiceAccessRestrictionKind = 'authorized-only' | 'daytime-access' | 'emergency-only' | 'heavy-vehicle';
export type AccessControlKind =
  | 'bollard-line'
  | 'checkpoint'
  | 'fence'
  | 'gate'
  | 'guardrail'
  | 'turnstile'
  | 'wall';
export type AccessControlRuleKind =
  | 'authorized-only'
  | 'emergency-only'
  | 'paid-access'
  | 'private-property'
  | 'public-pass-through'
  | 'service-only';
export type PowerGridEquipmentKind =
  | 'backup-supply'
  | 'meter'
  | 'street-light-circuit'
  | 'substation'
  | 'switchgear'
  | 'transformer';

export interface PowerGridNodeContract {
  readonly equipmentKind: PowerGridEquipmentKind;
  readonly voltageKv: number;
  readonly circuitId: CityId;
  readonly feederId?: CityId;
  readonly backupSupplyId?: CityId;
  readonly servedObjectIds: readonly CityId[];
}

export interface PowerGridEdgeContract {
  readonly circuitId: CityId;
  readonly fromEquipmentKind: PowerGridEquipmentKind;
  readonly toEquipmentKind: PowerGridEquipmentKind;
  readonly voltageKv: number;
  readonly phase: 'single' | 'three';
  readonly normallyOpen: boolean;
}

export interface BuildingPowerServiceContract {
  readonly serviceNodeId: CityId;
  readonly transformerNodeId: CityId;
  readonly meterId: CityId;
  readonly serviceLateralEdgeId: CityId;
  readonly circuitId: CityId;
  readonly outageDomainId: CityId;
  readonly estimatedPeakKva: number;
}

export type WaterSupplyEquipmentKind = 'hydrant' | 'main' | 'meter' | 'pressure-zone' | 'pump' | 'tank' | 'valve';

export interface WaterSupplyNodeContract {
  readonly equipmentKind: WaterSupplyEquipmentKind;
  readonly pressureZoneId: CityId;
  readonly pressureMinKpa: number;
  readonly pressureMaxKpa: number;
  readonly servedObjectIds: readonly CityId[];
  readonly hydrantReachMeters?: number;
  readonly storageVolumeCubicMeters?: number;
}

export interface WaterSupplyEdgeContract {
  readonly mainId: CityId;
  readonly fromEquipmentKind: WaterSupplyEquipmentKind;
  readonly toEquipmentKind: WaterSupplyEquipmentKind;
  readonly pipeDiameterMm: number;
  readonly pressureZoneId: CityId;
  readonly normallyOpen: boolean;
}

export interface BuildingWaterServiceContract {
  readonly serviceNodeId: CityId;
  readonly serviceLateralEdgeId: CityId;
  readonly meterId: CityId;
  readonly pressureZoneId: CityId;
  readonly nearestHydrantNodeId: CityId;
  readonly estimatedPeakLitersPerSecond: number;
}

export type WastewaterEquipmentKind = 'lift-station' | 'manhole' | 'outfall' | 'service-connection' | 'treatment-plant';

export interface WastewaterNodeContract {
  readonly equipmentKind: WastewaterEquipmentKind;
  readonly sewerBasinId: CityId;
  readonly invertElevationMeters: number;
  readonly rimElevationMeters: number;
  readonly servedObjectIds: readonly CityId[];
  readonly wetWellVolumeCubicMeters?: number;
  readonly receivingWaterwayId?: CityId;
}

export interface WastewaterEdgeContract {
  readonly sewerLineId: CityId;
  readonly fromEquipmentKind: WastewaterEquipmentKind;
  readonly toEquipmentKind: WastewaterEquipmentKind;
  readonly pipeDiameterMm: number;
  readonly slopePercent: number;
  readonly flowMethod: 'gravity' | 'pumped';
  readonly sewerBasinId: CityId;
  readonly capacityReservePercent: number;
  readonly receivingWaterwayId?: CityId;
}

export interface BuildingWastewaterServiceContract {
  readonly serviceNodeId: CityId;
  readonly serviceLateralEdgeId: CityId;
  readonly nearestManholeNodeId: CityId;
  readonly sewerBasinId: CityId;
  readonly estimatedPeakLitersPerSecond: number;
  readonly pretreatmentRequired: boolean;
}

export type StormwaterEquipmentKind = 'bioswale' | 'culvert' | 'detention-basin' | 'drain' | 'inlet' | 'outfall' | 'pervious-area';
export type StormwaterConveyanceKind = 'culvert' | 'pipe' | 'surface-flow';

export interface StormwaterNodeContract {
  readonly equipmentKind: StormwaterEquipmentKind;
  readonly drainageCatchmentId: CityId;
  readonly designStormMmPerHour: number;
  readonly runoffCoefficient: number;
  readonly imperviousAreaSquareMeters: number;
  readonly servedRoadIds: readonly CityId[];
  readonly servedHazardZoneIds: readonly CityId[];
  readonly storageVolumeCubicMeters?: number;
  readonly treatmentVolumeCubicMeters?: number;
  readonly receivingWaterwayId?: CityId;
}

export interface StormwaterEdgeContract {
  readonly drainageLineId: CityId;
  readonly fromEquipmentKind: StormwaterEquipmentKind;
  readonly toEquipmentKind: StormwaterEquipmentKind;
  readonly conveyanceKind: StormwaterConveyanceKind;
  readonly drainageCatchmentId: CityId;
  readonly designStormMmPerHour: number;
  readonly slopePercent: number;
  readonly pipeDiameterMm?: number;
  readonly channelWidthMeters?: number;
  readonly capacityReservePercent: number;
  readonly receivingWaterwayId?: CityId;
}

export interface RoadStormwaterDrainageContract {
  readonly drainageCatchmentId: CityId;
  readonly inletNodeIds: readonly CityId[];
  readonly runoffPathEdgeIds: readonly CityId[];
  readonly lowPointNodeId: CityId;
  readonly detentionNodeId: CityId;
  readonly outfallNodeId: CityId;
  readonly perviousAreaNodeIds: readonly CityId[];
  readonly floodHazardZoneIds: readonly CityId[];
  readonly designStormMmPerHour: number;
  readonly imperviousAreaSquareMeters: number;
  readonly runoffCoefficient: number;
}

export type TelecomEquipmentKind = 'antenna' | 'cabinet' | 'cell-site' | 'duct-bank' | 'fiber-hub';
export type TelecomMediumKind = 'fiber' | 'copper' | 'wireless';

export interface TelecomNodeContract {
  readonly equipmentKind: TelecomEquipmentKind;
  readonly networkZoneId: CityId;
  readonly coverageAssumptionId: CityId;
  readonly bandwidthMbps: number;
  readonly servedObjectIds: readonly CityId[];
  readonly coverageRadiusMeters?: number;
  readonly frequencyBandGhz?: number;
  readonly backhaulNodeId?: CityId;
  readonly redundantBackhaulAvailable: boolean;
}

export interface TelecomEdgeContract {
  readonly routeId: CityId;
  readonly fromEquipmentKind: TelecomEquipmentKind;
  readonly toEquipmentKind: TelecomEquipmentKind;
  readonly medium: TelecomMediumKind;
  readonly bandwidthMbps: number;
  readonly latencyMs: number;
  readonly ductCount?: number;
  readonly fiberStrandCount?: number;
  readonly buried: boolean;
  readonly coverageAssumptionId: CityId;
}

export interface BuildingTelecomServiceContract {
  readonly serviceNodeId: CityId;
  readonly serviceDropEdgeId: CityId;
  readonly coverageNodeId: CityId;
  readonly networkZoneId: CityId;
  readonly subscriberId: CityId;
  readonly estimatedPeakMbps: number;
  readonly redundancyTier: 'none' | 'secondary-backhaul' | 'critical-facility';
}

export type ThermalEnergyEquipmentKind =
  | 'boiler'
  | 'chilled-water-plant'
  | 'district-energy-plant'
  | 'gas-meter'
  | 'gas-regulator'
  | 'gas-valve'
  | 'heat-exchanger'
  | 'thermal-storage';
export type ThermalEnergyMediumKind = 'chilled-water' | 'gas' | 'hot-water' | 'steam';

export interface ThermalEnergyNodeContract {
  readonly equipmentKind: ThermalEnergyEquipmentKind;
  readonly thermalLoopId: CityId;
  readonly serviceAreaId: CityId;
  readonly medium: ThermalEnergyMediumKind;
  readonly capacityKwThermal: number;
  readonly servedObjectIds: readonly CityId[];
  readonly supplyTemperatureC?: number;
  readonly returnTemperatureC?: number;
  readonly pressureKpa?: number;
  readonly plantRoomBuildingId?: CityId;
  readonly thermalStorageMwh?: number;
  readonly backupFuelAvailable: boolean;
}

export interface ThermalEnergyEdgeContract {
  readonly loopId: CityId;
  readonly fromEquipmentKind: ThermalEnergyEquipmentKind;
  readonly toEquipmentKind: ThermalEnergyEquipmentKind;
  readonly medium: ThermalEnergyMediumKind;
  readonly capacityKwThermal: number;
  readonly pipeDiameterMm: number;
  readonly maxPressureKpa: number;
  readonly designDeltaTC?: number;
  readonly buried: boolean;
  readonly insulated: boolean;
}

export interface BuildingThermalServiceContract {
  readonly serviceNodeId: CityId;
  readonly heatExchangerNodeId: CityId;
  readonly gasServiceNodeId: CityId;
  readonly serviceLateralEdgeId: CityId;
  readonly thermalLoopId: CityId;
  readonly outageDomainId: CityId;
  readonly serviceModes: readonly ThermalEnergyMediumKind[];
  readonly estimatedPeakKwThermal: number;
  readonly estimatedPeakGasKjPerHour: number;
}

export interface UtilityCapacityContract {
  readonly value: number;
  readonly unit: UtilityCapacityUnit;
  readonly peakLoadFactor: number;
}

export interface UtilityServiceAreaContract {
  readonly serviceAreaBoundaryId: CityId;
  readonly districtIds: readonly CityId[];
  readonly parcelIds: readonly CityId[];
  readonly criticalObjectIds: readonly CityId[];
}

export interface UtilityAccessPointContract {
  readonly accessPointKind: UtilityAccessPointKind;
  readonly objectId: CityId;
  readonly position: Point2D;
  readonly clearAccessMeters: number;
}

export interface UtilityOutageDomainContract {
  readonly outageDomainId: CityId;
  readonly isolationGroupId: CityId;
  readonly backupAvailable: boolean;
  readonly criticality: 'low' | 'medium' | 'high';
}

export interface UtilityNodeContract extends CityObjectBase<'utility-node'> {
  readonly utilityType: UtilityNetworkKind;
  readonly nodeRole: UtilityNodeRole;
  readonly center: Point2D;
  readonly serviceArea: UtilityServiceAreaContract;
  readonly capacity: UtilityCapacityContract;
  readonly accessPoint: UtilityAccessPointContract;
  readonly outage: UtilityOutageDomainContract;
  readonly ownerEntityId: CityId;
  readonly connectedEdgeIds: readonly CityId[];
  readonly serviceAccessCorridorIds?: readonly CityId[];
  readonly renderBindingId: CityId;
  readonly powerGrid?: PowerGridNodeContract;
  readonly waterSupply?: WaterSupplyNodeContract;
  readonly wastewater?: WastewaterNodeContract;
  readonly stormwater?: StormwaterNodeContract;
  readonly telecom?: TelecomNodeContract;
  readonly thermalEnergy?: ThermalEnergyNodeContract;
}

export interface UtilityEdgeContract extends CityObjectBase<'utility-edge'> {
  readonly utilityType: UtilityNetworkKind;
  readonly edgeRole: UtilityEdgeRole;
  readonly fromNodeId: CityId;
  readonly toNodeId: CityId;
  readonly centerline: Polyline2D;
  readonly lengthMeters: number;
  readonly serviceAreaBoundaryId: CityId;
  readonly capacity: UtilityCapacityContract;
  readonly accessPointIds: readonly CityId[];
  readonly outageDomainId: CityId;
  readonly ownerEntityId: CityId;
  readonly serviceAccessCorridorIds?: readonly CityId[];
  readonly renderBindingId: CityId;
  readonly powerGrid?: PowerGridEdgeContract;
  readonly waterSupply?: WaterSupplyEdgeContract;
  readonly wastewater?: WastewaterEdgeContract;
  readonly stormwater?: StormwaterEdgeContract;
  readonly telecom?: TelecomEdgeContract;
  readonly thermalEnergy?: ThermalEnergyEdgeContract;
}

export interface ServiceAccessCorridorContract extends CityObjectBase<'service-access-corridor'> {
  readonly corridorKind: ServiceAccessCorridorKind;
  readonly surface: ServiceAccessSurfaceKind;
  readonly center: Point2D;
  readonly boundary: Polygon2D;
  readonly lengthMeters: number;
  readonly widthMeters: number;
  readonly clearAccessMeters: number;
  readonly utilityNodeIds: readonly CityId[];
  readonly utilityEdgeIds: readonly CityId[];
  readonly buildingIds: readonly CityId[];
  readonly parcelIds: readonly CityId[];
  readonly cadastreRecordIds: readonly CityId[];
  readonly cadastreEasementIds: readonly CityId[];
  readonly roadIds: readonly CityId[];
  readonly restricted: boolean;
  readonly restrictions: readonly ServiceAccessRestrictionKind[];
  readonly authorizedRoleIds: readonly CityId[];
  readonly maintenanceWindow: {
    readonly startHour: number;
    readonly endHour: number;
    readonly days: readonly string[];
  };
  readonly emergencyAccess: boolean;
}

export interface AccessControlContract extends CityObjectBase<'access-control'> {
  readonly controlKind: AccessControlKind;
  readonly ruleKind: AccessControlRuleKind;
  readonly center: Point2D;
  readonly centerline: Polyline2D;
  readonly boundary: Polygon2D;
  readonly heightMeters: number;
  readonly widthMeters: number;
  readonly clearanceMeters: number;
  readonly normallyOpen: boolean;
  readonly publicAccess: boolean;
  readonly privateAccess: boolean;
  readonly emergencyOverride: boolean;
  readonly allowedModes: readonly NavigationMode[];
  readonly restrictedModes: readonly NavigationMode[];
  readonly authorizedRoleIds: readonly CityId[];
  readonly controlledObjectIds: readonly CityId[];
  readonly relatedConstraintIds: readonly CityId[];
  readonly hazardZoneIds: readonly CityId[];
  readonly serviceAccessCorridorIds: readonly CityId[];
  readonly roadIds: readonly CityId[];
  readonly sidewalkIds: readonly CityId[];
  readonly crossingIds: readonly CityId[];
  readonly buildingEntranceIds: readonly CityId[];
  readonly parcelIds: readonly CityId[];
  readonly transitStopIds: readonly CityId[];
  readonly navigationGraphEdgeIds: readonly CityId[];
}

export interface ParcelFrontagePriorityContract {
  readonly roadId: CityId;
  readonly side: BlockFrontageSide;
  readonly frontageClass: BlockFrontageClass;
  readonly priority: 'primary' | 'secondary' | 'service';
}

export interface ParcelFitContract {
  readonly buildableEnvelopeId: CityId;
  readonly buildableEnvelope: Polygon2D;
  readonly buildableAreaSqM: number;
  readonly minBuildableWidthMeters: number;
  readonly minBuildableDepthMeters: number;
  readonly preferredBuildingCenter: Point2D;
  readonly canFitBuilding: boolean;
}

export type ZoningDistrictKind = 'base' | 'overlay' | 'form-based';

export interface ZoningFrontageRuleContract {
  readonly requiredPriority: 'any' | 'primary' | 'secondary' | 'service';
  readonly activeUsesAllowed: boolean;
  readonly activeFrontageRequiredOnPrimary: boolean;
}

export interface ZoningDensityControlsContract {
  readonly densityBand: 'low' | 'medium' | 'high' | 'super-tall';
  readonly targetFloorAreaRatio: number;
  readonly targetDwellingUnitsPerHectare: number;
  readonly targetJobsPerHectare: number;
}

export interface ParcelZoningControlsContract {
  readonly zoningDistrictId: CityId;
  readonly zoningCode: string;
  readonly zoningKind: ZoningDistrictKind;
  readonly allowedUses: readonly LandUse[];
  readonly maxHeightMeters: number;
  readonly maxFloorAreaRatio: number;
  readonly maxCoverageRatio: number;
  readonly minimumSetbacks: ParcelSetbackContract;
  readonly bufferMeters: number;
  readonly frontageRules: ZoningFrontageRuleContract;
  readonly density: ZoningDensityControlsContract;
  readonly formRules: {
    readonly massing: 'tower' | 'mid-rise' | 'campus' | 'industrial-shed' | 'neighborhood-block';
    readonly streetWallRequired: boolean;
    readonly stepbackAboveMeters?: number;
  };
}

export interface ZoningDistrictContract extends CityObjectBase<'zoning-district'> {
  readonly districtId: CityId;
  readonly boundary: Polygon2D;
  readonly zoningCode: string;
  readonly zoningKind: ZoningDistrictKind;
  readonly controls: ParcelZoningControlsContract;
  readonly blockIds: readonly CityId[];
  readonly parcelIds: readonly CityId[];
  readonly overlayConstraintIds: readonly CityId[];
}

export interface BlockContract extends CityObjectBase<'block'> {
  readonly boundary: Polygon2D;
  readonly districtId: CityId;
  readonly administrativeBoundaryIds: readonly CityId[];
  readonly wardId: CityId;
  readonly neighborhoodId: CityId;
  readonly permeability: 'low' | 'medium' | 'high';
  readonly buildableEnvelope: BlockBuildableEnvelopeContract;
  readonly frontageClasses: readonly BlockFrontageContract[];
  readonly internalAccess: {
    readonly mode: BlockInternalAccessMode;
    readonly accessIds: readonly CityId[];
  };
  readonly alleys: readonly BlockInternalAccessContract[];
  readonly subdivisionConstraints: BlockSubdivisionConstraintsContract;
  readonly permeabilityMetrics: BlockPermeabilityMetricsContract;
}

export interface ParcelContract extends CityObjectBase<'parcel'> {
  readonly boundary: Polygon2D;
  readonly districtId: CityId;
  readonly blockId: CityId;
  readonly blockBuildableEnvelopeId: CityId;
  readonly zoningDistrictId: CityId;
  readonly zoning: ParcelZoningControlsContract;
  readonly setbacks: ParcelSetbackContract;
  readonly lotSplit: ParcelLotSplitContract;
  readonly developmentRights: ParcelDevelopmentRightsContract;
  readonly cadastreRecordId: CityId;
  readonly frontagePriority: readonly ParcelFrontagePriorityContract[];
  readonly parcelConstraintIds: readonly CityId[];
  readonly fit: ParcelFitContract;
  readonly administrativeBoundaryIds: readonly CityId[];
  readonly wardId: CityId;
  readonly neighborhoodId: CityId;
  readonly frontageRoadIds: readonly CityId[];
  readonly allowedUses: readonly LandUse[];
  readonly maxHeightMeters: number;
  readonly maxCoverageRatio: number;
  readonly soilGeologyZoneIds?: readonly CityId[];
}

export interface LaneContract extends CityObjectBase<'lane'> {
  readonly roadSegmentId: CityId;
  readonly laneIndex: number;
  readonly laneRole: LaneRole;
  readonly allowedModes: readonly TravelMode[];
  readonly restrictedModes: readonly TravelMode[];
  readonly widthMeters: number;
  readonly direction: 'forward' | 'backward';
  readonly turnMovements: readonly TurnMovement[];
  readonly reversible: boolean;
  readonly continuityGroupId: CityId;
}

export type TravelMode = 'vehicle' | 'bus' | 'bike' | 'freight' | 'emergency';
export type LaneRole = 'general' | 'bus-only' | 'turn-pocket' | 'reversible' | 'service';

export type BikeFacilityKind = 'protected-lane' | 'painted-lane' | 'cycle-track' | 'shared-street';
export type BikeConflictKind = 'turning-conflict' | 'door-zone' | 'transit-stop-conflict' | 'driveway-crossing';
export type BikeSignalKind = 'protected-phase' | 'leading-bike-interval' | 'yield-control';

export interface BikeSegmentContract extends CityObjectBase<'bike-segment'> {
  readonly roadId: CityId;
  readonly side: CurbSide;
  readonly facilityKind: BikeFacilityKind;
  readonly startMeters: number;
  readonly endMeters: number;
  readonly lengthMeters: number;
  readonly widthMeters: number;
  readonly centerline: Polyline2D;
  readonly protected: boolean;
  readonly connectsToTransit: boolean;
  readonly bikeParkingIds: readonly CityId[];
  readonly conflictZoneIds: readonly CityId[];
}

export interface BikeGraphNodeContract extends CityObjectBase<'bike-graph-node'> {
  readonly roadId: CityId;
  readonly segmentId: CityId;
  readonly intersectionId?: CityId;
  readonly position: Point2D;
  readonly nodeRole: 'segment-start' | 'segment-end' | 'intersection' | 'parking';
  readonly accessibleToTransit: boolean;
}

export interface BikeGraphEdgeContract extends CityObjectBase<'bike-graph-edge'> {
  readonly fromNodeId: CityId;
  readonly toNodeId: CityId;
  readonly segmentId: CityId;
  readonly roadId: CityId;
  readonly lengthMeters: number;
  readonly facilityKind: BikeFacilityKind;
  readonly protected: boolean;
  readonly conflictZoneIds: readonly CityId[];
}

export interface BikeParkingContract extends CityObjectBase<'bike-parking'> {
  readonly roadId: CityId;
  readonly sidewalkId: CityId;
  readonly streetFurnitureId?: CityId;
  readonly segmentId: CityId;
  readonly position: Point2D;
  readonly capacity: number;
  readonly parkingKind: 'rack' | 'dock' | 'corral';
  readonly connectsToTransitStopId?: CityId;
}

export interface BikeSignalContract extends CityObjectBase<'bike-signal'> {
  readonly intersectionId: CityId;
  readonly roadId: CityId;
  readonly segmentId: CityId;
  readonly position: Point2D;
  readonly signalKind: BikeSignalKind;
  readonly protectedPhaseSeconds: number;
  readonly conflictZoneIds: readonly CityId[];
}

export interface BikeConflictZoneContract extends CityObjectBase<'bike-conflict-zone'> {
  readonly roadId: CityId;
  readonly segmentId: CityId;
  readonly intersectionId?: CityId;
  readonly curbZoneId?: CityId;
  readonly crossingId?: CityId;
  readonly position: Point2D;
  readonly conflictKind: BikeConflictKind;
  readonly severity: ConflictPointSeverity;
  readonly mitigation: 'paint' | 'signal' | 'buffer' | 'raised-crossing';
}

export type FreightVehicleClass = 'cargo-van' | 'box-truck' | 'semi-truck';
export type FreightRouteKind = 'industrial-haul' | 'retail-delivery' | 'warehouse-link';
export type FreightLoadingDockKind = 'curbside' | 'service-bay' | 'yard';
export type FreightDeliveryWindowKind = 'overnight' | 'morning' | 'midday' | 'off-peak';
export type NavigationMode = 'vehicle' | 'pedestrian' | 'bike' | 'transit' | 'service' | 'emergency' | 'freight';
export type NavigationRouteKind = 'baseline' | 'transfer' | 'service' | 'emergency' | 'freight';
export type NavigationRequestClass = 'agent' | 'operation' | 'simulation';
export type NavigationAgentType =
  | 'driver'
  | 'pedestrian'
  | 'cyclist'
  | 'transit-rider'
  | 'service-crew'
  | 'emergency-responder'
  | 'freight-operator';

export interface NavigationGraphNodeContract extends CityObjectBase<'navigation-graph-node'> {
  readonly mode: NavigationMode;
  readonly position: Point2D;
  readonly sourceObjectId: CityId;
  readonly sourceObjectKind: CityObjectKind;
  readonly roadId?: CityId;
  readonly laneId?: CityId;
  readonly sidewalkGraphNodeId?: CityId;
  readonly bikeGraphNodeId?: CityId;
  readonly transitStopId?: CityId;
  readonly loadingDockId?: CityId;
  readonly serviceAlleyId?: CityId;
  readonly intersectionId?: CityId;
  readonly accessible: boolean;
  readonly emergencyAccess: boolean;
  readonly serviceAccess: boolean;
  readonly transferNodeIds: readonly CityId[];
}

export interface NavigationGraphEdgeContract extends CityObjectBase<'navigation-graph-edge'> {
  readonly mode: NavigationMode;
  readonly fromNodeId: CityId;
  readonly toNodeId: CityId;
  readonly sourceObjectId: CityId;
  readonly sourceObjectKind: CityObjectKind;
  readonly roadIds: readonly CityId[];
  readonly laneIds: readonly CityId[];
  readonly lengthMeters: number;
  readonly travelTimeSeconds: number;
  readonly bidirectional: boolean;
  readonly accessible: boolean;
  readonly restrictions: readonly string[];
  readonly accessControlIds?: readonly CityId[];
}

export interface NavigationRouteContract extends CityObjectBase<'navigation-route'> {
  readonly mode: NavigationMode;
  readonly routeKind: NavigationRouteKind;
  readonly requestClass: NavigationRequestClass;
  readonly fromNodeId: CityId;
  readonly toNodeId: CityId;
  readonly nodeIds: readonly CityId[];
  readonly edgeIds: readonly CityId[];
  readonly sourceObjectIds: readonly CityId[];
  readonly lengthMeters: number;
  readonly estimatedTravelTimeSeconds: number;
  readonly supportedAgentTypes: readonly NavigationAgentType[];
}

export interface FreightDeliveryWindowContract {
  readonly windowKind: FreightDeliveryWindowKind;
  readonly startHour: number;
  readonly endHour: number;
  readonly days: readonly ('weekday' | 'saturday' | 'sunday')[];
}

export interface FreightTruckRestrictionContract {
  readonly maxLengthMeters: number;
  readonly maxWeightTonnes: number;
  readonly hazmatAllowed: boolean;
  readonly restrictedRoadIds: readonly CityId[];
}

export interface FreightLoadingDockContract extends CityObjectBase<'freight-loading-dock'> {
  readonly buildingId: CityId;
  readonly parcelId: CityId;
  readonly districtId: CityId;
  readonly roadId: CityId;
  readonly curbZoneId: CityId;
  readonly serviceAlleyId?: CityId;
  readonly position: Point2D;
  readonly dockKind: FreightLoadingDockKind;
  readonly loadingBays: number;
  readonly dockHeightMeters: number;
  readonly deliveryWindow: FreightDeliveryWindowContract;
  readonly allowedVehicleClasses: readonly FreightVehicleClass[];
  readonly linkedRouteIds: readonly CityId[];
  readonly warehouseLink: boolean;
  readonly lastMileRadiusMeters: number;
}

export interface FreightRouteContract extends CityObjectBase<'freight-route'> {
  readonly routeKind: FreightRouteKind;
  readonly roadIds: readonly CityId[];
  readonly laneIds: readonly CityId[];
  readonly loadingDockIds: readonly CityId[];
  readonly curbZoneIds: readonly CityId[];
  readonly warehouseBuildingIds: readonly CityId[];
  readonly polyline: Polyline2D;
  readonly deliveryWindow: FreightDeliveryWindowContract;
  readonly allowedVehicleClasses: readonly FreightVehicleClass[];
  readonly truckRestriction: FreightTruckRestrictionContract;
  readonly lastMileStopCount: number;
}

export interface ServiceAlleyContract extends CityObjectBase<'service-alley'> {
  readonly roadId: CityId;
  readonly buildingIds: readonly CityId[];
  readonly parcelIds: readonly CityId[];
  readonly loadingDockIds: readonly CityId[];
  readonly centerline: Polyline2D;
  readonly widthMeters: number;
  readonly accessControlled: boolean;
  readonly deliveryWindow: FreightDeliveryWindowContract;
  readonly allowedVehicleClasses: readonly FreightVehicleClass[];
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
  readonly accessibleClearPathMeters: number;
  readonly runningGradePercent: number;
  readonly crossSlopePercent: number;
  readonly accessibility: SidewalkAccessibilityContract;
}

export interface SidewalkAccessibilityContract {
  readonly stepFree: boolean;
  readonly clearPathContinuous: boolean;
  readonly wheelchairPassable: boolean;
  readonly maxRunningGradePercent: number;
  readonly maxCrossSlopePercent: number;
}

export interface RoadSegmentContract extends CityObjectBase<'road-segment'> {
  readonly centerline: Polyline2D;
  readonly hierarchy: StreetHierarchy;
  readonly streetProfileId: string;
  readonly widthMeters: number;
  readonly rightOfWayWidthMeters: number;
  readonly designSpeedKph: number;
  readonly corridorId: CityId;
  readonly corridorName: string;
  readonly continuityGroupId: CityId;
  readonly transitEligible: boolean;
  readonly lanes: readonly LaneContract[];
  readonly sidewalks: readonly SidewalkContract[];
  readonly groundProfile?: GroundProfileContract;
  readonly stormwaterDrainage?: RoadStormwaterDrainageContract;
}

export type TopographyZoneKind = 'elevation-band' | 'slope-area' | 'retaining-condition' | 'buildability-area';
export type LandformBuildability = 'high' | 'moderate' | 'limited' | 'restricted';
export type RetainingCondition = 'none' | 'recommended' | 'required';

export interface GroundProfileContract {
  readonly startElevationMeters: number;
  readonly endElevationMeters: number;
  readonly averageElevationMeters: number;
  readonly minElevationMeters: number;
  readonly maxElevationMeters: number;
  readonly maxGradePercent: number;
  readonly topographyZoneIds: readonly CityId[];
}

export interface TopographyZoneContract extends CityObjectBase<'topography-zone'> {
  readonly zoneKind: TopographyZoneKind;
  readonly center: Point2D;
  readonly boundary: Polygon2D;
  readonly minElevationMeters: number;
  readonly maxElevationMeters: number;
  readonly averageElevationMeters: number;
  readonly slopePercent: number;
  readonly aspectDegrees: number;
  readonly buildability: LandformBuildability;
  readonly retainingCondition: RetainingCondition;
  readonly gradeLimitPercent: number;
  readonly relatedRoadIds: readonly CityId[];
  readonly relatedBuildingIds: readonly CityId[];
}

export type SoilGeologyKind =
  | 'alluvial-silt'
  | 'engineered-fill'
  | 'shallow-bedrock'
  | 'sandy-loam'
  | 'contaminated-fill'
  | 'waterfront-clay';

export type FoundationSuitability =
  | 'shallow-spread'
  | 'mat-foundation'
  | 'pile-foundation'
  | 'restricted-remediation';

export type TunnelDifficulty = 'low' | 'medium' | 'high' | 'restricted';
export type DrainageAssumption = 'free-draining' | 'moderate-infiltration' | 'poor-drainage' | 'dewatering-required';
export type SoilContaminationStatus = 'clean' | 'watch' | 'contaminated';
export type GroundRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface SoilGeologyZoneContract extends CityObjectBase<'soil-geology-zone'> {
  readonly soilKind: SoilGeologyKind;
  readonly center: Point2D;
  readonly boundary: Polygon2D;
  readonly districtIds: readonly CityId[];
  readonly topographyZoneIds: readonly CityId[];
  readonly hazardZoneIds: readonly CityId[];
  readonly parcelIds: readonly CityId[];
  readonly buildingIds: readonly CityId[];
  readonly foundationSuitability: FoundationSuitability;
  readonly bearingCapacityKpa: number;
  readonly settlementRisk: GroundRiskLevel;
  readonly tunnelDifficulty: TunnelDifficulty;
  readonly drainageAssumption: DrainageAssumption;
  readonly permeabilityMillimetersPerHour: number;
  readonly groundwaterDepthMeters: number;
  readonly contamination: {
    readonly status: SoilContaminationStatus;
    readonly hazardZoneIds: readonly CityId[];
    readonly remediationRequired: boolean;
  };
  readonly groundRisk: {
    readonly overall: GroundRiskLevel;
    readonly flood: GroundRiskLevel;
    readonly slope: GroundRiskLevel;
    readonly liquefaction: GroundRiskLevel;
  };
}

export type IntersectionControlExpectation = 'signalized' | 'stop-controlled' | 'uncontrolled';
export type IntersectionControlType = 'traffic-signal' | 'all-way-stop' | 'minor-stop' | 'yield' | 'uncontrolled';
export type IntersectionApproachControl = 'signal' | 'stop' | 'yield' | 'uncontrolled';
export type IntersectionApproachPriority = 'major' | 'minor' | 'shared';
export type TurnMovement = 'left' | 'through' | 'right';
export type ConflictPointKind = 'vehicle-vehicle' | 'vehicle-pedestrian' | 'bike-vehicle';
export type ConflictPointSeverity = 'low' | 'medium' | 'high';

export interface IntersectionApproachRule {
  readonly roadId: CityId;
  readonly control: IntersectionApproachControl;
  readonly priority: IntersectionApproachPriority;
}

export interface IntersectionTurnConstraint {
  readonly fromRoadId: CityId;
  readonly toRoadId: CityId;
  readonly allowedMovements: readonly TurnMovement[];
}

export interface IntersectionConflictPoint {
  readonly id: CityId;
  readonly point: Point2D;
  readonly conflictKind: ConflictPointKind;
  readonly severity: ConflictPointSeverity;
}

export interface IntersectionVisibilitySplay {
  readonly roadId: CityId;
  readonly distanceMeters: number;
  readonly clearSightTriangleMeters: number;
}

export interface IntersectionContract extends CityObjectBase<'intersection'> {
  readonly center: Point2D;
  readonly connectedRoadIds: readonly CityId[];
  readonly hierarchyMix: readonly StreetHierarchy[];
  readonly signalExpectation: IntersectionControlExpectation;
  readonly controlType: IntersectionControlType;
  readonly approachRules: readonly IntersectionApproachRule[];
  readonly turnConstraints: readonly IntersectionTurnConstraint[];
  readonly conflictPoints: readonly IntersectionConflictPoint[];
  readonly visibilitySplays: readonly IntersectionVisibilitySplay[];
  readonly cornerRadiusMeters: number;
  readonly raisedJunction: boolean;
}

export interface CrossingContract extends CityObjectBase<'crossing'> {
  readonly intersectionId?: CityId;
  readonly roadId: CityId;
  readonly center: Point2D;
  readonly connectedSidewalkIds: readonly [CityId, CityId];
  readonly widthMeters: number;
  readonly lengthMeters: number;
  readonly signalized: boolean;
  readonly crossingLocation: CrossingLocation;
  readonly crosswalkType: CrosswalkType;
  readonly priority: CrossingPriority;
  readonly hasRefugeIsland: boolean;
  readonly raisedCrossing: boolean;
  readonly tactileCues: boolean;
  readonly curbRamps: readonly ['left', 'right'];
  readonly curbRampIds: readonly [CityId, CityId];
  readonly tactileCueIds: readonly [CityId, CityId];
  readonly signalPhase?: CrossingSignalPhase;
}

export type CrossingLocation = 'intersection' | 'midblock';
export type CrosswalkType = 'zebra' | 'continental' | 'raised-table';
export type CrossingPriority = 'signal-protected' | 'pedestrian-priority' | 'yield-controlled' | 'uncontrolled';

export interface CrossingSignalPhase {
  readonly phaseId: CityId;
  readonly walkSeconds: number;
  readonly clearanceSeconds: number;
  readonly leadingPedestrianIntervalSeconds: number;
}

export interface SidewalkGraphNodeContract extends CityObjectBase<'sidewalk-graph-node'> {
  readonly intersectionId?: CityId;
  readonly crossingId?: CityId;
  readonly sidewalkId: CityId;
  readonly position: Point2D;
  readonly accessible: boolean;
  readonly curbRampId?: CityId;
  readonly tactileCueId?: CityId;
}

export type SidewalkGraphEdgeMode = 'sidewalk' | 'crossing';

export interface SidewalkGraphEdgeContract extends CityObjectBase<'sidewalk-graph-edge'> {
  readonly fromNodeId: CityId;
  readonly toNodeId: CityId;
  readonly mode: SidewalkGraphEdgeMode;
  readonly lengthMeters: number;
  readonly crossingId?: CityId;
  readonly sidewalkId?: CityId;
  readonly accessible: boolean;
  readonly minClearWidthMeters: number;
  readonly maxGradePercent: number;
  readonly hasCurbRampConnection: boolean;
  readonly hasTactileCueConnection: boolean;
}

export type BuildingFrontageSide = 'north' | 'east' | 'south' | 'west';

export type BuildingTypologyKind =
  | 'residential'
  | 'office'
  | 'civic'
  | 'industrial'
  | 'mixed-use'
  | 'retail'
  | 'hospitality'
  | 'warehouse'
  | 'utility'
  | 'special-use';

export type BuildingEntranceStrategy = 'public-lobby' | 'storefront' | 'campus-entry' | 'service-yard' | 'utility-access';

export type BuildingServiceAccessProfile = 'curb-loading' | 'internal-service' | 'yard-loading' | 'public-service' | 'utility-only';

export type CivicAnchorServiceType =
  | 'community'
  | 'culture'
  | 'education'
  | 'emergency'
  | 'government'
  | 'healthcare';

export type CivicAnchorArrivalMode = 'bike' | 'emergency' | 'pedestrian' | 'service' | 'transit' | 'vehicle';

export interface CivicAnchorContract extends CityObjectBase<'civic-anchor'> {
  readonly serviceType: CivicAnchorServiceType;
  readonly buildingId: CityId;
  readonly districtId: CityId;
  readonly blockId: CityId;
  readonly parcelId: CityId;
  readonly administrativeBoundaryIds: readonly CityId[];
  readonly serviceAreaBoundaryId: CityId;
  readonly center: Point2D;
  readonly catchment: {
    readonly radiusMeters: number;
    readonly populationCapacity: number;
    readonly serviceAreaSqM: number;
    readonly targetDistrictIds: readonly CityId[];
  };
  readonly capacity: {
    readonly dailyVisitors: number;
    readonly staff: number;
    readonly emergencyOccupancy?: number;
  };
  readonly arrivalModes: readonly CivicAnchorArrivalMode[];
  readonly publicEntranceIds: readonly CityId[];
  readonly serviceEntranceIds: readonly CityId[];
  readonly addressPointIds?: readonly CityId[];
  readonly schedule: {
    readonly scheduleProfileId: string;
    readonly openHour: number;
    readonly closeHour: number;
    readonly emergencyAccess: boolean;
  };
  readonly renderBindingId: CityId;
}

export type GovernmentAnchorKind =
  | 'administrative-office'
  | 'city-hall'
  | 'civic-plaza-interface'
  | 'court'
  | 'service-counter';

export interface GovernmentAnchorContract extends CityObjectBase<'government-anchor'> {
  readonly anchorKind: GovernmentAnchorKind;
  readonly civicAnchorId: CityId;
  readonly buildingId: CityId;
  readonly districtId: CityId;
  readonly plazaZoneIds: readonly CityId[];
  readonly center: Point2D;
  readonly publicAdministrationRole: string;
  readonly serviceCounterCount: number;
  readonly dailyVisitors: number;
  readonly staffCapacity: number;
  readonly queueCapacityPeople: number;
  readonly ceremonialCapacityPeople: number;
  readonly securityScreening: boolean;
  readonly publicAccess: boolean;
  readonly addressPointIds?: readonly CityId[];
  readonly scheduleProfileId: string;
  readonly renderBindingId: CityId;
}

export type EmergencyServiceAnchorKind =
  | 'ambulance-post'
  | 'command-post'
  | 'fire-station'
  | 'police-station'
  | 'public-shelter'
  | 'staging-area';

export type EmergencyResponseMode = 'command' | 'fire' | 'medical' | 'multi-agency' | 'police' | 'shelter';

export interface EmergencyServiceAnchorContract extends CityObjectBase<'emergency-service-anchor'> {
  readonly anchorKind: EmergencyServiceAnchorKind;
  readonly responseMode: EmergencyResponseMode;
  readonly civicAnchorId: CityId;
  readonly buildingId: CityId;
  readonly parcelId: CityId;
  readonly districtId: CityId;
  readonly roadId: CityId;
  readonly serviceAreaBoundaryId: CityId;
  readonly center: Point2D;
  readonly dispatch: {
    readonly unitCapacity: number;
    readonly responderCapacity: number;
    readonly vehiclesAvailable: number;
    readonly stagingBays: number;
    readonly operates24h: boolean;
    readonly dispatchPriority: number;
  };
  readonly coverage: {
    readonly radiusMeters: number;
    readonly targetDistrictIds: readonly CityId[];
    readonly coveredRoadIds: readonly CityId[];
    readonly coveredBuildingFireSafetyProfileIds: readonly CityId[];
    readonly estimatedResponseSeconds: number;
    readonly coverageScore: number;
  };
  readonly staging: {
    readonly stagingAreaSqM: number;
    readonly assemblyCapacityPeople: number;
    readonly ambulanceBays: number;
    readonly commandPostReady: boolean;
    readonly shelterCapacityPeople: number;
  };
  readonly access: {
    readonly navigationNodeIds: readonly CityId[];
    readonly navigationEdgeIds: readonly CityId[];
    readonly fireLaneCurbZoneIds: readonly CityId[];
    readonly serviceAccessCorridorIds: readonly CityId[];
    readonly hydrantNodeIds: readonly CityId[];
  };
  readonly scheduleProfileId: CityId;
  readonly renderBindingId: CityId;
}

export type HealthcareAnchorKind =
  | 'ambulance-bay'
  | 'clinic'
  | 'hospital'
  | 'pharmacy'
  | 'urgent-care';

export interface HealthcareAnchorContract extends CityObjectBase<'healthcare-anchor'> {
  readonly anchorKind: HealthcareAnchorKind;
  readonly civicAnchorId: CityId;
  readonly buildingId: CityId;
  readonly parcelId: CityId;
  readonly districtId: CityId;
  readonly roadId: CityId;
  readonly serviceAreaBoundaryId: CityId;
  readonly center: Point2D;
  readonly capacity: {
    readonly bedCapacity: number;
    readonly examRooms: number;
    readonly pharmacyCounters: number;
    readonly urgentCareBays: number;
    readonly ambulanceBays: number;
    readonly staffCapacity: number;
  };
  readonly arrivals: {
    readonly dailyPatients: number;
    readonly appointmentShare: number;
    readonly emergencyArrivalShare: number;
    readonly publicEntranceIds: readonly CityId[];
    readonly serviceEntranceIds: readonly CityId[];
    readonly transitStopIds: readonly CityId[];
    readonly ambulanceAccessRoadIds: readonly CityId[];
    readonly ambulanceNavigationNodeIds: readonly CityId[];
    readonly ambulanceNavigationEdgeIds: readonly CityId[];
  };
  readonly coverage: {
    readonly radiusMeters: number;
    readonly targetDistrictIds: readonly CityId[];
    readonly coveredNavigationNodeIds: readonly CityId[];
    readonly coveredNavigationEdgeIds: readonly CityId[];
    readonly estimatedAmbulanceResponseSeconds: number;
    readonly coverageScore: number;
  };
  readonly acceptsAmbulance: boolean;
  readonly emergencyDepartment: boolean;
  readonly addressPointIds?: readonly CityId[];
  readonly scheduleProfileId: CityId;
  readonly renderBindingId: CityId;
}

export type CultureAnchorKind =
  | 'event-space'
  | 'gallery'
  | 'heritage-site'
  | 'museum'
  | 'theater'
  | 'venue';

export interface CultureAnchorContract extends CityObjectBase<'culture-anchor'> {
  readonly anchorKind: CultureAnchorKind;
  readonly civicAnchorId: CityId;
  readonly buildingId: CityId;
  readonly districtId: CityId;
  readonly plazaZoneIds: readonly CityId[];
  readonly center: Point2D;
  readonly culturalProgram: string;
  readonly culturalFootfallDaily: number;
  readonly staffCapacity: number;
  readonly eventCapacityPeople: number;
  readonly tourismAttractionScore: number;
  readonly eveningActivity: boolean;
  readonly heritageProtected: boolean;
  readonly addressPointIds?: readonly CityId[];
  readonly scheduleProfileId: string;
  readonly renderBindingId: CityId;
}

export type CommunityAnchorKind =
  | 'cemetery'
  | 'community-hall'
  | 'food-bank'
  | 'processional-space'
  | 'recreation-center'
  | 'shelter'
  | 'social-service'
  | 'worship-place';

export interface CommunityAnchorContract extends CityObjectBase<'community-anchor'> {
  readonly anchorKind: CommunityAnchorKind;
  readonly civicAnchorId: CityId;
  readonly buildingId: CityId;
  readonly districtId: CityId;
  readonly plazaZoneIds: readonly CityId[];
  readonly center: Point2D;
  readonly serviceProgram: string;
  readonly dailyVisitors: number;
  readonly staffCapacity: number;
  readonly eventCapacityPeople: number;
  readonly socialServiceCapacityPeople: number;
  readonly shelterCapacityPeople: number;
  readonly communityCoverageScore: number;
  readonly crowdEventReady: boolean;
  readonly foodDistribution: boolean;
  readonly cemeteryCapacityPlots: number;
  readonly addressPointIds?: readonly CityId[];
  readonly scheduleProfileId: string;
  readonly renderBindingId: CityId;
}

export interface BuildingTypologyContract {
  readonly typologyId: string;
  readonly kind: BuildingTypologyKind;
  readonly primaryUse: LandUse;
  readonly defaultUses: readonly LandUse[];
  readonly heightRangeMeters: readonly [number, number];
  readonly typicalFloorHeightMeters: number;
  readonly facadeGrammarId: string;
  readonly roofGrammarId: string;
  readonly entranceStrategy: BuildingEntranceStrategy;
  readonly serviceAccess: BuildingServiceAccessProfile;
  readonly scheduleProfileId: string;
}

export type BuildingFootprintGrammarKind =
  | 'bar'
  | 'podium'
  | 'tower-on-podium'
  | 'courtyard'
  | 'warehouse-shed'
  | 'civic-block';

export interface BuildingFootprintGrammarContract {
  readonly grammarId: string;
  readonly kind: BuildingFootprintGrammarKind;
  readonly parcelFitEnvelopeId: CityId;
  readonly buildableEnvelope: Polygon2D;
  readonly footprintAreaSqM: number;
  readonly groundCoverageRatio: number;
  readonly envelopeCoverageRatio: number;
  readonly placementOffsetMeters: Point2D;
  readonly setbacks: {
    readonly frontMeters: number;
    readonly sideMeters: number;
    readonly rearMeters: number;
    readonly waterfrontMeters?: number;
  };
  readonly podium?: {
    readonly footprint: Polygon2D;
    readonly heightMeters: number;
  };
  readonly tower?: {
    readonly footprint: Polygon2D;
    readonly floorPlateAreaSqM: number;
    readonly stepbackMeters: number;
  };
  readonly courtyard?: {
    readonly center: Point2D;
    readonly sizeMeters: { readonly x: number; readonly z: number };
    readonly openToSky: boolean;
  };
  readonly constraintIds: readonly CityId[];
  readonly waterfrontSetbackApplied: boolean;
  readonly hazardConstrained: boolean;
}

export type BuildingStructuralSystemKind =
  | 'load-bearing-wall'
  | 'reinforced-concrete-frame'
  | 'steel-frame'
  | 'concrete-core-outrigger'
  | 'long-span-steel'
  | 'civic-frame';

export type BuildingCoreKind = 'single-core' | 'dual-core' | 'side-core' | 'service-core' | 'distributed-core';

export interface BuildingFloorPlateContract {
  readonly level: number;
  readonly elevationMeters: number;
  readonly floorHeightMeters: number;
  readonly footprint: Polygon2D;
  readonly areaSqM: number;
  readonly use: LandUse;
  readonly structuralGridId: string;
  readonly isTransferLevel: boolean;
  readonly isMechanicalLevel: boolean;
}

export interface BuildingStructureShellContract {
  readonly grammarId: string;
  readonly structuralSystem: BuildingStructuralSystemKind;
  readonly massing: {
    readonly totalHeightMeters: number;
    readonly floorCount: number;
    readonly typicalFloorHeightMeters: number;
    readonly podiumFloorCount: number;
    readonly towerFloorCount: number;
    readonly roofElevationMeters: number;
  };
  readonly core: {
    readonly coreId: string;
    readonly kind: BuildingCoreKind;
    readonly footprint: Polygon2D;
    readonly areaSqM: number;
    readonly servesLevels: readonly [number, number];
    readonly egressStairCount: number;
    readonly elevatorBankCount: number;
  };
  readonly structuralGrid: {
    readonly gridId: string;
    readonly baySpacingMeters: { readonly x: number; readonly z: number };
    readonly columnLineCount: { readonly x: number; readonly z: number };
    readonly primarySpanMeters: number;
    readonly material: 'concrete' | 'steel' | 'hybrid' | 'masonry';
  };
  readonly floorPlates: readonly BuildingFloorPlateContract[];
  readonly transferLevels: readonly number[];
  readonly loadBearingAssumptions: {
    readonly gravitySystem: string;
    readonly lateralSystem: string;
    readonly foundationHint: string;
    readonly liveLoadKpa: number;
    readonly longSpan: boolean;
  };
}

export type BuildingFacadeRhythm =
  | 'civic-formal'
  | 'fine-grain'
  | 'industrial-large-bay'
  | 'mid-rise-waterfront'
  | 'residential-regular'
  | 'tower-grid';

export type BuildingFacadeMaterialZone =
  | 'balcony-rail'
  | 'brick'
  | 'concrete'
  | 'glass'
  | 'metal-panel'
  | 'plaster'
  | 'stone'
  | 'storefront-glass';

export interface BuildingFacadeAtlasSlotsContract {
  readonly wall: string;
  readonly window: string;
  readonly frame: string;
  readonly balcony?: string;
  readonly storefrontSign?: string;
  readonly awning?: string;
}

export interface BuildingFacadeSideContract {
  readonly side: BuildingFrontageSide;
  readonly widthMeters: number;
  readonly heightMeters: number;
  readonly bayCount: number;
  readonly baySpacingMeters: number;
  readonly floorLevels: readonly number[];
  readonly windowModule: {
    readonly widthMeters: number;
    readonly heightMeters: number;
    readonly sillHeightMeters: number;
    readonly transparencyRatio: number;
  };
  readonly balconyModule: {
    readonly enabled: boolean;
    readonly startLevel: number;
    readonly everyNFloors: number;
    readonly widthMeters: number;
    readonly depthMeters: number;
  };
  readonly storefrontModule: {
    readonly enabled: boolean;
    readonly roadId?: CityId;
    readonly bayCount: number;
    readonly signAtlasSlot?: string;
    readonly awningAtlasSlot?: string;
  };
  readonly materialZones: readonly BuildingFacadeMaterialZone[];
  readonly renderLod: LodTier;
}

export interface BuildingFacadeGrammarContract {
  readonly grammarId: string;
  readonly templateId: string;
  readonly sourceStructureShellId: string;
  readonly rhythm: BuildingFacadeRhythm;
  readonly floorGrid: {
    readonly floorCount: number;
    readonly typicalFloorHeightMeters: number;
    readonly expressedFloorLevels: readonly number[];
  };
  readonly baySpacingMeters: number;
  readonly sides: readonly BuildingFacadeSideContract[];
  readonly materialPaletteId: string;
  readonly atlasSlots: BuildingFacadeAtlasSlotsContract;
}

export type BuildingRoofStyleKind = 'flat' | 'mechanical' | 'green' | 'antenna' | 'terrace' | 'sawtooth' | 'civic-cornice';
export type BuildingRoofDetailKind =
  | 'mechanical-screen'
  | 'solar-array'
  | 'green-roof'
  | 'antenna'
  | 'terrace'
  | 'roof-access';
export type BuildingRoofMaterialZone = 'roof' | 'solar' | 'green-roof' | 'metal' | 'terrace';

export interface BuildingRoofDetailContract {
  readonly detailId: CityId;
  readonly detailKind: BuildingRoofDetailKind;
  readonly centerOffsetMeters: Point2D;
  readonly sizeMeters: { readonly x: number; readonly y: number; readonly z: number };
  readonly baseElevationMeters: number;
  readonly topElevationMeters: number;
  readonly assetBindingId: CityId;
  readonly materialZone: BuildingRoofMaterialZone;
  readonly heightExempt: boolean;
}

export interface BuildingRoofGrammarContract {
  readonly grammarId: string;
  readonly templateId: string;
  readonly sourceStructureShellId: string;
  readonly roofStyle: BuildingRoofStyleKind;
  readonly roofPlane: {
    readonly footprint: Polygon2D;
    readonly areaSqM: number;
    readonly elevationMeters: number;
    readonly usableAreaSqM: number;
    readonly parapetHeightMeters: number;
    readonly drainageSlopePercent: number;
  };
  readonly details: readonly BuildingRoofDetailContract[];
  readonly solar: {
    readonly panelCount: number;
    readonly arrayAreaSqM: number;
    readonly tiltDegrees: number;
    readonly azimuthDegrees: number;
    readonly detailIds: readonly CityId[];
  };
  readonly greenRoof: {
    readonly enabled: boolean;
    readonly coverageRatio: number;
    readonly areaSqM: number;
    readonly soilDepthMeters: number;
    readonly detailId?: CityId;
  };
  readonly roofAccess: {
    readonly hasStairBulkhead: boolean;
    readonly hasMaintenancePath: boolean;
    readonly accessDetailIds: readonly CityId[];
  };
  readonly heightExemptions: readonly {
    readonly detailId: CityId;
    readonly allowed: boolean;
    readonly reason: 'mechanical-screen' | 'antenna' | 'access-bulkhead';
    readonly exemptHeightMeters: number;
    readonly zoningLimitMeters: number;
  }[];
}

export type BuildingEntranceKind = 'loading-door' | 'lobby' | 'public-door' | 'ramp' | 'service-entry';
export type BuildingEntranceAccessLevel = 'public' | 'resident' | 'restricted' | 'service';

export interface BuildingEntranceContract extends CityObjectBase<'building-entrance'> {
  readonly entranceKind: BuildingEntranceKind;
  readonly accessLevel: BuildingEntranceAccessLevel;
  readonly buildingId: CityId;
  readonly parcelId: CityId;
  readonly roadId: CityId;
  readonly sidewalkId?: CityId;
  readonly activeFrontageIds: readonly CityId[];
  readonly serviceAccessCorridorIds: readonly CityId[];
  readonly addressPointId: CityId;
  readonly position: Point2D;
  readonly frontageSide: BuildingFrontageSide;
  readonly facingDirectionRadians: number;
  readonly widthMeters: number;
  readonly accessible: boolean;
  readonly stepFree: boolean;
  readonly door: {
    readonly automatic: boolean;
    readonly clearWidthMeters: number;
    readonly swing: 'inward' | 'outward' | 'sliding';
  };
  readonly lobby?: {
    readonly areaSqM: number;
    readonly weatherProtected: boolean;
    readonly publicHoursProfile: CityId;
  };
  readonly ramp?: {
    readonly slopePercent: number;
    readonly widthMeters: number;
    readonly landingLengthMeters: number;
  };
  readonly loading?: {
    readonly loadingDockId?: CityId;
    readonly loadingBays: number;
    readonly clearHeightMeters: number;
  };
}

export type BuildingFireSafetyRiskClass = 'assembly' | 'industrial' | 'low-rise' | 'mid-rise' | 'high-rise';

export interface BuildingRefugeAreaContract {
  readonly id: CityId;
  readonly level: number;
  readonly position: Point2D;
  readonly areaSqM: number;
  readonly capacityPersons: number;
}

export interface BuildingFireSafetyProfileContract extends CityObjectBase<'building-fire-safety'> {
  readonly buildingId: CityId;
  readonly parcelId: CityId;
  readonly roadId: CityId;
  readonly riskClass: BuildingFireSafetyRiskClass;
  readonly hydrantNodeId: CityId;
  readonly hydrantDistanceMeters: number;
  readonly hydrantReachMeters: number;
  readonly hydrantWithinReach: boolean;
  readonly fireLaneCurbZoneIds: readonly CityId[];
  readonly fireLaneClearance: boolean;
  readonly egressEntranceIds: readonly CityId[];
  readonly emergencyAccessEntranceIds: readonly CityId[];
  readonly serviceAccessCorridorIds: readonly CityId[];
  readonly egress: {
    readonly requiredExitCount: number;
    readonly providedExitCount: number;
    readonly totalExitWidthMeters: number;
    readonly minExitSeparationMeters: number;
    readonly exitCapacityPersons: number;
  };
  readonly sprinkler: {
    readonly required: boolean;
    readonly provided: boolean;
    readonly waterServiceNodeId: CityId;
    readonly pressureZoneId: CityId;
    readonly estimatedFlowLitersPerSecond: number;
  };
  readonly refugeAreas: readonly BuildingRefugeAreaContract[];
  readonly emergencyAccess: {
    readonly maxAccessDistanceMeters: number;
    readonly serviceAccessProvided: boolean;
    readonly fireLaneProvided: boolean;
    readonly hydrantReachProvided: boolean;
  };
}

export interface AddressPointContract extends CityObjectBase<'address-point'> {
  readonly buildingId: CityId;
  readonly parcelId: CityId;
  readonly roadId: CityId;
  readonly position: Point2D;
  readonly streetName: string;
  readonly buildingNumber: string;
  readonly unitRange?: string;
  readonly postalCode: string;
  readonly formattedAddress?: string;
  readonly administrativeBoundaryIds?: readonly CityId[];
  readonly wardId?: CityId;
  readonly wardName?: string;
  readonly neighborhoodId?: CityId;
  readonly neighborhoodName?: string;
  readonly districtId?: CityId;
  readonly placeIds?: readonly CityId[];
  readonly importTags?: Readonly<Record<string, string>>;
  readonly entranceIds: readonly CityId[];
  readonly activeFrontageIds: readonly CityId[];
  readonly primary: boolean;
}

export type NamedPlaceKind = 'civic-anchor' | 'district' | 'neighborhood' | 'park' | 'street' | 'ward' | 'waterfront';
export type GazetteerEntryKind = 'address' | 'anchor' | 'place' | 'street';

export interface NamedPlaceContract extends CityObjectBase<'named-place'> {
  readonly placeKind: NamedPlaceKind;
  readonly name: string;
  readonly normalizedName: string;
  readonly sourceObjectId: CityId;
  readonly sourceObjectKind: CityObjectKind;
  readonly center: Point2D;
  readonly boundary?: Polygon2D;
  readonly addressPointIds: readonly CityId[];
  readonly administrativeBoundaryIds: readonly CityId[];
  readonly districtIds: readonly CityId[];
  readonly roadIds: readonly CityId[];
  readonly buildingIds: readonly CityId[];
  readonly placeTags: readonly string[];
}

export interface GazetteerEntryContract extends CityObjectBase<'gazetteer-entry'> {
  readonly entryKind: GazetteerEntryKind;
  readonly displayName: string;
  readonly normalizedName: string;
  readonly searchTokens: readonly string[];
  readonly sourceObjectId: CityId;
  readonly sourceObjectKind: CityObjectKind;
  readonly position: Point2D;
  readonly reverseLookupRadiusMeters: number;
  readonly addressPointId?: CityId;
  readonly placeId?: CityId;
  readonly streetName?: string;
  readonly buildingNumber?: string;
  readonly postalCode?: string;
  readonly neighborhoodId?: CityId;
  readonly wardId?: CityId;
  readonly importTags?: Readonly<Record<string, string>>;
}

export interface BuildingContract extends CityObjectBase<'building'> {
  readonly parcelId: CityId;
  readonly zoningDistrictId: CityId;
  readonly footprint: Polygon2D;
  readonly uses: readonly LandUse[];
  readonly heightMeters: number;
  readonly floorCount: number;
  readonly typology: BuildingTypologyContract;
  readonly footprintGrammar: BuildingFootprintGrammarContract;
  readonly structureShell: BuildingStructureShellContract;
  readonly facadeGrammar: BuildingFacadeGrammarContract;
  readonly facadeGrammarId: string;
  readonly roofGrammar: BuildingRoofGrammarContract;
  readonly roofGrammarId: string;
  readonly primaryFrontageRoadId: CityId;
  readonly primaryFrontageSide: BuildingFrontageSide;
  readonly entranceIds: readonly CityId[];
  readonly publicEntranceIds: readonly CityId[];
  readonly serviceEntranceIds?: readonly CityId[];
  readonly loadingEntranceIds?: readonly CityId[];
  readonly addressPointIds?: readonly CityId[];
  readonly groundElevationMeters?: number;
  readonly finishedFloorElevationMeters?: number;
  readonly maxFootprintGradePercent?: number;
  readonly topographyZoneIds?: readonly CityId[];
  readonly buildabilityFromLandform?: LandformBuildability;
  readonly soilGeologyZoneIds?: readonly CityId[];
  readonly powerService?: BuildingPowerServiceContract;
  readonly waterService?: BuildingWaterServiceContract;
  readonly wastewaterService?: BuildingWastewaterServiceContract;
  readonly telecomService?: BuildingTelecomServiceContract;
  readonly thermalService?: BuildingThermalServiceContract;
  readonly serviceAccessCorridorIds?: readonly CityId[];
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
export type CurbManagementContext = 'detailed-street' | 'citywide';
export type CurbPricingPolicy = 'free' | 'metered' | 'permit' | 'commercial-loading' | 'not-applicable';
export type CurbEnforcementPolicy = 'camera' | 'patrol' | 'self-enforced' | 'not-applicable';

export interface CurbManagementPolicy {
  readonly pricing: CurbPricingPolicy;
  readonly enforcement: CurbEnforcementPolicy;
  readonly maxStayMinutes: number;
  readonly disabledSpaces: number;
  readonly loadingDockAccess: boolean;
  readonly fireLaneClearance: boolean;
  readonly transitStopClearance: boolean;
}

export interface CurbZoneContract extends CityObjectBase<'curb-zone'> {
  readonly sliceId?: CityId;
  readonly managementContext: CurbManagementContext;
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
  readonly management: CurbManagementPolicy;
}

export type CurbActivationKind = 'parklet' | 'outdoor-dining' | 'temporary-seating-deck' | 'interim-plaza';
export type CurbActivationStatus = 'active' | 'seasonal' | 'pending-removal';
export type CurbActivationSeason = 'spring' | 'summer' | 'autumn' | 'winter' | 'year-round';
export type CurbActivationBarrierKind = 'planter-buffer' | 'flex-post' | 'rail-buffer' | 'wheel-stop';

export interface CurbActivationContract extends CityObjectBase<'curb-activation'> {
  readonly activationKind: CurbActivationKind;
  readonly status: CurbActivationStatus;
  readonly curbZoneId: CityId;
  readonly permitInspectionRecordId: CityId;
  readonly roadId: CityId;
  readonly sidewalkId: CityId;
  readonly side: CurbSide;
  readonly startMeters: number;
  readonly endMeters: number;
  readonly lengthMeters: number;
  readonly widthMeters: number;
  readonly center: Point2D;
  readonly boundary: Polygon2D;
  readonly seatingCapacity: number;
  readonly protection: {
    readonly barrierKind: CurbActivationBarrierKind;
    readonly barrierCount: number;
    readonly reflectiveMarkers: boolean;
  };
  readonly clearances: {
    readonly accessiblePathMeters: number;
    readonly emergencyAccess: boolean;
    readonly transitStopClearance: boolean;
    readonly drainageInletClearance: boolean;
  };
  readonly seasonality: {
    readonly season: CurbActivationSeason;
    readonly activeFromDay: number;
    readonly activeToDay: number;
    readonly removalDay: number;
    readonly removableWithinHours: number;
  };
  readonly assetBindingId: CityId;
}


export type StreetLightPlacementContext = 'citywide-street' | 'detailed-street';
export type StreetLightFixtureType = 'cutoff-led' | 'decorative-pedestrian' | 'double-arm' | 'pedestrian-scale' | 'single-arm';
export type StreetLightPurpose = 'arterial-safety' | 'local-wayfinding' | 'promenade-comfort' | 'transit-stop-safety';
export type StreetLightDarkPathRisk = 'low' | 'medium' | 'high';

export interface StreetLightContract extends CityObjectBase<'street-light'> {
  readonly placementContext: StreetLightPlacementContext;
  readonly fixtureType: StreetLightFixtureType;
  readonly lightingPurpose: StreetLightPurpose;
  readonly sliceId?: CityId;
  readonly roadId: CityId;
  readonly sidewalkId: CityId;
  readonly curbZoneId?: CityId;
  readonly position: Point2D;
  readonly side: CurbSide;
  readonly alongRoadMeters: number;
  readonly offsetFromRoadEdgeMeters: number;
  readonly heightMeters: number;
  readonly poleRadiusMeters: number;
  readonly armLengthMeters: number;
  readonly fixtureLengthMeters: number;
  readonly coverageRadiusMeters: number;
  readonly colorTemperatureKelvin: number;
  readonly powerCircuitId?: CityId;
  readonly coverage: {
    readonly radiusMeters: number;
    readonly overlapScore: number;
    readonly criticalPedestrianPath: boolean;
    readonly nearestTransitStopId?: CityId;
  };
  readonly nightSafety: {
    readonly targetIlluminanceLux: number;
    readonly estimatedIlluminanceLux: number;
    readonly darkPathRisk: StreetLightDarkPathRisk;
    readonly emergencyRouteSupport: boolean;
  };
  readonly glareControl: {
    readonly shielded: boolean;
    readonly glareRating: 'low' | 'medium' | 'high';
    readonly cutoffAngleDegrees: number;
  };
  readonly decorativeLighting: {
    readonly enabled: boolean;
    readonly districtIdentity: boolean;
    readonly eventReady: boolean;
  };
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
  | 'railing'
  | 'regulatory-sign'
  | 'street-name-sign'
  | 'wayfinding-sign';

export type StreetFurniturePlacementZone = 'curb-edge' | 'furnishing-zone' | 'frontage-zone';
export type StreetFurniturePlacementContext = 'detailed-street' | 'citywide-street';
export type SignPanelKind =
  | 'district-map'
  | 'directional-fingerpost'
  | 'regulatory-plate'
  | 'storefront-directory'
  | 'street-name-blade';

export type PublicAmenityKind =
  | 'public-toilet'
  | 'drinking-fountain'
  | 'shade-structure'
  | 'misting-cooling-point'
  | 'charging-point'
  | 'clock'
  | 'information-kiosk'
  | 'repair-stand';
export type PublicAmenityPlacementContext = 'detailed-street' | 'citywide-street' | 'plaza' | 'waterfront';

export interface StreetFurnitureContract extends CityObjectBase<'street-furniture'> {
  readonly placementContext: StreetFurniturePlacementContext;
  readonly sliceId?: CityId;
  readonly roadId: CityId;
  readonly sidewalkId: CityId;
  readonly curbZoneId?: CityId;
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
  readonly clearPathWidthMeters: number;
  readonly crossingClearanceMeters: number;
  readonly visibilityClearanceMeters: number;
  readonly transitStopId?: CityId;
  readonly assetBindingId: CityId;
  readonly signFace?: {
    readonly signRole: 'regulatory' | 'street-name' | 'wayfinding';
    readonly panelKind: SignPanelKind;
    readonly textCode: string;
    readonly facing: 'road' | 'sidewalk';
    readonly readableLod: Extract<LodTier, 'lod4'>;
    readonly routeIds: readonly CityId[];
    readonly districtIds: readonly CityId[];
    readonly activeFrontageIds: readonly CityId[];
    readonly destinationObjectIds: readonly CityId[];
    readonly regulatoryRule?: {
      readonly ruleKind: 'loading-restriction' | 'speed-limit' | 'transit-priority';
      readonly valueCode: string;
    };
  };
}

export interface PublicAmenityContract extends CityObjectBase<'public-amenity'> {
  readonly amenityKind: PublicAmenityKind;
  readonly placementContext: PublicAmenityPlacementContext;
  readonly roadId?: CityId;
  readonly sidewalkId?: CityId;
  readonly plazaZoneId?: CityId;
  readonly waterfrontOpenSpaceId?: CityId;
  readonly serviceAccessCorridorId?: CityId;
  readonly side?: CurbSide;
  readonly position: Point2D;
  readonly boundary: Polygon2D;
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
  readonly accessiblePathMeters: number;
  readonly capacityUsers: number;
  readonly comfort: {
    readonly shadeProvided: boolean;
    readonly coolingProvided: boolean;
    readonly seatingSupported: boolean;
    readonly expectedDailyUsers: number;
  };
  readonly utilityRequirements: {
    readonly water: boolean;
    readonly power: boolean;
    readonly drainage: boolean;
  };
  readonly serviceAccess: {
    readonly required: boolean;
    readonly provided: boolean;
    readonly maintenanceAccessMeters: number;
  };
  readonly assetBindingId: CityId;
}


export type TransitMode = 'bus';
export type TransitStopType = 'bus-stop';
export type TransitServiceSpan = 'all-day' | 'peak-only' | 'night';

export interface TransitStopContract extends CityObjectBase<'transit-stop'> {
  readonly stopType: TransitStopType;
  readonly mode: TransitMode;
  readonly roadId: CityId;
  readonly sidewalkId: CityId;
  readonly shelterFurnitureId?: CityId;
  readonly routeIds: readonly CityId[];
  readonly side: CurbSide;
  readonly center: Point2D;
  readonly alongRoadMeters: number;
  readonly platformLengthMeters: number;
  readonly passengerDemandSeed: number;
  readonly serviceHeadwayMinutes: number;
  readonly accessible: boolean;
  readonly transferRoadIds: readonly CityId[];
  readonly assetBindingId: CityId;
}

export interface TransitRouteContract extends CityObjectBase<'transit-route'> {
  readonly mode: TransitMode;
  readonly routeShortName: string;
  readonly roadIds: readonly CityId[];
  readonly stopIds: readonly CityId[];
  readonly laneIds: readonly CityId[];
  readonly headwayMinutes: number;
  readonly serviceSpan: TransitServiceSpan;
  readonly passengerDemandSeed: number;
  readonly colorHex: string;
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

export type TrafficCalmingDeviceKind =
  | 'curb-extension'
  | 'bus-bulb'
  | 'chicane'
  | 'pinchpoint'
  | 'speed-hump'
  | 'speed-table'
  | 'speed-cushion'
  | 'neighborhood-gateway';

export interface TrafficCalmingDeviceContract extends CityObjectBase<'traffic-calming-device'> {
  readonly sliceId: CityId;
  readonly roadId: CityId;
  readonly intersectionId?: CityId;
  readonly crossingId?: CityId;
  readonly curbZoneIds: readonly CityId[];
  readonly deviceKind: TrafficCalmingDeviceKind;
  readonly center: Point2D;
  readonly orientation: 'horizontal' | 'vertical';
  readonly positionOnRoadMeters: number;
  readonly side: CurbSide | 'both';
  readonly size: {
    readonly x: number;
    readonly z: number;
  };
  readonly heightMeters: number;
  readonly targetSpeedKph: number;
  readonly designSpeedKph: number;
  readonly emergencyVehicleClearanceMeters: number;
  readonly accessibleClearPathMeters: number;
  readonly crossingSafetyBenefit: 'shorter-crossing' | 'speed-reduction' | 'transit-access' | 'gateway-slow-zone';
  readonly assetBindingId: CityId;
}

export type WeatherPresetKind = 'clear' | 'cloudy' | 'rain' | 'fog' | 'monsoon';
export type WeatherSeason = 'spring' | 'summer' | 'monsoon' | 'autumn' | 'winter';
export type WeatherPrecipitationKind = 'none' | 'drizzle' | 'rain' | 'heavy-rain';

export interface WeatherPresetRenderingContract {
  readonly backgroundColor: number;
  readonly fogColor: number;
  readonly fogDensity: number;
  readonly skyColor: number;
  readonly skyOpacity: number;
  readonly sunIntensity: number;
  readonly hemisphereIntensity: number;
  readonly fillIntensity: number;
  readonly exposure: number;
}

export interface WeatherPresetContract extends CityObjectBase<'weather-preset'> {
  readonly presetKind: WeatherPresetKind;
  readonly season: WeatherSeason;
  readonly active: boolean;
  readonly cloudCover: number;
  readonly precipitation: WeatherPrecipitationKind;
  readonly precipitationIntensity: number;
  readonly visibilityMeters: number;
  readonly surfaceWetness: number;
  readonly puddleCoverage: number;
  readonly humidity: number;
  readonly temperatureCelsius: number;
  readonly windSpeedKph: number;
  readonly transitionSeconds: number;
  readonly rendering: WeatherPresetRenderingContract;
  readonly simulationHooks: {
    readonly trafficSpeedMultiplier: number;
    readonly pedestrianComfort: 'comfortable' | 'warm' | 'humid' | 'reduced-visibility' | 'storm';
    readonly drainageLoad: 'none' | 'low' | 'medium' | 'high';
  };
}

export type SolarShadingSampleKind = 'roof-solar' | 'plaza-comfort' | 'park-comfort' | 'waterfront-comfort';
export type SolarGlareRisk = 'low' | 'medium' | 'high';
export type UrbanHeatZoneKind = 'heat-island' | 'cool-roof' | 'canopy-cooling' | 'water-cooling' | 'public-route-risk';
export type UrbanHeatRiskLevel = 'low' | 'moderate' | 'high' | 'critical';

export interface SolarPathSampleContract {
  readonly hour: number;
  readonly altitudeDegrees: number;
  readonly azimuthDegrees: number;
  readonly shadowLengthMultiplier: number;
  readonly irradianceWattsPerSqM: number;
}

export interface SolarShadingSampleContract extends CityObjectBase<'solar-shading-sample'> {
  readonly sampleKind: SolarShadingSampleKind;
  readonly parentObjectId: CityId;
  readonly center: Point2D;
  readonly analysisRadiusMeters: number;
  readonly weatherPresetId: CityId;
  readonly daylightHours: number;
  readonly peakSunHour: number;
  readonly shadeCoverageRatio: number;
  readonly comfortScore: number;
  readonly glareRisk: SolarGlareRisk;
  readonly solarPotentialKwhPerDay: number;
  readonly roofSuitabilityScore: number;
  readonly sunPath: readonly SolarPathSampleContract[];
  readonly references: {
    readonly buildingId?: CityId;
    readonly roofDetailIds?: readonly CityId[];
    readonly plazaZoneId?: CityId;
    readonly parkId?: CityId;
    readonly parkFeatureIds?: readonly CityId[];
    readonly waterfrontOpenSpaceId?: CityId;
    readonly shadeTreeIds?: readonly CityId[];
  };
}

export interface UrbanHeatZoneContract extends CityObjectBase<'urban-heat-zone'> {
  readonly zoneKind: UrbanHeatZoneKind;
  readonly riskLevel: UrbanHeatRiskLevel;
  readonly parentObjectId: CityId;
  readonly center: Point2D;
  readonly boundary: Polygon2D;
  readonly weatherPresetId: CityId;
  readonly daytimeTemperatureDeltaCelsius: number;
  readonly nightTemperatureDeltaCelsius: number;
  readonly surfaceAlbedo: number;
  readonly shadeCoverageRatio: number;
  readonly treeCanopyCoolingScore: number;
  readonly waterCoolingScore: number;
  readonly coolRoofCoverageRatio: number;
  readonly mitigationEffectScore: number;
  readonly heatRiskScore: number;
  readonly routeExposureScore: number;
  readonly references: {
    readonly districtId?: CityId;
    readonly buildingIds?: readonly CityId[];
    readonly roadIds?: readonly CityId[];
    readonly treeIds?: readonly CityId[];
    readonly solarShadingSampleIds?: readonly CityId[];
    readonly waterfrontOpenSpaceId?: CityId;
    readonly hazardZoneIds?: readonly CityId[];
  };
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
    | 'environment'
    | 'graph'
    | 'geometry'
    | 'identifier'
    | 'import-export'
    | 'land'
    | 'lod'
    | 'metadata'
    | 'metrics'
    | 'operations'
    | 'performance'
    | 'resilience'
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
