import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('park expansion features are deterministic, indexed, and connected to sidewalks', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const diagnostics = createCityDiagnostics(firstCity, createTraffic(firstCity), renderConfig);

  expect(firstCity.parkFeatures.map((feature) => feature.id)).toEqual(
    secondCity.parkFeatures.map((feature) => feature.id)
  );
  expect(firstCity.parkFeatures).toHaveLength(24);
  expect(firstCity.objectIndex.countsByKind['park-feature']).toBe(24);
  expect(firstCity.validation.issues.filter((issue) => issue.objectId?.startsWith('park-feature-'))).toEqual([]);
  expect(firstCity.parks.map((park) => park.connectedSidewalkIds.length)).toEqual([2, 2, 2]);
  expect(firstCity.parks.map((park) => park.pathFeatureIds.length)).toEqual([2, 2, 2]);
  expect(firstCity.parks.map((park) => park.programZoneIds.length)).toEqual([6, 6, 6]);
  expect(diagnostics.parkExpansion).toMatchObject({
    totalFeatures: 24,
    pathFeatures: 6,
    programZones: 18,
    accessibleFeatures: 21,
    connectedParks: 3,
    sidewalkConnections: 6
  });
  expect(diagnostics.parkExpansion.byKind).toMatchObject({
    lawn: 3,
    path: 6,
    planting: 3,
    sports: 3,
    seating: 3,
    'water-feature': 3,
    shade: 3
  });
});

test('park expansion validation catches broken access, parent, and binding references', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [firstPark, ...remainingParks] = city.parks;
  const [firstFeature, ...remainingFeatures] = city.parkFeatures;
  const invalidPark = {
    ...firstPark,
    connectedSidewalkIds: [],
    pathFeatureIds: ['missing-park-path']
  };
  const invalidFeature = {
    ...firstFeature,
    parentId: 'central-park',
    parkId: 'central-park',
    center: { x: 680, z: 680 },
    connectedSidewalkIds: ['missing-sidewalk'],
    assetBindingId: 'missing-park-feature-binding'
  };
  const invalidCity = {
    ...city,
    parks: [invalidPark, ...remainingParks],
    parkFeatures: [invalidFeature, ...remainingFeatures]
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: `park-missing-sidewalk-connection-${firstPark.id}`,
        category: 'graph'
      }),
      expect.objectContaining({
        id: `park-missing-feature-missing-park-path-${firstPark.id}`,
        category: 'graph'
      }),
      expect.objectContaining({
        id: `park-feature-outside-park-${firstFeature.id}`,
        category: 'geometry'
      }),
      expect.objectContaining({
        id: `park-feature-missing-sidewalk-${firstFeature.id}-missing-sidewalk`,
        category: 'graph'
      }),
      expect.objectContaining({
        id: `park-feature-missing-binding-${firstFeature.id}`,
        category: 'asset'
      })
    ])
  );
});

test('browser diagnostics expose park expansion counts and debug panel metric', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const diagnostics = await page.evaluate(() => ({
    validationPassed: window.cityDiagnostics?.validation.passed,
    objectCounts: window.cityDiagnostics?.objectCounts,
    parkExpansion: window.cityDiagnostics?.parkExpansion,
    parkFeatureObjects: window.cityDiagnostics?.objectIndex.countsByKind['park-feature'],
    pickableParkFeature: window.cityDiagnostics?.picking.pickableObjects.find(
      (metadata) => metadata.kind === 'park-feature'
    ),
    debugText: document.querySelector('[data-city-debug-panel="true"]')?.textContent ?? '',
    canvasCount: document.querySelectorAll('canvas').length
  }));

  expect(diagnostics.validationPassed).toBe(true);
  expect(diagnostics.objectCounts).toMatchObject({
    parks: 3,
    parkFeatures: 24,
    parkPaths: 6,
    parkProgramZones: 18,
    parkSidewalkConnections: 6
  });
  expect(diagnostics.parkExpansion).toMatchObject({
    totalFeatures: 24,
    connectedParks: 3
  });
  expect(diagnostics.parkFeatureObjects).toBe(24);
  expect(diagnostics.pickableParkFeature).toMatchObject({
    kind: 'park-feature',
    ownerDomain: 'public-realm',
    parentId: 'central-park'
  });
  expect(diagnostics.canvasCount).toBe(1);
  expect(diagnostics.debugText).toContain('Parks');
  expect(diagnostics.debugText).toContain('24 features, 6 paths, 3 connected');
});

function createTraffic(city: ReturnType<CityGenerator['generate']>) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections,
    trafficCalmingDevices: city.trafficCalmingDevices
  });
}
