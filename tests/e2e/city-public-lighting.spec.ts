import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex, createGeneratedRuntimeObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { createCityOverlayDatasets } from '../../src/city/rendering-handoff/overlays/overlayData';
import { StreetLightMeshBuilder } from '../../src/city/rendering-handoff/mesh-builders/StreetLightMeshBuilder';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';
import { MaterialLibrary } from '../../src/rendering/materials/MaterialLibrary';
import { disposeObject3D } from '../../src/utils/dispose';

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

test('street light mesh builder keeps actual dynamic light support capped and shadow-free', () => {
  const city = new CityGenerator(cityConfig).generate();
  const materials = new MaterialLibrary();
  const group = new StreetLightMeshBuilder(materials, {}, {
    dynamicLightLimit: 1,
    shadowCastingLightLimit: 0
  }).build(city.streetLights);
  let spotLights = 0;
  let physicallyConfiguredSpotLights = 0;
  let shadowCastingSpotLights = 0;
  let dynamicReceivers = 0;

  try {
    group.traverse((object) => {
      if (object.name === 'StreetLightDynamicReceiverInstances') {
        dynamicReceivers += 1;
      }

      if (object.type !== 'SpotLight') {
        return;
      }

      spotLights += 1;

      const spotLight = object as unknown as {
        readonly intensity: number;
        readonly distance: number;
        readonly angle: number;
        readonly decay: number;
        readonly castShadow: boolean;
      };

      if (
        spotLight.intensity > 0 &&
        spotLight.distance > 0 &&
        spotLight.angle > 0 &&
        spotLight.decay === 2
      ) {
        physicallyConfiguredSpotLights += 1;
      }

      if (spotLight.castShadow) {
        shadowCastingSpotLights += 1;
      }
    });

    expect(spotLights).toBe(1);
    expect(physicallyConfiguredSpotLights).toBe(1);
    expect(shadowCastingSpotLights).toBe(0);
    expect(dynamicReceivers).toBe(1);
  } finally {
    disposeObject3D(group);
    materials.dispose();
  }
});

test('public lighting diagnostics are visible in browser debug surfaces', async ({ page }) => {
  test.setTimeout(180_000);

  await page.goto('/?testMode=fast');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const diagnostics = await page.evaluate(() => {
    const cityApp = window.cityApp as unknown as {
      city?: {
        group: {
          getObjectByName(name: string): { visible?: boolean } | undefined;
          traverse(callback: (object: any) => void): void;
        };
      };
      getStreetLightRuntimeState?: () => {
        enabled: boolean;
        dynamicLightCount: number;
        shadowCastingLightCount: number;
        illuminationPoolCount: number;
      };
    };

    return {
      validationPassed: window.cityDiagnostics?.validation.passed,
      total: window.cityDiagnostics?.publicLighting.total,
      citywide: window.cityDiagnostics?.publicLighting.citywide,
      darkCriticalPathLights: window.cityDiagnostics?.publicLighting.darkCriticalPathLights,
      overlayFeatures: window.cityDiagnostics?.overlays.find((overlay) => overlay.id === 'public-lighting')
        ?.featureCount,
      visibleStreetLightGroup: Boolean(cityApp.city?.group.getObjectByName('StreetLights')?.visible),
      streetLightRuntime: cityApp.getStreetLightRuntimeState?.(),
      streetLightEffectsEnabled: document.body.dataset.streetLightsEnabled,
      panelText: document.body.innerText
    };
  });
  const renderedLighting = await page.evaluate(getRenderedStreetLightingState);

  expect(diagnostics.validationPassed).toBe(true);
  expect(diagnostics.total).toBe(504);
  expect(diagnostics.citywide).toBe(480);
  expect(diagnostics.darkCriticalPathLights).toBe(0);
  expect(diagnostics.overlayFeatures).toBe(504);
  expect(diagnostics.visibleStreetLightGroup).toBe(true);
  expect(diagnostics.streetLightRuntime).toMatchObject({
    enabled: true,
    dynamicLightCount: 0,
    shadowCastingLightCount: 0,
    illuminationPoolCount: 504
  });
  expect(diagnostics.streetLightEffectsEnabled).toBe('true');
  expect(renderedLighting).toMatchObject({
    dynamicGroupVisible: true,
    dynamicReceiverVisible: false,
    glowVisible: true,
    illuminationPoolVisible: true,
    spotLights: 0,
    physicallyConfiguredSpotLights: 0
  });
  expect(diagnostics.panelText).toContain('Public Lighting');
  expect(diagnostics.panelText).toContain('Lighting');

  const streetLightToggle = page.locator(
    '[data-city-debug-panel="true"] [data-city-street-light-toggle="effects"]'
  );
  await expect(streetLightToggle).toBeChecked();
  await streetLightToggle.uncheck();
  await expect(page.locator('body')).toHaveAttribute('data-street-lights-enabled', 'false');

  const disabledRuntime = await page.evaluate(() => window.cityApp?.getStreetLightRuntimeState());
  const disabledLighting = await page.evaluate(getRenderedStreetLightingState);

  expect(disabledRuntime?.enabled).toBe(false);
  expect(disabledLighting).toMatchObject({
    dynamicGroupVisible: false,
    dynamicReceiverVisible: false,
    glowVisible: false,
    illuminationPoolVisible: false,
    spotLights: 0
  });
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

function getRenderedStreetLightingState() {
  const cityApp = window.cityApp as unknown as {
    city?: {
      group: {
        getObjectByName(name: string): { visible?: boolean } | undefined;
        traverse(callback: (object: any) => void): void;
      };
    };
  };
  const group = cityApp.city?.group;
  let spotLights = 0;
  let physicallyConfiguredSpotLights = 0;

  group?.traverse((object: any) => {
    if (object?.type !== 'SpotLight') {
      return;
    }

    spotLights += 1;

    if (
      typeof object.intensity === 'number' &&
      object.intensity > 0 &&
      typeof object.distance === 'number' &&
      object.distance > 0 &&
      typeof object.angle === 'number' &&
      object.angle > 0 &&
      object.decay === 2
    ) {
      physicallyConfiguredSpotLights += 1;
    }
  });

  return {
    dynamicGroupVisible: Boolean(group?.getObjectByName('StreetLightDynamicLights')?.visible),
    dynamicReceiverVisible: Boolean(group?.getObjectByName('StreetLightDynamicReceiverInstances')?.visible),
    glowVisible: Boolean(group?.getObjectByName('StreetLightGlowInstances')?.visible),
    illuminationPoolVisible: Boolean(group?.getObjectByName('StreetLightIlluminancePoolInstances')?.visible),
    spotLights,
    physicallyConfiguredSpotLights
  };
}
