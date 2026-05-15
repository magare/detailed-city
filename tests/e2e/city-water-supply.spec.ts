import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('water supply skeleton serves buildings and hydrants deterministically', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const diagnostics = createCityDiagnostics(firstCity, createTraffic(firstCity), renderConfig);
  const firstBuilding = firstCity.buildings[0];
  const hydrants = firstCity.utilityNodes.filter((node) => node.waterSupply?.equipmentKind === 'hydrant');

  expect(firstCity.utilityNodes.filter((node) => node.utilityType === 'water').map(getWaterNodeSignature)).toEqual(
    secondCity.utilityNodes.filter((node) => node.utilityType === 'water').map(getWaterNodeSignature)
  );
  expect(firstCity.utilityEdges.filter((edge) => edge.utilityType === 'water').map(getWaterEdgeSignature)).toEqual(
    secondCity.utilityEdges.filter((edge) => edge.utilityType === 'water').map(getWaterEdgeSignature)
  );
  expect(diagnostics.waterSupply).toMatchObject({
    nodes: 7,
    edges: 6,
    hydrants: 2,
    valves: 1,
    pumps: 1,
    tanks: 1,
    meters: 1,
    pressureZones: 1,
    buildingsServed: firstCity.buildings.length
  });
  expect(firstCity.validation.issues.filter((issue) => issue.category === 'utility-coverage')).toEqual([]);
  expect(hydrants).toHaveLength(2);
  expect(hydrants.every((node) => (node.waterSupply?.hydrantReachMeters ?? 0) > 0)).toBe(true);
  expect(firstBuilding.waterService).toMatchObject({
    serviceNodeId: 'utility-node-water-meter-bank-downtown',
    serviceLateralEdgeId: 'utility-edge-water-service-meter-bank-downtown',
    pressureZoneId: 'water-pressure-zone-downtown-primary',
    nearestHydrantNodeId: 'utility-node-water-hydrant-road-v-6-north'
  });
  expect(firstBuilding.waterService?.estimatedPeakLitersPerSecond ?? 0).toBeGreaterThan(0);
  expect(diagnostics.waterSupply.pressureZoneIds).toEqual(['water-pressure-zone-downtown-primary']);
});

test('water validation catches bad service, pressure, hydrant reach, and edge metadata', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [firstBuilding, ...remainingBuildings] = city.buildings;
  const firstHydrant = city.utilityNodes.find((node) => node.waterSupply?.equipmentKind === 'hydrant');
  const firstWaterEdge = city.utilityEdges.find((edge) => edge.utilityType === 'water');
  if (!firstHydrant?.waterSupply || !firstWaterEdge?.waterSupply) {
    throw new Error('Expected generated water hydrant and water edge for invalid fixture.');
  }
  const hydrantWaterSupply = firstHydrant.waterSupply;
  const edgeWaterSupply = firstWaterEdge.waterSupply;
  const invalidCity = {
    ...city,
    buildings: [
      {
        ...firstBuilding,
        waterService: {
          ...firstBuilding.waterService!,
          serviceNodeId: 'missing-water-service-node',
          nearestHydrantNodeId: 'missing-water-hydrant',
          estimatedPeakLitersPerSecond: 0
        }
      },
      ...remainingBuildings
    ],
    utilityNodes: city.utilityNodes.map((node) =>
      node.id === firstHydrant.id
        ? {
            ...node,
            waterSupply: {
              ...hydrantWaterSupply,
              pressureMinKpa: 500,
              pressureMaxKpa: 400,
              hydrantReachMeters: 0
            }
          }
        : node
    ),
    utilityEdges: city.utilityEdges.map((edge) =>
      edge.id === firstWaterEdge.id
        ? {
            ...edge,
            waterSupply: {
              ...edgeWaterSupply,
              pipeDiameterMm: 0,
              fromEquipmentKind: 'hydrant' as const
            }
          }
        : edge
    )
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: `invalid-building-water-service-${firstBuilding.id}`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-utility-node-${firstHydrant.id}-invalid-water-pressure`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-utility-node-${firstHydrant.id}-invalid-hydrant-reach`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-utility-edge-${firstWaterEdge.id}-invalid-water-capacity`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-utility-edge-${firstWaterEdge.id}-equipment-kind-mismatch`,
        category: 'utility-coverage'
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

function getWaterNodeSignature(node: ReturnType<CityGenerator['generate']>['utilityNodes'][number]) {
  return {
    id: node.id,
    nodeRole: node.nodeRole,
    center: node.center,
    capacity: node.capacity,
    outage: node.outage,
    connectedEdgeIds: node.connectedEdgeIds,
    waterSupply: node.waterSupply
  };
}

function getWaterEdgeSignature(edge: ReturnType<CityGenerator['generate']>['utilityEdges'][number]) {
  return {
    id: edge.id,
    edgeRole: edge.edgeRole,
    fromNodeId: edge.fromNodeId,
    toNodeId: edge.toNodeId,
    centerline: edge.centerline,
    capacity: edge.capacity,
    waterSupply: edge.waterSupply
  };
}
