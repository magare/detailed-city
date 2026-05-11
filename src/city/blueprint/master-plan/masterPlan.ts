import type { DistrictKind } from '../../../types/city';
import type { CityId, LandUse, LodTier, Point2D, ValidationIssue, ValidationResult } from '../../data-contracts/cityContracts';

export type CityFormKind = 'river-coastal-polycentric-grid';
export type MasterPlanCenterHierarchy = 'primary' | 'secondary' | 'local';
export type MasterPlanInfluence =
  | {
      readonly shape: 'radial';
      readonly center: Point2D;
      readonly radius: number;
    }
  | {
      readonly shape: 'zone';
      readonly minX: number;
      readonly maxX: number;
      readonly minZ: number;
      readonly maxZ: number;
    };

export interface MasterPlanObjectBase {
  readonly id: CityId;
  readonly name: string;
  readonly ownerDomain: 'blueprint';
  readonly lod: LodTier;
}

export interface CityFormIntent extends MasterPlanObjectBase {
  readonly formKind: CityFormKind;
  readonly primaryAxisRoadId: CityId;
  readonly waterRelationship: 'south-river-edge';
  readonly densityStrategy: 'center-weighted-with-waterfront-edge';
}

export interface MasterPlanCenter extends MasterPlanObjectBase {
  readonly hierarchy: MasterPlanCenterHierarchy;
  readonly districtIntent: DistrictKind;
  readonly influence: MasterPlanInfluence;
  readonly assignmentPriority: number;
  readonly skylineRole: 'skyline-peak' | 'civic-marker' | 'employment-node' | 'neighborhood-node';
}

export interface SkylineIntent extends MasterPlanObjectBase {
  readonly centerId: CityId;
  readonly districtIntent: DistrictKind;
  readonly heightRangeMeters: readonly [number, number];
  readonly landmarkCount: number;
}

export interface ProtectedOpenSpaceIntent extends MasterPlanObjectBase {
  readonly publicSpaceId: CityId;
  readonly protectionPolicy: 'no-build-open-space';
  readonly primaryUses: readonly Extract<LandUse, 'open-space'>[];
}

export interface WaterEdgeIntent extends MasterPlanObjectBase {
  readonly waterwayId: CityId;
  readonly targetDistrict: Extract<DistrictKind, 'waterfront'>;
  readonly normalizedInfluence: MasterPlanInfluence;
  readonly continuity: 'continuous-public-edge';
  readonly bufferByBlock: number;
}

export interface GrowthBoundaryIntent extends MasterPlanObjectBase {
  readonly boundaryKind: 'city-limit' | 'intensification-area' | 'managed-edge';
  readonly normalizedZone: Extract<MasterPlanInfluence, { readonly shape: 'zone' }>;
  readonly allowedDistricts: readonly DistrictKind[];
  readonly active: boolean;
}

export interface CityMasterPlan extends MasterPlanObjectBase {
  readonly cityForm: CityFormIntent;
  readonly centers: readonly MasterPlanCenter[];
  readonly skyline: readonly SkylineIntent[];
  readonly protectedOpenSpaces: readonly ProtectedOpenSpaceIntent[];
  readonly waterEdges: readonly WaterEdgeIntent[];
  readonly growthBoundaries: readonly GrowthBoundaryIntent[];
}

export interface MasterPlanDiagnostics {
  readonly id: CityId;
  readonly cityFormKind: CityFormKind;
  readonly centers: {
    readonly total: number;
    readonly primary: number;
    readonly secondary: number;
    readonly local: number;
  };
  readonly skyline: {
    readonly intentCount: number;
    readonly landmarkCount: number;
  };
  readonly protectedOpenSpaces: {
    readonly total: number;
    readonly noBuild: number;
  };
  readonly waterEdges: {
    readonly total: number;
    readonly continuousPublicEdges: number;
  };
  readonly growthBoundaries: {
    readonly total: number;
    readonly active: number;
  };
  readonly validation: ValidationResult;
}

