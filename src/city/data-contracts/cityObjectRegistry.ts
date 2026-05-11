import type {
  CityId,
  CityObjectBase,
  CityObjectIndex,
  CityObjectKind,
  ValidationIssue
} from './cityContracts';

export type CityObjectParentRequirement = 'none' | 'optional' | 'required';

export interface CityObjectParentRule {
  readonly requirement: CityObjectParentRequirement;
  readonly allowedKinds?: readonly CityObjectKind[];
}

export interface CityObjectKindRegistryEntry {
  readonly kind: CityObjectKind;
  readonly idPatterns: readonly RegExp[];
  readonly idPatternDescriptions: readonly string[];
  readonly parent: CityObjectParentRule;
}

export interface CityObjectRegistryDiagnostics {
  readonly registeredKinds: number;
  readonly kinds: readonly {
    readonly kind: CityObjectKind;
    readonly parentRequirement: CityObjectParentRequirement;
    readonly allowedParentKinds: readonly CityObjectKind[];
    readonly idPatternDescriptions: readonly string[];
  }[];
}

export interface CityObjectRegistryValidationContext {
  readonly getParentKind?: (id: CityId) => CityObjectKind | undefined;
}

const NAMED_ID = String.raw`[a-z][a-z0-9]*(?:-[a-z0-9]+)*`;
const ROAD_ID = String.raw`road-[vh]-\d+`;
const INTERSECTION_ID = String.raw`intersection-v\d+-h\d+`;
const SIDEWALK_SIDE = String.raw`(?:left|right)`;
const SIDEWALK_ID = String.raw`${ROAD_ID}-sidewalk-${SIDEWALK_SIDE}`;
const CROSSING_ID = String.raw`crossing-${INTERSECTION_ID}-${ROAD_ID}`;
const BUILDING_ID = String.raw`building-\d+-\d+-\d+-\d+`;
const STREET_FURNITURE_TYPE = String.raw`(?:bench|bin|bike-rack|bollard|bus-shelter|kiosk|regulatory-sign|street-name-sign|wayfinding-sign)`;
const CURB_USE = String.raw`(?:parking|loading|ride-hail|bus-stop|emergency|no-stopping)`;

