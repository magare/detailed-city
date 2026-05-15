import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex, createGeneratedRuntimeObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { createCityOverlayDatasets } from '../../src/city/rendering-handoff/overlays/overlayData';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('signage and wayfinding are deterministic, readable, and bound to city context', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(firstCity);
  const diagnostics = createCityDiagnostics(firstCity, traffic, renderConfig);
  const overlays = createCityOverlayDatasets(firstCity, createGeneratedRuntimeObjectIndex(firstCity, traffic));
  const signs = firstCity.streetFurniture.filter((item) => item.signFace);

  expect(signs.map(getSignageSignature)).toEqual(secondCity.streetFurniture.filter((item) => item.signFace).map(getSignageSignature));
  expect(firstCity.validation.passed).toBe(true);
  expect(signs).toHaveLength(133);
  expect(signs.every((sign) => sign.lod === 'lod4' && sign.signFace?.readableLod === 'lod4')).toBe(true);
  expect(diagnostics.signageWayfinding).toMatchObject({
    totalSigns: 133,
    regulatorySigns: 57,
    streetNameSigns: 28,
    wayfindingSigns: 48,
    readableLod4Signs: 133,
    routeBoundSigns: 27,
    districtBoundSigns: 133,
    frontageBoundSigns: 3
  });
  expect(diagnostics.signageWayfinding.panelKinds).toEqual({
    'district-map': 21,
    'directional-fingerpost': 24,
    'regulatory-plate': 57,
    'storefront-directory': 3,
    'street-name-blade': 28
  });
  expect(overlays.find((overlay) => overlay.id === 'signage-wayfinding')?.featureCount).toBe(133);
});

test('signage validation catches unreadable signs and broken route/frontage bindings', () => {
  const city = new CityGenerator(cityConfig).generate();
  const wayfindingSign = city.streetFurniture.find((item) => item.signFace?.activeFrontageIds.length);

  expect(wayfindingSign).toBeDefined();

  const invalidSign = {
    ...wayfindingSign!,
    lod: 'lod3' as const,
    signFace: {
      ...wayfindingSign!.signFace!,
      readableLod: 'lod4' as const,
      routeIds: ['missing-transit-route'],
      activeFrontageIds: ['missing-active-frontage'],
      destinationObjectIds: ['missing-transit-route', 'missing-active-frontage']
    }
  };
  const invalidCity = {
    ...city,
    streetFurniture: [
      invalidSign,
      ...city.streetFurniture.filter((item) => item.id !== wayfindingSign!.id)
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
        id: `non-readable-sign-lod-${wayfindingSign!.id}`,
        category: 'lod',
        objectId: wayfindingSign!.id
      }),
      expect.objectContaining({
        id: `invalid-sign-route-reference-${wayfindingSign!.id}-missing-transit-route`,
        category: 'graph',
        objectId: wayfindingSign!.id
      }),
      expect.objectContaining({
        id: `invalid-sign-frontage-reference-${wayfindingSign!.id}-missing-active-frontage`,
        category: 'graph',
        objectId: wayfindingSign!.id
      })
    ])
  );
});

test('signage diagnostics are visible in browser debug surfaces', async ({ page }) => {
  await page.goto('/?testMode=fast');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const diagnostics = await page.evaluate(() => ({
    validationPassed: window.cityDiagnostics?.validation.passed,
    totalSigns: window.cityDiagnostics?.signageWayfinding.totalSigns,
    routeBoundSigns: window.cityDiagnostics?.signageWayfinding.routeBoundSigns,
    frontageBoundSigns: window.cityDiagnostics?.signageWayfinding.frontageBoundSigns,
    overlayFeatures: window.cityDiagnostics?.overlays.find((overlay) => overlay.id === 'signage-wayfinding')
      ?.featureCount,
    visibleSignPanels: Boolean(
      (window.cityApp as unknown as { city?: { group: { getObjectByName(name: string): { visible?: boolean } | undefined } } })
        ?.city?.group.getObjectByName('StreetFurnitureWayfindingSignPanelInstances')?.visible
    ),
    panelText: document.body.innerText
  }));

  expect(diagnostics.validationPassed).toBe(true);
  expect(diagnostics.totalSigns).toBe(133);
  expect(diagnostics.routeBoundSigns).toBe(27);
  expect(diagnostics.frontageBoundSigns).toBe(3);
  expect(diagnostics.overlayFeatures).toBe(133);
  expect(diagnostics.visibleSignPanels).toBe(true);
  expect(diagnostics.panelText).toContain('Signage');
});

function createTraffic(city: ReturnType<CityGenerator['generate']>) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections
  });
}

function getSignageSignature(sign: ReturnType<CityGenerator['generate']>['streetFurniture'][number]): readonly unknown[] {
  return [
    sign.id,
    sign.furnitureType,
    sign.lod,
    sign.placementContext,
    sign.signFace?.signRole,
    sign.signFace?.panelKind,
    sign.signFace?.textCode,
    sign.signFace?.routeIds.join(','),
    sign.signFace?.districtIds.join(','),
    sign.signFace?.activeFrontageIds.join(','),
    sign.signFace?.destinationObjectIds.join(',')
  ];
}
