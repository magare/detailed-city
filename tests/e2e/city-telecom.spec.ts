import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('telecom network serves buildings and wireless coverage deterministically', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const diagnostics = createCityDiagnostics(firstCity, createTraffic(firstCity), renderConfig);
  const firstBuilding = firstCity.buildings[0];

  expect(firstCity.utilityNodes.filter((node) => node.utilityType === 'telecom').map(getTelecomNodeSignature)).toEqual(
    secondCity.utilityNodes.filter((node) => node.utilityType === 'telecom').map(getTelecomNodeSignature)
  );
  expect(firstCity.utilityEdges.filter((edge) => edge.utilityType === 'telecom').map(getTelecomEdgeSignature)).toEqual(
    secondCity.utilityEdges.filter((edge) => edge.utilityType === 'telecom').map(getTelecomEdgeSignature)
  );
  expect(diagnostics.telecom).toMatchObject({
    nodes: 7,
    edges: 6,
    fiberHubs: 1,
    cabinets: 2,
    ductBanks: 1,
    cellSites: 1,
    antennas: 2,
    buildingsServed: firstCity.buildings.length
  });
  expect(firstCity.validation.issues.filter((issue) => issue.category === 'utility-coverage')).toEqual([]);
  expect(firstBuilding.telecomService).toMatchObject({
    serviceNodeId: 'utility-node-telecom-cabinet-4',
    serviceDropEdgeId: 'utility-edge-telecom-service-drop-downtown',
    networkZoneId: 'telecom-zone-downtown-primary'
  });
  expect(firstBuilding.telecomService?.estimatedPeakMbps ?? 0).toBeGreaterThan(0);
  expect(diagnostics.telecom.coverageAssumptionIds).toEqual(['telecom-coverage-assumption-downtown-primary']);
});

test('telecom validation catches broken service, wireless coverage, and edge metadata', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [firstBuilding, ...remainingBuildings] = city.buildings;
  const antenna = city.utilityNodes.find((node) => node.telecom?.equipmentKind === 'antenna');
  const fiberEdge = city.utilityEdges.find((edge) => edge.telecom?.medium === 'fiber');

  if (!antenna?.telecom || !fiberEdge?.telecom) {
    throw new Error('Expected generated telecom antenna and fiber edge for invalid fixture.');
  }

  const invalidCity = {
    ...city,
    buildings: [
      {
        ...firstBuilding,
        telecomService: {
          ...firstBuilding.telecomService!,
          serviceNodeId: 'missing-telecom-service-node',
          coverageNodeId: 'missing-telecom-coverage-node',
          estimatedPeakMbps: 0
        }
      },
      ...remainingBuildings
    ],
    utilityNodes: city.utilityNodes.map((node) =>
      node.id === antenna.id
        ? {
            ...node,
            telecom: {
              ...antenna.telecom!,
              coverageRadiusMeters: 0,
              frequencyBandGhz: 0,
              backhaulNodeId: 'missing-backhaul-node'
            }
          }
        : node
    ),
    utilityEdges: city.utilityEdges.map((edge) =>
      edge.id === fiberEdge.id
        ? {
            ...edge,
            telecom: {
              ...fiberEdge.telecom!,
              bandwidthMbps: 0,
              fromEquipmentKind: 'antenna' as const,
              ductCount: 0,
              fiberStrandCount: 0
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
        id: `invalid-building-telecom-service-${firstBuilding.id}`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-utility-node-${antenna.id}-missing-wireless-coverage`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-utility-node-${antenna.id}-missing-frequency-band`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-utility-node-${antenna.id}-missing-backhaul-node`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-utility-edge-${fiberEdge.id}-invalid-telecom-capacity`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-utility-edge-${fiberEdge.id}-equipment-kind-mismatch`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-utility-edge-${fiberEdge.id}-missing-fiber-strands`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-utility-edge-${fiberEdge.id}-missing-duct-count`,
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

function getTelecomNodeSignature(node: ReturnType<CityGenerator['generate']>['utilityNodes'][number]) {
  return {
    id: node.id,
    nodeRole: node.nodeRole,
    center: node.center,
    capacity: node.capacity,
    outage: node.outage,
    connectedEdgeIds: node.connectedEdgeIds,
    telecom: node.telecom
  };
}

function getTelecomEdgeSignature(edge: ReturnType<CityGenerator['generate']>['utilityEdges'][number]) {
  return {
    id: edge.id,
    edgeRole: edge.edgeRole,
    fromNodeId: edge.fromNodeId,
    toNodeId: edge.toNodeId,
    centerline: edge.centerline,
    capacity: edge.capacity,
    telecom: edge.telecom
  };
}