export const CITY_MASTER_PLAN: CityMasterPlan = {
  id: 'master-plan-detailed-city-v1',
  name: 'Detailed City Master Plan',
  ownerDomain: 'blueprint',
  lod: 'lod0',
  cityForm: {
    id: 'city-form-river-coastal-polycentric-grid',
    name: 'River Coastal Polycentric Grid',
    ownerDomain: 'blueprint',
    lod: 'lod0',
    formKind: 'river-coastal-polycentric-grid',
    primaryAxisRoadId: 'road-v-6',
    waterRelationship: 'south-river-edge',
    densityStrategy: 'center-weighted-with-waterfront-edge'
  },
  centers: [
    {
      id: 'center-downtown-core',
      name: 'Downtown Core',
      ownerDomain: 'blueprint',
      lod: 'lod0',
      hierarchy: 'primary',
      districtIntent: 'downtown',
      influence: {
        shape: 'radial',
        center: { x: 0.5, z: 0.54 },
        radius: 0.24
      },
      assignmentPriority: 10,
      skylineRole: 'skyline-peak'
    },
    {
      id: 'center-industrial-logistics',
      name: 'Industrial Logistics Node',
      ownerDomain: 'blueprint',
      lod: 'lod0',
      hierarchy: 'secondary',
      districtIntent: 'industrial',
      influence: {
        shape: 'zone',
        minX: 0.68,
        maxX: 1,
        minZ: 0.45,
        maxZ: 1
      },
      assignmentPriority: 30,
      skylineRole: 'employment-node'
    },
    {
      id: 'center-civic-campus',
      name: 'Civic Campus',
      ownerDomain: 'blueprint',
      lod: 'lod0',
      hierarchy: 'secondary',
      districtIntent: 'civic',
      influence: {
        shape: 'zone',
        minX: 0,
        maxX: 0.3,
        minZ: 0.58,
        maxZ: 1
      },
      assignmentPriority: 40,
      skylineRole: 'civic-marker'
    },
    {
      id: 'center-neighborhoods',
      name: 'Residential Neighborhoods',
      ownerDomain: 'blueprint',
      lod: 'lod0',
      hierarchy: 'local',
      districtIntent: 'residential',
      influence: {
        shape: 'zone',
        minX: 0,
        maxX: 1,
        minZ: 0,
        maxZ: 1
      },
      assignmentPriority: 90,
      skylineRole: 'neighborhood-node'
    }
  ],
  skyline: [
    {
      id: 'skyline-downtown-peak',
      name: 'Downtown Skyline Peak',
      ownerDomain: 'blueprint',
      lod: 'lod0',
      centerId: 'center-downtown-core',
      districtIntent: 'downtown',
      heightRangeMeters: [36, 92],
      landmarkCount: 3
    },
    {
      id: 'skyline-waterfront-midrise',
      name: 'Waterfront Midrise Edge',
      ownerDomain: 'blueprint',
      lod: 'lod0',
      centerId: 'center-downtown-core',
      districtIntent: 'waterfront',
      heightRangeMeters: [18, 58],
      landmarkCount: 1
    },
    {
      id: 'skyline-civic-marker',
      name: 'Civic Marker Heights',
      ownerDomain: 'blueprint',
      lod: 'lod0',
      centerId: 'center-civic-campus',
      districtIntent: 'civic',
      heightRangeMeters: [12, 42],
      landmarkCount: 1
    }
  ],
  protectedOpenSpaces: [
    {
      id: 'protected-open-space-central-park',
      name: 'Central Park Protected Open Space',
      ownerDomain: 'blueprint',
      lod: 'lod0',
      publicSpaceId: 'central-park',
      protectionPolicy: 'no-build-open-space',
      primaryUses: ['open-space']
    },
    {
      id: 'protected-open-space-civic-plaza',
      name: 'Civic Plaza Protected Open Space',
      ownerDomain: 'blueprint',
      lod: 'lod0',
      publicSpaceId: 'civic-plaza',
      protectionPolicy: 'no-build-open-space',
      primaryUses: ['open-space']
    },
    {
      id: 'protected-open-space-riverside-green',
      name: 'Riverside Green Protected Open Space',
      ownerDomain: 'blueprint',
      lod: 'lod0',
      publicSpaceId: 'riverside-green',
      protectionPolicy: 'no-build-open-space',
      primaryUses: ['open-space']
    }
  ],
  waterEdges: [
    {
      id: 'water-edge-south-river-north-bank',
      name: 'South River Public Edge',
      ownerDomain: 'blueprint',
      lod: 'lod0',
      waterwayId: 'south-river',
      targetDistrict: 'waterfront',
      normalizedInfluence: {
        shape: 'zone',
        minX: 0,
        maxX: 1,
        minZ: 0,
        maxZ: 0.34
      },
      continuity: 'continuous-public-edge',
      bufferByBlock: 1.25
    }
  ],
  growthBoundaries: [
    {
      id: 'growth-boundary-city-limit',
      name: 'City Limit',
      ownerDomain: 'blueprint',
      lod: 'lod0',
      boundaryKind: 'city-limit',
      normalizedZone: {
        shape: 'zone',
        minX: 0,
        maxX: 1,
        minZ: 0,
        maxZ: 1
      },
      allowedDistricts: ['downtown', 'waterfront', 'industrial', 'civic', 'residential'],
      active: true
    },
    {
      id: 'growth-boundary-core-intensification',
      name: 'Core Intensification Area',
      ownerDomain: 'blueprint',
      lod: 'lod0',
      boundaryKind: 'intensification-area',
      normalizedZone: {
        shape: 'zone',
        minX: 0.26,
        maxX: 0.68,
        minZ: 0.34,
        maxZ: 0.78
      },
      allowedDistricts: ['downtown', 'civic', 'residential'],
      active: true
    },
    {
      id: 'growth-boundary-managed-industrial-edge',
      name: 'Managed Industrial Edge',
      ownerDomain: 'blueprint',
      lod: 'lod0',
      boundaryKind: 'managed-edge',
      normalizedZone: {
        shape: 'zone',
        minX: 0.68,
        maxX: 1,
        minZ: 0.45,
        maxZ: 1
      },
      allowedDistricts: ['industrial'],
      active: true
    }
  ]
};

