import type { CityPlanningLayer } from '../cityPlan';
import type {
  CityId,
  CityObjectBase,
  CityObjectIndex,
  CityObjectKind,
  SourceType,
  ValidationIssue,
  ValidationResult
} from './cityContracts';

export type CityObjectGroupKind =
  | 'authored-set'
  | 'corridor'
  | 'district'
  | 'owner-domain'
  | 'render-layer'
  | 'scenario-layer'
  | 'validation-selection'
  | 'vertical-slice';

export type CityObjectGroupSource = 'domain-data' | 'metadata' | 'rendering-handoff' | 'simulation' | 'validation';

export interface CityObjectGroupDefinition {
  readonly id: CityId;
  readonly kind: CityObjectGroupKind;
  readonly name: string;
  readonly ownerDomain: CityPlanningLayer;
  readonly source: CityObjectGroupSource;
  readonly objectIds: readonly CityId[];
  readonly parentGroupId?: CityId;
  readonly metadata?: Readonly<Record<string, string | number | boolean>>;
}

export interface CityObjectGroup extends CityObjectGroupDefinition {
  readonly objectCount: number;
}

export interface MissingCityObjectGroupReference {
  readonly groupId: CityId;
  readonly objectId: CityId;
}

export interface CityObjectGroupIndex<ObjectType extends CityObjectBase = CityObjectBase> {
  readonly objectIndex: CityObjectIndex<ObjectType>;
  readonly groups: readonly CityObjectGroup[];
  readonly groupIds: readonly CityId[];
  readonly groupsById: Readonly<Record<CityId, CityObjectGroup>>;
  readonly groupIdsByKind: Readonly<Partial<Record<CityObjectGroupKind, readonly CityId[]>>>;
  readonly groupIdsByObjectId: Readonly<Record<CityId, readonly CityId[]>>;
  readonly objectIdsByGroupId: Readonly<Record<CityId, readonly CityId[]>>;
  readonly duplicateGroupIds: readonly CityId[];
  readonly missingObjectReferences: readonly MissingCityObjectGroupReference[];
}

export interface CityObjectGroupQuery {
  readonly groupId?: CityId;
  readonly groupKind?: CityObjectGroupKind;
  readonly ownerDomain?: CityPlanningLayer;
  readonly parentGroupId?: CityId;
  readonly metadata?: Readonly<Record<string, string | number | boolean>>;
}

export interface CityObjectGroupDiagnostics {
  readonly groupCount: number;
  readonly emptyGroupCount: number;
  readonly duplicateGroupIds: readonly CityId[];
  readonly missingObjectReferences: number;
  readonly countsByKind: Readonly<Record<CityObjectGroupKind, number>>;
  readonly groups: readonly {
    readonly id: CityId;
    readonly kind: CityObjectGroupKind;
    readonly name: string;
    readonly ownerDomain: CityPlanningLayer;
    readonly objectCount: number;
    readonly parentGroupId?: CityId;
  }[];
  readonly validation: ValidationResult;
}

export const CITY_OBJECT_GROUP_KINDS = [
  'authored-set',
  'corridor',
  'district',
  'owner-domain',
  'render-layer',
  'scenario-layer',
  'validation-selection',
  'vertical-slice'
] as const satisfies readonly CityObjectGroupKind[];

export function createCityObjectGroupIndex<ObjectType extends CityObjectBase>(
  objectIndex: CityObjectIndex<ObjectType>,
  groupDefinitions: readonly CityObjectGroupDefinition[]
): CityObjectGroupIndex<ObjectType> {
  const groups: CityObjectGroup[] = [];
  const groupIds: CityId[] = [];
  const groupsById: Record<CityId, CityObjectGroup> = {};
  const groupIdsByKind: Partial<Record<CityObjectGroupKind, CityId[]>> = {};
  const groupIdsByObjectId: Record<CityId, CityId[]> = {};
  const objectIdsByGroupId: Record<CityId, CityId[]> = {};
  const duplicateGroupIds = new Set<CityId>();
  const missingObjectReferences: MissingCityObjectGroupReference[] = [];

  for (const definition of groupDefinitions) {
    const objectIds = normalizeGroupObjectIds(definition.objectIds);
    const resolvedObjectIds: CityId[] = [];

    for (const objectId of objectIds) {
      if (!objectIndex.objectsById[objectId]) {
        missingObjectReferences.push({ groupId: definition.id, objectId });
        continue;
      }

      resolvedObjectIds.push(objectId);
      groupIdsByObjectId[objectId] ??= [];
      groupIdsByObjectId[objectId].push(definition.id);
    }

    const group: CityObjectGroup = {
      ...definition,
      objectIds: resolvedObjectIds,
      objectCount: resolvedObjectIds.length
    };

    groupIds.push(group.id);
    groups.push(group);
    objectIdsByGroupId[group.id] = resolvedObjectIds;
    groupIdsByKind[group.kind] ??= [];
    groupIdsByKind[group.kind]?.push(group.id);

    if (hasOwn(groupsById, group.id)) {
      duplicateGroupIds.add(group.id);
    } else {
      groupsById[group.id] = group;
    }
  }

  return {
    objectIndex,
    groups,
    groupIds,
    groupsById,
    groupIdsByKind,
    groupIdsByObjectId,
    objectIdsByGroupId,
    duplicateGroupIds: [...duplicateGroupIds].sort(),
    missingObjectReferences: missingObjectReferences.sort(compareMissingReferences)
  };
}

