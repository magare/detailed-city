import { expect, test } from '@playwright/test';
import { createGeneratedRuntimeObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { createGeneratedCityObjectGroupIndex } from '../../src/city/data-contracts/generatedCityObjectGroups';
import {
  createCityObjectGroupDiagnostics,
  createCityObjectGroupIndex,
  getCityObjectsByOwnerDomain,
  getCityObjectsByRenderLayer,
  getCityObjectsByScenarioLayer,
  getCityObjectsByVerticalSlice,
  queryCityObjectGroups
} from '../../src/city/data-contracts/cityObjectGroups';
import { validateTrafficPlan } from '../../src/city/data-contracts/validation/validateTrafficPlan';
import { cityConfig } from '../../src/config/cityConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('city object groups provide deterministic query paths for domains, slices, scenarios, and render layers', () => {
  const first = createGroupedCity();
  const second = createGroupedCity();
  const sliceId = 'slice-detailed-street-road-v-6';

  expect(first.groupIndex.groupIds).toEqual(second.groupIndex.groupIds);
  expect(first.groupIndex.groups.map((group) => [group.id, group.objectCount])).toEqual(
    second.groupIndex.groups.map((group) => [group.id, group.objectCount])
  );
  expect(first.diagnostics.validation.passed).toBe(true);
  expect(first.diagnostics.duplicateGroupIds).toEqual([]);
  expect(first.diagnostics.missingObjectReferences).toBe(0);
  expect(first.diagnostics.countsByKind).toMatchObject({
    'authored-set': 4,
    corridor: 1,
    district: 5,
    'owner-domain': 13,
    'render-layer': 6,
    'scenario-layer': 1,
    'validation-selection': 1,
    'vertical-slice': 1
  });

  const mobilityObjects = getCityObjectsByOwnerDomain(first.groupIndex, 'mobility');
  expect(mobilityObjects).toHaveLength(
    first.runtimeIndex.objects.filter((object) => object.ownerDomain === 'mobility').length
  );
  expect(mobilityObjects.map((object) => object.id)).toContain('road-v-0');
  expect(mobilityObjects.map((object) => object.id)).toContain('crossing-intersection-v0-h0-road-v-0');

  const sliceObjects = getCityObjectsByVerticalSlice(first.groupIndex, sliceId);
  const slice = first.city.verticalSlices[0];
  const firstCurbZone = first.city.curbZones.find((curbZone) => curbZone.sliceId === slice.id);
  const firstActiveFrontage = first.city.activeFrontages.find((frontage) => frontage.sliceId === slice.id);
  const firstStreetLight = first.city.streetLights.find((streetLight) => streetLight.sliceId === slice.id);
  const firstStreetFurniture = first.city.streetFurniture.find((furniture) => furniture.sliceId === slice.id);

  expect(firstCurbZone).toBeDefined();
  expect(firstActiveFrontage).toBeDefined();
  expect(firstStreetLight).toBeDefined();
  expect(firstStreetFurniture).toBeDefined();
  expect(sliceObjects.map((object) => object.id)).toEqual(
    expect.arrayContaining([
      sliceId,
      slice.corridorRoadId,
      slice.sidewalkIds[0],
      firstCurbZone?.id,
      firstActiveFrontage?.id,
      firstStreetLight?.id,
      firstStreetFurniture?.id
    ])
  );
  expect(sliceObjects.some((object) => object.kind === 'lane-marking')).toBe(true);
  expect(sliceObjects.some((object) => object.kind === 'traffic-vehicle')).toBe(true);

  const baselineScenarioObjects = getCityObjectsByScenarioLayer(first.groupIndex, 'baseline');
  expect(baselineScenarioObjects).toHaveLength(first.runtimeIndex.objectIds.length);

  expect(getCityObjectsByRenderLayer(first.groupIndex, 'networks')).toHaveLength(
    first.city.roads.length +
      first.traffic.markings.length +
      first.city.trafficCalmingDevices.length +
      first.city.bikeSegments.length +
      first.city.bikeGraphNodes.length +
      first.city.bikeGraphEdges.length +
      first.city.bikeSignals.length +
      first.city.bikeConflictZones.length +
      first.city.navigationGraphNodes.length +
      first.city.navigationGraphEdges.length +
      first.city.navigationRoutes.length +
      first.city.freightLoadingDocks.length +
      first.city.freightRoutes.length +
      first.city.serviceAlleys.length +
      first.city.waterTransportAccess.length
  );
  expect(getCityObjectsByRenderLayer(first.groupIndex, 'buildings')).toHaveLength(
    first.city.buildings.length +
      first.city.civicAnchors.length +
      first.city.communityAnchors.length +
      first.city.cultureAnchors.length +
      first.city.governmentAnchors.length +
      first.city.educationAnchors.length +
      first.city.healthcareAnchors.length +
      first.city.emergencyServiceAnchors.length +
      first.city.economyAnchors.length +
      first.city.activeFrontages.length
  );
  expect(getCityObjectsByRenderLayer(first.groupIndex, 'agents')).toHaveLength(first.traffic.vehicles.length);

  expect(queryCityObjectGroups(first.groupIndex, { groupKind: 'district' })).toHaveLength(5);
  expect(
    queryCityObjectGroups(first.groupIndex, {
      groupKind: 'render-layer',
      metadata: { renderLayerId: 'networks' }
    })[0]
  ).toMatchObject({
    id: 'group:render-layer:networks',
    objectCount: first.city.roads.length +
      first.traffic.markings.length +
      first.city.trafficCalmingDevices.length +
      first.city.bikeSegments.length +
      first.city.bikeGraphNodes.length +
      first.city.bikeGraphEdges.length +
      first.city.bikeSignals.length +
      first.city.bikeConflictZones.length +
      first.city.navigationGraphNodes.length +
      first.city.navigationGraphEdges.length +
      first.city.navigationRoutes.length +
      first.city.freightLoadingDocks.length +
      first.city.freightRoutes.length +
      first.city.serviceAlleys.length +
      first.city.waterTransportAccess.length
  });
});