export function getMasterPlanDistrictForNormalizedBlock(
  masterPlan: CityMasterPlan,
  normalizedBlock: Point2D,
  fallbackDistrict: DistrictKind = 'residential'
): DistrictKind {
  const candidates = [
    ...masterPlan.centers.map((center) => ({
      district: center.districtIntent,
      priority: center.assignmentPriority,
      matches: isInsideInfluence(normalizedBlock, center.influence)
    })),
    ...masterPlan.waterEdges.map((waterEdge) => ({
      district: waterEdge.targetDistrict,
      priority: 20,
      matches: isInsideInfluence(normalizedBlock, waterEdge.normalizedInfluence)
    }))
  ]
    .filter((candidate) => candidate.matches)
    .sort((left, right) => left.priority - right.priority);

  for (const candidate of candidates) {
    if (isDistrictAllowedByActiveGrowthBoundary(masterPlan, normalizedBlock, candidate.district)) {
      return candidate.district;
    }
  }

  return fallbackDistrict;
}

export function createMasterPlanDiagnostics(masterPlan: CityMasterPlan): MasterPlanDiagnostics {
  return {
    id: masterPlan.id,
    cityFormKind: masterPlan.cityForm.formKind,
    centers: {
      total: masterPlan.centers.length,
      primary: masterPlan.centers.filter((center) => center.hierarchy === 'primary').length,
      secondary: masterPlan.centers.filter((center) => center.hierarchy === 'secondary').length,
      local: masterPlan.centers.filter((center) => center.hierarchy === 'local').length
    },
    skyline: {
      intentCount: masterPlan.skyline.length,
      landmarkCount: masterPlan.skyline.reduce((sum, skyline) => sum + skyline.landmarkCount, 0)
    },
    protectedOpenSpaces: {
      total: masterPlan.protectedOpenSpaces.length,
      noBuild: masterPlan.protectedOpenSpaces.filter((space) => space.protectionPolicy === 'no-build-open-space').length
    },
    waterEdges: {
      total: masterPlan.waterEdges.length,
      continuousPublicEdges: masterPlan.waterEdges.filter((edge) => edge.continuity === 'continuous-public-edge').length
    },
    growthBoundaries: {
      total: masterPlan.growthBoundaries.length,
      active: masterPlan.growthBoundaries.filter((boundary) => boundary.active).length
    },
    validation: validateMasterPlan(masterPlan)
  };
}

