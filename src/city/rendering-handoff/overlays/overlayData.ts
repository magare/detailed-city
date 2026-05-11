import type {
  CityId,
  CityObjectBase,
  CityObjectIndex,
  CityObjectKind,
  Point2D,
  Polygon2D,
  Polyline2D,
  ValidationIssue,
  ValidationSeverity
} from '../../data-contracts/cityContracts';
import type { CityPlanningLayer } from '../../cityPlan';
import type { GeneratedCity, GeneratedRuntimeCityObject } from '../../../types/city';

export type CityOverlayId =
  | 'administrative-boundaries'
  | 'districts'
  | 'city-metrics'
  | 'constraints'
  | 'resilience-goals'
  | 'parcels'
  | 'roads'
  | 'validation-issues'
  | 'owner-domains';

export type CityOverlayGeometry =
  | { readonly type: 'none' }
  | { readonly type: 'point'; readonly point: Point2D }
  | { readonly type: 'polyline'; readonly points: Polyline2D }
  | { readonly type: 'polygon'; readonly points: Polygon2D };

export interface CityOverlayFeature {
  readonly id: string;
  readonly overlayId: CityOverlayId;
  readonly objectId?: CityId;
  readonly objectKind?: CityObjectKind;
  readonly ownerDomain?: CityPlanningLayer;
  readonly label: string;
  readonly geometry: CityOverlayGeometry;
  readonly severity?: ValidationSeverity;
  readonly category?: ValidationIssue['category'];
  readonly focus?: {
    readonly objectId?: CityId;
    readonly point?: Point2D;
    readonly boundary?: Polygon2D;
    readonly suggestedFix?: string;
  };
  readonly metadata?: Readonly<Record<string, string | number | boolean>>;
}

export interface CityOverlayDataset {
  readonly id: CityOverlayId;
  readonly name: string;
  readonly ownerDomain: 'rendering-handoff';
  readonly source: 'domain-data' | 'validation';
  readonly featureCount: number;
  readonly features: readonly CityOverlayFeature[];
}

export function createCityOverlayDatasets(
  city: GeneratedCity,
  runtimeObjectIndex: CityObjectIndex<GeneratedRuntimeCityObject>
): readonly CityOverlayDataset[] {
  return [
    createDataset('administrative-boundaries', 'Administrative Boundaries', 'domain-data', createAdministrativeBoundaryFeatures(city)),
    createDataset('districts', 'Districts', 'domain-data', createDistrictFeatures(city)),
    createDataset('city-metrics', 'City Metrics', 'domain-data', createCityMetricFeatures(city)),
    createDataset('constraints', 'Constraints', 'domain-data', createConstraintFeatures(city)),
    createDataset('resilience-goals', 'Resilience Goals', 'domain-data', createResilienceGoalFeatures(city)),
    createDataset('parcels', 'Parcels', 'domain-data', createParcelFeatures(city)),
    createDataset('roads', 'Roads', 'domain-data', createRoadFeatures(city)),
    createDataset('validation-issues', 'Validation Issues', 'validation', createValidationIssueFeatures(city, runtimeObjectIndex)),
    createDataset('owner-domains', 'Owner Domains', 'domain-data', createOwnerDomainFeatures(runtimeObjectIndex))
  ];
}

function createDataset(
  id: CityOverlayId,
  name: string,
  source: CityOverlayDataset['source'],
  features: readonly CityOverlayFeature[]
): CityOverlayDataset {
  return {
    id,
    name,
    ownerDomain: 'rendering-handoff',
    source,
    featureCount: features.length,
    features
  };
}

function createAdministrativeBoundaryFeatures(city: GeneratedCity): CityOverlayFeature[] {
  return city.administrativeBoundaries.map((boundary) => ({
    id: `overlay:administrative-boundaries:${boundary.id}`,
    overlayId: 'administrative-boundaries',
    objectId: boundary.id,
    objectKind: boundary.kind,
    ownerDomain: boundary.ownerDomain,
    label: boundary.name ?? boundary.id,
    geometry: { type: 'polygon', points: boundary.boundary },
    metadata: {
      boundaryKind: boundary.boundaryKind,
      authority: boundary.authority,
      jurisdictionLevel: boundary.jurisdictionLevel,
      ownershipClass: boundary.ownershipClass,
      blocks: boundary.blockIds.length,
      parcels: boundary.parcelIds.length,
      services: boundary.serviceTypes.join(',')
    }
  }));
}

