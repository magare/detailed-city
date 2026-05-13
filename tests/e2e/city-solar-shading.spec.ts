import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex, createGeneratedRuntimeObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { countProceduralSeedDomainObjects, createProceduralSeedJsonExport } from '../../src/city/data-contracts/import-export';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { createCityOverlayDatasets } from '../../src/city/rendering-handoff/overlays/overlayData';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('solar shading samples are deterministic, indexed, and exported', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(firstCity);
  const diagnostics = createCityDiagnostics(firstCity, traffic, renderConfig);
  const runtimeIndex = createGeneratedRuntimeObjectIndex(firstCity, traffic);
  const overlays = createCityOverlayDatasets(firstCity, runtimeIndex);
  const exportArtifact = createProceduralSeedJsonExport(firstCity, {
    seed: cityConfig.seed,
    config: cityConfig
  });

  expect(
    firstCity.solarShadingSamples.map((sample) => [
      sample.id,
      sample.sampleKind,
      sample.parentObjectId,
      sample.weatherPresetId,
      sample.shadeCoverageRatio,
      sample.solarPotentialKwhPerDay
    ])
  ).toEqual(
    secondCity.solarShadingSamples.map((sample) => [
      sample.id,
      sample.sampleKind,
      sample.parentObjectId,
      sample.weatherPresetId,
      sample.shadeCoverageRatio,
      sample.solarPotentialKwhPerDay
    ])
  );
  expect(firstCity.solarShadingSamples).toHaveLength(24);
  expect(firstCity.objectIndex.countsByKind['solar-shading-sample']).toBe(24);
  expect(firstCity.validation.issues.filter((issue) => issue.category === 'environment')).toEqual([]);
  expect(firstCity.solarShadingSamples.map((sample) => sample.sampleKind)).toEqual(
    expect.arrayContaining(['roof-solar', 'plaza-comfort', 'park-comfort', 'waterfront-comfort'])
  );
  expect(firstCity.objectIndex.objectsById['solar-shading-roof-solar-0']).toMatchObject({
    id: 'solar-shading-roof-solar-0',
    kind: 'solar-shading-sample',
    ownerDomain: 'environment',
    lod: 'lod0',
    sampleKind: 'roof-solar',
    weatherPresetId: 'weather-preset-coastal-clear'
  });
  expect(diagnostics.solarShading).toMatchObject({
    total: 24,
    roofSolarSamples: 12,
    shadeComfortSamples: 12,
    highGlareSamples: 3,
    peakSunHour: 14
  });
  expect(diagnostics.solarShading.totalSolarPotentialKwhPerDay).toBeGreaterThan(100);
  expect(diagnostics.solarShading.averageComfortScore).toBeGreaterThan(0.4);
  expect(diagnostics.objectCounts).toMatchObject({
    solarShadingSamples: 24,
    roofSolarSamples: 12,
    shadeComfortSamples: 12
  });
  expect(overlays.find((overlay) => overlay.id === 'solar-shading')?.featureCount).toBe(24);
  expect(exportArtifact.domainSectionCounts.solarShadingSamples).toBe(24);
  expect(exportArtifact.city.solarShadingSamples).toHaveLength(24);
  expect(countProceduralSeedDomainObjects(exportArtifact)).toBe(exportArtifact.objectCount);
});

test('solar shading validation catches invalid values and broken references', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [baseSample] = city.solarShadingSamples;
  const invalidSample = {
    ...baseSample,
    parentObjectId: 'missing-building',
    weatherPresetId: 'missing-weather-preset',
    daylightHours: 32,
    shadeCoverageRatio: 1.3,
    comfortScore: -0.2,
    roofSuitabilityScore: 0,
    solarPotentialKwhPerDay: 0,
    sunPath: [
      {
        ...baseSample.sunPath[0],
        altitudeDegrees: 104
      }
    ],
    references: {
      ...baseSample.references,
      buildingId: 'missing-building',
      roofDetailIds: ['missing-roof-detail']
    }
  };
  const invalidCity = {
    ...city,
    solarShadingSamples: city.solarShadingSamples.map((sample) => (sample.id === invalidSample.id ? invalidSample : sample))
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
        id: `solar-shading-missing-parent-object-${invalidSample.id}`,
        category: 'environment',
        objectId: invalidSample.id
      }),
      expect.objectContaining({
        id: `solar-shading-missing-weather-preset-${invalidSample.id}`,
        category: 'environment',
        objectId: invalidSample.id
      }),
      expect.objectContaining({
        id: `solar-shading-invalid-values-${invalidSample.id}`,
        category: 'environment',
        objectId: invalidSample.id
      }),
      expect.objectContaining({
        id: `solar-shading-invalid-sun-path-${invalidSample.id}`,
        category: 'environment',
        objectId: invalidSample.id
      }),
      expect.objectContaining({
        id: `solar-shading-missing-building-reference-${invalidSample.id}`,
        category: 'environment',
        objectId: invalidSample.id
      }),
      expect.objectContaining({
        id: `solar-shading-missing-roof-detail-reference-${invalidSample.id}`,
        category: 'environment',
        objectId: invalidSample.id
      }),
      expect.objectContaining({
        id: `solar-shading-invalid-roof-solar-potential-${invalidSample.id}`,
        category: 'environment',
        objectId: invalidSample.id
      })
    ])
  );
});

test('browser diagnostics expose solar shading for debug and overlays', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const diagnostics = await page.evaluate(() => ({
    validationPassed: window.cityDiagnostics?.validation.passed,
    total: window.cityDiagnostics?.solarShading.total,
    roofSamples: window.cityDiagnostics?.solarShading.roofSolarSamples,
    shadeSamples: window.cityDiagnostics?.solarShading.shadeComfortSamples,
    highGlareSamples: window.cityDiagnostics?.solarShading.highGlareSamples,
    solarObjects: window.cityDiagnostics?.objectCounts.solarShadingSamples,
    overlayFeatures: window.cityDiagnostics?.overlays.find((overlay) => overlay.id === 'solar-shading')?.featureCount,
    solarKind: window.cityDiagnostics?.objectIndex.objectsById['solar-shading-roof-solar-0']?.kind,
    debugText: document.querySelector('[data-city-debug-panel="true"]')?.textContent ?? ''
  }));

  expect(diagnostics).toMatchObject({
    validationPassed: true,
    total: 24,
    roofSamples: 12,
    shadeSamples: 12,
    highGlareSamples: 3,
    solarObjects: 24,
    overlayFeatures: 24,
    solarKind: 'solar-shading-sample'
  });
  expect(diagnostics.debugText).toContain('Solar');
  expect(diagnostics.debugText).toContain('24 samples, 12 roofs, 3 glare');
});

function createTraffic(city: ReturnType<CityGenerator['generate']>) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections
  });
}
