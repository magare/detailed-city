import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex, createGeneratedRuntimeObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { createCityOverlayDatasets } from '../../src/city/rendering-handoff/overlays/overlayData';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('city metrics are deterministic, indexed, and exposed in diagnostics', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(firstCity);
  const diagnostics = createCityDiagnostics(firstCity, traffic, renderConfig);
  const runtimeIndex = createGeneratedRuntimeObjectIndex(firstCity, traffic);
  const overlays = createCityOverlayDatasets(firstCity, runtimeIndex);

  expect(firstCity.cityMetrics.map((metric) => [metric.id, metric.value, metric.status])).toEqual(
    secondCity.cityMetrics.map((metric) => [metric.id, metric.value, metric.status])
  );
  expect(firstCity.cityMetrics).toHaveLength(8);
  expect(firstCity.objectIndex.countsByKind['city-metric']).toBe(8);
  expect(firstCity.validation.issues.filter((issue) => issue.category === 'metrics')).toEqual([]);
  expect(firstCity.objectIndex.objectsById['city-metric-walkability']).toMatchObject({
    id: 'city-metric-walkability',
    kind: 'city-metric',
    ownerDomain: 'blueprint',
    lod: 'lod0',
    metricKind: 'walkability',
    value: 96.02,
    status: 'pass'
  });
  expect(firstCity.objectIndex.objectsById['city-metric-density']).toMatchObject({
    metricKind: 'density',
    value: 2029.27,
    status: 'warn'
  });
  expect(diagnostics.cityMetrics).toMatchObject({
    total: 8,
    passing: 6,
    warnings: 2,
    failing: 0,
    scoreAverage: 79.42
  });
  expect(diagnostics.cityMetrics.valuesByKind).toMatchObject({
    walkability: 96.02,
    density: 2029.27,
    'open-space-access': 21.65,
    'service-coverage': 100,
    traffic: 0.78,
    energy: 2.12,
    emissions: 706.7,
    'quality-checks': 100
  });
  expect(overlays.find((overlay) => overlay.id === 'city-metrics')?.featureCount).toBe(8);
});

test('city metric validation catches missing coverage and invalid references', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [baseMetric] = city.cityMetrics;
  const invalidMetric = {
    ...baseMetric,
    value: -1,
    status: 'pass' as const,
    computedFromObjectIds: ['missing-input-object'] as const
  };
  const invalidCity = {
    ...city,
    cityMetrics: city.cityMetrics.map((metric) => (metric.id === invalidMetric.id ? invalidMetric : metric))
  };
  const indexedInvalidCity = {
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  };
  const validation = validateGeneratedCity(indexedInvalidCity);

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: `city-metric-invalid-value-${invalidMetric.id}`,
        category: 'metrics',
        objectId: invalidMetric.id
      }),
      expect.objectContaining({
        id: `city-metric-status-target-mismatch-${invalidMetric.id}`,
        category: 'metrics',
        objectId: invalidMetric.id
      }),
      expect.objectContaining({
        id: `city-metric-missing-input-missing-input-object-${invalidMetric.id}`,
        category: 'metrics',
        objectId: invalidMetric.id
      })
    ])
  );
});

test('browser diagnostics expose city metrics for the debug panel', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const diagnostics = await page.evaluate(() => ({
    validationPassed: window.cityDiagnostics?.validation.passed,
    metrics: window.cityDiagnostics?.cityMetrics.total,
    passing: window.cityDiagnostics?.cityMetrics.passing,
    warnings: window.cityDiagnostics?.cityMetrics.warnings,
    walkability: window.cityDiagnostics?.cityMetrics.valuesByKind.walkability,
    overlayFeatures: window.cityDiagnostics?.overlays.find((overlay) => overlay.id === 'city-metrics')?.featureCount,
    debugText: document.querySelector('[data-city-debug-panel="true"]')?.textContent ?? ''
  }));

  expect(diagnostics).toMatchObject({
    validationPassed: true,
    metrics: 8,
    passing: 6,
    warnings: 2,
    walkability: 96.02,
    overlayFeatures: 8
  });
  expect(diagnostics.debugText).toContain('Metrics');
  expect(diagnostics.debugText).toContain('8 metrics, 6 pass, 2 warn');
});

function createTraffic(city: ReturnType<CityGenerator['generate']>) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections
  });
}