function createDistrictFeatures(city: GeneratedCity): CityOverlayFeature[] {
  return city.districts.map((district) => ({
    id: `overlay:districts:${district.id}`,
    overlayId: 'districts',
    objectId: district.id,
    objectKind: district.kind,
    ownerDomain: district.ownerDomain,
    label: district.name ?? district.id,
    geometry: { type: 'polygon', points: district.boundary },
    metadata: {
      density: district.density,
      primaryUses: district.primaryUses.join(',')
    }
  }));
}

function createCityMetricFeatures(city: GeneratedCity): CityOverlayFeature[] {
  return city.cityMetrics.map((metric) => ({
    id: `overlay:city-metrics:${metric.id}`,
    overlayId: 'city-metrics',
    objectId: metric.id,
    objectKind: metric.kind,
    ownerDomain: metric.ownerDomain,
    label: metric.name ?? metric.id,
    geometry: { type: 'point', point: metric.focusPoint },
    metadata: {
      metricKind: metric.metricKind,
      value: metric.value,
      unit: metric.unit,
      status: metric.status,
      inputs: metric.computedFromObjectIds.length
    }
  }));
}

function createConstraintFeatures(city: GeneratedCity): CityOverlayFeature[] {
  return city.constraints.map((constraint) => ({
    id: `overlay:constraints:${constraint.id}`,
    overlayId: 'constraints',
    objectId: constraint.id,
    objectKind: constraint.kind,
    ownerDomain: constraint.ownerDomain,
    label: constraint.name ?? constraint.id,
    geometry: { type: 'polygon', points: constraint.boundary },
    metadata: {
      constraintKind: constraint.constraintKind,
      priority: constraint.priority,
      affectedKinds: constraint.affectedObjectKinds.join(','),
      prohibitedKinds: constraint.prohibitedObjectKinds.join(','),
      requiredReferences: constraint.requiredObjectIds.length,
      relatedReferences: constraint.relatedObjectIds.length,
      ...(constraint.minSetbackMeters !== undefined ? { minSetbackMeters: constraint.minSetbackMeters } : {}),
      ...(constraint.minClearanceMeters !== undefined ? { minClearanceMeters: constraint.minClearanceMeters } : {}),
      ...(constraint.maxHeightMeters !== undefined ? { maxHeightMeters: constraint.maxHeightMeters } : {})
    }
  }));
}

function createResilienceGoalFeatures(city: GeneratedCity): CityOverlayFeature[] {
  return city.resilienceGoals.map((goal) => ({
    id: `overlay:resilience-goals:${goal.id}`,
    overlayId: 'resilience-goals',
    objectId: goal.id,
    objectKind: goal.kind,
    ownerDomain: goal.ownerDomain,
    label: goal.name ?? goal.id,
    geometry: goal.focusBoundary
      ? { type: 'polygon', points: goal.focusBoundary }
      : { type: 'point', point: goal.focusPoint },
    metadata: {
      goalKind: goal.goalKind,
      priority: goal.priority,
      targetMetric: goal.target.metric,
      targetMinimumCount: goal.target.minimumCount,
      targetDistricts: goal.targetDistrictIds.length,
      routeRoads: goal.routeRoadIds.length,
      shelterCandidates: goal.shelterObjectIds.length,
      continuityTargets: goal.continuityTargets.length,
      recoveryPriority: goal.recoveryPriority
    }
  }));
}

function createParcelFeatures(city: GeneratedCity): CityOverlayFeature[] {
  return city.parcels.map((parcel) => ({
    id: `overlay:parcels:${parcel.id}`,
    overlayId: 'parcels',
    objectId: parcel.id,
    objectKind: parcel.kind,
    ownerDomain: parcel.ownerDomain,
    label: parcel.id,
    geometry: { type: 'polygon', points: parcel.boundary },
    metadata: {
      district: parcel.district,
      blockId: parcel.blockId,
      blockBuildableEnvelopeId: parcel.blockBuildableEnvelopeId,
      frontageRoads: parcel.frontageRoadIds.length
    }
  }));
}

function createRoadFeatures(city: GeneratedCity): CityOverlayFeature[] {
  return city.roads.map((road) => ({
    id: `overlay:roads:${road.id}`,
    overlayId: 'roads',
    objectId: road.id,
    objectKind: road.kind,
    ownerDomain: road.ownerDomain,
    label: road.id,
    geometry: { type: 'polyline', points: road.centerline },
    metadata: {
      hierarchy: road.hierarchy,
      profile: road.streetProfileId,
      lanes: road.laneCount
    }
  }));
}

