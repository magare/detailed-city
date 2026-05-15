import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex, createGeneratedRuntimeObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { createCityOverlayDatasets } from '../../src/city/rendering-handoff/overlays/overlayData';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';
import { MaterialLibrary } from '../../src/rendering/materials/MaterialLibrary';
import { City } from '../../src/world/city/City';

test('public amenities are deterministic, indexed, diagnosed, and exported', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(firstCity);
  const diagnostics = createCityDiagnostics(firstCity, traffic, renderConfig);
  const overlays = createCityOverlayDatasets(firstCity, createGeneratedRuntimeObjectIndex(firstCity, traffic));
  const publicAmenityOverlay = overlays.find((overlay) => overlay.id === 'public-amenities');

  expect(firstCity.publicAmenities.map((amenity) => amenity.id)).toEqual(
    secondCity.publicAmenities.map((amenity) => amenity.id)
  );
  expect(firstCity.publicAmenities).toHaveLength(46);
  expect(firstCity.objectIndex.countsByKind['public-amenity']).toBe(46);
  expect(firstCity.validation.issues).toEqual([]);
  expect(countAmenitiesByKind(firstCity.publicAmenities)).toEqual({
    'public-toilet': 5,
    'drinking-fountain': 6,
    'shade-structure': 6,
    'misting-cooling-point': 6,
    'charging-point': 6,
    clock: 6,
    'information-kiosk': 6,
    'repair-stand': 5
  });
  expect(firstCity.publicAmenities.every((amenity) => amenity.accessiblePathMeters >= 1.8)).toBe(true);
  expect(
    firstCity.publicAmenities
      .filter((amenity) => amenity.serviceAccess.required || amenity.utilityRequirements.water || amenity.utilityRequirements.power)
      .every((amenity) => amenity.serviceAccess.provided && amenity.serviceAccessCorridorId)
  ).toBe(true);
  expect(diagnostics.publicAmenities).toMatchObject({
    total: 46,
    publicToilets: 5,
    drinkingFountains: 6,
    shadeStructures: 6,
    coolingPoints: 6,
    chargingPoints: 6,
    clocks: 6,
    informationKiosks: 6,
    repairStands: 5,
    accessibleAmenities: 46,
    servicedAmenities: 46,
    waterServedAmenities: 17,
    powerServedAmenities: 23,
    drainageServedAmenities: 17,
    totalDailyUsers: 5418
  });
  expect(diagnostics.importExport.proceduralSeedExport.domainSectionCounts.publicAmenities).toBe(46);
  expect(publicAmenityOverlay).toMatchObject({
    id: 'public-amenities',
    featureCount: 46
  });
  expect(publicAmenityOverlay?.features[0]).toMatchObject({
    objectKind: 'public-amenity',
    ownerDomain: 'public-realm',
    geometry: { type: 'polygon' },
    metadata: {
      amenityKind: 'drinking-fountain',
      placementContext: 'detailed-street',
      accessiblePathMeters: 2.1,
      serviceAccessProvided: true
    }
  });
});

test('public amenity validation catches inaccessible and unserved fixtures', () => {
  const city = new CityGenerator(cityConfig).generate();
  const baseAmenity = city.publicAmenities[0];
  const invalidAmenity = {
    ...baseAmenity,
    id: 'public-amenity-invalid-unserved-test',
    parentId: 'missing-sidewalk',
    roadId: 'missing-road',
    sidewalkId: 'missing-sidewalk',
    dimensions: {
      ...baseAmenity.dimensions,
      widthMeters: -1
    },
    accessiblePathMeters: 1.2,
    serviceAccessCorridorId: undefined,
    serviceAccess: {
      required: true,
      provided: false,
      maintenanceAccessMeters: 999
    },
    utilityRequirements: {
      water: true,
      power: true,
      drainage: true
    },
    amenityKind: 'public-toilet' as const,
    assetBindingId: 'missing-public-amenity-binding'
  };
  const invalidCity = {
    ...city,
    publicAmenities: [invalidAmenity, ...city.publicAmenities.slice(1)]
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: 'public-amenity-missing-parent-public-amenity-invalid-unserved-test',
        category: 'graph',
        objectId: 'public-amenity-invalid-unserved-test'
      }),
      expect.objectContaining({
        id: 'public-amenity-missing-street-context-public-amenity-invalid-unserved-test',
        category: 'graph'
      }),
      expect.objectContaining({
        id: 'public-amenity-invalid-geometry-public-amenity-invalid-unserved-test',
        category: 'geometry'
      }),
      expect.objectContaining({
        id: 'public-amenity-inaccessible-or-empty-public-amenity-invalid-unserved-test',
        category: 'graph'
      }),
      expect.objectContaining({
        id: 'public-amenity-missing-service-access-public-amenity-invalid-unserved-test',
        category: 'graph'
      }),
      expect.objectContaining({
        id: 'public-amenity-unserved-utility-public-amenity-invalid-unserved-test',
        category: 'graph'
      }),
      expect.objectContaining({
        id: 'public-amenity-invalid-binding-public-amenity-invalid-unserved-test',
        category: 'asset'
      })
    ])
  );
});

