import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import {
  DEFAULT_STREET_PROFILES,
  type StreetHierarchy
} from '../../src/city/data-contracts/cityContracts';
import { createGeneratedCityObjectIndex, createGeneratedRuntimeObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { createCityOverlayDatasets } from '../../src/city/rendering-handoff/overlays/overlayData';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('street network hierarchy is deterministic and profile-driven', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(firstCity);
  const diagnostics = createCityDiagnostics(firstCity, traffic, renderConfig);
  const runtimeIndex = createGeneratedRuntimeObjectIndex(firstCity, traffic);
  const overlays = createCityOverlayDatasets(firstCity, runtimeIndex);
  const profilesById = new Map<string, (typeof DEFAULT_STREET_PROFILES)[number]>(
    DEFAULT_STREET_PROFILES.map((profile) => [profile.id, profile])
  );
  const hierarchyKinds = new Set(firstCity.roads.map((road) => road.hierarchy));
  const roadOverlay = overlays.find((overlay) => overlay.id === 'roads');
  const transitRoad = firstCity.roads.find((road) => road.id === 'road-h-6');
  const detailedStreetRoad = firstCity.roads.find((road) => road.id === 'road-v-6');

  expect(firstCity.roads.map((road) => road.id)).toEqual(secondCity.roads.map((road) => road.id));
  expect(firstCity.roads.map((road) => road.streetProfileId)).toEqual(
    secondCity.roads.map((road) => road.streetProfileId)
  );
  expect(hierarchyKinds).toEqual(
    new Set<StreetHierarchy>(['arterial', 'collector', 'local', 'alley', 'promenade', 'transit-corridor'])
  );
  expect(firstCity.roads.every((road) => road.lanes.length === road.laneCount)).toBe(true);
  expect(
    firstCity.roads.every((road) => {
      const profile = profilesById.get(road.streetProfileId);

      return (
        profile &&
        road.hierarchy === profile.hierarchy &&
        road.laneCount === profile.vehicleLanes &&
        road.designSpeedKph === profile.designSpeedKph &&
        road.rightOfWayWidthMeters === profile.totalWidthMeters &&
        road.corridorId.length > 0 &&
        road.corridorName.length > 0 &&
        road.continuityGroupId.length > 0
      );
    })
  ).toBe(true);
  expect(detailedStreetRoad).toMatchObject({
    id: 'road-v-6',
    hierarchy: 'arterial',
    streetProfileId: 'grand-avenue',
    corridorName: 'Central Grand Avenue'
  });
  expect(transitRoad).toMatchObject({
    id: 'road-h-6',
    hierarchy: 'transit-corridor',
    streetProfileId: 'transit-corridor',
    transitEligible: true,
    corridorName: 'Crosstown Transit Corridor'
  });
  expect(firstCity.intersections.find((intersection) => intersection.id === 'intersection-v0-h6')).toMatchObject({
    hierarchyMix: ['arterial', 'transit-corridor'],
    signalExpectation: 'signalized'
  });
  expect(diagnostics.roadNetwork).toMatchObject({
    total: firstCity.roads.length,
    hierarchyKinds: 6,
    transitEligibleRoads: expect.any(Number)
  });
  expect(diagnostics.roadNetwork.transitEligibleRoads).toBeGreaterThan(0);
  expect(diagnostics.objectCounts).toMatchObject({
    roadHierarchyKinds: 6,
    namedRoadCorridors: diagnostics.roadNetwork.namedCorridors.length,
    transitEligibleRoads: diagnostics.roadNetwork.transitEligibleRoads
  });
  expect(roadOverlay?.features.find((feature) => feature.objectId === 'road-h-6')?.metadata).toMatchObject({
    hierarchy: 'transit-corridor',
    profile: 'transit-corridor',
    corridorName: 'Crosstown Transit Corridor',
    designSpeedKph: 35,
    rightOfWayWidthMeters: 30,
    transitEligible: true
  });
});

test('road hierarchy validator catches profile and corridor policy mismatches', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [road, ...remainingRoads] = city.roads;
  const invalidRoad = {
    ...road,
    hierarchy: 'local' as const,
    designSpeedKph: 5,
    corridorId: '',
    corridorName: '',
    continuityGroupId: ''
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
      expect.objectContaining({ id: `road-profile-policy-mismatch-${road.id}`, category: 'graph' }),
      expect.objectContaining({ id: `missing-road-corridor-${road.id}`, category: 'graph' })
    ])
  );
});

function createTraffic(city: ReturnType<CityGenerator['generate']>) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections
  });
}
