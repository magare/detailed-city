import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex, createGeneratedRuntimeObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { createCityOverlayDatasets } from '../../src/city/rendering-handoff/overlays/overlayData';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('public lighting is deterministic, citywide, powered, and diagnosed', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(firstCity);
  const diagnostics = createCityDiagnostics(firstCity, traffic, renderConfig);
  const overlays = createCityOverlayDatasets(firstCity, createGeneratedRuntimeObjectIndex(firstCity, traffic));

  expect(firstCity.streetLights.map(getLightingSignature)).toEqual(secondCity.streetLights.map(getLightingSignature));
  expect(firstCity.validation.passed).toBe(true);
  expect(firstCity.streetLights).toHaveLength(504);
  expect(firstCity.objectIndex.countsByKind['street-light']).toBe(firstCity.streetLights.length);
  expect(firstCity.streetLights.filter((light) => light.placementContext === 'citywide-street')).toHaveLength(480);
  expect(firstCity.streetLights.filter((light) => light.placementContext === 'detailed-street')).toHaveLength(24);
  expect(firstCity.streetLights.every((light) => light.powerCircuitId === 'power-circuit-road-v-6-street-lighting')).toBe(true);
  expect(diagnostics.publicLighting).toMatchObject({
    total: 504,
    citywide: 480,
    detailedStreet: 24,
    nightEnabled: 504,
    criticalPathLights: 384,
    darkCriticalPathLights: 0,
    lowGlareFixtures: 504
  });
  expect(diagnostics.publicLighting.fixtureTypes).toEqual({
    'cutoff-led': 216,
    'decorative-pedestrian': 31,
    'double-arm': 7,
    'pedestrian-scale': 180,
    'single-arm': 70
  });
  expect(diagnostics.powerGrid.streetLightsServed).toBe(firstCity.streetLights.length);
  expect(overlays.find((overlay) => overlay.id === 'public-lighting')?.featureCount).toBe(504);
});

test('public lighting validation catches dark critical paths, glare, and missing coverage', () => {
  const city = new CityGenerator(cityConfig).generate();
  const criticalLight = city.streetLights.find((light) => light.coverage.criticalPedestrianPath);

  expect(criticalLight).toBeDefined();

  const invalidLight = {
    ...criticalLight!,
    nightSafety: {
      ...criticalLight!.nightSafety,
      estimatedIlluminanceLux: 2,
      darkPathRisk: 'high' as const
    },
    glareControl: {
      ...criticalLight!.glareControl,
      shielded: false,
      glareRating: 'high' as const
    }
  };
  const invalidCity = {
    ...city,
    streetLights: [
      invalidLight,
      ...city.streetLights.filter(
        (light) => light.id !== criticalLight!.id && !(light.roadId === 'road-v-6' && light.side === 'left')
      )
    ]
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: `dark-critical-street-light-path-${criticalLight!.id}`,
        category: 'utility-coverage',
        objectId: criticalLight!.id
      }),
      expect.objectContaining({
        id: `high-glare-street-light-${criticalLight!.id}`,
        category: 'utility-coverage',
        objectId: criticalLight!.id
      }),
      expect.objectContaining({
        id: 'dark-public-lighting-gap-road-v-6-left',
        category: 'utility-coverage',
        objectId: 'road-v-6'
      })
    ])
  );
});

test('public lighting diagnostics are visible in browser debug surfaces', async ({ page }) => {
  await page.goto('/?testMode=fast');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const diagnostics = await page.evaluate(() => ({
    validationPassed: window.cityDiagnostics?.validation.passed,
    total: window.cityDiagnostics?.publicLighting.total,
    citywide: window.cityDiagnostics?.publicLighting.citywide,
    darkCriticalPathLights: window.cityDiagnostics?.publicLighting.darkCriticalPathLights,
    overlayFeatures: window.cityDiagnostics?.overlays.find((overlay) => overlay.id === 'public-lighting')
      ?.featureCount,
    visibleStreetLightGroup: Boolean(
      (window.cityApp as unknown as { city?: { group: { getObjectByName(name: string): { visible?: boolean } | undefined } } })
        ?.city?.group.getObjectByName('StreetLights')?.visible
    ),
    panelText: document.body.innerText
  }));

  expect(diagnostics.validationPassed).toBe(true);
  expect(diagnostics.total).toBe(504);
  expect(diagnostics.citywide).toBe(480);
  expect(diagnostics.darkCriticalPathLights).toBe(0);
  expect(diagnostics.overlayFeatures).toBe(504);
  expect(diagnostics.visibleStreetLightGroup).toBe(true);
  expect(diagnostics.panelText).toContain('Public Lighting');
});

function createTraffic(city: ReturnType<CityGenerator['generate']>) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections
  });
}

function getLightingSignature(light: ReturnType<CityGenerator['generate']>['streetLights'][number]): readonly unknown[] {
  return [
    light.id,
    light.placementContext,
    light.fixtureType,
    light.lightingPurpose,
    light.roadId,
    light.side,
    light.alongRoadMeters,
    light.coverage.radiusMeters,
    light.nightSafety.estimatedIlluminanceLux,
    light.glareControl.glareRating
  ];
}