export const CITY_OBJECT_KIND_REGISTRY_ENTRIES = [
  entry('asset', ['asset:<category>:<semantic-name>:primitive'], [exact(String.raw`asset:${NAMED_ID}(?::${NAMED_ID})+:primitive`)], none()),
  entry('block', ['block-<grid-x>-<grid-z>'], [exact(String.raw`block-\d+-\d+`)], required(['district'])),
  entry('building', ['building-<block-x>-<block-z>-<lot-x>-<lot-z>'], [exact(BUILDING_ID)], required(['parcel'])),
  entry('civic-anchor', ['civic-anchor-<slug>'], [exact(String.raw`civic-anchor-${NAMED_ID}`)], optional(['district', 'block', 'parcel', 'building'])),
  entry('constraint', ['constraint-<slug>'], [exact(String.raw`constraint-${NAMED_ID}`)], none()),
  entry('crossing', ['crossing-<intersection-id>-<road-id>'], [exact(CROSSING_ID)], required(['intersection'])),
  entry(
    'curb-zone',
    ['curb-zone-<road-id>-<side>-intersection-<index>-no-stopping', 'curb-zone-<road-id>-<side>-segment-<index>-<use>'],
    [exact(String.raw`curb-zone-${ROAD_ID}-${SIDEWALK_SIDE}-(?:intersection-\d+-no-stopping|segment-\d+-${CURB_USE})`)],
    required(['sidewalk'])
  ),
  entry('district', ['district-<district-slug>'], [exact(String.raw`district-${NAMED_ID}`)], none()),
  entry('economy-anchor', ['economy-anchor-<slug>'], [exact(String.raw`economy-anchor-${NAMED_ID}`)], optional(['district', 'block', 'parcel', 'building'])),
  entry('facade', ['facade-active-frontage-<building-id>-<road-id>'], [exact(String.raw`facade-active-frontage-${BUILDING_ID}-${ROAD_ID}`)], required(['building'])),
  entry('intersection', ['intersection-v<vertical-index>-h<horizontal-index>'], [exact(INTERSECTION_ID)], none()),
  entry('lane', ['<road-id>-lane-<index>'], [exact(String.raw`${ROAD_ID}-lane-\d+`)], required(['road-segment'])),
  entry(
    'lane-marking',
    ['<road-id>-lane-dash-<index>', '<road-id>-turn-arrow-<index>', '<crossing-id>-<marking-type>-<index>'],
    [
      exact(String.raw`${ROAD_ID}-lane-dash-\d+`),
      exact(String.raw`${ROAD_ID}-turn-arrow-\d+`),
      exact(String.raw`${CROSSING_ID}-(?:zebra-stripe-\d+|stop-bar-\d+|tactile-pad-\d+|refuge-island)`)
    ],
    required(['road-segment', 'lane', 'crossing'])
  ),
  entry('parcel', ['parcel-<block-x>-<block-z>-<lot-x>-<lot-z>'], [exact(String.raw`parcel-\d+-\d+-\d+-\d+`)], required(['block'])),
  entry('park', ['<park-slug>'], [exact(NAMED_ID)], none()),
  entry('resilience-goal', ['resilience-goal-<slug>'], [exact(String.raw`resilience-goal-${NAMED_ID}`)], none()),
  entry('road-segment', ['road-v-<index>', 'road-h-<index>'], [exact(ROAD_ID)], none()),
  entry('sensor', ['sensor-<slug>'], [exact(String.raw`sensor-${NAMED_ID}`)], optional(['building', 'road-segment', 'street-light', 'utility-node'])),
  entry('sidewalk', ['<road-id>-sidewalk-left', '<road-id>-sidewalk-right'], [exact(SIDEWALK_ID)], required(['road-segment'])),
  entry(
    'sidewalk-graph-edge',
    ['sidewalk-edge-<crossing-id>', 'sidewalk-edge-<sidewalk-id>-<from-intersection-id>-<to-intersection-id>'],
    [exact(String.raw`sidewalk-edge-${CROSSING_ID}`), exact(String.raw`sidewalk-edge-${SIDEWALK_ID}-${INTERSECTION_ID}-${INTERSECTION_ID}`)],
    required(['crossing', 'sidewalk'])
  ),
  entry('sidewalk-graph-node', ['sidewalk-node-<intersection-id>-<sidewalk-id>'], [exact(String.raw`sidewalk-node-${INTERSECTION_ID}-${SIDEWALK_ID}`)], required(['intersection'])),
  entry('street-furniture', ['street-furniture-<road-id>-<side>-<index>-<type>'], [exact(String.raw`street-furniture-${ROAD_ID}-${SIDEWALK_SIDE}-\d+-${STREET_FURNITURE_TYPE}`)], required(['sidewalk'])),
  entry('street-light', ['street-light-<road-id>-<side>-<index>'], [exact(String.raw`street-light-${ROAD_ID}-${SIDEWALK_SIDE}-\d+`)], required(['sidewalk'])),
  entry('traffic-vehicle', ['traffic-vehicle-<index>'], [exact(String.raw`traffic-vehicle-\d+`)], required(['road-segment'])),
  entry('tree-planting', ['<park-id>-tree-<index>', 'street-tree-<road-id>-<side>-<index>'], [exact(String.raw`${NAMED_ID}-tree-\d+`), exact(String.raw`street-tree-${ROAD_ID}-${SIDEWALK_SIDE}-\d+`)], required(['park', 'sidewalk'])),
  entry('utility-edge', ['utility-edge-<slug>'], [exact(String.raw`utility-edge-${NAMED_ID}`)], optional(['utility-node'])),
  entry('utility-node', ['utility-node-<slug>'], [exact(String.raw`utility-node-${NAMED_ID}`)], optional(['district', 'block', 'parcel', 'road-segment'])),
  entry('vertical-slice', ['slice-detailed-street-<road-id>'], [exact(String.raw`slice-detailed-street-${ROAD_ID}`)], required(['road-segment'])),
  entry('waterway', ['<waterway-slug>'], [exact(NAMED_ID)], none())
] as const satisfies readonly CityObjectKindRegistryEntry[];

type RegisteredCityObjectKind = (typeof CITY_OBJECT_KIND_REGISTRY_ENTRIES)[number]['kind'];
const CITY_OBJECT_KIND_REGISTRY_EXHAUSTIVE_CHECK: AssertAllKindsRegistered<
  Exclude<CityObjectKind, RegisteredCityObjectKind>
> = true;
void CITY_OBJECT_KIND_REGISTRY_EXHAUSTIVE_CHECK;

const CITY_OBJECT_KIND_REGISTRY_BY_KIND = new Map(
  CITY_OBJECT_KIND_REGISTRY_ENTRIES.map((registryEntry) => [registryEntry.kind, registryEntry])
);

export function getCityObjectRegistryEntry(kind: CityObjectKind): CityObjectKindRegistryEntry {
  const registryEntry = CITY_OBJECT_KIND_REGISTRY_BY_KIND.get(kind);

  if (!registryEntry) {
    throw new Error(`Missing city object registry entry for kind ${kind}.`);
  }

  return registryEntry;
}

export function isCityObjectIdValidForKind(kind: CityObjectKind, id: CityId): boolean {
  return getCityObjectRegistryEntry(kind).idPatterns.some((pattern) => pattern.test(id));
}

export function getCityObjectsByKind<
  ObjectType extends CityObjectBase,
  Kind extends ObjectType['kind']
>(index: CityObjectIndex<ObjectType>, kind: Kind): Extract<ObjectType, { readonly kind: Kind }>[] {
  return index.objects.filter((object): object is Extract<ObjectType, { readonly kind: Kind }> => object.kind === kind);
}

