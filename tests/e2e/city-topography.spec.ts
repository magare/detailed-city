import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex, createGeneratedRuntimeObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { createCityOverlayDatasets } from '../../src/city/rendering-handoff/overlays/overlayData';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('topography model is deterministic and attaches ground profiles to roads and buildings', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(firstCity);
  const diagnostics = createCityDiagnostics(firstCity, traffic, renderConfig);
  const runtimeIndex = createGeneratedRuntimeObjectIndex(firstCity, traffic);
  const overlays = createCityOverlayDatasets(firstCity, runtimeIndex);
  const road = firstCity.roads.find((candidate) => candidate.id === 'road-v-6');
  const building = firstCity.buildings[0];

  expect(firstCity.topographyZones.map((zone) => zone.id)).toEqual(secondCity.topographyZones.map((zone) => zone.id));
  expect(firstCity.topographyZones).toHaveLength(5);
  expect(firstCity.objectIndex.countsByKind['topography-zone']).toBe(5);
  expect(firstCity.topographyZones[0]).toMatchObject({
    id: 'topography-zone-retaining-condition-0',
    kind: 'topography-zone',
    ownerDomain: 'land',
    lod: 'lod0',
    zoneKind: 'retaining-condition'
  });
  expect(road?.groundProfile).toBeDefined();
  expect(road?.groundProfile?.topographyZoneIds.length).toBeGreaterThan(0);
  expect(road?.groundProfile?.maxGradePercent).toBeLessThanOrEqual(12);
  expect(building?.groundElevationMeters).toEqual(expect.any(Number));
  expect(building?.finishedFloorElevationMeters).toBeGreaterThanOrEqual(building?.groundElevationMeters ?? 0);
  expect(building?.topographyZoneIds?.length).toBeGreaterThan(0);
  expect(firstCity.validation.issues.filter((issue) => issue.category === 'land')).toEqual([]);
  expect(diagnostics.topography).toMatchObject({
    total: 5,
    roadsWithGroundProfiles: firstCity.roads.length,
    buildingsWithGroundProfiles: firstCity.buildings.length
  });
  expect(diagnostics.topography.maxRoadGradePercent).toBeLessThanOrEqual(12);
  expect(diagnostics.objectCounts.topographyZones).toBe(5);
  expect(overlays.find((overlay) => overlay.id === 'topography')?.featureCount).toBe(5);
  expect(overlays.find((overlay) => overlay.id === 'topography')?.features[0]).toMatchObject({
    id: 'overlay:topography:topography-zone-retaining-condition-0',
    objectKind: 'topography-zone',
    ownerDomain: 'land',
    geometry: { type: 'polygon' },
    metadata: {
      zoneKind: 'retaining-condition'
    }
  });
});

test('topography validation catches missing road grades and impossible building grades', () => {
  const city = new CityGenerator(cityConfig).generate();
  const invalidRoad = {
    ...city.roads[0],
    groundProfile: undefined
  };
  const invalidBuilding = {
    ...city.buildings[0],
    maxFootprintGradePercent: 22,
    buildabilityFromLandform: 'restricted' as const
  };
  const invalidCity = {
    ...city,
    roads: [invalidRoad, ...city.roads.slice(1)],
    buildings: [invalidBuilding, ...city.buildings.slice(1)]
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: `missing-road-ground-profile-${invalidRoad.id}`, category: 'land' }),
      expect.objectContaining({ id: `impossible-building-footprint-grade-${invalidBuilding.id}`, category: 'land' })
    ])
  );
});

test('browser diagnostics expose topography counts and nonblank city output', async ({ page }) => {
  await page.goto('/?testMode=fast');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const diagnostics = await page.evaluate(() => ({
    topography: window.cityDiagnostics?.topography,
    objectCounts: window.cityDiagnostics?.objectCounts,
    topographyOverlay: window.cityDiagnostics?.overlays.find((overlay) => overlay.id === 'topography'),
    validationIssues: window.cityDiagnostics?.validation.issues.length,
    debugText: document.body.textContent,
    canvasCount: document.querySelectorAll('canvas').length
  }));

  expect(diagnostics.topography).toMatchObject({
    total: 5,
    roadsWithGroundProfiles: diagnostics.objectCounts?.roads,
    buildingsWithGroundProfiles: diagnostics.objectCounts?.buildings
  });
  expect(diagnostics.topography?.maxRoadGradePercent).toBeLessThanOrEqual(12);
  expect(diagnostics.objectCounts?.topographyZones).toBe(5);
  expect(diagnostics.topographyOverlay?.featureCount).toBe(5);
  expect(diagnostics.validationIssues).toBe(0);
  expect(diagnostics.canvasCount).toBe(1);
  expect(diagnostics.debugText).toContain('Validation');
});

function createTraffic(city: ReturnType<CityGenerator['generate']>) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections,
    trafficCalmingDevices: city.trafficCalmingDevices
  });
}
