import { expect, test } from '@playwright/test';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { cityConfig } from '../../src/config/cityConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';

test('sidewalk accessibility metadata is deterministic and route-ready', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const firstSidewalk = firstCity.roads[0].sidewalks[0];
  const firstCrossing = firstCity.crossings[0];
  const firstCrossingEdge = firstCity.sidewalkGraph.edges.find((edge) => edge.crossingId === firstCrossing.id);

  expect(firstCity.roads.flatMap((road) => road.sidewalks).map((sidewalk) => sidewalk.accessibleClearPathMeters)).toEqual(
    secondCity.roads.flatMap((road) => road.sidewalks).map((sidewalk) => sidewalk.accessibleClearPathMeters)
  );
  expect(firstSidewalk).toMatchObject({
    id: 'road-v-0-sidewalk-left',
    accessibleClearPathMeters: 3.92,
    runningGradePercent: expect.any(Number),
    crossSlopePercent: expect.any(Number),
    accessibility: {
      stepFree: true,
      clearPathContinuous: true,
      wheelchairPassable: true,
      maxRunningGradePercent: 5,
      maxCrossSlopePercent: 2
    }
  });
  expect(firstSidewalk.runningGradePercent).toBeLessThanOrEqual(5);
  expect(firstCrossing).toMatchObject({
    curbRampIds: ['curb-ramp-intersection-v0-h0-left', 'curb-ramp-intersection-v0-h0-right'],
    tactileCueIds: ['tactile-cue-intersection-v0-h0-left', 'tactile-cue-intersection-v0-h0-right']
  });
  expect(firstCrossingEdge).toMatchObject({
    accessible: true,
    minClearWidthMeters: expect.any(Number),
    maxGradePercent: 0,
    hasCurbRampConnection: true,
    hasTactileCueConnection: true
  });
  expect(firstCrossingEdge?.minClearWidthMeters).toBeGreaterThanOrEqual(1.8);
  expect(firstCity.validation.issues.filter((issue) => issue.id.includes('accessible'))).toEqual([]);
});

test('validation rejects inaccessible sidewalk routes', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [firstRoad, ...remainingRoads] = city.roads;
  const [firstSidewalk, ...remainingSidewalks] = firstRoad.sidewalks;
  const firstSidewalkEdge = city.sidewalkGraph.edges.find((edge) => edge.sidewalkId === firstSidewalk.id);

  expect(firstSidewalkEdge).toBeDefined();

  const invalidCity = {
    ...city,
    roads: [
      {
        ...firstRoad,
        sidewalks: [
          {
            ...firstSidewalk,
            accessibleClearPathMeters: 1.2,
            runningGradePercent: 8,
            accessibility: {
              ...firstSidewalk.accessibility,
              wheelchairPassable: false
            }
          },
          ...remainingSidewalks
        ]
      },
      ...remainingRoads
    ],
    sidewalkGraph: {
      ...city.sidewalkGraph,
      edges: city.sidewalkGraph.edges.map((edge) =>
        edge.id === firstSidewalkEdge?.id
          ? {
              ...edge,
              accessible: false,
              minClearWidthMeters: 1.2,
              maxGradePercent: 8
            }
          : edge
      )
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
        id: `invalid-sidewalk-clear-path-${firstSidewalk.id}`,
        severity: 'error',
        category: 'geometry',
        objectId: firstSidewalk.id
      }),
      expect.objectContaining({
        id: `inaccessible-sidewalk-${firstSidewalk.id}`,
        severity: 'error',
        category: 'graph',
        objectId: firstSidewalk.id
      }),
      expect.objectContaining({
        id: `inaccessible-sidewalk-edge-${firstSidewalkEdge?.id}`,
        severity: 'error',
        category: 'graph',
        objectId: firstSidewalkEdge?.id
      })
    ])
  );
});
