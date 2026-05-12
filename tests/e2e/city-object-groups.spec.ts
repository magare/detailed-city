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
    first.city.roads.length + first.traffic.markings.length + first.city.trafficCalmingDevices.length
  );
  expect(getCityObjectsByRenderLayer(first.groupIndex, 'buildings')).toHaveLength(
    first.city.buildings.length + first.city.activeFrontages.length
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
    objectCount: first.city.roads.length + first.traffic.markings.length + first.city.trafficCalmingDevices.length
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

test('browser diagnostics expose grouped object counts for debug tools', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const groupDiagnostics = await page.evaluate(() => ({
    validationPassed: window.cityDiagnostics?.objectGroups.validation.passed,
    groupCount: window.cityDiagnostics?.objectGroups.groupCount,
    emptyGroups: window.cityDiagnostics?.objectGroups.emptyGroupCount,
    ownerDomainGroups: window.cityDiagnostics?.objectGroups.countsByKind['owner-domain'],
    districtGroups: window.cityDiagnostics?.objectGroups.countsByKind.district,
    renderLayerGroups: window.cityDiagnostics?.objectGroups.countsByKind['render-layer'],
    networkRenderLayerObjects:
      window.cityDiagnostics?.objectGroupIndex.groupsById['group:render-layer:networks']?.objectCount,
    baselineScenarioObjects:
      window.cityDiagnostics?.objectGroupIndex.groupsById['group:scenario-layer:baseline']?.objectCount,
    sliceGroupObjects:
      window.cityDiagnostics?.objectGroupIndex.groupsById['group:vertical-slice:slice-detailed-street-road-v-6']
        ?.objectCount,
    roadGroups: [...(window.cityDiagnostics?.objectGroupIndex.groupIdsByObjectId['road-v-6'] ?? [])].sort().join(',')
  }));

  expect(groupDiagnostics).toMatchObject({
    validationPassed: true,
    groupCount: 32,
    ownerDomainGroups: 13,
    districtGroups: 5,
    renderLayerGroups: 6,
    networkRenderLayerObjects: 988,
    baselineScenarioObjects: 4937
  });
  expect(groupDiagnostics.emptyGroups).toBeGreaterThan(0);
  expect(groupDiagnostics.sliceGroupObjects).toBeGreaterThan(1000);
  expect(groupDiagnostics.roadGroups).toContain('group:corridor:road-v-6');
  expect(groupDiagnostics.roadGroups).toContain('group:render-layer:networks');
  expect(groupDiagnostics.roadGroups).toContain('group:vertical-slice:slice-detailed-street-road-v-6');
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
