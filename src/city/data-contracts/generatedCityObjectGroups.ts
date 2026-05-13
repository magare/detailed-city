import { CITY_LAYER_SEQUENCE, type CityPlanningLayer } from '../cityPlan';
import type { CityId, CityObjectIndex, SourceType, ValidationIssue } from './cityContracts';
import {
  createAuthoredSetGroupId,
  createCityObjectGroupIndex,
  createCorridorGroupId,
  createDistrictGroupId,
  createOwnerDomainGroupId,
  createRenderLayerGroupId,
  createScenarioLayerGroupId,
  createValidationSelectionGroupId,
  createVerticalSliceGroupId,
  type CityObjectGroupDefinition,
  type CityObjectGroupIndex
} from './cityObjectGroups';
import type { GeneratedCity, GeneratedRuntimeCityObject, TrafficPlan } from '../../types/city';

const SOURCE_TYPES = ['procedural', 'authored', 'imported', 'simulated'] as const satisfies readonly SourceType[];

const RENDER_LAYER_KIND_GROUPS = [
  {
    id: 'terrain',
    name: 'Terrain Render Layer',
    objectKinds: ['waterway', 'topography-zone'] as const
  },
  {
    id: 'networks',
    name: 'Networks Render Layer',
    objectKinds: ['road-segment', 'lane-marking', 'traffic-calming-device'] as const
  },
  {
    id: 'buildings',
    name: 'Buildings Render Layer',
    objectKinds: ['building', 'civic-anchor', 'community-anchor', 'culture-anchor', 'government-anchor', 'facade'] as const
  },
  {
    id: 'public-realm',
    name: 'Public Realm Render Layer',
    objectKinds: ['park', 'tree-planting', 'street-light', 'street-furniture', 'waterfront-edge'] as const
  },
  {
    id: 'agents',
    name: 'Agents Render Layer',
    objectKinds: ['traffic-vehicle'] as const
  },
  {
    id: 'overlays',
    name: 'Overlays Render Layer',
    objectKinds: [
      'administrative-boundary',
      'city-metric',
      'constraint',
      'hazard-zone',
      'resilience-goal',
      'vertical-slice',
      'zoning-district'
    ] as const
  }
] as const;

export function createGeneratedCityObjectGroupIndex(
  city: GeneratedCity,
  traffic: TrafficPlan,
  runtimeObjectIndex: CityObjectIndex<GeneratedRuntimeCityObject>,
  validationIssues: readonly ValidationIssue[] = city.validation.issues
): CityObjectGroupIndex<GeneratedRuntimeCityObject> {
  return createCityObjectGroupIndex(
    runtimeObjectIndex,
    createGeneratedCityObjectGroups(city, traffic, runtimeObjectIndex, validationIssues)
  );
}

export function createGeneratedCityObjectGroups(
  city: GeneratedCity,
  traffic: TrafficPlan,
  runtimeObjectIndex: CityObjectIndex<GeneratedRuntimeCityObject>,
  validationIssues: readonly ValidationIssue[] = city.validation.issues
): readonly CityObjectGroupDefinition[] {
  return [
    ...createOwnerDomainGroups(runtimeObjectIndex),
    ...createDistrictGroups(city),
    ...createVerticalSliceGroups(city, traffic),
    ...createCorridorGroups(city, traffic),
    ...createScenarioLayerGroups(runtimeObjectIndex),
    ...createRenderLayerGroups(runtimeObjectIndex),
    ...createValidationSelectionGroups(validationIssues),
    ...createAuthoredSetGroups(runtimeObjectIndex)
  ];
}

function createOwnerDomainGroups(
  runtimeObjectIndex: CityObjectIndex<GeneratedRuntimeCityObject>
): CityObjectGroupDefinition[] {
  const objectIdsByDomain = new Map<CityPlanningLayer, CityId[]>(
    CITY_LAYER_SEQUENCE.map((ownerDomain) => [ownerDomain, []])
  );

  for (const object of runtimeObjectIndex.objects) {
    objectIdsByDomain.get(object.ownerDomain)?.push(object.id);
  }

  return CITY_LAYER_SEQUENCE.map((ownerDomain) => ({
    id: createOwnerDomainGroupId(ownerDomain),
    kind: 'owner-domain',
    name: `Owner Domain: ${ownerDomain}`,
    ownerDomain,
    source: 'domain-data',
    objectIds: objectIdsByDomain.get(ownerDomain) ?? [],
    metadata: {
      ownerDomain
    }
  }));
}

