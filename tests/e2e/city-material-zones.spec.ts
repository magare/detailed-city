import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import {
  CANONICAL_MATERIAL_SURFACES,
  MATERIAL_ZONE_IDS,
  createMaterialZoneDiagnostics
} from '../../src/city/rendering-handoff/material-zones/materialZoneDefinitions';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('material zone registry covers generated asset bindings deterministically', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(firstCity);
  const diagnostics = createCityDiagnostics(firstCity, traffic, renderConfig);
  const firstMaterialZones = createMaterialZoneDiagnostics(firstCity.assetCatalog, firstCity.assetBindings);
  const secondMaterialZones = createMaterialZoneDiagnostics(secondCity.assetCatalog, secondCity.assetBindings);

  expect(firstMaterialZones).toEqual(secondMaterialZones);
  expect(firstMaterialZones.registeredZones).toEqual(MATERIAL_ZONE_IDS);
  expect(firstMaterialZones.canonicalSurfaces).toEqual(CANONICAL_MATERIAL_SURFACES);
  expect(firstMaterialZones.unregisteredAssetZones).toEqual([]);
  expect(firstMaterialZones.unregisteredBindingZones).toEqual([]);
  expect(firstMaterialZones.bindingZones).toEqual(diagnostics.assetBindingDiagnostics.materialZones);
  expect(diagnostics.assetBindingDiagnostics.materialZoneRegistry.definitions).toBeGreaterThanOrEqual(60);

  for (const surface of CANONICAL_MATERIAL_SURFACES) {
    expect(firstMaterialZones.zonesBySurface[surface]).toBeGreaterThan(0);
  }

  expect(firstMaterialZones.fallbackMaterials).toEqual(expect.arrayContaining(['asphalt', 'brick', 'metal', 'water', 'treeCanopy']));
  expect(firstMaterialZones.atlasChannels).toEqual(
    expect.arrayContaining(['facade-panel', 'road-pavement', 'road-markings', 'signage', 'water-surface'])
  );
});

test('material zone validation rejects unregistered asset and render binding zones', () => {
  const city = new CityGenerator(cityConfig).generate();
  const invalidAsset = {
    ...city.assetCatalog[0],
    id: 'asset:test:bad-material-zone',
    tags: {
      ...city.assetCatalog[0].tags,
      materialZone: 'bad-zone'
    }
  };
  const invalidBinding = {
    ...city.assetBindings[0],
    id: 'binding:test:bad-material-zone',
    assetId: invalidAsset.id,
    materialZone: 'bad-zone'
  };
  const invalidCity = {
    ...city,
    assetCatalog: [...city.assetCatalog, invalidAsset],
    assetBindings: [...city.assetBindings, invalidBinding]
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity as any)
  } as any);

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: 'invalid-asset-material-zone-asset:test:bad-material-zone-bad-zone',
        category: 'asset'
      }),
      expect.objectContaining({
        id: 'invalid-render-binding-material-zone-binding:test:bad-material-zone-bad-zone',
        category: 'asset'
      })
    ])
  );
});

function createTraffic(city: ReturnType<CityGenerator['generate']>) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections,
    trafficCalmingDevices: city.trafficCalmingDevices
  });
}
