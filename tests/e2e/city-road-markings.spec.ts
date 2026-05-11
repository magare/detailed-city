import { expect, test } from '@playwright/test';
import { validateTrafficPlan } from '../../src/city/data-contracts/validation/validateTrafficPlan';
import { cityConfig } from '../../src/config/cityConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('road markings are generated from road and crossing contracts', () => {
  const city = new CityGenerator(cityConfig).generate();
  const firstTraffic = createTraffic(city);
  const secondTraffic = createTraffic(new CityGenerator(cityConfig).generate());
  const markingCounts = countMarkingsByType(firstTraffic.markings);
  const firstZebra = firstTraffic.markings.find((marking) => marking.markingType === 'zebra-crossing-stripe');
  const firstTactile = firstTraffic.markings.find((marking) => marking.markingType === 'tactile-paving');
  const firstRefuge = firstTraffic.markings.find((marking) => marking.markingType === 'refuge-island');

  expect(firstTraffic.markings.map((marking) => marking.id)).toEqual(
    secondTraffic.markings.map((marking) => marking.id)
  );
  expect(markingCounts).toEqual({
    'lane-dash': 676,
    'turn-arrow': 4,
    'zebra-crossing-stripe': 140,
    'stop-bar': 56,
    'tactile-paving': 56,
    'refuge-island': 18
  });
  expect(firstZebra).toMatchObject({
    id: 'crossing-intersection-v6-h0-road-v-6-zebra-stripe-0',
    kind: 'lane-marking',
    ownerDomain: 'mobility',
    parentId: 'crossing-intersection-v6-h0-road-v-6',
    roadId: 'road-v-6',
    crossingId: 'crossing-intersection-v6-h0-road-v-6',
    intersectionId: 'intersection-v6-h0',
    markingType: 'zebra-crossing-stripe',
    assetBindingId: 'binding:road:zebra-crossing',
    stripeIndex: 0
  });
  expect(firstTactile).toMatchObject({
    markingType: 'tactile-paving',
    surfaceMaterial: 'tactile',
    assetBindingId: 'binding:road:tactile-paving'
  });
  expect(firstRefuge).toMatchObject({
    markingType: 'refuge-island',
    surfaceMaterial: 'raised-concrete',
    assetBindingId: 'binding:road:refuge-island'
  });
  const firstMidblockStripe = firstTraffic.markings.find(
    (marking) => marking.id === 'crossing-midblock-road-h-4-0-zebra-stripe-0'
  );
  expect(firstMidblockStripe).toMatchObject({
    parentId: 'crossing-midblock-road-h-4-0',
    roadId: 'road-h-4',
    crossingId: 'crossing-midblock-road-h-4-0',
    markingType: 'zebra-crossing-stripe'
  });
  expect(firstMidblockStripe?.intersectionId).toBeUndefined();
  expect(validateTraffic(city, firstTraffic).issues).toEqual([]);
});

test('traffic validation rejects invalid crossing markings', () => {
  const city = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(city);
  const firstZebra = traffic.markings.find((marking) => marking.markingType === 'zebra-crossing-stripe');
  const invalidTraffic = {
    ...traffic,
    markings: traffic.markings.map((marking) =>
      marking.id === firstZebra?.id
        ? {
            ...marking,
            crossingId: 'missing-crossing',
            parentId: 'missing-crossing',
            size: { ...marking.size, x: 0 }
          }
        : marking
    )
  };
  const validation = validateTraffic(city, invalidTraffic);

  expect(firstZebra).toBeTruthy();
  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: `missing-lane-marking-crossing-${firstZebra?.id}`,
        severity: 'error',
        category: 'identifier',
        objectId: firstZebra?.id
      }),
      expect.objectContaining({
        id: `invalid-lane-marking-geometry-${firstZebra?.id}`,
        severity: 'error',
        category: 'geometry',
        objectId: firstZebra?.id
      })
    ])
  );
});

function createTraffic(city: ReturnType<CityGenerator['generate']>) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections
  });
}

function validateTraffic(
  city: ReturnType<CityGenerator['generate']>,
  traffic: ReturnType<TrafficLaneGenerator['create']>
) {
  return validateTrafficPlan({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections,
    assetBindings: city.assetBindings,
    traffic
  });
}

function countMarkingsByType(
  markings: ReturnType<TrafficLaneGenerator['create']>['markings']
): Record<string, number> {
  return markings.reduce<Record<string, number>>((counts, marking) => {
    counts[marking.markingType] = (counts[marking.markingType] ?? 0) + 1;
    return counts;
  }, {});
}
