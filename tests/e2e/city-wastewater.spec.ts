import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('wastewater skeleton serves buildings and outfalls deterministically', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const diagnostics = createCityDiagnostics(firstCity, createTraffic(firstCity), renderConfig);
  const firstBuilding = firstCity.buildings[0];

  expect(firstCity.utilityNodes.filter((node) => node.utilityType === 'wastewater').map(getWastewaterNodeSignature)).toEqual(
    secondCity.utilityNodes.filter((node) => node.utilityType === 'wastewater').map(getWastewaterNodeSignature)
  );
  expect(firstCity.utilityEdges.filter((edge) => edge.utilityType === 'wastewater').map(getWastewaterEdgeSignature)).toEqual(
    secondCity.utilityEdges.filter((edge) => edge.utilityType === 'wastewater').map(getWastewaterEdgeSignature)
  );
  expect(diagnostics.wastewater).toMatchObject({
    nodes: 6,
    edges: 5,
    manholes: 2,
    liftStations: 1,
    outfalls: 1,
    serviceConnections: 1,
    treatmentPlants: 1,
    buildingsServed: firstCity.buildings.length
  });
  expect(firstCity.validation.issues.filter((issue) => issue.category === 'utility-coverage')).toEqual([]);
  expect(firstBuilding.wastewaterService).toMatchObject({
    serviceNodeId: 'utility-node-wastewater-service-collector-downtown',
    serviceLateralEdgeId: 'utility-edge-wastewater-service-collector-downtown',
    nearestManholeNodeId: 'utility-node-wastewater-manhole-road-v-6-north',
    sewerBasinId: 'wastewater-basin-downtown-primary'
  });
  expect(firstBuilding.wastewaterService?.estimatedPeakLitersPerSecond ?? 0).toBeGreaterThan(0);
  expect(diagnostics.wastewater.sewerBasinIds).toEqual(['wastewater-basin-downtown-primary']);
});

test('wastewater validation catches bad service, elevation, outfall, and edge metadata', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [firstBuilding, ...remainingBuildings] = city.buildings;
  const liftStation = city.utilityNodes.find((node) => node.wastewater?.equipmentKind === 'lift-station');
  const outfall = city.utilityNodes.find((node) => node.wastewater?.equipmentKind === 'outfall');
  const wastewaterEdge = city.utilityEdges.find((edge) => edge.utilityType === 'wastewater');

  if (!liftStation?.wastewater || !outfall?.wastewater || !wastewaterEdge?.wastewater) {
    throw new Error('Expected generated wastewater nodes and edge for invalid fixture.');
  }

  const invalidCity = {
    ...city,
    buildings: [
      {
        ...firstBuilding,
        wastewaterService: {
          ...firstBuilding.wastewaterService!,
          serviceNodeId: 'missing-wastewater-service-node',
          nearestManholeNodeId: 'missing-wastewater-manhole',
          estimatedPeakLitersPerSecond: 0
        }
      },
      ...remainingBuildings
    ],
    utilityNodes: city.utilityNodes.map((node) => {
      if (node.id === liftStation.id) {
        return {
          ...node,
          wastewater: {
            ...liftStation.wastewater!,
            rimElevationMeters: liftStation.wastewater!.invertElevationMeters,
            wetWellVolumeCubicMeters: 0
          }
        };
      }
      if (node.id === outfall.id) {
        return {
          ...node,
          wastewater: {
            ...outfall.wastewater!,
            receivingWaterwayId: 'missing-waterway'
          }
        };
      }
      return node;
    }),
    utilityEdges: city.utilityEdges.map((edge) =>
      edge.id === wastewaterEdge.id
        ? {
            ...edge,
            wastewater: {
              ...wastewaterEdge.wastewater!,
              pipeDiameterMm: 0,
              fromEquipmentKind: 'outfall' as const
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
        id: `invalid-building-wastewater-service-${firstBuilding.id}`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-utility-node-${liftStation.id}-invalid-wastewater-elevation`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-utility-node-${liftStation.id}-invalid-wet-well-volume`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-utility-node-${outfall.id}-missing-receiving-waterway`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-utility-edge-${wastewaterEdge.id}-invalid-wastewater-capacity`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-utility-edge-${wastewaterEdge.id}-equipment-kind-mismatch`,
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

function getWastewaterNodeSignature(node: ReturnType<CityGenerator['generate']>['utilityNodes'][number]) {
  return {
    id: node.id,
    nodeRole: node.nodeRole,
    center: node.center,
    capacity: node.capacity,
    outage: node.outage,
    connectedEdgeIds: node.connectedEdgeIds,
    wastewater: node.wastewater
  };
}

function getWastewaterEdgeSignature(edge: ReturnType<CityGenerator['generate']>['utilityEdges'][number]) {
  return {
    id: edge.id,
    edgeRole: edge.edgeRole,
    fromNodeId: edge.fromNodeId,
    toNodeId: edge.toNodeId,
    centerline: edge.centerline,
    capacity: edge.capacity,
    wastewater: edge.wastewater
  };
}
