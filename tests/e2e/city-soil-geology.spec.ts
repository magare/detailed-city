import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex, createGeneratedRuntimeObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { createCityOverlayDatasets } from '../../src/city/rendering-handoff/overlays/overlayData';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('soil geology model is deterministic, indexed, and queryable from parcels and buildings', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(firstCity);
  const diagnostics = createCityDiagnostics(firstCity, traffic, renderConfig);
  const overlays = createCityOverlayDatasets(firstCity, createGeneratedRuntimeObjectIndex(firstCity, traffic));

  expect(firstCity.soilGeologyZones.map((zone) => zone.id)).toEqual(secondCity.soilGeologyZones.map((zone) => zone.id));
  expect(firstCity.soilGeologyZones).toHaveLength(5);
  expect(firstCity.objectIndex.countsByKind['soil-geology-zone']).toBe(5);
  expect(firstCity.parcels.every((parcel) => parcel.soilGeologyZoneIds?.length)).toBe(true);
  expect(firstCity.buildings.every((building) => building.soilGeologyZoneIds?.length)).toBe(true);
  expect(firstCity.validation.issues.filter((issue) => issue.category === 'land')).toEqual([]);
  expect(firstCity.soilGeologyZones.find((zone) => zone.soilKind === 'contaminated-fill')).toMatchObject({
    foundationSuitability: 'restricted-remediation',
    contamination: {
      status: 'watch',
      remediationRequired: true
    },
    tunnelDifficulty: 'high'
  });
  expect(firstCity.soilGeologyZones.some((zone) => zone.drainageAssumption === 'dewatering-required')).toBe(true);
  expect(diagnostics.soilGeology).toMatchObject({
    total: 5,
    contaminatedZones: 3,
    remediationRequiredZones: 1,
    zonesWithTopographyRefs: 5,
    parcelsWithSoilGeology: firstCity.parcels.length,
    buildingsWithSoilGeology: firstCity.buildings.length
  });
  expect(diagnostics.objectCounts).toMatchObject({
    soilGeologyZones: 5,
    contaminatedSoilZones: 3,
    parcelsWithSoilGeology: firstCity.parcels.length,
    buildingsWithSoilGeology: firstCity.buildings.length
  });
  expect(overlays.find((overlay) => overlay.id === 'soil-geology')?.featureCount).toBe(5);
  expect(overlays.find((overlay) => overlay.id === 'soil-geology')?.features[0]).toMatchObject({
    objectKind: 'soil-geology-zone',
    ownerDomain: 'land',
    geometry: { type: 'polygon' },
    metadata: {
      foundationSuitability: expect.any(String),
      tunnelDifficulty: expect.any(String),
      drainageAssumption: expect.any(String)
    }
  });
});

test('soil geology validation catches invalid ground metrics and missing query references', () => {
  const city = new CityGenerator(cityConfig).generate();
  const zone = city.soilGeologyZones[0];
  const invalidZone = {
    ...zone,
    soilKind: 'bogus-soil',
    topographyZoneIds: [],
    hazardZoneIds: ['missing-hazard-zone'],
    foundationSuitability: 'bogus-foundation',
    bearingCapacityKpa: 20,
    contamination: {
      status: 'watch',
      hazardZoneIds: [],
      remediationRequired: true
    }
  } as unknown as typeof zone;
  const invalidParcel = {
    ...city.parcels[0],
    soilGeologyZoneIds: []
  };
  const invalidBuilding = {
    ...city.buildings[0],
    soilGeologyZoneIds: ['missing-soil-zone']
  };
  const invalidCity = {
    ...city,
    soilGeologyZones: [invalidZone, ...city.soilGeologyZones.slice(1)],
    parcels: [invalidParcel, ...city.parcels.slice(1)],
    buildings: [invalidBuilding, ...city.buildings.slice(1)]
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: `soil-geology-invalid-soil-kind-${zone.id}`, category: 'land' }),
      expect.objectContaining({ id: `soil-geology-invalid-topography-reference-${zone.id}`, category: 'land' }),
      expect.objectContaining({ id: `soil-geology-invalid-hazard-reference-${zone.id}`, category: 'land' }),
      expect.objectContaining({ id: `soil-geology-invalid-ground-metrics-${zone.id}`, category: 'land' }),
      expect.objectContaining({ id: `soil-geology-invalid-contamination-hint-${zone.id}`, category: 'land' }),
      expect.objectContaining({ id: `invalid-parcel-soil-geology-zone-reference-${invalidParcel.id}`, category: 'land' }),
      expect.objectContaining({ id: `invalid-building-soil-geology-zone-reference-${invalidBuilding.id}`, category: 'land' })
    ])
  );
});

test('browser diagnostics expose soil geology counts and debug panel metric', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const diagnostics = await page.evaluate(() => ({
    validationPassed: window.cityDiagnostics?.validation.passed,
    soilGeology: window.cityDiagnostics?.soilGeology,
    objectCounts: window.cityDiagnostics?.objectCounts,
    soilOverlayFeatures: window.cityDiagnostics?.overlays.find((overlay) => overlay.id === 'soil-geology')?.featureCount,
    soilObjects: window.cityDiagnostics?.objectIndex.countsByKind['soil-geology-zone'],
    debugText: document.querySelector('[data-city-debug-panel="true"]')?.textContent ?? '',
    canvasCount: document.querySelectorAll('canvas').length
  }));

  expect(diagnostics.validationPassed).toBe(true);
  expect(diagnostics.soilGeology).toMatchObject({
    total: 5,
    contaminatedZones: 3,
    remediationRequiredZones: 1
  });
  expect(diagnostics.objectCounts).toMatchObject({
    soilGeologyZones: 5,
    contaminatedSoilZones: 3
  });
  expect(diagnostics.soilOverlayFeatures).toBe(5);
  expect(diagnostics.soilObjects).toBe(5);
  expect(diagnostics.canvasCount).toBe(1);
  expect(diagnostics.debugText).toContain('Soils');
});

function createTraffic(city: ReturnType<CityGenerator['generate']>) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections,
    trafficCalmingDevices: city.trafficCalmingDevices
  });
}