export function validateMasterPlan(masterPlan: CityMasterPlan): ValidationResult {
  const issues: ValidationIssue[] = [];
  const ids = [
    masterPlan.id,
    masterPlan.cityForm.id,
    ...masterPlan.centers.map((center) => center.id),
    ...masterPlan.skyline.map((skyline) => skyline.id),
    ...masterPlan.protectedOpenSpaces.map((space) => space.id),
    ...masterPlan.waterEdges.map((edge) => edge.id),
    ...masterPlan.growthBoundaries.map((boundary) => boundary.id)
  ];
  const seenIds = new Set<CityId>();

  for (const id of ids) {
    if (seenIds.has(id)) {
      issues.push(createMasterPlanIssue(`duplicate-master-plan-id-${toIssueIdToken(id)}`, id, `Duplicate master-plan id ${id}.`));
    }

    seenIds.add(id);
  }

  for (const center of masterPlan.centers) {
    validateInfluence(center.id, center.influence, issues);
  }

  const centerIds = new Set(masterPlan.centers.map((center) => center.id));
  for (const skyline of masterPlan.skyline) {
    if (!centerIds.has(skyline.centerId)) {
      issues.push(
        createMasterPlanIssue(
          `missing-skyline-center-${toIssueIdToken(skyline.id)}-${toIssueIdToken(skyline.centerId)}`,
          skyline.id,
          `Skyline intent ${skyline.id} references missing center ${skyline.centerId}.`
        )
      );
    }

    if (skyline.heightRangeMeters[0] <= 0 || skyline.heightRangeMeters[1] < skyline.heightRangeMeters[0]) {
      issues.push(
        createMasterPlanIssue(
          `invalid-skyline-height-range-${toIssueIdToken(skyline.id)}`,
          skyline.id,
          `Skyline intent ${skyline.id} must use a positive ascending height range.`
        )
      );
    }
  }

  for (const waterEdge of masterPlan.waterEdges) {
    validateInfluence(waterEdge.id, waterEdge.normalizedInfluence, issues);
  }

  for (const boundary of masterPlan.growthBoundaries) {
    validateInfluence(boundary.id, boundary.normalizedZone, issues);

    if (boundary.allowedDistricts.length === 0) {
      issues.push(
        createMasterPlanIssue(
          `missing-growth-boundary-districts-${toIssueIdToken(boundary.id)}`,
          boundary.id,
          `Growth boundary ${boundary.id} must allow at least one district.`
        )
      );
    }
  }

  return {
    passed: issues.every((issue) => issue.severity !== 'error'),
    issues
  };
}

function isDistrictAllowedByActiveGrowthBoundary(
  masterPlan: CityMasterPlan,
  normalizedBlock: Point2D,
  district: DistrictKind
): boolean {
  const activeBoundaries = masterPlan.growthBoundaries.filter(
    (boundary) => boundary.active && isInsideInfluence(normalizedBlock, boundary.normalizedZone)
  );

  if (activeBoundaries.length === 0) {
    return true;
  }

  return activeBoundaries.some((boundary) => boundary.allowedDistricts.includes(district));
}

function isInsideInfluence(point: Point2D, influence: MasterPlanInfluence): boolean {
  if (influence.shape === 'radial') {
    return Math.hypot(point.x - influence.center.x, point.z - influence.center.z) < influence.radius;
  }

  return point.x >= influence.minX && point.x <= influence.maxX && point.z >= influence.minZ && point.z <= influence.maxZ;
}

function validateInfluence(objectId: CityId, influence: MasterPlanInfluence, issues: ValidationIssue[]): void {
  if (influence.shape === 'radial') {
    if (!isNormalizedValue(influence.center.x) || !isNormalizedValue(influence.center.z) || influence.radius <= 0) {
      issues.push(
        createMasterPlanIssue(
          `invalid-master-plan-influence-${toIssueIdToken(objectId)}`,
          objectId,
          `Master-plan influence for ${objectId} must use normalized coordinates and positive radius.`
        )
      );
    }
    return;
  }

  if (
    !isNormalizedValue(influence.minX) ||
    !isNormalizedValue(influence.maxX) ||
    !isNormalizedValue(influence.minZ) ||
    !isNormalizedValue(influence.maxZ) ||
    influence.minX > influence.maxX ||
    influence.minZ > influence.maxZ
  ) {
    issues.push(
      createMasterPlanIssue(
        `invalid-master-plan-influence-${toIssueIdToken(objectId)}`,
        objectId,
        `Master-plan zone for ${objectId} must use ascending normalized bounds.`
      )
    );
  }
}

function isNormalizedValue(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

function createMasterPlanIssue(id: CityId, objectId: CityId, message: string): ValidationIssue {
  return {
    id,
    severity: 'error',
    category: 'config',
    objectId,
    message
  };
}

function toIssueIdToken(value: string): string {
  return value.replace(/[^a-zA-Z0-9:-]+/g, '-').replace(/^-+|-+$/g, '') || 'empty';
}
