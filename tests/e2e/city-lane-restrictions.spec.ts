import { expect, test } from '@playwright/test';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { validateTrafficPlan } from '../../src/city/data-contracts/validation/validateTrafficPlan';
import { cityConfig } from '../../src/config/cityConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('lane-level restrictions are deterministic and support mode-specific routing', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const firstTraffic = createTraffic(firstCity);
  const laneRoles = countLaneRoles(firstCity);
  const firstRoad = firstCity.roads.find((road) => road.id === 'road-v-0');
  const transitRoad = firstCity.roads.find((road) => road.id === 'road-h-6');
  const [firstVehicle] = firstTraffic.vehicles;

  expect(firstCity.roads.flatMap((road) => road.lanes.map((lane) => lane.laneRole))).toEqual(
    secondCity.roads.flatMap((road) => road.lanes.map((lane) => lane.laneRole))
  );
  expect(laneRoles).toEqual({
    'bus-only': 10,
    general: 48,
    reversible: 1,
    service: 4,
    'turn-pocket': 9
  });
  expect(firstRoad?.lanes[0]).toMatchObject({
    id: 'road-v-0-lane-0',
    laneIndex: 0,
    laneRole: 'bus-only',
    allowedModes: ['bus', 'emergency'],
    restrictedModes: ['vehicle', 'bike', 'freight'],
    turnMovements: ['through'],
    reversible: false
  });
  expect(transitRoad?.lanes[1]).toMatchObject({
    id: 'road-h-6-lane-1',
    laneRole: 'reversible',
    allowedModes: ['vehicle', 'bus', 'emergency'],
    turnMovements: ['left', 'through', 'right'],
    reversible: true
  });
  expect(firstVehicle).toMatchObject({
    id: 'traffic-vehicle-0',
    roadId: 'road-v-0',
    laneId: 'road-v-0-lane-1'
  });
  expect(validateTraffic(firstCity, firstTraffic).issues).toEqual([]);
});

test('lane policy validation catches invalid mode and continuity metadata', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [road, ...remainingRoads] = city.roads;
  const invalidRoad = {
    ...road,
    lanes: road.lanes.map((lane, index) =>
      index === 0
        ? {
            ...lane,
            laneRole: 'bus-only' as const,
            allowedModes: ['vehicle'] as const,
            restrictedModes: ['vehicle'] as const,
            turnMovements: [],
            continuityGroupId: '',
            reversible: true
          }
        : lane
    )
  };
  const invalidCity = {
    ...city,
    roads: [invalidRoad, ...remainingRoads]
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: 'invalid-lane-policy-road-v-0-lane-0', category: 'graph' }),
      expect.objectContaining({ id: 'invalid-lane-mode-policy-road-v-0-lane-0', category: 'graph' }),
      expect.objectContaining({ id: 'invalid-bus-lane-policy-road-v-0-lane-0', category: 'graph' })
    ])
  );
});

test('traffic validation rejects vehicles assigned to restricted lanes', () => {
  const city = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(city);
  const [vehicle] = traffic.vehicles;
  const invalidTraffic = {
    ...traffic,
    vehicles: traffic.vehicles.map((candidate) =>
      candidate.id === vehicle.id ? { ...candidate, laneId: 'road-v-0-lane-0' } : candidate
    )
  };
  const validation = validateTraffic(city, invalidTraffic);

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: `traffic-vehicle-lane-mode-mismatch-${vehicle.id}`,
        category: 'simulation'
      })
    ])
  );
});

test('browser diagnostics expose lane-level restriction counts', async ({ page }) => {
  await page.goto('/?testMode=fast');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const diagnostics = await page.evaluate(() => ({
    validationPassed: window.cityDiagnostics?.validation.passed,
    trafficValidationPassed: window.cityDiagnostics?.trafficValidation.passed,
    laneRestrictions: window.cityDiagnostics?.laneRestrictions,
    objectCounts: window.cityDiagnostics?.objectCounts,
    roadOverlay: window.cityDiagnostics?.overlays.find((overlay) => overlay.id === 'roads'),
    debugText: document.body.textContent
  }));

  expect(diagnostics.validationPassed).toBe(true);
  expect(diagnostics.trafficValidationPassed).toBe(true);
  expect(diagnostics.laneRestrictions).toMatchObject({
    total: 72,
    busOnlyLanes: 10,
    reversibleLanes: 1,
    turnPocketLanes: 9,
    freightRestrictedLanes: 20,
    continuityGroups: 71
  });
  expect(diagnostics.objectCounts).toMatchObject({
    busOnlyLanes: 10,
    reversibleLanes: 1,
    turnPocketLanes: 9,
    laneContinuityGroups: 71
  });
  expect(diagnostics.roadOverlay?.features.find((feature) => feature.objectId === 'road-h-6')?.metadata).toMatchObject({
    busOnlyLanes: 1,
    reversibleLanes: 1
  });
  expect(diagnostics.debugText).toContain('Lanes');
});

function createTraffic(city: ReturnType<CityGenerator['generate']>) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections
  });
}

function validateTraffic(city: ReturnType<CityGenerator['generate']>, traffic: ReturnType<TrafficLaneGenerator['create']>) {
  return validateTrafficPlan({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections,
    assetBindings: city.assetBindings,
    traffic,
    lodPolicy: city.lodPolicy
  });
}

function countLaneRoles(city: ReturnType<CityGenerator['generate']>): Record<string, number> {
  return city.roads.flatMap((road) => road.lanes).reduce<Record<string, number>>((counts, lane) => {
    counts[lane.laneRole] = (counts[lane.laneRole] ?? 0) + 1;
    return counts;
  }, {});
}