export function getCityObjectChildren<
  ObjectType extends CityObjectBase,
  Kind extends ObjectType['kind']
>(
  index: CityObjectIndex<ObjectType>,
  parentId: CityId,
  kind?: Kind
): Extract<ObjectType, { readonly kind: Kind }>[] | ObjectType[] {
  const childIds = index.childrenByParentId[parentId] ?? [];
  const children = childIds.flatMap((childId) => {
    const child = index.objectsById[childId];
    return child ? [child] : [];
  });

  if (!kind) {
    return children;
  }

  return children.filter((child): child is Extract<ObjectType, { readonly kind: Kind }> => child.kind === kind);
}

export function validateCityObjectRegistryIdentity(
  object: CityObjectBase,
  context: CityObjectRegistryValidationContext = {}
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const registryEntry = CITY_OBJECT_KIND_REGISTRY_BY_KIND.get(object.kind);

  if (!registryEntry) {
    issues.push({
      id: `missing-object-kind-registry-${toIssueIdToken(object.kind)}`,
      severity: 'error',
      category: 'identifier',
      objectId: object.id,
      message: `City object kind ${object.kind} is missing from the object-kind registry.`
    });
    return issues;
  }

  if (!registryEntry.idPatterns.some((pattern) => pattern.test(object.id))) {
    issues.push({
      id: `invalid-id-pattern-${object.kind}-${toIssueIdToken(object.id)}`,
      severity: 'error',
      category: 'identifier',
      objectId: object.id,
      message: `City object ${object.id} does not match ID pattern for ${object.kind}: ${registryEntry.idPatternDescriptions.join(' or ')}.`
    });
  }

  if (registryEntry.parent.requirement === 'required' && !object.parentId) {
    issues.push({
      id: `missing-required-parent-${toIssueIdToken(object.id)}`,
      severity: 'error',
      category: 'identifier',
      objectId: object.id,
      message: `City object ${object.id} must have a parent of kind ${formatAllowedKinds(registryEntry.parent.allowedKinds)}.`
    });
  }

  if (registryEntry.parent.requirement === 'none' && object.parentId) {
    issues.push({
      id: `unexpected-parent-${toIssueIdToken(object.id)}`,
      severity: 'error',
      category: 'identifier',
      objectId: object.id,
      message: `City object ${object.id} should not have a parent.`
    });
  }

  if (object.parentId && registryEntry.parent.allowedKinds?.length && context.getParentKind) {
    const parentKind = context.getParentKind(object.parentId);

    if (parentKind && !registryEntry.parent.allowedKinds.includes(parentKind)) {
      issues.push({
        id: `invalid-parent-kind-${toIssueIdToken(object.id)}-${toIssueIdToken(object.parentId)}`,
        severity: 'error',
        category: 'identifier',
        objectId: object.id,
        message: `City object ${object.id} has parent ${object.parentId} of kind ${parentKind}, expected ${formatAllowedKinds(registryEntry.parent.allowedKinds)}.`
      });
    }
  }

  return issues;
}

export function createCityObjectRegistryDiagnostics(): CityObjectRegistryDiagnostics {
  return {
    registeredKinds: CITY_OBJECT_KIND_REGISTRY_ENTRIES.length,
    kinds: CITY_OBJECT_KIND_REGISTRY_ENTRIES.map((registryEntry) => ({
      kind: registryEntry.kind,
      parentRequirement: registryEntry.parent.requirement,
      allowedParentKinds: registryEntry.parent.allowedKinds ?? [],
      idPatternDescriptions: registryEntry.idPatternDescriptions
    }))
  };
}

type AssertAllKindsRegistered<MissingKind> = [MissingKind] extends [never] ? true : never;

function entry(
  kind: CityObjectKind,
  idPatternDescriptions: readonly string[],
  idPatterns: readonly RegExp[],
  parent: CityObjectParentRule
): CityObjectKindRegistryEntry {
  return {
    kind,
    idPatternDescriptions,
    idPatterns,
    parent
  };
}

function none(): CityObjectParentRule {
  return { requirement: 'none' };
}

function optional(allowedKinds: readonly CityObjectKind[]): CityObjectParentRule {
  return { requirement: 'optional', allowedKinds };
}

function required(allowedKinds: readonly CityObjectKind[]): CityObjectParentRule {
  return { requirement: 'required', allowedKinds };
}

function exact(pattern: string): RegExp {
  return new RegExp(`^${pattern}$`);
}

function formatAllowedKinds(allowedKinds: readonly CityObjectKind[] | undefined): string {
  return allowedKinds?.join(', ') ?? 'none';
}

function toIssueIdToken(value: string): string {
  return value.replace(/[^a-zA-Z0-9:-]+/g, '-').replace(/^-+|-+$/g, '') || 'empty';
}
