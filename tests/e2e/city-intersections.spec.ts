import { expect, test } from '@playwright/test';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { cityConfig } from '../../src/config/cityConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';

test('generated intersections are deterministic and resolve connected roads', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const firstIntersection = firstCity.intersections[0];

  expect(firstCity.intersections).toHaveLength(169);
  expect(firstCity.intersections.map((intersection) => intersection.id)).toEqual(
    secondCity.intersections.map((intersection) => intersection.id)
  );
  expect(firstIntersection).toMatchObject({
    id: 'intersection-v0-h0',
    kind: 'intersection',
    ownerDomain: 'mobility',
    lod: 'lod2',
    connectedRoadIds: ['road-v-0', 'road-h-0'],
    hierarchyMix: ['arterial'],
    signalExpectation: 'signalized',
    grid: { x: 0, z: 0 },
    verticalRoadId: 'road-v-0',
    horizontalRoadId: 'road-h-0'
  });
  expect(firstCity.objectIndex.objectsById['intersection-v0-h0']).toEqual(firstIntersection);
  expect(firstCity.validation.issues.filter((issue) => issue.objectId === firstIntersection.id)).toEqual([]);
});

test('validation rejects intersections that reference missing roads', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [firstIntersection, ...remainingIntersections] = city.intersections;
  const invalidCity = {
    ...city,
    intersections: [
      {
        ...firstIntersection,
        connectedRoadIds: ['missing-road', firstIntersection.connectedRoadIds[1]]
      },
      ...remainingIntersections
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
        id: 'missing-intersection-road-intersection-v0-h0-missing-road',
        severity: 'error',
        category: 'identifier',
        objectId: 'intersection-v0-h0'
      })
    ])
  );
});
