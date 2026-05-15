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
const CROSSING_ID = String.raw`crossing-(?:${INTERSECTION_ID}-${ROAD_ID}|midblock-${ROAD_ID}-\d+)`;
const BUILDING_ID = String.raw`building-\d+-\d+-\d+-\d+`;
const BUILDING_ENTRANCE_KIND = String.raw`(?:primary|lobby|ramp|service|loading)`;
const PARCEL_ID = String.raw`parcel-\d+-\d+-\d+-\d+`;
const FREIGHT_ROUTE_KIND = String.raw`(?:industrial-haul|retail-delivery|warehouse-link)`;
const STREET_FURNITURE_TYPE = String.raw`(?:bench|bin|bike-rack|bollard|bus-shelter|kiosk|railing|regulatory-sign|street-name-sign|wayfinding-sign)`;
const TRAFFIC_CALMING_KIND = String.raw`(?:curb-extension|bus-bulb|chicane|pinchpoint|speed-hump|speed-table|speed-cushion|neighborhood-gateway)`;
const TRANSIT_MODE = String.raw`(?:bus)`;
const CURB_USE = String.raw`(?:parking|loading|ride-hail|bus-stop|emergency|no-stopping)`;
const COMMUNITY_ANCHOR_KIND = String.raw`(?:cemetery|community-hall|food-bank|processional-space|recreation-center|shelter|social-service|worship-place)`;
const CULTURE_ANCHOR_KIND = String.raw`(?:event-space|gallery|heritage-site|museum|theater|venue)`;
const ADMIN_BOUNDARY_KIND = String.raw`(?:city-limit|ward|neighborhood|service|ownership|jurisdiction)`;
const HAZARD_ZONE_KIND = String.raw`(?:contamination|flood-plain|heat-exposure|landslide-risk|restricted-area)`;
const WATERFRONT_EDGE_KIND = String.raw`(?:ecological-edge|flood-wall|pier|promenade|public-access|quay)`;
const WATERFRONT_OPEN_SPACE_KIND = String.raw`(?:boardwalk|ecological-edge|overlook|pier-landing|promenade|water-access)`;
const WEATHER_PRESET_KIND = String.raw`(?:clear|cloudy|rain|fog|monsoon)`;
const SOLAR_SHADING_SAMPLE_KIND = String.raw`(?:roof-solar|plaza-comfort|park-comfort|waterfront-comfort)`;
const URBAN_HEAT_ZONE_KIND = String.raw`(?:heat-island|cool-roof|canopy-cooling|water-cooling|public-route-risk)`;
const TOPOGRAPHY_ZONE_KIND = String.raw`(?:elevation-band|slope-area|retaining-condition|buildability-area)`;
const SOIL_GEOLOGY_KIND = String.raw`(?:alluvial-silt|engineered-fill|shallow-bedrock|sandy-loam|contaminated-fill|waterfront-clay)`;
const DEVELOPMENT_PHASE_KIND = String.raw`(?:baseline|future-expansion|temporary-condition)`;
const PARK_FEATURE_KIND = String.raw`(?:lawn|path|planting|sports|seating|water-feature|shade)`;
const PLAZA_ZONE_KIND = String.raw`(?:active-edge|event|hardscape|paving|seating|shade)`;
const GOVERNMENT_ANCHOR_KIND = String.raw`(?:administrative-offices|city-hall|civic-plaza-interface|courts|service-counters)`;
const NAVIGATION_MODE = String.raw`(?:vehicle|pedestrian|bike|transit|service|emergency|freight)`;
const NAVIGATION_ROUTE_KIND = String.raw`(?:baseline|transfer|service|emergency|freight)`;
const SERVICE_ACCESS_CORRIDOR_KIND = String.raw`(?:maintenance-path|restricted-corridor|service-yard|utility-easement|vault-access)`;
const NAMED_PLACE_KIND = String.raw`(?:civic-anchor|district|neighborhood|park|street|ward|waterfront)`;
const GAZETTEER_ENTRY_KIND = String.raw`(?:address|anchor|place|street)`;
const ACCESS_CONTROL_KIND = String.raw`(?:bollard-line|checkpoint|fence|gate|guardrail|turnstile|wall)`;
const GREEN_STORMWATER_KIND = String.raw`(?:bioswale|curb-cut|flow-through-planter|permeable-pavement|pervious-strip|rain-garden|tree-trench)`;
const ASSET_INVENTORY_TARGET_KIND = String.raw`(?:civic-anchor|community-anchor|culture-anchor|government-anchor|green-stormwater-feature|park-feature|plaza-zone|street-furniture|street-light|utility-edge|utility-node|waterfront-open-space)`;
const MAINTENANCE_OPERATION_KIND = String.raw`(?:inspection|repair|replacement|street-work|temporary-closure)`;

