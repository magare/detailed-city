import type {
  AssetConditionRating,
  AssetInventoryRecordContract,
  CityId,
  MaintenanceOperationContract,
  MaintenanceOperationKind,
  MaintenanceOperationStatus,
  MaintenancePriority
} from '../../city/data-contracts/cityContracts';
import type { NavigationGraphEdge, NavigationRoute, RoadSegment } from '../../types/city';

export interface MaintenanceOperationGeneratorInput {
  readonly assetInventoryRecords: readonly AssetInventoryRecordContract[];
  readonly navigationRoutes: readonly NavigationRoute[];
  readonly navigationGraphEdges: readonly NavigationGraphEdge[];
  readonly roads: readonly RoadSegment[];
}

const CURRENT_YEAR = 2026;
const INSPECTION_LIMIT = 24;
const STREET_WORK_LIMIT = 12;

export class MaintenanceOperationGenerator {
  create(input: MaintenanceOperationGeneratorInput): MaintenanceOperationContract[] {
    const serviceRoute = input.navigationRoutes.find((route) => route.mode === 'service' && route.requestClass === 'operation')
      ?? input.navigationRoutes.find((route) => route.requestClass === 'operation');
    const roadIds = new Set(input.roads.map((road) => road.id));
    const closureEdgesByRoadId = collectClosureEdgesByRoadId(input.navigationGraphEdges);
    const maintenanceWatchRecords = input.assetInventoryRecords
      .filter((record) => record.operationalStatus === 'maintenance-watch')
      .sort(compareInventoryRecords);
    const inspectionRecords = input.assetInventoryRecords
      .filter((record) => record.criticality === 'high' && record.operationalStatus === 'active')
      .sort(compareInventoryRecords)
      .slice(0, INSPECTION_LIMIT);
    const replacementRecords = input.assetInventoryRecords
      .filter((record) => record.condition.rating === 'poor' || record.lifecycle.replacementYear <= CURRENT_YEAR + 5)
      .sort(compareInventoryRecords);
    const streetWorkRecords = maintenanceWatchRecords
      .filter((record) => record.inspectionAccessObjectIds.some((id) => roadIds.has(id)))
      .slice(0, STREET_WORK_LIMIT);

    return [
      ...inspectionRecords.map((record, index) =>
        createOperation({
          record,
          operationKind: 'inspection',
          status: 'scheduled',
          priority: 'normal',
          sequence: index,
          serviceRoute,
          closureEdgesByRoadId,
          createsClosure: false
        })
      ),
      ...maintenanceWatchRecords.map((record, index) =>
        createOperation({
          record,
          operationKind: 'repair',
          status: record.criticality === 'high' ? 'in-progress' : 'queued',
          priority: record.criticality === 'high' ? 'urgent' : 'normal',
          sequence: index,
          serviceRoute,
          closureEdgesByRoadId,
          createsClosure: false
        })
      ),
      ...replacementRecords.map((record, index) =>
        createOperation({
          record,
          operationKind: 'replacement',
          status: 'scheduled',
          priority: record.criticality === 'high' ? 'urgent' : 'normal',
          sequence: index,
          serviceRoute,
          closureEdgesByRoadId,
          createsClosure: false
        })
      ),
      ...streetWorkRecords.map((record, index) =>
        createOperation({
          record,
          operationKind: index % 3 === 0 ? 'temporary-closure' : 'street-work',
          status: index % 2 === 0 ? 'scheduled' : 'queued',
          priority: record.criticality === 'high' ? 'urgent' : 'normal',
          sequence: index,
          serviceRoute,
          closureEdgesByRoadId,
          createsClosure: true
        })
      )
    ].sort((first, second) => first.id.localeCompare(second.id));
  }
}

interface CreateOperationInput {
  readonly record: AssetInventoryRecordContract;
  readonly operationKind: MaintenanceOperationKind;
  readonly status: MaintenanceOperationStatus;
  readonly priority: MaintenancePriority;
  readonly sequence: number;
  readonly serviceRoute: NavigationRoute | undefined;
  readonly closureEdgesByRoadId: ReadonlyMap<CityId, readonly CityId[]>;
  readonly createsClosure: boolean;
}

