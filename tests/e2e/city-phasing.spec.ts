import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex, createGeneratedRuntimeObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { createCityOverlayDatasets } from '../../src/city/rendering-handoff/overlays/overlayData';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('development phases are deterministic, indexed, and exposed for operations', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(firstCity);
  const diagnostics = createCityDiagnostics(firstCity, traffic, renderConfig);
  const overlays = createCityOverlayDatasets(firstCity, createGeneratedRuntimeObjectIndex(firstCity, traffic));

  expect(firstCity.developmentPhases.map((phase) => phase.id)).toEqual(
    secondCity.developmentPhases.map((phase) => phase.id)
  );
  expect(firstCity.developmentPhases.map((phase) => phase.sequence)).toEqual([0, 1, 2]);
  expect(firstCity.developmentPhases).toHaveLength(3);
  expect(firstCity.objectIndex.countsByKind['development-phase']).toBe(3);
  expect(firstCity.validation.issues.filter((issue) => issue.objectId?.startsWith('development-phase-'))).toEqual([]);
  expect(firstCity.developmentPhases[1]).toMatchObject({
    id: 'development-phase-future-expansion-core-intensification',
    phaseKind: 'future-expansion',
    status: 'planned',
    unlocksAfterPhaseIds: ['development-phase-baseline-operational-city'],
    closureRoadIds: ['road-h-5'],
    masterPlanGrowthBoundaryIds: ['growth-boundary-core-intensification']
  });
  expect(firstCity.developmentPhases[2]).toMatchObject({
    phaseKind: 'temporary-condition',
    status: 'temporary',
    temporaryRoadIds: ['road-v-2'],
    temporaryParkIds: ['civic-plaza'],
    closureRoadIds: ['road-h-6', 'road-v-1']
  });
  expect(diagnostics.developmentPhasing).toMatchObject({
    total: 3,
    active: 1,
    planned: 1,
    temporary: 1,
    futureExpansionPhases: 1,
    temporaryConditionPhases: 1,
    closureRoads: 3,
    temporaryRoads: 1,
    temporaryParks: 1,
    unlockLinks: 9,
    maxSequence: 2
  });
  expect(diagnostics.objectCounts).toMatchObject({
    developmentPhases: 3,
    activeDevelopmentPhases: 1,
    temporaryRoadClosures: 3,
    temporaryPhaseAssets: 2
  });
  expect(overlays.find((overlay) => overlay.id === 'phasing')?.featureCount).toBe(3);
  expect(overlays.find((overlay) => overlay.id === 'phasing')?.features[0]).toMatchObject({
    objectKind: 'development-phase',
    ownerDomain: 'blueprint',
    geometry: { type: 'polygon' },
    metadata: {
      phaseKind: 'baseline',
      status: 'active',
      sequence: 0
    }
  });
});

test('development phase validation catches invalid staging references and order', () => {
  const city = new CityGenerator(cityConfig).generate();
  const invalidFuturePhase = {
    ...city.developmentPhases[1],
    unlocksAfterPhaseIds: ['development-phase-temporary-condition-civic-campus-works'],
    closureRoadIds: ['missing-road'],
    masterPlanGrowthBoundaryIds: ['missing-growth-boundary']
  };
  const invalidTemporaryPhase = {
    ...city.developmentPhases[2],
    sequence: 1,
    temporaryRoadIds: [],
    temporaryParkIds: [],
    closureRoadIds: []
  };
  const invalidCity = {
    ...city,
    developmentPhases: [city.developmentPhases[0], invalidFuturePhase, invalidTemporaryPhase]
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: `development-phase-invalid-unlock-order-${city.developmentPhases[2].id}-${invalidFuturePhase.id}`,
        category: 'metadata'
      }),
      expect.objectContaining({
        id: `development-phase-missing-closure-road-missing-road-${invalidFuturePhase.id}`,
        category: 'metadata'
      }),
      expect.objectContaining({
        id: `development-phase-missing-growth-boundary-missing-growth-boundary-${invalidFuturePhase.id}`,
        category: 'metadata'
      }),
      expect.objectContaining({
        id: `development-phase-duplicate-sequence-1-${invalidTemporaryPhase.id}`,
        category: 'metadata'
      }),
      expect.objectContaining({
        id: `development-phase-missing-temporary-assets-${invalidTemporaryPhase.id}`,
        category: 'metadata'
      })
    ])
  );
});

test('browser diagnostics expose phasing counts and debug panel metric', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const diagnostics = await page.evaluate(() => ({
    validationPassed: window.cityDiagnostics?.validation.passed,
    developmentPhasing: window.cityDiagnostics?.developmentPhasing,
    objectCounts: window.cityDiagnostics?.objectCounts,
    phaseOverlayFeatures: window.cityDiagnostics?.overlays.find((overlay) => overlay.id === 'phasing')?.featureCount,
    phaseObjects: window.cityDiagnostics?.objectIndex.countsByKind['development-phase'],
    debugText: document.querySelector('[data-city-debug-panel="true"]')?.textContent ?? '',
    canvasCount: document.querySelectorAll('canvas').length
  }));

  expect(diagnostics.validationPassed).toBe(true);
  expect(diagnostics.developmentPhasing).toMatchObject({
    total: 3,
    active: 1,
    closureRoads: 3
  });
  expect(diagnostics.objectCounts).toMatchObject({
    developmentPhases: 3,
    temporaryRoadClosures: 3
  });
  expect(diagnostics.phaseOverlayFeatures).toBe(3);
  expect(diagnostics.phaseObjects).toBe(3);
  expect(diagnostics.canvasCount).toBe(1);
  expect(diagnostics.debugText).toContain('Phasing');
});

function createTraffic(city: ReturnType<CityGenerator['generate']>) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections,
    trafficCalmingDevices: city.trafficCalmingDevices
  });
}
