import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('power grid skeleton serves buildings and street lights deterministically', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const diagnostics = createCityDiagnostics(firstCity, createTraffic(firstCity), renderConfig);
  const firstStreetLight = firstCity.streetLights[0];
  const firstBuilding = firstCity.buildings[0];

  expect(firstCity.utilityNodes.filter((node) => node.utilityType === 'power').map(getPowerNodeSignature)).toEqual(
    secondCity.utilityNodes.filter((node) => node.utilityType === 'power').map(getPowerNodeSignature)
  );
  expect(firstCity.utilityEdges.filter((edge) => edge.utilityType === 'power').map(getPowerEdgeSignature)).toEqual(
    secondCity.utilityEdges.filter((edge) => edge.utilityType === 'power').map(getPowerEdgeSignature)
  );
  expect(diagnostics.powerGrid).toMatchObject({
    nodes: 8,
    edges: 7,
    transformers: 3,
    switchgear: 1,
    meters: 1,
    streetLightCircuits: 1,
    backupSupplyNodes: 1,
    buildingsServed: firstCity.buildings.length,
    streetLightsServed: firstCity.streetLights.length
  });
  expect(firstCity.validation.issues.filter((issue) => issue.category === 'utility-coverage')).toEqual([]);
  expect(firstStreetLight.powerCircuitId).toBe('power-circuit-road-v-6-street-lighting');
  expect(firstBuilding.powerService).toMatchObject({
    serviceNodeId: 'utility-node-power-meter-bank-downtown',
    transformerNodeId: 'utility-node-power-transformer-downtown-0',
    serviceLateralEdgeId: 'utility-edge-power-service-meter-bank-downtown',
    circuitId: 'power-circuit-downtown-building-service',
    outageDomainId: 'outage-domain-power-downtown-primary'
  });
  expect(firstBuilding.powerService?.estimatedPeakKva ?? 0).toBeGreaterThan(0);
  expect(diagnostics.powerGrid.circuitIds).toEqual(
    expect.arrayContaining([
      'power-circuit-road-v-6-street-lighting',
      'power-circuit-downtown-building-service',
      'power-feeder-downtown-primary'
    ])
  );
});

test('power validation catches unserved lights, bad building service, and broken equipment metadata', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [firstLight, ...remainingLights] = city.streetLights;
  const [firstBuilding, ...remainingBuildings] = city.buildings;
  const firstTransformer = city.utilityNodes.find((node) => node.powerGrid?.equipmentKind === 'transformer');
  if (!firstTransformer?.powerGrid) {
    throw new Error('Expected generated power transformer for invalid fixture.');
  }
  const transformerPowerGrid = firstTransformer.powerGrid;
  const invalidUtilityNodes = city.utilityNodes.map((node) =>
    node.id === firstTransformer.id
      ? {
          ...node,
          powerGrid: {
            ...transformerPowerGrid,
            voltageKv: 0,
            backupSupplyId: 'missing-power-backup-supply'
          }
        }
      : node
  );
  const invalidCity = {
    ...city,
    streetLights: [
      {
        ...firstLight,
        powerCircuitId: 'missing-power-circuit'
      },
      ...remainingLights
    ],
    buildings: [
      {
        ...firstBuilding,
        powerService: {
          ...firstBuilding.powerService!,
          serviceNodeId: 'missing-power-service-node',
          estimatedPeakKva: 0
        }
      },
      ...remainingBuildings
    ],
    utilityNodes: invalidUtilityNodes
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: `unserved-street-light-power-${firstLight.id}`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-building-power-service-${firstBuilding.id}`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-utility-node-${firstTransformer?.id}-invalid-power-capacity`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-utility-node-${firstTransformer?.id}-missing-backup-supply`,
        category: 'utility-coverage'
      })
    ])
  );
});

test('browser diagnostics expose power grid coverage in the debug panel', async ({ page }) => {
  await page.goto('/?testMode=fast');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const diagnostics = await page.evaluate(() => ({
    validationPassed: window.cityDiagnostics?.validation.passed,
    powerGrid: window.cityDiagnostics?.powerGrid,
    powerNodes: window.cityDiagnostics?.objectCounts.powerGridNodes,
    powerEdges: window.cityDiagnostics?.objectCounts.powerGridEdges,
    debugText: document.querySelector('[data-city-debug-panel="true"]')?.textContent ?? ''
  }));

  expect(diagnostics.validationPassed).toBe(true);
  expect(diagnostics.powerGrid).toMatchObject({
    nodes: 8,
    edges: 7,
    transformers: 3,
    streetLightCircuits: 1,
    buildingsServed: 583,
    streetLightsServed: 12
  });
  expect(diagnostics.powerNodes).toBe(8);
  expect(diagnostics.powerEdges).toBe(7);
  expect(diagnostics.debugText).toContain('Power');
});

function createTraffic(city: ReturnType<CityGenerator['generate']>) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections
  });
}

function getPowerNodeSignature(node: ReturnType<CityGenerator['generate']>['utilityNodes'][number]) {
  return {
    id: node.id,
    nodeRole: node.nodeRole,
    center: node.center,
    capacity: node.capacity,
    outage: node.outage,
    connectedEdgeIds: node.connectedEdgeIds,
    powerGrid: node.powerGrid
  };
}

function getPowerEdgeSignature(edge: ReturnType<CityGenerator['generate']>['utilityEdges'][number]) {
  return {
    id: edge.id,
    edgeRole: edge.edgeRole,
    fromNodeId: edge.fromNodeId,
    toNodeId: edge.toNodeId,
    centerline: edge.centerline,
    capacity: edge.capacity,
    powerGrid: edge.powerGrid
  };
}
