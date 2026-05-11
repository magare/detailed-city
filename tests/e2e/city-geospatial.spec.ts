import { expect, test } from '@playwright/test';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { cityConfig } from '../../src/config/cityConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';

test('geospatial frame exposes local meter origin, precision, height datum, and import projection metadata', () => {
  const city = new CityGenerator(cityConfig).generate();

  expect(city.geospatial).toMatchObject({
    unit: 'meter',
    coordinateSystem: 'local-xz',
    axisMapping: {
      x: 'local-east-west',
      y: 'local-up',
      z: 'local-north-south'
    },
    origin: { x: 0, y: 0, z: 0 },
    originMetadata: {
      id: 'local-origin-detailed-city-v1',
      sourceType: 'procedural'
    },
    heightDatum: {
      id: 'local-ground-plane',
      verticalUnit: 'meter',
      groundElevationMeters: 0,
      minElevationMeters: -5,
      maxElevationMeters: 180
    },
    localBounds: {
      minX: -700,
      maxX: 700,
      minZ: -700,
      maxZ: 700
    },
    precision: {
      coordinatePrecisionMeters: 0.01,
      horizontalToleranceMeters: 0.01,
      verticalToleranceMeters: 0.01
    },
    importProjection: {
      status: 'not-configured',
      expectedUnit: 'meter'
    }
  });
  expect(city.validation.issues.filter((issue) => issue.category === 'geometry')).toEqual([]);
});

test('validation rejects non-finite coordinates and coordinates outside local tolerance', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [firstIntersection, ...remainingIntersections] = city.intersections;
  const [firstPark, ...remainingParks] = city.parks;
  const [firstSlice, ...remainingSlices] = city.verticalSlices;
  const invalidCity = {
    ...city,
    geospatial: {
      ...city.geospatial,
      origin: {
        ...city.geospatial.origin,
        y: Number.POSITIVE_INFINITY
      }
    },
    intersections: [
      {
        ...firstIntersection,
        center: {
          ...firstIntersection.center,
          x: Number.NaN
        }
      },
      ...remainingIntersections
    ],
    parks: [
      {
        ...firstPark,
        center: {
          ...firstPark.center,
          x: city.geospatial.localBounds.maxX + city.geospatial.precision.horizontalToleranceMeters + 0.02
        }
      },
      ...remainingParks
    ],
    verticalSlices: [
      {
        ...firstSlice,
        cameraPosition: {
          ...firstSlice.cameraPosition,
          y: city.geospatial.heightDatum.maxElevationMeters + city.geospatial.precision.verticalToleranceMeters + 0.02
        }
      },
      ...remainingSlices
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
        id: 'invalid-geospatial-origin',
        category: 'geometry'
      }),
      expect.objectContaining({
        id: `non-finite-coordinate-${firstIntersection.id}-center-x`,
        category: 'geometry',
        objectId: firstIntersection.id
      }),
      expect.objectContaining({
        id: `coordinate-out-of-bounds-${firstPark.id}-center-x`,
        category: 'geometry',
        objectId: firstPark.id
      }),
      expect.objectContaining({
        id: `height-out-of-datum-${firstSlice.id}-cameraPosition-y`,
        category: 'geometry',
        objectId: firstSlice.id
      })
    ])
  );
});