test('public amenity meshes are render-ready and pickable', () => {
  const city = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(city);
  const materials = new MaterialLibrary();
  const cityScene = new City(city, traffic, materials);

  try {
    expect(cityScene.group.getObjectByName('PublicAmenities')).toBeTruthy();
    expect(cityScene.group.getObjectByName('PublicAmenityToiletInstances')).toBeTruthy();
    expect(cityScene.group.getObjectByName('PublicAmenityFountainInstances')).toBeTruthy();
    expect(cityScene.group.getObjectByName('PublicAmenityShadeCanopyInstances')).toBeTruthy();
    expect(cityScene.group.getObjectByName('PublicAmenityMistingPostInstances')).toBeTruthy();
    expect(cityScene.group.getObjectByName('PublicAmenityChargingPointInstances')).toBeTruthy();
    expect(cityScene.group.getObjectByName('PublicAmenityClockFaceInstances')).toBeTruthy();
    expect(cityScene.group.getObjectByName('PublicAmenityInformationKioskInstances')).toBeTruthy();
    expect(cityScene.group.getObjectByName('PublicAmenityRepairStandPostInstances')).toBeTruthy();
  } finally {
    cityScene.dispose();
    materials.dispose();
  }
});

test('public amenities surface in browser diagnostics and scene graph', async ({ page }) => {
  await page.goto('/?testMode=fast');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const runtime = await page.evaluate(() => {
    const sceneNames: string[] = [];
    (
      window.cityApp as unknown as { city?: { group: { traverse: (callback: (object: { name: string }) => void) => void } } }
    ).city?.group.traverse((object) => {
      if (object.name === 'PublicAmenities' || object.name.startsWith('PublicAmenity')) {
        sceneNames.push(object.name);
      }
    });

    return {
      publicAmenities: window.cityDiagnostics?.publicAmenities,
      publicAmenityOverlayFeatures: window.cityDiagnostics?.overlays.find((overlay) => overlay.id === 'public-amenities')
        ?.featureCount,
      pickablePublicAmenities: window.cityDiagnostics?.picking.countsByKind['public-amenity'],
      sceneNames,
      panelText: document.querySelector('[data-city-debug-panel="true"]')?.textContent ?? ''
    };
  });

  expect(runtime.publicAmenities).toMatchObject({
    total: 46,
    accessibleAmenities: 46,
    servicedAmenities: 46,
    totalDailyUsers: 5418
  });
  expect(runtime.publicAmenityOverlayFeatures).toBe(46);
  expect(runtime.pickablePublicAmenities).toBe(46);
  expect(runtime.sceneNames).toEqual(
    expect.arrayContaining([
      'PublicAmenities',
      'PublicAmenityToiletInstances',
      'PublicAmenityFountainInstances',
      'PublicAmenityShadeCanopyInstances',
      'PublicAmenityChargingPointInstances'
    ])
  );
  expect(runtime.panelText).toContain('Public Amenities');
  expect(runtime.panelText).toContain('46 fixtures, 5 toilets, 5418 daily users');
});

function createTraffic(city: ReturnType<CityGenerator['generate']>) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections
  });
}

function countAmenitiesByKind(
  amenities: ReturnType<CityGenerator['generate']>['publicAmenities']
): Record<string, number> {
  return amenities.reduce<Record<string, number>>((countsByKind, amenity) => {
    countsByKind[amenity.amenityKind] = (countsByKind[amenity.amenityKind] ?? 0) + 1;
    return countsByKind;
  }, {});
}
