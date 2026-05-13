import { expect, test } from '@playwright/test';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { cityConfig } from '../../src/config/cityConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';

test('street lights are deterministic and bind to detailed street curb zones', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const [firstStreetLight] = firstCity.streetLights;

  expect(firstCity.streetLights.map((light) => light.id)).toEqual(secondCity.streetLights.map((light) => light.id));
  expect(firstCity.streetLights).toHaveLength(12);
  expect(firstStreetLight).toMatchObject({
    id: 'street-light-road-v-6-left-0',
    kind: 'street-light',
    ownerDomain: 'public-realm',
    parentId: 'road-v-6-sidewalk-left',
    sliceId: 'slice-detailed-street-road-v-6',
    roadId: 'road-v-6',
    sidewalkId: 'road-v-6-sidewalk-left',
    curbZoneId: 'curb-zone-road-v-6-left-segment-0-emergency',
    heightMeters: 6.2,
    coverageRadiusMeters: 18,
    colorTemperatureKelvin: 3000,
    powerCircuitId: 'power-circuit-road-v-6-street-lighting',
    nightLighting: {
      enabledByDefault: false,
      emissiveIntensity: 0.82,
      castsDynamicLight: false
    },
    tags: {
      detailedStreetSliceId: 'slice-detailed-street-road-v-6',
      detailedStreetSliceRole: 'corridor-street-light',
      corridorRoadId: 'road-v-6'
    }
  });
  expect(firstCity.objectIndex.objectsById[firstStreetLight.id]).toEqual(firstStreetLight);
  expect(firstCity.assetBindings).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: 'binding:street-light:pole-fixture',
        objectKind: 'street-light',
        fallbackGeometry: 'street-light-pole-fixture'
      })
    ])
  );
  expect(firstCity.validation.issues.filter((issue) => issue.objectId === firstStreetLight.id)).toEqual([]);
});

test('validation warns when street light power circuit placeholders are missing', () => {
  const city = new CityGenerator(cityConfig).generate();
  const invalidStreetLights = city.streetLights.map((streetLight, index) =>
    index === 0
      ? {
          ...streetLight,
          powerCircuitId: undefined
        }
      : streetLight
  );
  const validation = validateGeneratedCity({
    ...city,
    streetLights: invalidStreetLights,
    objectIndex: createGeneratedCityObjectIndex({
      ...city,
      streetLights: invalidStreetLights
    })
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: `missing-street-light-power-circuit-${city.streetLights[0].id}`,
        severity: 'warning',
        category: 'utility-coverage',
        objectId: city.streetLights[0].id
      }),
      expect.objectContaining({
        id: `unserved-street-light-power-${city.streetLights[0].id}`,
        severity: 'error',
        category: 'utility-coverage',
        objectId: city.streetLights[0].id
      })
    ])
  );
});
