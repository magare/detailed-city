import type {
  AssetCriticality,
  AssetInventoryRecordContract,
  AssetInventoryScope,
  CityId,
  RenderBinding
} from '../../city/data-contracts/cityContracts';
import type {
  CivicAnchor,
  CommunityAnchor,
  CultureAnchor,
  EmergencyServiceAnchor,
  GeneratedCity,
  GovernmentAnchor,
  GreenStormwaterFeature,
  ParkFeature,
  PlazaZone,
  StreetFurniture,
  StreetLight,
  UtilityEdge,
  UtilityNode,
  WaterTransportAccess,
  WaterfrontOpenSpace
} from '../../types/city';

export interface AssetInventoryGeneratorInput {
  readonly assetBindings: readonly RenderBinding[];
  readonly civicAnchors: readonly CivicAnchor[];
  readonly communityAnchors: readonly CommunityAnchor[];
  readonly cultureAnchors: readonly CultureAnchor[];
  readonly governmentAnchors: readonly GovernmentAnchor[];
  readonly emergencyServiceAnchors: readonly EmergencyServiceAnchor[];
  readonly waterTransportAccess: readonly WaterTransportAccess[];
  readonly utilityNodes: readonly UtilityNode[];
  readonly utilityEdges: readonly UtilityEdge[];
  readonly streetLights: readonly StreetLight[];
  readonly streetFurniture: readonly StreetFurniture[];
  readonly parkFeatures: readonly ParkFeature[];
  readonly plazaZones: readonly PlazaZone[];
  readonly greenStormwaterFeatures: readonly GreenStormwaterFeature[];
  readonly waterfrontOpenSpaces: readonly WaterfrontOpenSpace[];
}

type InventoryTarget = Extract<
  GeneratedCity['objectIndex']['objects'][number],
  | CivicAnchor
  | CommunityAnchor
  | CultureAnchor
  | EmergencyServiceAnchor
  | GovernmentAnchor
  | WaterTransportAccess
  | UtilityNode
  | UtilityEdge
  | StreetLight
  | StreetFurniture
  | ParkFeature
  | PlazaZone
  | GreenStormwaterFeature
  | WaterfrontOpenSpace
>;

interface TargetDescriptor<T extends InventoryTarget = InventoryTarget> {
  readonly object: T;
  readonly scope: AssetInventoryScope;
  readonly departmentId: CityId;
  readonly ownerEntityId: CityId;
  readonly renderBindingId: CityId;
  readonly accessObjectIds: readonly CityId[];
}

const STREET_LIGHT_BINDING_ID = 'binding:street-light:pole-fixture';
const UTILITY_NODE_BINDING_ID = 'binding:utility:inventory-node';
const UTILITY_EDGE_BINDING_ID = 'binding:utility:inventory-edge';
const CURRENT_YEAR = 2026;

export class AssetInventoryGenerator {
  create(input: AssetInventoryGeneratorInput): AssetInventoryRecordContract[] {
    const bindingsById = new Map(input.assetBindings.map((binding) => [binding.id, binding]));

    return [
      ...input.civicAnchors.map((object) => civicTarget(object, object.renderBindingId)),
      ...input.communityAnchors.map((object) => civicTarget(object, object.renderBindingId)),
      ...input.cultureAnchors.map((object) => civicTarget(object, object.renderBindingId)),
      ...input.governmentAnchors.map((object) => civicTarget(object, object.renderBindingId)),
      ...input.emergencyServiceAnchors.map((object) => civicTarget(object, object.renderBindingId)),
      ...input.waterTransportAccess.map((object) =>
        publicRealmTarget(object, object.renderBindingId, [
          ...object.routing.connectedRoadIds,
          ...object.routing.transferObjectIds,
          ...(object.waterwayId ? [object.waterwayId] : []),
          ...(object.emergencyServiceAnchorId ? [object.emergencyServiceAnchorId] : []),
          ...(object.freightRouteId ? [object.freightRouteId] : [])
        ])
      ),
      ...input.utilityNodes.map((object) => utilityTarget(object, UTILITY_NODE_BINDING_ID, [object.accessPoint.objectId])),
      ...input.utilityEdges.map((object) => utilityTarget(object, UTILITY_EDGE_BINDING_ID, object.accessPointIds)),
      ...input.streetLights.map((object) => publicRealmTarget(object, STREET_LIGHT_BINDING_ID, [object.sidewalkId, object.roadId])),
      ...input.streetFurniture.map((object) => publicRealmTarget(object, object.assetBindingId, [object.sidewalkId, object.roadId])),
      ...input.parkFeatures.map((object) => publicRealmTarget(object, object.assetBindingId, [object.parkId, ...object.connectedSidewalkIds])),
      ...input.plazaZones.map((object) => publicRealmTarget(object, object.assetBindingId, [object.plazaId, ...object.connectedSidewalkIds])),
      ...input.greenStormwaterFeatures.map((object) => publicRealmTarget(object, object.assetBindingId, [object.roadId, object.sidewalkId])),
      ...input.waterfrontOpenSpaces.map((object) =>
        publicRealmTarget(object, object.assetBindingId, [object.waterfrontEdgeId, object.waterwayId, ...object.connectedRoadIds])
      )
    ]
      .sort((first, second) => first.object.id.localeCompare(second.object.id))
      .map((target, index) => createInventoryRecord(target, bindingsById.get(target.renderBindingId), index));
  }
}

