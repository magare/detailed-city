import { expect, test } from '@playwright/test';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { cityConfig } from '../../src/config/cityConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';

test('generated crossings and sidewalk graph are deterministic', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const firstCrossing = firstCity.crossings[0];

  expect(firstCity.crossings).toHaveLength(340);
  expect(firstCity.sidewalkGraph.nodes).toHaveLength(680);
  expect(firstCity.sidewalkGraph.edges).toHaveLength(964);
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
    signalized: true,
    crossingLocation: 'intersection',
    crosswalkType: 'continental',
    priority: 'signal-protected',
    hasRefugeIsland: true,
    raisedCrossing: false,
    tactileCues: true,
    curbRamps: ['left', 'right'],
    signalPhase: {
      phaseId: 'intersection-v0-h0-pedestrian-phase',
      walkSeconds: 8,
      clearanceSeconds: 12,
      leadingPedestrianIntervalSeconds: 3
    }
  });
  expect(firstCity.objectIndex.objectsById[firstCrossing.id]).toEqual(firstCrossing);
  expect(firstCity.sidewalkGraph.edges.some((edge) => edge.crossingId === firstCrossing.id)).toBe(true);
  expect(firstCity.validation.issues.filter((issue) => issue.objectId === firstCrossing.id)).toEqual([]);

  const midblockCrossing = firstCity.crossings.find((crossing) => crossing.id === 'crossing-midblock-road-h-4-0');
  expect(midblockCrossing).toMatchObject({
    id: 'crossing-midblock-road-h-4-0',
    kind: 'crossing',
    ownerDomain: 'mobility',
    parentId: 'road-h-4',
    roadId: 'road-h-4',
    crossingLocation: 'midblock',
    crosswalkType: 'raised-table',
    priority: 'pedestrian-priority',
    hasRefugeIsland: false,
    raisedCrossing: true,
    tactileCues: true,
    curbRamps: ['left', 'right'],
    signalized: false
  });
  expect(midblockCrossing?.intersectionId).toBeUndefined();
  expect(firstCity.sidewalkGraph.edges.some((edge) => edge.crossingId === midblockCrossing?.id)).toBe(true);
  expect(
    firstCity.sidewalkGraph.nodes.filter((node) => node.crossingId === midblockCrossing?.id).map((node) => node.parentId)
  ).toEqual([midblockCrossing?.id, midblockCrossing?.id]);
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

test('validation rejects malformed crossing detail policies', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [firstCrossing, ...remainingCrossings] = city.crossings;
  const invalidCity = {
    ...city,
    crossings: [
      {
        ...firstCrossing,
        crosswalkType: 'raised-table' as const,
        raisedCrossing: false,
        tactileCues: false,
        signalPhase: undefined
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
        id: `missing-crossing-tactile-cues-${firstCrossing.id}`,
        severity: 'error',
        category: 'asset',
        objectId: firstCrossing.id
      }),
      expect.objectContaining({
        id: `raised-crosswalk-not-raised-${firstCrossing.id}`,
        severity: 'error',
        category: 'geometry',
        objectId: firstCrossing.id
      }),
      expect.objectContaining({
        id: `invalid-crossing-signal-phase-${firstCrossing.id}`,
        severity: 'error',
        category: 'graph',
        objectId: firstCrossing.id
      })
    ])
  );
});
