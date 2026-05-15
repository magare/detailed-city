import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { countProceduralSeedDomainObjects, createProceduralSeedJsonExport } from '../../src/city/data-contracts/import-export';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { createCityOverlayDatasets } from '../../src/city/rendering-handoff/overlays/overlayData';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('service access corridors are deterministic, indexed, diagnosed, and exported', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(firstCity);
  const diagnostics = createCityDiagnostics(firstCity, traffic, renderConfig);
  const overlays = createCityOverlayDatasets(firstCity, diagnostics.objectIndex);
  const exportArtifact = createProceduralSeedJsonExport(firstCity, {
    seed: cityConfig.seed,
    config: cityConfig
  });
  const serviceAccessOverlay = overlays.find((overlay) => overlay.id === 'service-access');

  expect(firstCity.serviceAccessCorridors.map(getServiceAccessSignature)).toEqual(
    secondCity.serviceAccessCorridors.map(getServiceAccessSignature)
  );
  expect(firstCity.serviceAccessCorridors.length).toBeGreaterThan(
    firstCity.utilityNodes.length + firstCity.utilityEdges.length + firstCity.cadastreRecords.length
  );
  expect(new Set(firstCity.serviceAccessCorridors.map((corridor) => corridor.corridorKind))).toEqual(
    new Set(['maintenance-path', 'restricted-corridor', 'service-yard', 'utility-easement', 'vault-access'])
  );
  expect(firstCity.objectIndex.countsByKind['service-access-corridor']).toBe(firstCity.serviceAccessCorridors.length);
  expect(firstCity.validation.issues.filter((issue) => issue.category === 'utility-coverage')).toEqual([]);
  expect(firstCity.utilityNodes.every((node) => (node.serviceAccessCorridorIds ?? []).length > 0)).toBe(true);
  expect(firstCity.utilityEdges.every((edge) => (edge.serviceAccessCorridorIds ?? []).length > 0)).toBe(true);
  expect(firstCity.buildings.every((building) => (building.serviceAccessCorridorIds ?? []).length > 0)).toBe(true);
  expect(diagnostics.serviceAccess).toMatchObject({
    total: firstCity.serviceAccessCorridors.length,
    utilityNodesLinked: firstCity.utilityNodes.length,
    utilityEdgesLinked: firstCity.utilityEdges.length,
    buildingsLinked: firstCity.buildings.length
  });
  expect(diagnostics.serviceAccess.utilityEasements).toBe(firstCity.cadastreRecords.length);
  expect(diagnostics.serviceAccess.vaultAccess).toBe(firstCity.utilityNodes.length);
  expect(diagnostics.serviceAccess.maintenancePaths).toBe(firstCity.utilityEdges.length);
  expect(diagnostics.objectCounts.serviceAccessCorridors).toBe(firstCity.serviceAccessCorridors.length);
  expect(serviceAccessOverlay?.featureCount).toBe(firstCity.serviceAccessCorridors.length);
  expect(exportArtifact.domainSectionCounts.serviceAccessCorridors).toBe(firstCity.serviceAccessCorridors.length);
  expect(countProceduralSeedDomainObjects(exportArtifact)).toBe(exportArtifact.objectCount);
});