function createDistrictGroups(city: GeneratedCity): CityObjectGroupDefinition[] {
  const objectIdsByDistrictId = new Map<CityId, CityId[]>(
    city.districts.map((district) => [district.id, [district.id]])
  );
  const parcelDistrictIds = new Map(city.parcels.map((parcel) => [parcel.id, parcel.districtId]));
  const buildingDistrictIds = new Map<CityId, CityId>();

  for (const block of city.blocks) {
    objectIdsByDistrictId.get(block.districtId)?.push(block.id);
  }

  for (const zoning of city.zoningDistricts) {
    objectIdsByDistrictId.get(zoning.districtId)?.push(zoning.id);
  }

  for (const parcel of city.parcels) {
    objectIdsByDistrictId.get(parcel.districtId)?.push(parcel.id);
  }

  for (const building of city.buildings) {
    const districtId = parcelDistrictIds.get(building.parcelId);

    if (districtId) {
      objectIdsByDistrictId.get(districtId)?.push(building.id);
      buildingDistrictIds.set(building.id, districtId);
    }
  }

  for (const anchor of city.civicAnchors) {
    objectIdsByDistrictId.get(anchor.districtId)?.push(anchor.id);
  }

  for (const anchor of city.communityAnchors) {
    objectIdsByDistrictId.get(anchor.districtId)?.push(anchor.id);
  }

  for (const anchor of city.cultureAnchors) {
    objectIdsByDistrictId.get(anchor.districtId)?.push(anchor.id);
  }

  for (const anchor of city.governmentAnchors) {
    objectIdsByDistrictId.get(anchor.districtId)?.push(anchor.id);
  }

  for (const frontage of city.activeFrontages) {
    const districtId = buildingDistrictIds.get(frontage.buildingId) ?? parcelDistrictIds.get(frontage.parcelId);

    if (districtId) {
      objectIdsByDistrictId.get(districtId)?.push(frontage.id);
    }
  }

  return city.districts.map((district) => ({
    id: createDistrictGroupId(district.id),
    kind: 'district',
    name: district.name ?? `District ${district.id}`,
    ownerDomain: 'land',
    source: 'domain-data',
    objectIds: objectIdsByDistrictId.get(district.id) ?? [],
    metadata: {
      districtId: district.id,
      density: district.density,
      primaryUses: district.primaryUses.join(',')
    }
  }));
}

function createVerticalSliceGroups(city: GeneratedCity, traffic: TrafficPlan): CityObjectGroupDefinition[] {
  return city.verticalSlices.map((slice) => ({
    id: createVerticalSliceGroupId(slice.id),
    kind: 'vertical-slice',
    name: slice.name ?? `Vertical Slice ${slice.id}`,
    ownerDomain: 'blueprint',
    source: 'domain-data',
    objectIds: getSliceObjectIds(city, traffic, slice.id),
    metadata: {
      sliceId: slice.id,
      sliceKind: slice.sliceKind,
      corridorRoadId: slice.corridorRoadId,
      streetProfileId: slice.streetProfileId
    }
  }));
}

function createCorridorGroups(city: GeneratedCity, traffic: TrafficPlan): CityObjectGroupDefinition[] {
  return city.verticalSlices.map((slice) => ({
    id: createCorridorGroupId(slice.corridorRoadId),
    kind: 'corridor',
    name: `Corridor ${slice.corridorRoadId}`,
    ownerDomain: 'blueprint',
    source: 'domain-data',
    objectIds: getSliceObjectIds(city, traffic, slice.id),
    parentGroupId: createVerticalSliceGroupId(slice.id),
    metadata: {
      corridorRoadId: slice.corridorRoadId,
      sliceId: slice.id,
      streetProfileId: slice.streetProfileId
    }
  }));
}

function createScenarioLayerGroups(
  runtimeObjectIndex: CityObjectIndex<GeneratedRuntimeCityObject>
): CityObjectGroupDefinition[] {
  return [
    {
      id: createScenarioLayerGroupId('baseline'),
      kind: 'scenario-layer',
      name: 'Baseline Scenario Layer',
      ownerDomain: 'simulation',
      source: 'simulation',
      objectIds: runtimeObjectIndex.objectIds,
      metadata: {
        scenarioLayerId: 'baseline',
        deterministic: true
      }
    }
  ];
}

