import { expect, test } from '@playwright/test';
import { createGeneratedCityObjectIndex, createGeneratedRuntimeObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { createCityOverlayDatasets } from '../../src/city/rendering-handoff/overlays/overlayData';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';
import type { GeneratedCity } from '../../src/types/city';

test('maintenance operations are deterministic and schedule asset work from inventory and navigation data', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(firstCity);
  const diagnostics = createCityDiagnostics(firstCity, traffic, renderConfig);
  const overlays = createCityOverlayDatasets(firstCity, createGeneratedRuntimeObjectIndex(firstCity, traffic));
  const maintenanceWatchIds = new Set(
    firstCity.assetInventoryRecords
      .filter((record) => record.operationalStatus === 'maintenance-watch')
      .map((record) => record.id)
  );
  const queuedAssetIds = new Set(
    firstCity.maintenanceOperations
      .filter((operation) => operation.operationKind === 'repair' || operation.operationKind === 'replacement')
      .map((operation) => operation.assetInventoryRecordId)
  );

  expect(firstCity.maintenanceOperations.map(getMaintenanceSignature)).toEqual(
    secondCity.maintenanceOperations.map(getMaintenanceSignature)
  );
  expect(firstCity.validation.passed).toBe(true);
  expect(firstCity.maintenanceOperations).toHaveLength(402);
  expect(diagnostics.maintenanceOperations).toMatchObject({
    total: 402,
    inspectionCycles: 24,
    repairQueueItems: 155,
    replacementPlans: 211,
    streetWorks: 8,
    temporaryClosures: 4,
    assetsWithConditionUpdates: 295,
    closureRoads: 7,
    closureNavigationEdges: 15,
    operationRoutes: 1
  });
  expect([...maintenanceWatchIds].every((id) => queuedAssetIds.has(id))).toBe(true);
  expect(firstCity.maintenanceOperations.every((operation) => operation.navigationRouteId === 'navigation-route-service-service-4')).toBe(true);
  expect(firstCity.maintenanceOperations.some((operation) => operation.createsTemporaryClosure)).toBe(true);
  expect(overlays.find((overlay) => overlay.id === 'maintenance-operations')?.featureCount).toBe(402);
});

test('maintenance validation catches broken asset, route, schedule, and closure references', () => {
  const city = new CityGenerator(cityConfig).generate();
  const operation = city.maintenanceOperations.find((candidate) => candidate.createsTemporaryClosure) ?? city.maintenanceOperations[0];
  const watchedRecordOperation = city.maintenanceOperations.find((candidate) => candidate.operationKind === 'repair');

  expect(operation).toBeDefined();
  expect(watchedRecordOperation).toBeDefined();

  const invalidOperation = {
    ...operation,
    navigationRouteId: 'missing-operation-route',
    scheduledWindow: {
      ...operation.scheduledWindow,
      endDay: operation.scheduledWindow.startDay - 1
    },
    repairQueue: {
      ...operation.repairQueue,
      estimatedCrewHours: 0
    },
    conditionUpdate: {
      ...operation.conditionUpdate,
      projectedScore: operation.conditionUpdate.fromScore - 1
    },
    closureRoadIds: ['missing-road'],
    closureNavigationEdgeIds: ['missing-navigation-edge']
  };
  const invalidCity = {
    ...city,
    maintenanceOperations: [
      invalidOperation,
      ...city.maintenanceOperations.filter((candidate) =>
        candidate.id !== operation.id && candidate.assetInventoryRecordId !== watchedRecordOperation?.assetInventoryRecordId
      )
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
        id: `maintenance-operation-missing-operation-route-${operation.id}`,
        category: 'operations'
      }),
      expect.objectContaining({
        id: `maintenance-operation-invalid-schedule-queue-condition-${operation.id}`,
        category: 'operations'
      }),
      expect.objectContaining({
        id: `maintenance-operation-missing-closure-road-missing-road-${operation.id}`,
        category: 'operations'
      }),
      expect.objectContaining({
        id: `maintenance-operation-missing-closure-edge-missing-navigation-edge-${operation.id}`,
        category: 'operations'
      }),
      expect.objectContaining({
        id: `missing-maintenance-operation-${watchedRecordOperation?.assetInventoryRecordId}`,
        category: 'operations'
      })
    ])
  );
});

test('maintenance diagnostics and overlays are inspectable in browser debug surfaces', async ({ page }) => {
  await page.goto('/?testMode=fast', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const diagnostics = await page.evaluate(() => ({
    validationPassed: window.cityDiagnostics?.validation.passed,
    maintenance: window.cityDiagnostics?.maintenanceOperations,
    maintenanceObjects: window.cityDiagnostics?.objectCounts.maintenanceOperations,
    overlayFeatures: window.cityDiagnostics?.overlays.find((overlay) => overlay.id === 'maintenance-operations')?.featureCount,
    panelText: document.body.innerText
  }));

  expect(diagnostics.validationPassed).toBe(true);
  expect(diagnostics.maintenance?.total).toBe(402);
  expect(diagnostics.maintenance?.repairQueueItems).toBe(155);
  expect(diagnostics.maintenance?.temporaryClosures).toBe(4);
  expect(diagnostics.maintenanceObjects).toBe(402);
  expect(diagnostics.overlayFeatures).toBe(402);
  expect(diagnostics.panelText).toContain('Maintenance');
  expect(diagnostics.panelText).toContain('402 ops');
});

function createTraffic(city: ReturnType<CityGenerator['generate']>) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections
  });
}

function getMaintenanceSignature(operation: GeneratedCity['maintenanceOperations'][number]): readonly unknown[] {
  return [
    operation.id,
    operation.assetInventoryRecordId,
    operation.operationKind,
    operation.status,
    operation.priority,
    operation.scheduledWindow.startDay,
    operation.scheduledWindow.endDay,
    operation.repairQueue.sequence,
    operation.repairQueue.estimatedCrewHours,
    operation.conditionUpdate.fromScore,
    operation.conditionUpdate.projectedScore,
    operation.navigationRouteId,
    operation.closureRoadIds.join(','),
    operation.closureNavigationEdgeIds.join(',')
  ];
}
