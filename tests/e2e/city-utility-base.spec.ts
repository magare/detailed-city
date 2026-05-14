import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { countProceduralSeedDomainObjects, createProceduralSeedJsonExport } from '../../src/city/data-contracts/import-export';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('utility base contracts are deterministic and indexed', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const diagnostics = createCityDiagnostics(firstCity, createTraffic(firstCity), renderConfig);
  const exportArtifact = createProceduralSeedJsonExport(firstCity, {
    seed: cityConfig.seed,
    config: cityConfig
  });

  expect(firstCity.utilityNodes.map(getUtilityNodeSignature)).toEqual(secondCity.utilityNodes.map(getUtilityNodeSignature));
  expect(firstCity.utilityEdges.map(getUtilityEdgeSignature)).toEqual(secondCity.utilityEdges.map(getUtilityEdgeSignature));
  expect(firstCity.utilityNodes).toHaveLength(45);
  expect(firstCity.utilityEdges).toHaveLength(38);
  expect(firstCity.objectIndex.countsByKind['utility-node']).toBe(45);
  expect(firstCity.objectIndex.countsByKind['utility-edge']).toBe(38);
  expect(firstCity.validation.issues.filter((issue) => issue.category === 'utility-coverage')).toEqual([]);
  expect(diagnostics.utilityBase).toMatchObject({
    nodes: 45,
    edges: 38,
    networkTypes: 8,
    backupNodes: 30,
    highCriticalityNodes: 25
  });
  expect(diagnostics.utilityBase.serviceParcels).toBeGreaterThan(0);
  expect(diagnostics.utilityBase.criticalObjects).toBeGreaterThan(0);
  expect(diagnostics.objectCounts).toMatchObject({
    utilityNodes: 45,
    utilityEdges: 38,
    utilityNetworkTypes: 8,
    utilityBackupNodes: 30,
    utilityHighCriticalityNodes: 25
  });
  expect(exportArtifact.domainSectionCounts.utilityNodes).toBe(45);
  expect(exportArtifact.domainSectionCounts.utilityEdges).toBe(38);
  expect(countProceduralSeedDomainObjects(exportArtifact)).toBe(exportArtifact.objectCount);
});

test('utility validation catches invalid service, access, capacity, and edge references', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [firstNode, ...remainingNodes] = city.utilityNodes;
  const [firstEdge, ...remainingEdges] = city.utilityEdges;
  const invalidNode = {
    ...firstNode,
    serviceArea: {
      ...firstNode.serviceArea,
      serviceAreaBoundaryId: 'missing-utility-service-area',
      parcelIds: ['missing-utility-parcel']
    },
    capacity: {
      ...firstNode.capacity,
      value: 0
    },
    accessPoint: {
      ...firstNode.accessPoint,
      objectId: 'missing-access-road',
      clearAccessMeters: 0
    },
    connectedEdgeIds: ['missing-utility-edge']
  };
  const invalidEdge = {
    ...firstEdge,
    toNodeId: 'missing-utility-node',
    lengthMeters: -1,
    capacity: {
      ...firstEdge.capacity,
      peakLoadFactor: 2
    },
    accessPointIds: []
  };
  const invalidCity = {
    ...city,
    utilityNodes: [invalidNode, ...remainingNodes],
    utilityEdges: [invalidEdge, ...remainingEdges]
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: `invalid-utility-node-${firstNode.id}-missing-service-area`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-utility-node-${firstNode.id}-invalid-capacity`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-utility-node-${firstNode.id}-invalid-access-point`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-utility-node-${firstNode.id}-missing-connected-edge-missing-utility-edge`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-utility-node-${firstNode.id}-missing-service-parcel-missing-utility-parcel`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-utility-edge-${firstEdge.id}-missing-node-reference`,
        category: 'utility-coverage'
      })
    ])
  );
});

test('browser diagnostics expose utility base counts in the debug panel', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const diagnostics = await page.evaluate(() => ({
    validationPassed: window.cityDiagnostics?.validation.passed,
    utilityBase: window.cityDiagnostics?.utilityBase,
    utilityNodeObjects: window.cityDiagnostics?.objectIndex.countsByKind['utility-node'],
    utilityEdgeObjects: window.cityDiagnostics?.objectIndex.countsByKind['utility-edge'],
    debugText: document.querySelector('[data-city-debug-panel="true"]')?.textContent ?? ''
  }));

  expect(diagnostics.validationPassed).toBe(true);
  expect(diagnostics.utilityBase).toMatchObject({
    nodes: 45,
    edges: 38,
    networkTypes: 8
  });
  expect(diagnostics.utilityNodeObjects).toBe(45);
  expect(diagnostics.utilityEdgeObjects).toBe(38);
  expect(diagnostics.debugText).toContain('Utilities');
});

function createTraffic(city: ReturnType<CityGenerator['generate']>) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections
  });
}

function getUtilityNodeSignature(node: ReturnType<CityGenerator['generate']>['utilityNodes'][number]) {
  return {
    id: node.id,
    utilityType: node.utilityType,
    nodeRole: node.nodeRole,
    parentId: node.parentId,
    center: node.center,
    serviceArea: node.serviceArea,
    capacity: node.capacity,
    accessPoint: node.accessPoint,
    outage: node.outage,
    ownerEntityId: node.ownerEntityId,
    connectedEdgeIds: node.connectedEdgeIds,
    renderBindingId: node.renderBindingId
  };
}

function getUtilityEdgeSignature(edge: ReturnType<CityGenerator['generate']>['utilityEdges'][number]) {
  return {
    id: edge.id,
    utilityType: edge.utilityType,
    edgeRole: edge.edgeRole,
    parentId: edge.parentId,
    fromNodeId: edge.fromNodeId,
    toNodeId: edge.toNodeId,
    centerline: edge.centerline,
    lengthMeters: edge.lengthMeters,
    serviceAreaBoundaryId: edge.serviceAreaBoundaryId,
    capacity: edge.capacity,
    accessPointIds: edge.accessPointIds,
    outageDomainId: edge.outageDomainId,
    ownerEntityId: edge.ownerEntityId,
    renderBindingId: edge.renderBindingId
  };
}