export function resolveCityObjectGroup<ObjectType extends CityObjectBase>(
  groupIndex: CityObjectGroupIndex<ObjectType>,
  groupId: CityId
): CityObjectGroup | undefined {
  return groupIndex.groupsById[groupId];
}

export function queryCityObjectGroups<ObjectType extends CityObjectBase>(
  groupIndex: CityObjectGroupIndex<ObjectType>,
  query: CityObjectGroupQuery
): CityObjectGroup[] {
  return groupIndex.groups.filter((group) => {
    if (query.groupId && group.id !== query.groupId) {
      return false;
    }

    if (query.groupKind && group.kind !== query.groupKind) {
      return false;
    }

    if (query.ownerDomain && group.ownerDomain !== query.ownerDomain) {
      return false;
    }

    if (query.parentGroupId && group.parentGroupId !== query.parentGroupId) {
      return false;
    }

    if (query.metadata && !matchesMetadata(group.metadata, query.metadata)) {
      return false;
    }

    return true;
  });
}

export function getCityObjectsForGroup<ObjectType extends CityObjectBase>(
  groupIndex: CityObjectGroupIndex<ObjectType>,
  groupId: CityId,
  objectKind?: CityObjectKind
): ObjectType[] {
  const objectIds = groupIndex.objectIdsByGroupId[groupId] ?? [];
  const objects = objectIds.flatMap((objectId) => {
    const object = groupIndex.objectIndex.objectsById[objectId];
    return object ? [object] : [];
  });

  if (!objectKind) {
    return objects;
  }

  return objects.filter((object) => object.kind === objectKind);
}

export function getCityObjectsByOwnerDomain<ObjectType extends CityObjectBase>(
  groupIndex: CityObjectGroupIndex<ObjectType>,
  ownerDomain: CityPlanningLayer
): ObjectType[] {
  return getCityObjectsForGroup(groupIndex, createOwnerDomainGroupId(ownerDomain));
}

export function getCityObjectsByVerticalSlice<ObjectType extends CityObjectBase>(
  groupIndex: CityObjectGroupIndex<ObjectType>,
  sliceId: CityId
): ObjectType[] {
  return getCityObjectsForGroup(groupIndex, createVerticalSliceGroupId(sliceId));
}

export function getCityObjectsByScenarioLayer<ObjectType extends CityObjectBase>(
  groupIndex: CityObjectGroupIndex<ObjectType>,
  scenarioLayerId: CityId
): ObjectType[] {
  return getCityObjectsForGroup(groupIndex, createScenarioLayerGroupId(scenarioLayerId));
}

export function getCityObjectsByRenderLayer<ObjectType extends CityObjectBase>(
  groupIndex: CityObjectGroupIndex<ObjectType>,
  renderLayerId: string
): ObjectType[] {
  return getCityObjectsForGroup(groupIndex, createRenderLayerGroupId(renderLayerId));
}

