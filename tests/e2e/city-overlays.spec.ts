import { expect, test } from '@playwright/test';
import { createGeneratedRuntimeObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { createCityOverlayDatasets } from '../../src/city/rendering-handoff/overlays/overlayData';
import { cityConfig } from '../../src/config/cityConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('debug overlay datasets are generated from domain data', () => {
  const city = new CityGenerator(cityConfig).generate();
  const traffic = new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections
  });
  const runtimeIndex = createGeneratedRuntimeObjectIndex(city, traffic);
  const overlays = createCityOverlayDatasets(city, runtimeIndex);

  expect(overlays.map((overlay) => overlay.id)).toEqual([
    'districts',
    'constraints',
    'parcels',
    'roads',
    'validation-issues',
    'owner-domains'
  ]);
  expect(overlays.find((overlay) => overlay.id === 'districts')?.featureCount).toBe(5);
  expect(overlays.find((overlay) => overlay.id === 'constraints')?.featureCount).toBe(11);
  expect(overlays.find((overlay) => overlay.id === 'parcels')?.featureCount).toBe(562);
  expect(overlays.find((overlay) => overlay.id === 'roads')?.featureCount).toBe(26);
  expect(overlays.find((overlay) => overlay.id === 'validation-issues')?.featureCount).toBe(0);
  expect(overlays.find((overlay) => overlay.id === 'owner-domains')?.featureCount).toBe(runtimeIndex.objectIds.length);
  expect(overlays.find((overlay) => overlay.id === 'roads')?.features[0]).toMatchObject({
    id: 'overlay:roads:road-v-0',
    objectId: 'road-v-0',
    objectKind: 'road-segment',
    ownerDomain: 'mobility',
    geometry: { type: 'polyline' }
  });
});

test('validation overlay features link issues back to domain object IDs', () => {
  const city = new CityGenerator(cityConfig).generate();
  const traffic = new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections
  });
  const runtimeIndex = createGeneratedRuntimeObjectIndex(city, traffic);
  const invalidCity = {
    ...city,
    validation: {
      passed: false,
      issues: [
        {
          id: 'test-validation-road-v-0',
          severity: 'error',
          category: 'identifier',
          objectId: 'road-v-0',
          affectedPoint: { x: -260, z: -288 },
          suggestedFix: 'Synthetic fix for overlay focus coverage.',
          message: 'Synthetic validation issue for overlay coverage.'
        }
      ]
    }
  } satisfies typeof city;
  const overlays = createCityOverlayDatasets(invalidCity, runtimeIndex);
  const validationOverlay = overlays.find((overlay) => overlay.id === 'validation-issues');

  expect(validationOverlay?.featureCount).toBe(1);
  expect(validationOverlay?.features[0]).toMatchObject({
    id: 'overlay:validation-issues:test-validation-road-v-0',
    objectId: 'road-v-0',
    objectKind: 'road-segment',
    ownerDomain: 'mobility',
    severity: 'error',
    category: 'identifier',
    geometry: {
      type: 'point',
      point: { x: -260, z: -288 }
    },
    focus: {
      objectId: 'road-v-0',
      point: { x: -260, z: -288 },
      suggestedFix: 'Synthetic fix for overlay focus coverage.'
    },
    metadata: {
      suggestedFix: 'Synthetic fix for overlay focus coverage.'
    }
  });
});
