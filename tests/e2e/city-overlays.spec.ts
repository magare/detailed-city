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
    'administrative-boundaries',
    'districts',
    'zoning',
    'waterways',
    'waterfront',
    'hazards',
    'topography',
    'soil-geology',
    'phasing',
    'weather-presets',
    'solar-shading',
    'urban-heat',
    'city-metrics',
    'civic-anchors',
    'community-anchors',
    'culture-anchors',
    'government-anchors',
    'constraints',
    'resilience-goals',
    'parcels',
    'roads',
    'validation-issues',
    'owner-domains'
  ]);
  expect(overlays.find((overlay) => overlay.id === 'administrative-boundaries')?.featureCount).toBe(18);
  expect(overlays.find((overlay) => overlay.id === 'districts')?.featureCount).toBe(5);
  expect(overlays.find((overlay) => overlay.id === 'zoning')?.featureCount).toBe(5);
  expect(overlays.find((overlay) => overlay.id === 'waterways')?.featureCount).toBe(40);
  expect(overlays.find((overlay) => overlay.id === 'waterfront')?.featureCount).toBe(19);
  expect(overlays.find((overlay) => overlay.id === 'waterfront')?.features).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        objectKind: 'waterfront-open-space',
        ownerDomain: 'public-realm',
        metadata: expect.objectContaining({
          openSpaceKind: 'water-access',
          waterAccess: true
        })
      })
    ])
  );
  expect(overlays.find((overlay) => overlay.id === 'hazards')?.featureCount).toBe(6);
  expect(overlays.find((overlay) => overlay.id === 'topography')?.featureCount).toBe(5);
  expect(overlays.find((overlay) => overlay.id === 'soil-geology')?.featureCount).toBe(5);
  expect(overlays.find((overlay) => overlay.id === 'phasing')?.featureCount).toBe(3);
  expect(overlays.find((overlay) => overlay.id === 'weather-presets')?.featureCount).toBe(5);
  expect(overlays.find((overlay) => overlay.id === 'weather-presets')?.features).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        objectKind: 'weather-preset',
        ownerDomain: 'environment',
        metadata: expect.objectContaining({
          active: true,
          presetKind: 'clear',
          precipitation: 'none'
        })
      })
    ])
  );
  expect(overlays.find((overlay) => overlay.id === 'solar-shading')?.featureCount).toBe(24);
  expect(overlays.find((overlay) => overlay.id === 'solar-shading')?.features).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        objectKind: 'solar-shading-sample',
        ownerDomain: 'environment',
        metadata: expect.objectContaining({
          sampleKind: 'roof-solar',
          weatherPresetId: 'weather-preset-coastal-clear'
        })
      })
    ])
  );
  expect(overlays.find((overlay) => overlay.id === 'urban-heat')?.featureCount).toBe(17);
  expect(overlays.find((overlay) => overlay.id === 'urban-heat')?.features).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        objectKind: 'urban-heat-zone',
        ownerDomain: 'environment',
        metadata: expect.objectContaining({
          zoneKind: 'heat-island',
          riskLevel: 'high'
        })
      })
    ])
  );
  expect(overlays.find((overlay) => overlay.id === 'city-metrics')?.featureCount).toBe(8);
  expect(overlays.find((overlay) => overlay.id === 'civic-anchors')?.featureCount).toBe(6);
  expect(overlays.find((overlay) => overlay.id === 'civic-anchors')?.features).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        objectKind: 'civic-anchor',
        ownerDomain: 'civic',
        metadata: expect.objectContaining({
          serviceType: 'government'
        })
      })
    ])
  );
  expect(overlays.find((overlay) => overlay.id === 'community-anchors')?.featureCount).toBe(8);
  expect(overlays.find((overlay) => overlay.id === 'community-anchors')?.features).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        objectKind: 'community-anchor',
        ownerDomain: 'civic',
        metadata: expect.objectContaining({
          anchorKind: 'food-bank',
          foodDistribution: true
        })
      })
    ])
  );
  expect(overlays.find((overlay) => overlay.id === 'culture-anchors')?.featureCount).toBe(6);
  expect(overlays.find((overlay) => overlay.id === 'culture-anchors')?.features).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        objectKind: 'culture-anchor',
        ownerDomain: 'civic',
        metadata: expect.objectContaining({
          anchorKind: 'museum',
          tourismAttractionScore: 92
        })
      })
    ])
  );
  expect(overlays.find((overlay) => overlay.id === 'government-anchors')?.featureCount).toBe(5);
  expect(overlays.find((overlay) => overlay.id === 'government-anchors')?.features).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        objectKind: 'government-anchor',
        ownerDomain: 'civic',
        metadata: expect.objectContaining({
          anchorKind: 'city-hall',
          serviceCounters: 8
        })
      })
    ])
  );
  expect(overlays.find((overlay) => overlay.id === 'constraints')?.featureCount).toBe(11);
  expect(overlays.find((overlay) => overlay.id === 'resilience-goals')?.featureCount).toBe(7);
  expect(overlays.find((overlay) => overlay.id === 'parcels')?.featureCount).toBe(583);
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