export function createCityObjectGroupDiagnostics<ObjectType extends CityObjectBase>(
  groupIndex: CityObjectGroupIndex<ObjectType>
): CityObjectGroupDiagnostics {
  const countsByKind = Object.fromEntries(CITY_OBJECT_GROUP_KINDS.map((kind) => [kind, 0])) as Record<
    CityObjectGroupKind,
    number
  >;

  for (const group of groupIndex.groups) {
    countsByKind[group.kind] += 1;
  }

  return {
    groupCount: groupIndex.groupIds.length,
    emptyGroupCount: groupIndex.groups.filter((group) => group.objectCount === 0).length,
    duplicateGroupIds: groupIndex.duplicateGroupIds,
    missingObjectReferences: groupIndex.missingObjectReferences.length,
    countsByKind,
    groups: groupIndex.groups.map((group) => ({
      id: group.id,
      kind: group.kind,
      name: group.name,
      ownerDomain: group.ownerDomain,
      objectCount: group.objectCount,
      parentGroupId: group.parentGroupId
    })),
    validation: validateCityObjectGroupIndex(groupIndex)
  };
}

export function validateCityObjectGroupIndex<ObjectType extends CityObjectBase>(
  groupIndex: CityObjectGroupIndex<ObjectType>
): ValidationResult {
  const issues: ValidationIssue[] = [];

  for (const groupId of groupIndex.duplicateGroupIds) {
    issues.push({
      id: `duplicate-city-object-group-${toIssueIdToken(groupId)}`,
      severity: 'error',
      category: 'identifier',
      objectId: groupId,
      message: `City object group ${groupId} is defined more than once.`
    });
  }

  for (const reference of groupIndex.missingObjectReferences) {
    issues.push({
      id: `missing-city-object-group-member-${toIssueIdToken(reference.groupId)}-${toIssueIdToken(reference.objectId)}`,
      severity: 'error',
      category: 'graph',
      objectId: reference.groupId,
      message: `City object group ${reference.groupId} references missing object ${reference.objectId}.`
    });
  }

  for (const group of groupIndex.groups) {
    if (group.parentGroupId && !groupIndex.groupsById[group.parentGroupId]) {
      issues.push({
        id: `missing-city-object-parent-group-${toIssueIdToken(group.id)}-${toIssueIdToken(group.parentGroupId)}`,
        severity: 'error',
        category: 'graph',
        objectId: group.id,
        message: `City object group ${group.id} references missing parent group ${group.parentGroupId}.`
      });
    }
  }

  return {
    passed: issues.every((issue) => issue.severity !== 'error'),
    issues
  };
}

export function createOwnerDomainGroupId(ownerDomain: CityPlanningLayer): CityId {
  return `group:owner-domain:${ownerDomain}`;
}

export function createDistrictGroupId(districtId: CityId): CityId {
  return `group:district:${districtId}`;
}

export function createCorridorGroupId(corridorId: CityId): CityId {
  return `group:corridor:${corridorId}`;
}

export function createVerticalSliceGroupId(sliceId: CityId): CityId {
  return `group:vertical-slice:${sliceId}`;
}

export function createScenarioLayerGroupId(scenarioLayerId: CityId): CityId {
  return `group:scenario-layer:${scenarioLayerId}`;
}

export function createRenderLayerGroupId(renderLayerId: string): CityId {
  return `group:render-layer:${renderLayerId}`;
}

export function createValidationSelectionGroupId(selectionId: CityId): CityId {
  return `group:validation-selection:${selectionId}`;
}

export function createAuthoredSetGroupId(sourceType: SourceType): CityId {
  return `group:authored-set:${sourceType}`;
}

function normalizeGroupObjectIds(objectIds: readonly CityId[]): CityId[] {
  const seen = new Set<CityId>();
  const normalized: CityId[] = [];

  for (const objectId of objectIds) {
    if (seen.has(objectId)) {
      continue;
    }

    seen.add(objectId);
    normalized.push(objectId);
  }

  return normalized;
}

function matchesMetadata(
  groupMetadata: Readonly<Record<string, string | number | boolean>> | undefined,
  queryMetadata: Readonly<Record<string, string | number | boolean>>
): boolean {
  if (!groupMetadata) {
    return false;
  }

  return Object.entries(queryMetadata).every(([key, value]) => groupMetadata[key] === value);
}

function compareMissingReferences(
  left: MissingCityObjectGroupReference,
  right: MissingCityObjectGroupReference
): number {
  return left.groupId.localeCompare(right.groupId) || left.objectId.localeCompare(right.objectId);
}

function hasOwn<T>(record: Readonly<Record<string, T>>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function toIssueIdToken(value: string): string {
  return value.replace(/[^a-zA-Z0-9:-]+/g, '-').replace(/^-+|-+$/g, '') || 'empty';
}