test('city object group validation catches duplicate groups and missing members', () => {
  const { runtimeIndex } = createGroupedCity();
  const invalidGroupIndex = createCityObjectGroupIndex(runtimeIndex, [
    {
      id: 'group:district:duplicate',
      kind: 'district',
      name: 'Duplicate A',
      ownerDomain: 'land',
      source: 'domain-data',
      objectIds: ['road-v-0', 'missing-object']
    },
    {
      id: 'group:district:duplicate',
      kind: 'district',
      name: 'Duplicate B',
      ownerDomain: 'land',
      source: 'domain-data',
      objectIds: []
    },
    {
      id: 'group:corridor:missing-parent',
      kind: 'corridor',
      name: 'Missing Parent',
      ownerDomain: 'blueprint',
      source: 'domain-data',
      objectIds: ['road-v-0'],
      parentGroupId: 'group:vertical-slice:missing'
    }
  ]);
  const diagnostics = createCityObjectGroupDiagnostics(invalidGroupIndex);

  expect(diagnostics.validation.passed).toBe(false);
  expect(diagnostics.validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: 'duplicate-city-object-group-group:district:duplicate',
        category: 'identifier'
      }),
      expect.objectContaining({
        id: 'missing-city-object-group-member-group:district:duplicate-missing-object',
        category: 'graph'
      }),
      expect.objectContaining({
        id: 'missing-city-object-parent-group-group:corridor:missing-parent-group:vertical-slice:missing',
        category: 'graph'
      })
    ])
  );
});

function createGroupedCity() {
  const city = new CityGenerator(cityConfig).generate();
  const traffic = new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections
  });
  const runtimeIndex = createGeneratedRuntimeObjectIndex(city, traffic);
  const trafficValidation = validateTrafficPlan({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections,
    assetBindings: city.assetBindings,
    traffic,
    lodPolicy: city.lodPolicy
  });
  const groupIndex = createGeneratedCityObjectGroupIndex(city, traffic, runtimeIndex, [
    ...city.validation.issues,
    ...trafficValidation.issues
  ]);
  const diagnostics = createCityObjectGroupDiagnostics(groupIndex);

  return {
    city,
    traffic,
    runtimeIndex,
    groupIndex,
    diagnostics
  };
}
