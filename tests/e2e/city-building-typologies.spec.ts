import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';
import type { TrafficPlan } from '../../src/types/city';

test('building typologies are deterministic and drive building defaults', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(firstCity);
  const diagnostics = createCityDiagnostics(firstCity, traffic, renderConfig);
  const firstTypologySignature = firstCity.buildings.map((building) => [
    building.id,
    building.typology.typologyId,
    building.typology.kind,
    building.typology.facadeGrammarId,
    building.typology.roofGrammarId,
    building.typology.entranceStrategy,
    building.typology.serviceAccess,
    building.typology.scheduleProfileId
  ]);

  expect(firstTypologySignature).toEqual(
    secondCity.buildings.map((building) => [
      building.id,
      building.typology.typologyId,
      building.typology.kind,
      building.typology.facadeGrammarId,
      building.typology.roofGrammarId,
      building.typology.entranceStrategy,
      building.typology.serviceAccess,
      building.typology.scheduleProfileId
    ])
  );
  expect(firstCity.validation.issues.filter((issue) => issue.id.includes('typology'))).toEqual([]);
  expect(diagnostics.buildingTypologies.buildingsWithTypology).toBe(firstCity.buildings.length);
  expect(diagnostics.buildingTypologies.typologyKinds).toBeGreaterThanOrEqual(4);
  expect(diagnostics.buildingTypologies.byKind['mixed-use']).toBeGreaterThan(0);
  expect(diagnostics.buildingTypologies.byKind.industrial).toBeGreaterThan(0);
  expect(diagnostics.buildingTypologies.byKind.civic).toBeGreaterThan(0);

  const mixedUseBuilding = firstCity.buildings.find((building) => building.typology.kind === 'mixed-use');
  expect(mixedUseBuilding).toBeDefined();
  expect(mixedUseBuilding).toMatchObject({
    typology: {
      typologyId: 'building-typology-mixed-use',
      entranceStrategy: 'storefront',
      serviceAccess: 'curb-loading',
      scheduleProfileId: 'schedule:mixed-use:baseline'
    }
  });
  expect(mixedUseBuilding?.facadeGrammarId).toBe(mixedUseBuilding?.typology.facadeGrammarId);
  expect(mixedUseBuilding?.roofGrammarId).toBe(mixedUseBuilding?.typology.roofGrammarId);
  expect(mixedUseBuilding?.floorCount).toBe(
    Math.max(1, Math.round((mixedUseBuilding?.heightMeters ?? 0) / (mixedUseBuilding?.typology.typicalFloorHeightMeters ?? 1)))
  );
});

test('building typology validation rejects invalid defaults', () => {
  const city = new CityGenerator(cityConfig).generate();
  const building = city.buildings.find((candidate) => candidate.typology.kind === 'mixed-use');
  expect(building).toBeDefined();
  const invalidBuilding = {
    ...building!,
    facadeGrammarId: 'detached-invalid-facade',
    typology: {
      ...building!.typology,
      typologyId: 'building-typology-not-real',
      heightRangeMeters: [1, 2] as const,
      scheduleProfileId: ''
    }
  };
  const invalidCity = {
    ...city,
    buildings: city.buildings.map((candidate) => (candidate.id === invalidBuilding.id ? invalidBuilding : candidate))
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: `invalid-building-typology-kind-${building!.id}`,
        category: 'zoning',
        objectId: building!.id
      }),
      expect.objectContaining({
        id: `building-height-outside-typology-${building!.id}`,
        category: 'zoning',
        objectId: building!.id
      }),
      expect.objectContaining({
        id: `building-grammar-mismatch-typology-${building!.id}`,
        category: 'zoning',
        objectId: building!.id
      }),
      expect.objectContaining({
        id: `invalid-building-typology-defaults-${building!.id}`,
        category: 'zoning',
        objectId: building!.id
      })
    ])
  );
});

test('browser diagnostics expose building typology counts in the debug panel', async ({ page }) => {
  await page.goto('/?testMode=fast');
  await expect(page.locator('.city-debug-panel')).toBeVisible();

  const diagnostics = await page.evaluate(() => ({
    validationPassed: window.cityDiagnostics?.validation.passed,
    buildings: window.cityDiagnostics?.objectCounts.buildings,
    buildingTypologyKinds: window.cityDiagnostics?.objectCounts.buildingTypologyKinds,
    buildingsWithTypology: window.cityDiagnostics?.buildingTypologies.buildingsWithTypology,
    storefrontEntrances: window.cityDiagnostics?.buildingTypologies.storefrontEntrances,
    typologyMetric: [...document.querySelectorAll('.city-debug-panel__metric')].find(
      (metric) => metric.textContent?.startsWith('Typologies')
    )?.textContent
  }));

  expect(diagnostics.validationPassed).toBe(true);
  expect(diagnostics.buildingsWithTypology).toBe(diagnostics.buildings);
  expect(diagnostics.buildingTypologyKinds).toBeGreaterThanOrEqual(4);
  expect(diagnostics.storefrontEntrances).toBeGreaterThan(0);
  expect(diagnostics.typologyMetric).toContain('Typologies');
});

function createTraffic(city: ReturnType<CityGenerator['generate']>): TrafficPlan {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    intersections: city.intersections,
    crossings: city.crossings,
    trafficCalmingDevices: city.trafficCalmingDevices
  });
}