function civicTarget<T extends CivicAnchor | CommunityAnchor | CultureAnchor | GovernmentAnchor | EmergencyServiceAnchor>(
  object: T,
  renderBindingId: CityId
): TargetDescriptor<T> {
  return {
    object,
    scope: 'civic',
    departmentId: 'department:civic-facilities',
    ownerEntityId: 'city-civic-services',
    renderBindingId,
    accessObjectIds: [object.buildingId, ...('plazaZoneIds' in object ? object.plazaZoneIds : [])]
  };
}

function utilityTarget<T extends UtilityNode | UtilityEdge>(
  object: T,
  renderBindingId: CityId,
  accessObjectIds: readonly CityId[]
): TargetDescriptor<T> {
  return {
    object,
    scope: 'utility',
    departmentId: `department:utility-${object.utilityType}`,
    ownerEntityId: object.ownerEntityId,
    renderBindingId,
    accessObjectIds
  };
}

function publicRealmTarget<T extends StreetLight | StreetFurniture | ParkFeature | PlazaZone | GreenStormwaterFeature | WaterTransportAccess | WaterfrontOpenSpace>(
  object: T,
  renderBindingId: CityId,
  accessObjectIds: readonly CityId[]
): TargetDescriptor<T> {
  const ownerEntityId = 'maintenanceOwnerEntityId' in object
    ? object.maintenanceOwnerEntityId
    : 'public-works-public-realm';

  return {
    object,
    scope: 'public-realm',
    departmentId: 'department:public-realm-maintenance',
    ownerEntityId,
    renderBindingId,
    accessObjectIds
  };
}

function createInventoryRecord(
  target: TargetDescriptor,
  binding: RenderBinding | undefined,
  sequence: number
): AssetInventoryRecordContract {
  const hash = stableHash(target.object.id);
  const installedYear = 2017 + (hash % 8);
  const expectedServiceLifeYears = getExpectedServiceLifeYears(target.object);
  const score = 68 + (hash % 29);
  const stage = installedYear + expectedServiceLifeYears <= CURRENT_YEAR + 2 ? 'renewal-due' : 'in-service';

  return {
    id: `asset-inventory-${target.object.kind}-${target.object.id}`,
    kind: 'asset-inventory-record',
    ownerDomain: 'operations',
    parentId: target.object.id,
    lod: 'lod1',
    tags: {
      assetObjectKind: target.object.kind,
      inventoryScope: target.scope,
      lookupKey: `asset:${target.scope}:${target.object.kind}:${target.object.id}`
    },
    assetObjectId: target.object.id,
    assetObjectKind: target.object.kind,
    assetLookupKey: `asset:${target.scope}:${target.object.kind}:${target.object.id}`,
    inventoryScope: target.scope,
    ownerEntityId: target.ownerEntityId,
    responsibleDepartmentId: target.departmentId,
    renderBindingId: target.renderBindingId,
    renderAssetId: binding?.assetId ?? `missing-asset-for-${target.renderBindingId}`,
    lifecycle: {
      stage,
      installedYear,
      expectedServiceLifeYears,
      replacementYear: installedYear + expectedServiceLifeYears
    },
    warranty: {
      providerEntityId: `vendor:${target.scope}:standard-${(sequence % 4) + 1}`,
      expiresYear: installedYear + getWarrantyYears(target.scope),
      coverage: target.scope === 'civic' ? 'structural' : target.scope === 'utility' ? 'parts-and-labor' : 'parts'
    },
    replacementCost: {
      amountUsd: getReplacementCost(target.object),
      estimateYear: CURRENT_YEAR
    },
    condition: {
      rating: getConditionRating(score),
      score,
      lastInspectionYear: CURRENT_YEAR - 1 - (hash % 2),
      nextInspectionYear: CURRENT_YEAR + 1 + (hash % 2)
    },
    operationalStatus: score < 72 ? 'maintenance-watch' : 'active',
    criticality: getCriticality(target.object),
    source: {
      sourceType: target.object.metadata?.sourceType ?? 'procedural',
      sourceId: target.object.metadata?.sourceId ?? `generated:asset-inventory:${target.object.id}`,
      generationStep: target.object.metadata?.generationStep ?? 'operations-asset-inventory'
    },
    inspectionAccessObjectIds: uniqueIds(target.accessObjectIds.filter(Boolean))
  };
}

