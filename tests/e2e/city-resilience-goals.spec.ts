import { expect, test } from '@playwright/test';
import { createGeneratedCityObjectIndex, createGeneratedRuntimeObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { createCityOverlayDatasets } from '../../src/city/rendering-handoff/overlays/overlayData';
import { cityConfig } from '../../src/config/cityConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('resilience goals are deterministic, indexed, and exposed as overlay data', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(firstCity);
  const runtimeIndex = createGeneratedRuntimeObjectIndex(firstCity, traffic);
  const overlays = createCityOverlayDatasets(firstCity, runtimeIndex);
  const resilienceOverlay = overlays.find((overlay) => overlay.id === 'resilience-goals');

  expect(firstCity.resilienceGoals.map((goal) => goal.id)).toEqual(
    secondCity.resilienceGoals.map((goal) => goal.id)
  );
  expect(firstCity.resilienceGoals).toHaveLength(7);
  expect(firstCity.objectIndex.countsByKind['resilience-goal']).toBe(7);
  expect(firstCity.validation.issues.filter((issue) => issue.category === 'resilience')).toEqual([]);
  expect(countGoalsByKind(firstCity.resilienceGoals)).toEqual({
    redundancy: 1,
    'climate-adaptation': 1,
    'evacuation-route': 1,
    'emergency-access': 1,
    continuity: 1,
    shelter: 1,
    'recovery-priority': 1
  });
  expect(firstCity.objectIndex.objectsById['resilience-goal-open-space-shelter-network']).toMatchObject({
    id: 'resilience-goal-open-space-shelter-network',
    kind: 'resilience-goal',
    ownerDomain: 'blueprint',
    lod: 'lod0',
    target: { metric: 'shelter-candidate-count', minimumCount: 3 },
    shelterObjectIds: ['central-park', 'civic-plaza', 'riverside-green']
  });
  expect(resilienceOverlay?.featureCount).toBe(7);
  expect(resilienceOverlay?.features[0]).toMatchObject({
    id: 'overlay:resilience-goals:resilience-goal-redundant-emergency-corridors',
    objectKind: 'resilience-goal',
    ownerDomain: 'blueprint',
    geometry: { type: 'polygon' },
    metadata: {
      goalKind: 'redundancy',
      priority: 'critical',
      targetMetric: 'redundant-corridor-count',
      targetMinimumCount: 2
    }
  });
});

test('resilience validation reports coverage gaps and missing route references with focus data', () => {
  const city = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(city);
  const baseGoal = city.resilienceGoals.find(
    (goal) => goal.id === 'resilience-goal-downtown-evacuation-spine'
  );

  expect(baseGoal).toBeDefined();

  const invalidGoal = {
    ...baseGoal!,
    routeRoadIds: [] as const,
    requiredObjectIds: ['missing-road'] as const,
    target: {
      ...baseGoal!.target,
      minimumCount: 2
    }
  };
  const invalidCity = {
    ...city,
    resilienceGoals: city.resilienceGoals.map((goal) => (goal.id === invalidGoal.id ? invalidGoal : goal))
  };
  const indexedInvalidCity = {
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  };
  const validation = validateGeneratedCity(indexedInvalidCity);
  const runtimeIndex = createGeneratedRuntimeObjectIndex(indexedInvalidCity, traffic);
  const overlays = createCityOverlayDatasets({ ...indexedInvalidCity, validation }, runtimeIndex);
  const validationFeature = overlays
    .find((overlay) => overlay.id === 'validation-issues')
    ?.features.find((feature) => feature.objectId === invalidGoal.id);

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: `resilience-missing-required-reference-missing-road-${invalidGoal.id}`,
        category: 'resilience',
        objectId: invalidGoal.id,
        affectedPoint: invalidGoal.focusPoint,
        affectedBoundary: invalidGoal.focusBoundary
      }),
      expect.objectContaining({
        id: `resilience-coverage-gap-${invalidGoal.id}`,
        category: 'resilience',
        objectId: invalidGoal.id,
        suggestedFix: expect.stringContaining('evacuation-route-count')
      }),
      expect.objectContaining({
        id: `resilience-missing-route-roads-${invalidGoal.id}`,
        category: 'resilience',
        objectId: invalidGoal.id
      })
    ])
  );
  expect(validationFeature).toMatchObject({
    overlayId: 'validation-issues',
    objectId: invalidGoal.id,
    objectKind: 'resilience-goal',
    geometry: { type: 'polygon' },
    focus: {
      objectId: invalidGoal.id,
      boundary: invalidGoal.focusBoundary,
      suggestedFix: expect.stringContaining('missing-road')
    }
  });
});

test('browser diagnostics expose resilience goals for debug tools', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const diagnostics = await page.evaluate(() => ({
    validationPassed: window.cityDiagnostics?.validation.passed,
    resilienceGoals: window.cityDiagnostics?.resilienceGoals.total,
    criticalGoals: window.cityDiagnostics?.resilienceGoals.criticalGoals,
    shelterCandidates: window.cityDiagnostics?.resilienceGoals.shelterCandidates,
    evacuationRouteRoads: window.cityDiagnostics?.resilienceGoals.evacuationRouteRoads.join(','),
    overlayFeatures: window.cityDiagnostics?.overlays.find((overlay) => overlay.id === 'resilience-goals')
      ?.featureCount,
    debugText: document.querySelector('[data-city-debug-panel="true"]')?.textContent ?? ''
  }));

  expect(diagnostics).toMatchObject({
    validationPassed: true,
    resilienceGoals: 7,
    criticalGoals: 3,
    shelterCandidates: 3,
    evacuationRouteRoads: 'road-h-6,road-v-6',
    overlayFeatures: 7
  });
  expect(diagnostics.debugText).toContain('Resilience');
  expect(diagnostics.debugText).toContain('7 goals, 3 shelters');
});

function createTraffic(city: ReturnType<CityGenerator['generate']>) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections
  });
}

function countGoalsByKind(goals: ReturnType<CityGenerator['generate']>['resilienceGoals']): Record<string, number> {
  return goals.reduce<Record<string, number>>((countsByKind, goal) => {
    countsByKind[goal.goalKind] = (countsByKind[goal.goalKind] ?? 0) + 1;
    return countsByKind;
  }, {});
}
