import { expect, test } from '@playwright/test';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { cityConfig } from '../../src/config/cityConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';

test('active frontages are deterministic detailed-street facade objects', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const [firstFrontage] = firstCity.activeFrontages;
  const parentBuilding = firstCity.objectIndex.objectsById[firstFrontage.buildingId];

  expect(firstCity.activeFrontages.map((frontage) => frontage.id)).toEqual(
    secondCity.activeFrontages.map((frontage) => frontage.id)
  );
  expect(firstCity.activeFrontages).toHaveLength(45);
  expect(firstCity.objectIndex.countsByKind.facade).toBe(45);
  expect(firstFrontage).toMatchObject({
    id: 'facade-active-frontage-building-5-1-2-1-road-v-6',
    kind: 'facade',
    ownerDomain: 'buildings',
    parentId: 'building-5-1-2-1',
    lod: 'lod3',
    facadeType: 'active-frontage',
    sliceId: 'slice-detailed-street-road-v-6',
    buildingId: 'building-5-1-2-1',
    parcelId: 'parcel-5-1-2-1',
    roadId: 'road-v-6',
    sidewalkId: 'road-v-6-sidewalk-left',
    frontageSide: 'east',
    roadSide: 'left',
    activeUses: ['mixed-use', 'hospitality'],
    publicEntranceIds: ['building-5-1-2-1-entrance-primary'],
    assetBindingIds: {
      storefrontWindow: 'binding:facade:storefront-window',
      awning: 'binding:facade:awning',
      sign: 'binding:facade:sign',
      entranceDoor: 'binding:facade:entrance-door',
      nightWindow: 'binding:facade:night-window'
    },
    tags: {
      detailedStreetSliceId: 'slice-detailed-street-road-v-6',
      detailedStreetSliceRole: 'corridor-active-frontage',
      corridorRoadId: 'road-v-6'
    }
  });
  expect(firstFrontage.storefront).toMatchObject({
    displayWindowCount: 2,
    signTextCode: 'road-v-6:building-5-1-2-1:storefront-0',
    awning: {
      enabled: true,
      depthMeters: 0.92,
      colorCode: 'teal'
    },
    nightWindows: {
      enabledByDefault: true,
      litWindowCount: 1
    }
  });
  expect(parentBuilding).toMatchObject({
    kind: 'building',
    primaryFrontageRoadId: 'road-v-6',
    primaryFrontageSide: 'east',
    publicEntranceIds: ['building-5-1-2-1-entrance-primary']
  });
  expect(firstCity.assetBindings).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: 'binding:facade:storefront-window',
        objectKind: 'facade',
        fallbackMaterial: 'storefrontGlass',
        fallbackGeometry: 'storefront-window-box'
      }),
      expect.objectContaining({
        id: 'binding:facade:entrance-door',
        objectKind: 'facade',
        fallbackMaterial: 'entranceDoor',
        fallbackGeometry: 'entrance-door-box'
      })
    ])
  );
  expect(firstCity.validation.issues.filter((issue) => issue.objectId === firstFrontage.id)).toEqual([]);
});

test('validation rejects active frontage without a public entrance', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [frontage] = city.activeFrontages;
  const activeFrontages = city.activeFrontages.map((candidate) =>
    candidate.id === frontage.id ? { ...candidate, publicEntranceIds: [] } : candidate
  );
  const validation = validateGeneratedCity({
    ...city,
    activeFrontages,
    objectIndex: createGeneratedCityObjectIndex({
      ...city,
      activeFrontages
    })
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: `missing-active-frontage-public-entrance-${frontage.id}`,
        severity: 'error',
        category: 'graph',
        objectId: frontage.id
      })
    ])
  );
});