function getExpectedServiceLifeYears(object: InventoryTarget): number {
  switch (object.kind) {
    case 'utility-node':
    case 'utility-edge':
      return 35;
    case 'civic-anchor':
    case 'community-anchor':
    case 'culture-anchor':
    case 'emergency-service-anchor':
    case 'government-anchor':
      return 40;
    case 'street-light':
      return 18;
    case 'street-furniture':
      return 12;
    case 'green-stormwater-feature':
      return 16;
    case 'water-transport-access':
    case 'waterfront-open-space':
      return 30;
    case 'park-feature':
    case 'plaza-zone':
      return 20;
  }
}

function getWarrantyYears(scope: AssetInventoryScope): number {
  return scope === 'civic' ? 10 : scope === 'utility' ? 7 : 3;
}

function getReplacementCost(object: InventoryTarget): number {
  switch (object.kind) {
    case 'utility-node':
      return object.capacity.value * 1250;
    case 'utility-edge':
      return Math.round(object.lengthMeters * 850);
    case 'civic-anchor':
    case 'community-anchor':
    case 'culture-anchor':
    case 'emergency-service-anchor':
    case 'government-anchor':
      return 850000 + stableHash(object.id) % 220000;
    case 'street-light':
      return 7200;
    case 'street-furniture':
      return Math.round((object.dimensions.widthMeters + object.dimensions.lengthMeters + object.dimensions.heightMeters) * 900);
    case 'green-stormwater-feature':
      return Math.round(object.storageVolumeCubicMeters * 4200 + object.size.x * object.size.z * 650);
    case 'water-transport-access':
      return Math.round(
        object.capacity.berths * 95000 +
          object.capacity.passengersPerHour * 120 +
          object.capacity.cargoTonnesPerDay * 720 +
          object.capacity.emergencySlotsPerHour * 18000
      );
    case 'waterfront-open-space':
      return Math.round(object.lengthMeters * object.widthMeters * 420);
    case 'park-feature':
    case 'plaza-zone':
      return Math.round(object.size.x * object.size.z * 380);
  }
}

function getCriticality(object: InventoryTarget): AssetCriticality {
  if (object.kind === 'utility-node') {
    return object.outage.criticality;
  }
  if (object.kind === 'utility-edge') {
    return object.outageDomainId.includes('critical') ? 'high' : 'medium';
  }
  if (object.kind === 'civic-anchor' && (object.serviceType === 'emergency' || object.serviceType === 'healthcare')) {
    return 'high';
  }
  if (object.kind === 'emergency-service-anchor') {
    return object.anchorKind === 'public-shelter' ? 'medium' : 'high';
  }
  if (object.kind === 'street-light' && object.nightSafety.emergencyRouteSupport) {
    return 'high';
  }
  if (object.kind === 'water-transport-access') {
    return object.constraints.emergencyPriority ? 'high' : object.capacity.cargoTonnesPerDay > 0 ? 'medium' : 'low';
  }
  if (object.kind === 'green-stormwater-feature' || object.kind === 'waterfront-open-space') {
    return 'medium';
  }
  return 'low';
}

function getConditionRating(score: number): AssetInventoryRecordContract['condition']['rating'] {
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

function stableHash(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 1000003;
  }
  return hash;
}

function uniqueIds(ids: readonly CityId[]): readonly CityId[] {
  return [...new Set(ids)];
}