function createOperation(input: CreateOperationInput): MaintenanceOperationContract {
  const roadIds = input.createsClosure ? getClosureRoadIds(input.record) : [];
  const closureNavigationEdgeIds = roadIds.flatMap((roadId) => input.closureEdgesByRoadId.get(roadId) ?? []).slice(0, 6);
  const fromScore = input.record.condition.score;
  const projectedScore = getProjectedConditionScore(input.operationKind, fromScore);
  const startDay = 14 + (stableHash(`${input.operationKind}:${input.record.id}`) % 180);

  return {
    id: `maintenance-operation-${input.operationKind}-${input.record.id}`,
    kind: 'maintenance-operation',
    ownerDomain: 'operations',
    parentId: input.record.id,
    lod: 'lod1',
    tags: {
      operationKind: input.operationKind,
      status: input.status,
      priority: input.priority,
      targetKind: input.record.assetObjectKind
    },
    assetInventoryRecordId: input.record.id,
    assetObjectId: input.record.assetObjectId,
    assetObjectKind: input.record.assetObjectKind,
    operationKind: input.operationKind,
    status: input.status,
    priority: input.priority,
    responsibleDepartmentId: input.record.responsibleDepartmentId,
    scheduledWindow: {
      startDay,
      endDay: startDay + getDurationDays(input.operationKind),
      recurrenceDays: input.operationKind === 'inspection' ? 180 : undefined
    },
    repairQueue: {
      queueId: `maintenance-queue-${input.record.inventoryScope}-${input.record.responsibleDepartmentId}`,
      sequence: input.sequence + 1,
      estimatedCrewHours: getCrewHours(input.operationKind, input.record)
    },
    conditionUpdate: {
      fromScore,
      projectedScore,
      projectedRating: getConditionRating(projectedScore)
    },
    replacement: {
      dueYear: input.operationKind === 'replacement' ? Math.min(input.record.lifecycle.replacementYear, CURRENT_YEAR + 2) : input.record.lifecycle.replacementYear,
      estimatedCostUsd: input.operationKind === 'replacement' ? input.record.replacementCost.amountUsd : Math.round(input.record.replacementCost.amountUsd * 0.18)
    },
    navigationRouteId: input.serviceRoute?.id ?? 'missing-service-navigation-route',
    serviceAccessObjectIds: input.record.inspectionAccessObjectIds,
    closureRoadIds: roadIds,
    closureNavigationEdgeIds,
    temporaryRestrictionIds: input.createsClosure ? roadIds.map((roadId) => `temporary-restriction-${roadId}-${input.record.id}`) : [],
    createsTemporaryClosure: input.createsClosure
  };
}

function collectClosureEdgesByRoadId(edges: readonly NavigationGraphEdge[]): ReadonlyMap<CityId, readonly CityId[]> {
  const result = new Map<CityId, CityId[]>();
  for (const edge of edges) {
    if (edge.mode !== 'vehicle' && edge.mode !== 'service' && edge.mode !== 'emergency') {
      continue;
    }
    for (const roadId of edge.roadIds) {
      result.set(roadId, [...(result.get(roadId) ?? []), edge.id]);
    }
  }
  return result;
}

function getClosureRoadIds(record: AssetInventoryRecordContract): readonly CityId[] {
  return record.inspectionAccessObjectIds.filter((id) => /^road-[hv]-\d+$/.test(id)).slice(0, 2);
}

function getProjectedConditionScore(kind: MaintenanceOperationKind, fromScore: number): number {
  if (kind === 'replacement') {
    return 96;
  }
  if (kind === 'repair') {
    return Math.min(94, fromScore + 18);
  }
  if (kind === 'street-work' || kind === 'temporary-closure') {
    return Math.min(90, fromScore + 12);
  }
  return Math.min(100, fromScore + 4);
}

function getDurationDays(kind: MaintenanceOperationKind): number {
  switch (kind) {
    case 'inspection':
      return 1;
    case 'repair':
      return 3;
    case 'replacement':
      return 7;
    case 'street-work':
      return 5;
    case 'temporary-closure':
      return 2;
  }
}

function getCrewHours(kind: MaintenanceOperationKind, record: AssetInventoryRecordContract): number {
  const criticalityFactor = record.criticality === 'high' ? 1.4 : record.criticality === 'medium' ? 1.15 : 1;
  const baseHours = kind === 'inspection' ? 2 : kind === 'replacement' ? 18 : kind === 'repair' ? 6 : 10;
  return Math.round(baseHours * criticalityFactor);
}

function getConditionRating(score: number): AssetConditionRating {
  if (score >= 90) {
    return 'excellent';
  }
  if (score >= 80) {
    return 'good';
  }
  if (score >= 70) {
    return 'fair';
  }
  return 'poor';
}

function compareInventoryRecords(first: AssetInventoryRecordContract, second: AssetInventoryRecordContract): number {
  if (first.criticality !== second.criticality) {
    return criticalityRank(second.criticality) - criticalityRank(first.criticality);
  }
  if (first.condition.score !== second.condition.score) {
    return first.condition.score - second.condition.score;
  }
  return first.id.localeCompare(second.id);
}

function criticalityRank(criticality: AssetInventoryRecordContract['criticality']): number {
  return criticality === 'high' ? 3 : criticality === 'medium' ? 2 : 1;
}

function stableHash(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 1000003;
  }
  return hash;
}
