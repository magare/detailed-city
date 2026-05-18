import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('gas and district energy serve buildings deterministically', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const diagnostics = createCityDiagnostics(firstCity, createTraffic(firstCity), renderConfig);
  const firstBuilding = firstCity.buildings[0];

  expect(firstCity.utilityNodes.filter(isThermalNode).map(getThermalNodeSignature)).toEqual(
    secondCity.utilityNodes.filter(isThermalNode).map(getThermalNodeSignature)
  );
  expect(firstCity.utilityEdges.filter(isThermalEdge).map(getThermalEdgeSignature)).toEqual(
    secondCity.utilityEdges.filter(isThermalEdge).map(getThermalEdgeSignature)
  );
  expect(diagnostics.thermalEnergy).toMatchObject({
    nodes: 8,
    edges: 7,
    gasNodes: 3,
    districtEnergyNodes: 5,
    gasRegulators: 1,
    gasMeters: 1,
    plantRooms: 1,
    boilers: 1,
    chillers: 1,
    heatExchangers: 1,
    thermalStorageNodes: 1,
    buildingsServed: firstCity.buildings.length
  });
  expect(firstCity.validation.issues.filter((issue) => issue.category === 'utility-coverage')).toEqual([]);
  expect(firstBuilding.thermalService).toMatchObject({
    serviceNodeId: 'utility-node-district-energy-heat-exchanger-downtown',
    heatExchangerNodeId: 'utility-node-district-energy-heat-exchanger-downtown',
    gasServiceNodeId: 'utility-node-gas-meter-bank-downtown',
    serviceLateralEdgeId: 'utility-edge-district-energy-service-heat-exchanger-downtown',
    thermalLoopId: 'thermal-loop-downtown-primary',
    outageDomainId: 'outage-domain-thermal-downtown-primary'
  });
  expect(firstBuilding.thermalService?.estimatedPeakKwThermal ?? 0).toBeGreaterThan(0);
  expect(diagnostics.thermalEnergy.thermalLoopIds).toEqual(
    expect.arrayContaining(['gas-loop-downtown-primary', 'thermal-loop-downtown-primary'])
  );
});

test('gas and district energy validation catches broken service, node, and edge metadata', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [firstBuilding, ...remainingBuildings] = city.buildings;
  const boiler = city.utilityNodes.find((node) => node.thermalEnergy?.equipmentKind === 'boiler');
  const storage = city.utilityNodes.find((node) => node.thermalEnergy?.equipmentKind === 'thermal-storage');
  const districtEnergyEdge = city.utilityEdges.find((edge) => edge.utilityType === 'district-energy');

  if (!boiler?.thermalEnergy || !storage?.thermalEnergy || !districtEnergyEdge?.thermalEnergy) {
    throw new Error('Expected generated thermal nodes and district-energy edge for invalid fixture.');
  }

  const invalidCity = {
    ...city,
    buildings: [
      {
        ...firstBuilding,
        thermalService: {
          ...firstBuilding.thermalService!,
          serviceNodeId: 'missing-thermal-service-node',
          heatExchangerNodeId: 'missing-heat-exchanger',
          gasServiceNodeId: 'missing-gas-meter',
          serviceModes: [],
          estimatedPeakKwThermal: 0
        }
      },
      ...remainingBuildings
    ],
    utilityNodes: city.utilityNodes.map((node) => {
      if (node.id === boiler.id) {
        return {
          ...node,
          thermalEnergy: {
            ...boiler.thermalEnergy!,
            supplyTemperatureC: 80,
            returnTemperatureC: 80,
            pressureKpa: 0
          }
        };
      }
      if (node.id === storage.id) {
        return {
          ...node,
          thermalEnergy: {
            ...storage.thermalEnergy!,
            thermalStorageMwh: 0
          }
        };
      }
      return node;
    }),
    utilityEdges: city.utilityEdges.map((edge) =>
      edge.id === districtEnergyEdge.id
        ? {
            ...edge,
            thermalEnergy: {
              ...districtEnergyEdge.thermalEnergy!,
              pipeDiameterMm: 0,
              fromEquipmentKind: 'gas-meter' as const,
              insulated: false,
              designDeltaTC: 0
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
        id: `invalid-building-thermal-service-${firstBuilding.id}`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-utility-node-${boiler.id}-invalid-thermal-operating-state`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-utility-node-${storage.id}-invalid-thermal-storage`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-utility-edge-${districtEnergyEdge.id}-invalid-thermal-capacity`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-utility-edge-${districtEnergyEdge.id}-equipment-kind-mismatch`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-utility-edge-${districtEnergyEdge.id}-invalid-thermal-loop-assumptions`,
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

function isThermalNode(node: ReturnType<CityGenerator['generate']>['utilityNodes'][number]): boolean {
  return node.utilityType === 'gas' || node.utilityType === 'district-energy';
}

function isThermalEdge(edge: ReturnType<CityGenerator['generate']>['utilityEdges'][number]): boolean {
  return edge.utilityType === 'gas' || edge.utilityType === 'district-energy';
}

function getThermalNodeSignature(node: ReturnType<CityGenerator['generate']>['utilityNodes'][number]) {
  return {
    id: node.id,
    utilityType: node.utilityType,
    nodeRole: node.nodeRole,
    center: node.center,
    capacity: node.capacity,
    outage: node.outage,
    connectedEdgeIds: node.connectedEdgeIds,
    thermalEnergy: node.thermalEnergy
  };
}

function getThermalEdgeSignature(edge: ReturnType<CityGenerator['generate']>['utilityEdges'][number]) {
  return {
    id: edge.id,
    utilityType: edge.utilityType,
    edgeRole: edge.edgeRole,
    fromNodeId: edge.fromNodeId,
    toNodeId: edge.toNodeId,
    centerline: edge.centerline,
    capacity: edge.capacity,
    thermalEnergy: edge.thermalEnergy
  };
}