export const CITY_OBJECT_KIND_REGISTRY_ENTRIES = [
  entry(
    'access-control',
    ['access-control-<access-control-kind>-<source-id>'],
    [exact(String.raw`access-control-${ACCESS_CONTROL_KIND}-${NAMED_ID}(?:-${NAMED_ID})*`)],
    required(['hazard-zone', 'road-segment', 'service-access-corridor', 'transit-stop'])
  ),
  entry(
    'administrative-boundary',
    ['administrative-boundary-<boundary-kind>-<slug>'],
    [exact(String.raw`administrative-boundary-${ADMIN_BOUNDARY_KIND}(?:-${NAMED_ID})?`)],
    optional(['administrative-boundary'])
  ),
  entry('asset', ['asset:<category>:<semantic-name>:primitive'], [exact(String.raw`asset:${NAMED_ID}(?::${NAMED_ID})+:primitive`)], none()),
  entry(
    'asset-inventory-record',
    ['asset-inventory-<target-kind>-<target-object-id>'],
    [exact(String.raw`asset-inventory-${ASSET_INVENTORY_TARGET_KIND}-${NAMED_ID}(?:-${NAMED_ID})*`)],
    required([
      'civic-anchor',
      'community-anchor',
      'culture-anchor',
      'government-anchor',
      'green-stormwater-feature',
      'park-feature',
      'plaza-zone',
      'street-furniture',
      'street-light',
      'utility-edge',
      'utility-node',
      'waterfront-open-space'
    ])
  ),
  entry('block', ['block-<grid-x>-<grid-z>'], [exact(String.raw`block-\d+-\d+`)], required(['district'])),
  entry('address-point', ['<building-id>-address-primary'], [exact(String.raw`${BUILDING_ID}-address-primary`)], required(['building'])),
  entry('building', ['building-<block-x>-<block-z>-<lot-x>-<lot-z>'], [exact(BUILDING_ID)], required(['parcel'])),
  entry(
    'building-entrance',
    ['<building-id>-entrance-<primary|lobby|ramp|service|loading>'],
    [exact(String.raw`${BUILDING_ID}-entrance-${BUILDING_ENTRANCE_KIND}`)],
    required(['building'])
  ),
  entry(
    'bike-conflict-zone',
    ['bike-conflict-zone-<road-id>-<side>-<suffix>'],
    [exact(String.raw`bike-conflict-zone-${ROAD_ID}-${SIDEWALK_SIDE}-${NAMED_ID}(?:-\d+)?`)],
    required(['bike-segment'])
  ),
  entry('bike-graph-edge', ['bike-graph-edge-<road-id>-<side>'], [exact(String.raw`bike-graph-edge-${ROAD_ID}-${SIDEWALK_SIDE}`)], required(['bike-segment'])),
  entry(
    'bike-graph-node',
    ['bike-graph-node-<road-id>-<side>-<role>'],
    [exact(String.raw`bike-graph-node-${ROAD_ID}-${SIDEWALK_SIDE}-${NAMED_ID}(?:-\d+)?`)],
    required(['bike-segment'])
  ),
  entry(
    'bike-parking',
    ['bike-parking-<street-furniture-id>'],
    [exact(String.raw`bike-parking-street-furniture-${ROAD_ID}-${SIDEWALK_SIDE}-\d+-bike-rack`)],
    required(['street-furniture'])
  ),
  entry('bike-segment', ['bike-segment-<road-id>-<side>'], [exact(String.raw`bike-segment-${ROAD_ID}-${SIDEWALK_SIDE}`)], required(['road-segment'])),
  entry(
    'bike-signal',
    ['bike-signal-<intersection-id>-<road-id>-<side>'],
    [exact(String.raw`bike-signal-${INTERSECTION_ID}-${ROAD_ID}-${SIDEWALK_SIDE}`)],
    required(['intersection'])
  ),
  entry('cadastre-record', ['cadastre-record-<parcel-id>'], [exact(String.raw`cadastre-record-${PARCEL_ID}`)], required(['parcel'])),
  entry('city-metric', ['city-metric-<metric-kind>'], [exact(String.raw`city-metric-${NAMED_ID}`)], none()),
  entry('civic-anchor', ['civic-anchor-<slug>'], [exact(String.raw`civic-anchor-${NAMED_ID}`)], optional(['district', 'block', 'parcel', 'building'])),
  entry(
    'community-anchor',
    ['community-anchor-<community-anchor-kind>'],
    [exact(String.raw`community-anchor-${COMMUNITY_ANCHOR_KIND}`)],
    required(['civic-anchor'])
  ),
  entry('constraint', ['constraint-<slug>'], [exact(String.raw`constraint-${NAMED_ID}`)], none()),
  entry(
    'crossing',
    ['crossing-<intersection-id>-<road-id>', 'crossing-midblock-<road-id>-<index>'],
    [exact(CROSSING_ID)],
    required(['intersection', 'road-segment'])
  ),
  entry(
    'curb-zone',
    ['curb-zone-<road-id>-<side>-intersection-<index>-no-stopping', 'curb-zone-<road-id>-<side>-segment-<index>-<use>'],
    [exact(String.raw`curb-zone-${ROAD_ID}-${SIDEWALK_SIDE}-(?:intersection-\d+-no-stopping|segment-\d+-${CURB_USE})`)],
    required(['sidewalk'])
  ),
  entry(
    'culture-anchor',
    ['culture-anchor-<culture-anchor-kind>'],
    [exact(String.raw`culture-anchor-${CULTURE_ANCHOR_KIND}`)],
    required(['civic-anchor'])
  ),
  entry(
    'development-phase',
    ['development-phase-<phase-kind>-<slug>'],
    [exact(String.raw`development-phase-${DEVELOPMENT_PHASE_KIND}-${NAMED_ID}`)],
    none()
  ),
  entry('district', ['district-<district-slug>'], [exact(String.raw`district-${NAMED_ID}`)], none()),
  entry('economy-anchor', ['economy-anchor-<slug>'], [exact(String.raw`economy-anchor-${NAMED_ID}`)], optional(['district', 'block', 'parcel', 'building'])),
  entry('facade', ['facade-active-frontage-<building-id>-<road-id>'], [exact(String.raw`facade-active-frontage-${BUILDING_ID}-${ROAD_ID}`)], required(['building'])),
  entry(
    'gazetteer-entry',
    ['gazetteer-entry-<address|anchor|place|street>-<source-id>'],
    [exact(String.raw`gazetteer-entry-${GAZETTEER_ENTRY_KIND}-${NAMED_ID}(?:-${NAMED_ID})*`)],
    required(['address-point', 'civic-anchor', 'community-anchor', 'culture-anchor', 'government-anchor', 'named-place', 'road-segment'])
  ),
  entry(
    'green-stormwater-feature',
    ['green-stormwater-<feature-kind>-<road-id>-<index>'],
    [exact(String.raw`green-stormwater-${GREEN_STORMWATER_KIND}-${ROAD_ID}-\d+`)],
    required(['road-segment'])
  ),
  entry(
    'freight-loading-dock',
    ['freight-loading-dock-<building-id>'],
    [exact(String.raw`freight-loading-dock-${BUILDING_ID}`)],
    required(['building'])
  ),
  entry(
    'freight-route',
    ['freight-route-<road-id>-<route-kind>'],
    [exact(String.raw`freight-route-${ROAD_ID}-${FREIGHT_ROUTE_KIND}`)],
    none()
  ),
  entry(
    'government-anchor',
    ['government-anchor-<government-anchor-kind>'],
    [exact(String.raw`government-anchor-${GOVERNMENT_ANCHOR_KIND}`)],
    required(['civic-anchor'])
  ),
  entry('hazard-zone', ['hazard-zone-<hazard-kind>-<slug>'], [exact(String.raw`hazard-zone-${HAZARD_ZONE_KIND}-${NAMED_ID}`)], none()),
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
  entry(
    'maintenance-operation',
    ['maintenance-operation-<operation-kind>-<asset-inventory-record-id>'],
    [exact(String.raw`maintenance-operation-${MAINTENANCE_OPERATION_KIND}-asset-inventory-${ASSET_INVENTORY_TARGET_KIND}-${NAMED_ID}(?:-${NAMED_ID})*`)],
    required(['asset-inventory-record'])
  ),
  entry(
    'navigation-graph-edge',
    ['navigation-edge-<mode>-<source-object-id>'],
    [exact(String.raw`navigation-edge-${NAVIGATION_MODE}-${NAMED_ID}(?:-${NAMED_ID})*(?:-\d+)?`)],
    required(['road-segment', 'sidewalk-graph-edge', 'bike-graph-edge', 'transit-route', 'freight-route', 'service-alley'])
  ),
  entry(
    'navigation-graph-node',
    ['navigation-node-<mode>-<source-object-id>'],
    [exact(String.raw`navigation-node-${NAVIGATION_MODE}-${NAMED_ID}(?:-${NAMED_ID})*(?:-(?:start|end))?`)],
    required(['road-segment', 'sidewalk-graph-node', 'bike-graph-node', 'bike-parking', 'transit-stop', 'freight-loading-dock', 'service-alley', 'utility-node'])
  ),
  entry(
    'navigation-route',
    ['navigation-route-<mode>-<route-kind>-<index>'],
    [exact(String.raw`navigation-route-${NAVIGATION_MODE}-${NAVIGATION_ROUTE_KIND}-\d+`)],
    none()
  ),
  entry(
    'named-place',
    ['named-place-<place-kind>-<source-id>'],
    [exact(String.raw`named-place-${NAMED_PLACE_KIND}-${NAMED_ID}(?:-${NAMED_ID})*`)],
    required(['administrative-boundary', 'civic-anchor', 'district', 'park', 'road-segment', 'waterfront-open-space'])
  ),
  entry('parcel', ['parcel-<block-x>-<block-z>-<lot-x>-<lot-z>'], [exact(PARCEL_ID)], required(['block'])),
  entry('park', ['<park-slug>'], [exact(NAMED_ID)], none()),
  entry(
    'park-feature',
    ['park-feature-<park-id>-<feature-kind>-<index>'],
    [exact(String.raw`park-feature-${NAMED_ID}-${PARK_FEATURE_KIND}-\d+`)],
    required(['park'])
  ),
  entry(
    'plaza-zone',
    ['plaza-zone-<plaza-id>-<zone-kind>-<index>'],
    [exact(String.raw`plaza-zone-${NAMED_ID}-${PLAZA_ZONE_KIND}-\d+`)],
    required(['park'])
  ),
  entry('resilience-goal', ['resilience-goal-<slug>'], [exact(String.raw`resilience-goal-${NAMED_ID}`)], none()),
  entry('road-segment', ['road-v-<index>', 'road-h-<index>'], [exact(ROAD_ID)], none()),
  entry('sensor', ['sensor-<slug>'], [exact(String.raw`sensor-${NAMED_ID}`)], optional(['building', 'road-segment', 'street-light', 'utility-node'])),
  entry(
    'service-access-corridor',
    ['service-access-corridor-<corridor-kind>-<index>'],
    [exact(String.raw`service-access-corridor-${SERVICE_ACCESS_CORRIDOR_KIND}-\d+`)],
    optional(['building', 'parcel', 'road-segment', 'utility-node', 'utility-edge'])
  ),
  entry('sidewalk', ['<road-id>-sidewalk-left', '<road-id>-sidewalk-right'], [exact(SIDEWALK_ID)], required(['road-segment'])),
  entry(
    'service-alley',
    ['service-alley-<road-id>-<index>'],
    [exact(String.raw`service-alley-${ROAD_ID}-\d+`)],
    required(['road-segment'])
  ),
  entry(
    'solar-shading-sample',
    ['solar-shading-<sample-kind>-<index>'],
    [exact(String.raw`solar-shading-${SOLAR_SHADING_SAMPLE_KIND}-\d+`)],
    required(['building', 'plaza-zone', 'park', 'waterfront-open-space'])
  ),
  entry(
    'urban-heat-zone',
    ['urban-heat-<zone-kind>-<index>'],
    [exact(String.raw`urban-heat-${URBAN_HEAT_ZONE_KIND}-\d+`)],
    required(['building', 'district', 'road-segment', 'tree-planting', 'waterfront-open-space'])
  ),
  entry(
    'sidewalk-graph-edge',
    ['sidewalk-edge-<crossing-id>', 'sidewalk-edge-<sidewalk-id>-<from-intersection-id>-<to-intersection-id>'],
    [exact(String.raw`sidewalk-edge-${CROSSING_ID}`), exact(String.raw`sidewalk-edge-${SIDEWALK_ID}-${INTERSECTION_ID}-${INTERSECTION_ID}`)],
    required(['crossing', 'sidewalk'])
  ),
  entry(
    'sidewalk-graph-node',
    ['sidewalk-node-<intersection-id>-<sidewalk-id>', 'sidewalk-node-<crossing-id>-<sidewalk-id>'],
    [exact(String.raw`sidewalk-node-(?:${INTERSECTION_ID}|${CROSSING_ID})-${SIDEWALK_ID}`)],
    required(['intersection', 'crossing'])
  ),
  entry('street-furniture', ['street-furniture-<road-id>-<side>-<index>-<type>'], [exact(String.raw`street-furniture-${ROAD_ID}-${SIDEWALK_SIDE}-\d+-${STREET_FURNITURE_TYPE}`)], required(['sidewalk'])),
  entry('street-light', ['street-light-<road-id>-<side>-<index>'], [exact(String.raw`street-light-${ROAD_ID}-${SIDEWALK_SIDE}-\d+`)], required(['sidewalk'])),
  entry(
    'topography-zone',
    ['topography-zone-<zone-kind>-<index>'],
    [exact(String.raw`topography-zone-${TOPOGRAPHY_ZONE_KIND}-\d+`)],
    none()
  ),
  entry(
    'soil-geology-zone',
    ['soil-geology-zone-<soil-kind>-<district-slug>'],
    [exact(String.raw`soil-geology-zone-${SOIL_GEOLOGY_KIND}-${NAMED_ID}`)],
    none()
  ),
  entry('traffic-vehicle', ['traffic-vehicle-<index>'], [exact(String.raw`traffic-vehicle-\d+`)], required(['road-segment'])),
  entry(
    'traffic-calming-device',
    ['traffic-calming-<road-id>-<device-kind>-<index>'],
    [exact(String.raw`traffic-calming-${ROAD_ID}-${TRAFFIC_CALMING_KIND}-\d+`)],
    required(['road-segment'])
  ),
  entry(
    'transit-route',
    ['transit-route-<mode>-<road-id>'],
    [exact(String.raw`transit-route-${TRANSIT_MODE}-${ROAD_ID}`)],
    none()
  ),
  entry(
    'transit-stop',
    ['transit-stop-<road-id>-<side>-<index>'],
    [exact(String.raw`transit-stop-${ROAD_ID}-${SIDEWALK_SIDE}-\d+`)],
    required(['sidewalk'])
  ),
  entry('tree-planting', ['<park-id>-tree-<index>', 'street-tree-<road-id>-<side>-<index>', 'citywide-tree-<road-id>-<side>-<index>'], [exact(String.raw`${NAMED_ID}-tree-\d+`), exact(String.raw`street-tree-${ROAD_ID}-${SIDEWALK_SIDE}-\d+`), exact(String.raw`citywide-tree-${ROAD_ID}-${SIDEWALK_SIDE}-\d+`)], required(['park', 'sidewalk'])),
  entry('utility-edge', ['utility-edge-<slug>'], [exact(String.raw`utility-edge-${NAMED_ID}`)], optional(['utility-node'])),
  entry('utility-node', ['utility-node-<slug>'], [exact(String.raw`utility-node-${NAMED_ID}`)], optional(['district', 'block', 'parcel', 'road-segment', 'waterway', 'building'])),
  entry('vertical-slice', ['slice-detailed-street-<road-id>'], [exact(String.raw`slice-detailed-street-${ROAD_ID}`)], required(['road-segment'])),
  entry('waterfront-edge', ['waterfront-edge-<waterway-id>-<kind>-<index>'], [exact(String.raw`waterfront-edge-${NAMED_ID}-${WATERFRONT_EDGE_KIND}-\d+`)], required(['waterway'])),
  entry(
    'waterfront-open-space',
    ['waterfront-open-space-<waterway-id>-<kind>-<index>'],
    [exact(String.raw`waterfront-open-space-${NAMED_ID}-${WATERFRONT_OPEN_SPACE_KIND}-\d+`)],
    required(['waterfront-edge'])
  ),
  entry('waterway', ['<waterway-slug>'], [exact(NAMED_ID)], none()),
  entry(
    'weather-preset',
    ['weather-preset-<weather-preset-kind-or-slug>'],
    [exact(String.raw`weather-preset-(?:${WEATHER_PRESET_KIND}|${NAMED_ID})(?:-${NAMED_ID})?`)],
    none()
  ),
  entry('zoning-district', ['zoning-district-<district-slug>'], [exact(String.raw`zoning-district-${NAMED_ID}`)], required(['district']))
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