function createValidationIssueFeatures(
  city: GeneratedCity,
  runtimeObjectIndex: CityObjectIndex<GeneratedRuntimeCityObject>
): CityOverlayFeature[] {
  return city.validation.issues.map((issue) => {
    const object = issue.objectId ? runtimeObjectIndex.objectsById[issue.objectId] : undefined;
    const focus = createValidationIssueFocus(issue, object);

    return {
      id: `overlay:validation-issues:${issue.id}`,
      overlayId: 'validation-issues',
      objectId: issue.objectId,
      objectKind: object?.kind,
      ownerDomain: object?.ownerDomain,
      label: issue.message,
      geometry: getValidationIssueGeometry(issue, object),
      severity: issue.severity,
      category: issue.category,
      focus,
      metadata: {
        validationIssueId: issue.id,
        ...(issue.suggestedFix ? { suggestedFix: issue.suggestedFix } : {}),
        ...(focus.objectId ? { focusObjectId: focus.objectId } : {})
      }
    };
  });
}

function getValidationIssueGeometry(
  issue: ValidationIssue,
  object: GeneratedRuntimeCityObject | undefined
): CityOverlayGeometry {
  if (issue.affectedBoundary) {
    return { type: 'polygon', points: issue.affectedBoundary };
  }

  if (issue.affectedPoint) {
    return { type: 'point', point: issue.affectedPoint };
  }

  return object ? getObjectGeometry(object) : { type: 'none' };
}

function createValidationIssueFocus(
  issue: ValidationIssue,
  object: GeneratedRuntimeCityObject | undefined
): NonNullable<CityOverlayFeature['focus']> {
  const objectGeometry = object ? getObjectGeometry(object) : undefined;

  return {
    objectId: issue.objectId,
    point: issue.affectedPoint ?? getGeometryPoint(objectGeometry),
    boundary: issue.affectedBoundary ?? (objectGeometry?.type === 'polygon' ? objectGeometry.points : undefined),
    suggestedFix: issue.suggestedFix
  };
}

function createOwnerDomainFeatures(
  runtimeObjectIndex: CityObjectIndex<GeneratedRuntimeCityObject>
): CityOverlayFeature[] {
  return runtimeObjectIndex.objects.map((object) => ({
    id: `overlay:owner-domains:${object.id}`,
    overlayId: 'owner-domains',
    objectId: object.id,
    objectKind: object.kind,
    ownerDomain: object.ownerDomain,
    label: object.name ?? object.id,
    geometry: getObjectGeometry(object),
    metadata: {
      lod: object.lod
    }
  }));
}

function getObjectGeometry(object: CityObjectBase): CityOverlayGeometry {
  if ('focusBoundary' in object && isPointArray(object.focusBoundary)) {
    return { type: 'polygon', points: object.focusBoundary };
  }

  if ('focusPoint' in object && isPoint(object.focusPoint)) {
    return { type: 'point', point: object.focusPoint };
  }

  if ('boundary' in object && isPointArray(object.boundary)) {
    return { type: 'polygon', points: object.boundary };
  }

  if ('centerline' in object && isPointArray(object.centerline)) {
    return { type: 'polyline', points: object.centerline };
  }

  if ('center' in object && isPoint(object.center)) {
    return { type: 'point', point: object.center };
  }

  if ('position' in object && isPoint(object.position)) {
    return { type: 'point', point: object.position };
  }

  return { type: 'none' };
}

function getGeometryPoint(geometry: CityOverlayGeometry | undefined): Point2D | undefined {
  if (!geometry) {
    return undefined;
  }

  if (geometry.type === 'point') {
    return geometry.point;
  }

  if (geometry.type === 'polygon' || geometry.type === 'polyline') {
    return geometry.points[0];
  }

  return undefined;
}

function isPoint(value: unknown): value is Point2D {
  return (
    typeof value === 'object' &&
    value !== null &&
    'x' in value &&
    'z' in value &&
    typeof value.x === 'number' &&
    typeof value.z === 'number'
  );
}

function isPointArray(value: unknown): value is readonly Point2D[] {
  return Array.isArray(value) && value.every(isPoint);
}
