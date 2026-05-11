import { expect, test } from '@playwright/test';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { cityConfig } from '../../src/config/cityConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';

test('generated crossings and sidewalk graph are deterministic', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const firstCrossing = firstCity.crossings[0];

  expect(firstCity.crossings).toHaveLength(338);
  expect(firstCity.sidewalkGraph.nodes).toHaveLength(676);
  expect(firstCity.sidewalkGraph.edges).toHaveLength(962);
  expect(firstCity.crossings.map((crossing) => crossing.id)).toEqual(
    secondCity.crossings.map((crossing) => crossing.id)
  );
  expect(firstCrossing).toMatchObject({
    id: 'crossing-intersection-v0-h0-road-v-0',
    kind: 'crossing',
    ownerDomain: 'mobility',
    parentId: 'intersection-v0-h0',
    intersectionId: 'intersection-v0-h0',
    roadId: 'road-v-0',
    roadOrientation: 'vertical',
    connectedSidewalkIds: ['road-v-0-sidewalk-left', 'road-v-0-sidewalk-right'],
    signalized: true
  });
  expect(firstCity.objectIndex.objectsById[firstCrossing.id]).toEqual(firstCrossing);
  expect(firstCity.sidewalkGraph.edges.some((edge) => edge.crossingId === firstCrossing.id)).toBe(true);
  expect(firstCity.validation.issues.filter((issue) => issue.objectId === firstCrossing.id)).toEqual([]);
});

test('validation rejects crossings with missing sidewalk references', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [firstCrossing, ...remainingCrossings] = city.crossings;
  const invalidCity = {
    ...city,
    crossings: [
      {
        ...firstCrossing,
        connectedSidewalkIds: ['missing-sidewalk', firstCrossing.connectedSidewalkIds[1]] as [string, string]
      },
      ...remainingCrossings
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
        id: 'missing-crossing-sidewalk-crossing-intersection-v0-h0-road-v-0-missing-sidewalk',
        severity: 'error',
        category: 'identifier',
        objectId: firstCrossing.id
      })
    ])
  );
});

test('validation rejects disconnected crossing graph edges', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [firstCrossing] = city.crossings;
  const invalidCity = {
    ...city,
    sidewalkGraph: {
      ...city.sidewalkGraph,
      edges: city.sidewalkGraph.edges.filter((edge) => edge.crossingId !== firstCrossing.id)
    }
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: `disconnected-crossing-${firstCrossing.id}`,
        severity: 'error',
        category: 'graph',
        objectId: firstCrossing.id
      })
    ])
  );
});