test('service access validation catches inaccessible assets and invalid restricted corridors', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [geometryCorridor, accessCorridor, ...remainingCorridors] = city.serviceAccessCorridors;
  const [firstNode, ...remainingNodes] = city.utilityNodes;
  const [firstEdge, ...remainingEdges] = city.utilityEdges;
  const [firstBuilding, ...remainingBuildings] = city.buildings;
  const invalidGeometryCorridor = {
    ...geometryCorridor,
    lengthMeters: 0,
    widthMeters: 0,
    clearAccessMeters: 5,
    utilityNodeIds: [],
    utilityEdgeIds: [],
    buildingIds: [],
    parcelIds: [],
    roadIds: [],
    cadastreRecordIds: [],
    cadastreEasementIds: []
  };
  const invalidAccessCorridor = {
    ...accessCorridor,
    utilityNodeIds: ['missing-utility-node'],
    utilityEdgeIds: ['missing-utility-edge'],
    buildingIds: ['missing-building'],
    parcelIds: ['missing-parcel'],
    cadastreRecordIds: ['missing-cadastre-record'],
    cadastreEasementIds: ['missing-cadastre-easement'],
    roadIds: ['missing-road'],
    restricted: true,
    restrictions: [],
    authorizedRoleIds: [],
    maintenanceWindow: {
      startHour: 20,
      endHour: 8,
      days: []
    }
  };
  const invalidNode = {
    ...firstNode,
    serviceAccessCorridorIds: []
  };
  const invalidEdge = {
    ...firstEdge,
    serviceAccessCorridorIds: []
  };
  const invalidBuilding = {
    ...firstBuilding,
    serviceAccessCorridorIds: []
  };
  const invalidCity = {
    ...city,
    serviceAccessCorridors: [invalidGeometryCorridor, invalidAccessCorridor, ...remainingCorridors],
    utilityNodes: [invalidNode, ...remainingNodes],
    utilityEdges: [invalidEdge, ...remainingEdges],
    buildings: [invalidBuilding, ...remainingBuildings]
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: `invalid-service-access-corridor-${geometryCorridor.id}-invalid-geometry`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-service-access-corridor-${geometryCorridor.id}-missing-object-links`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-service-access-corridor-${accessCorridor.id}-missing-utility-node-missing-utility-node`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-service-access-corridor-${accessCorridor.id}-missing-easement-missing-cadastre-easement`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-service-access-corridor-${accessCorridor.id}-missing-access-control`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-service-access-corridor-${accessCorridor.id}-invalid-maintenance-window`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-utility-node-${firstNode.id}-missing-service-access-corridor`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-utility-edge-${firstEdge.id}-missing-service-access-corridor`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-building-${firstBuilding.id}-missing-service-access-corridor`,
        category: 'utility-coverage'
      })
    ])
  );
});

test('service access diagnostics are visible in browser debug surfaces', async ({ page }) => {
  await page.goto('/?testMode=fast');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const browserDiagnostics = await page.evaluate(() => ({
    validationPassed: window.cityDiagnostics?.validation.passed,
    serviceAccess: window.cityDiagnostics?.serviceAccess,
    serviceAccessObjects: window.cityDiagnostics?.objectCounts.serviceAccessCorridors,
    serviceAccessOverlay: window.cityDiagnostics?.overlays.find((overlay) => overlay.id === 'service-access')?.featureCount,
    overlayIds: window.cityDiagnostics?.overlays.map((overlay) => overlay.id),
    panelText: document.querySelector('[data-city-debug-panel="true"]')?.textContent ?? ''
  }));

  expect(browserDiagnostics.validationPassed).toBe(true);
  expect(browserDiagnostics.serviceAccess?.total).toBeGreaterThan(0);
  expect(browserDiagnostics.serviceAccess?.total).toBe(browserDiagnostics.serviceAccessObjects);
  expect(browserDiagnostics.serviceAccessOverlay).toBe(browserDiagnostics.serviceAccess?.total);
  expect(browserDiagnostics.overlayIds).toContain('service-access');
  expect(browserDiagnostics.panelText).toContain('Service Access');
});

function createTraffic(city: ReturnType<CityGenerator['generate']>) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections
  });
}

function getServiceAccessSignature(corridor: ReturnType<CityGenerator['generate']>['serviceAccessCorridors'][number]) {
  return {
    id: corridor.id,
    parentId: corridor.parentId,
    corridorKind: corridor.corridorKind,
    surface: corridor.surface,
    center: corridor.center,
    boundary: corridor.boundary,
    lengthMeters: corridor.lengthMeters,
    widthMeters: corridor.widthMeters,
    clearAccessMeters: corridor.clearAccessMeters,
    utilityNodeIds: corridor.utilityNodeIds,
    utilityEdgeIds: corridor.utilityEdgeIds,
    buildingIds: corridor.buildingIds,
    parcelIds: corridor.parcelIds,
    cadastreRecordIds: corridor.cadastreRecordIds,
    cadastreEasementIds: corridor.cadastreEasementIds,
    roadIds: corridor.roadIds,
    restricted: corridor.restricted,
    restrictions: corridor.restrictions,
    authorizedRoleIds: corridor.authorizedRoleIds,
    maintenanceWindow: corridor.maintenanceWindow,
    emergencyAccess: corridor.emergencyAccess
  };
}