function createRenderLayerGroups(
  runtimeObjectIndex: CityObjectIndex<GeneratedRuntimeCityObject>
): CityObjectGroupDefinition[] {
  return RENDER_LAYER_KIND_GROUPS.map((layer) => ({
    id: createRenderLayerGroupId(layer.id),
    kind: 'render-layer',
    name: layer.name,
    ownerDomain: 'rendering-handoff',
    source: 'rendering-handoff',
    objectIds: runtimeObjectIndex.objects
      .filter((object) => (layer.objectKinds as readonly string[]).includes(object.kind))
      .map((object) => object.id),
    metadata: {
      renderLayerId: layer.id
    }
  }));
}

function createValidationSelectionGroups(validationIssues: readonly ValidationIssue[]): CityObjectGroupDefinition[] {
  return [
    {
      id: createValidationSelectionGroupId('current-issues'),
      kind: 'validation-selection',
      name: 'Current Validation Issues',
      ownerDomain: 'data-contracts',
      source: 'validation',
      objectIds: validationIssues.flatMap((issue) => (issue.objectId ? [issue.objectId] : [])),
      metadata: {
        selectionId: 'current-issues',
        issueCount: validationIssues.length
      }
    }
  ];
}

function createAuthoredSetGroups(
  runtimeObjectIndex: CityObjectIndex<GeneratedRuntimeCityObject>
): CityObjectGroupDefinition[] {
  const objectIdsBySourceType = new Map<SourceType, CityId[]>(SOURCE_TYPES.map((sourceType) => [sourceType, []]));

  for (const object of runtimeObjectIndex.objects) {
    const sourceType = object.metadata?.sourceType;

    if (sourceType) {
      objectIdsBySourceType.get(sourceType)?.push(object.id);
    }
  }

  return SOURCE_TYPES.map((sourceType) => ({
    id: createAuthoredSetGroupId(sourceType),
    kind: 'authored-set',
    name: `Source Set: ${sourceType}`,
    ownerDomain: 'data-contracts',
    source: 'metadata',
    objectIds: objectIdsBySourceType.get(sourceType) ?? [],
    metadata: {
      sourceType
    }
  }));
}

function getSliceObjectIds(city: GeneratedCity, traffic: TrafficPlan, sliceId: CityId): CityId[] {
  const slice = city.verticalSlices.find((candidate) => candidate.id === sliceId);

  if (!slice) {
    return [];
  }

  const sliceRoadIds = new Set([...slice.roadIds, ...slice.crossStreetRoadIds]);
  const sliceCrossingIds = new Set(slice.crossingIds);
  const sliceIntersectionIds = new Set(slice.intersectionIds);

  return [
    slice.id,
    ...slice.roadIds,
    ...slice.crossStreetRoadIds,
    ...slice.sidewalkIds,
    ...slice.intersectionIds,
    ...slice.crossingIds,
    ...slice.curbZoneIds,
    ...slice.sidewalkGraphNodeIds,
    ...slice.sidewalkGraphEdgeIds,
    ...slice.parcelIds,
    ...slice.buildingIds,
    ...city.activeFrontages.filter((frontage) => frontage.sliceId === slice.id).map((frontage) => frontage.id),
    ...city.trees.filter((tree) => tree.sliceId === slice.id).map((tree) => tree.id),
    ...city.streetLights.filter((streetLight) => streetLight.sliceId === slice.id).map((streetLight) => streetLight.id),
    ...city.streetFurniture.filter((furniture) => furniture.sliceId === slice.id).map((furniture) => furniture.id),
    ...traffic.markings
      .filter(
        (marking) =>
          sliceRoadIds.has(marking.roadId) ||
          (marking.crossingId !== undefined && sliceCrossingIds.has(marking.crossingId)) ||
          (marking.intersectionId !== undefined && sliceIntersectionIds.has(marking.intersectionId))
      )
      .map((marking) => marking.id),
    ...traffic.vehicles.filter((vehicle) => sliceRoadIds.has(vehicle.roadId)).map((vehicle) => vehicle.id)
  ];
}
