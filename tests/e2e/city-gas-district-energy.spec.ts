import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';
import type { GeneratedCity, UtilityEdge, UtilityNode } from '../../src/types/city';

test('gas and district energy serve buildings deterministically', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const diagnostics = createCityDiagnostics(firstCity, createTraffic(firstCity), renderConfig);
  const thermalNodes = firstCity.utilityNodes.filter((node) => node.utilityType === 'district-energy' || node.utilityType === 'gas');
  const firstBuilding = firstCity.buildings[0];
  const criticalBuildings = firstCity.buildings.filter(isCriticalFacilityBuilding);

  expect(thermalNodes.map(getThermalNodeSignature)).toEqual(
    secondCity.utilityNodes
      .filter((node) => node.utilityType === 'district-energy' || node.utilityType === 'gas')
      .map(getThermalNodeSignature)
  );
  expect(
    firstCity.utilityEdges
      .filter((edge) => edge.utilityType === 'district-energy' || edge.utilityType === 'gas')
      .map(getThermalEdgeSignature)
  ).toEqual(
    secondCity.utilityEdges
      .filter((edge) => edge.utilityType === 'district-energy' || edge.utilityType === 'gas')
      .map(getThermalEdgeSignature)
  );
  expect(firstCity.buildings.map((building) => building.thermalService)).toEqual(secondCity.buildings.map((building) => building.thermalService));
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
    buildingsServed: firstCity.buildings.length,
    criticalBuildingsServed: criticalBuildings.length,
    totalCapacityKwThermal: 47300,
    totalGasCapacityKjPerHour: 40700
  });
  expect(diagnostics.thermalEnergy.thermalLoopIds).toEqual([
    'gas-loop-downtown-primary',
    'thermal-loop-downtown-chilled-water',
    'thermal-loop-downtown-primary'
  ]);
  expect(firstBuilding.thermalService).toMatchObject({
    serviceNodeId: 'utility-node-district-energy-heat-exchanger-downtown',
    heatExchangerNodeId: 'utility-node-district-energy-heat-exchanger-downtown',
    gasServiceNodeId: 'utility-node-gas-meter-bank-downtown',
    serviceLateralEdgeId: 'utility-edge-district-energy-service-heat-exchanger-downtown',
    thermalLoopId: 'thermal-loop-downtown-primary',
    outageDomainId: 'outage-domain-thermal-downtown-primary'
  });
  expect(firstBuilding.thermalService?.estimatedPeakKwThermal ?? 0).toBeGreaterThan(0);
  expect(firstBuilding.thermalService?.estimatedPeakGasKjPerHour ?? 0).toBeGreaterThan(0);
  expect(firstCity.validation.issues).toEqual([]);
});

test('thermal validation catches unserved buildings, critical backup gaps, and bad loop metadata', () => {
  const city = new CityGenerator(cityConfig).generate();
  const missingServiceBuilding = city.buildings.find((building) => !isCriticalFacilityBuilding(building)) ?? city.buildings[0];
  const criticalBuilding = city.buildings.find((building) => isCriticalFacilityBuilding(building) && building.id !== missingServiceBuilding.id);
  const heatExchanger = city.utilityNodes.find((node) => node.thermalEnergy?.equipmentKind === 'heat-exchanger');
  const thermalStorage = city.utilityNodes.find((node) => node.thermalEnergy?.equipmentKind === 'thermal-storage');
  const districtEnergyEdge = city.utilityEdges.find((edge) => edge.utilityType === 'district-energy');
  if (!criticalBuilding?.thermalService || !heatExchanger?.thermalEnergy || !thermalStorage?.thermalEnergy || !districtEnergyEdge?.thermalEnergy) {
    throw new Error('Expected generated thermal service, heat exchanger, storage, and district energy edge for invalid fixture.');
  }
  const invalidCity: GeneratedCity = {
    ...city,
    buildings: city.buildings.map((building) =>
      building.id === missingServiceBuilding.id
        ? {
            ...building,
            thermalService: undefined
          }
        : building.id === criticalBuilding.id
          ? {
              ...building,
              thermalService: {
                ...building.thermalService!,
                serviceNodeId: 'missing-thermal-service-node',
                estimatedPeakKwThermal: 0
              }
            }
          : building
    ),
    utilityNodes: city.utilityNodes.map((node) =>
      node.id === heatExchanger.id
        ? {
            ...node,
            capacity: {
              ...node.capacity,
              value: 0
            },
            thermalEnergy: {
              ...heatExchanger.thermalEnergy!,
              pressureKpa: 0,
              backupFuelAvailable: false
            }
          }
        : node.id === thermalStorage.id
          ? {
              ...node,
              thermalEnergy: {
                ...thermalStorage.thermalEnergy!,
                thermalStorageMwh: 0
              }
            }
          : node
    ),
    utilityEdges: city.utilityEdges.map((edge) =>
      edge.id === districtEnergyEdge.id
        ? {
            ...edge,
            capacity: {
              ...edge.capacity,
              value: 0
            },
            thermalEnergy: {
              ...districtEnergyEdge.thermalEnergy!,
              fromEquipmentKind: 'gas-meter',
              designDeltaTC: 0,
              insulated: false
            }
          }
        : edge
    )
  };
  const validation = validateGeneratedCity(invalidCity);

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: `missing-building-thermal-service-${missingServiceBuilding.id}`,
        severity: 'error',
        category: 'utility-coverage',
        objectId: missingServiceBuilding.id
      }),
      expect.objectContaining({
        id: `invalid-building-thermal-service-${criticalBuilding.id}`,
        severity: 'error',
        category: 'utility-coverage',
        objectId: criticalBuilding.id
      }),
      expect.objectContaining({
        id: `critical-building-thermal-backup-missing-${criticalBuilding.id}`,
        severity: 'error',
        category: 'utility-coverage',
        objectId: criticalBuilding.id
      }),
      expect.objectContaining({
        id: `invalid-utility-node-${heatExchanger.id}-invalid-thermal-capacity`,
        severity: 'error',
        category: 'utility-coverage',
        objectId: heatExchanger.id
      }),
      expect.objectContaining({
        id: `invalid-utility-node-${thermalStorage.id}-invalid-thermal-storage`,
        severity: 'error',
        category: 'utility-coverage',
        objectId: thermalStorage.id
      }),
      expect.objectContaining({
        id: `invalid-utility-edge-${districtEnergyEdge.id}-equipment-kind-mismatch`,
        severity: 'error',
        category: 'utility-coverage',
        objectId: districtEnergyEdge.id
      }),
      expect.objectContaining({
        id: `invalid-utility-edge-${districtEnergyEdge.id}-invalid-thermal-loop-assumptions`,
        severity: 'error',
        category: 'utility-coverage',
        objectId: districtEnergyEdge.id
      })
    ])
  );
});

function isCriticalFacilityBuilding(building: GeneratedCity['buildings'][number]): boolean {
  return building.uses.some((use) => use === 'civic' || use === 'education' || use === 'transport' || use === 'utility');
}

function getThermalNodeSignature(node: UtilityNode) {
  return {
    id: node.id,
    utilityType: node.utilityType,
    parentId: node.parentId,
    center: node.center,
    role: node.nodeRole,
    capacity: node.capacity,
    thermalEnergy: node.thermalEnergy
  };
}

function getThermalEdgeSignature(edge: UtilityEdge) {
  return {
    id: edge.id,
    utilityType: edge.utilityType,
    fromNodeId: edge.fromNodeId,
    toNodeId: edge.toNodeId,
    lengthMeters: edge.lengthMeters,
    thermalEnergy: edge.thermalEnergy
  };
}

function createTraffic(city: GeneratedCity) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections,
    trafficCalmingDevices: city.trafficCalmingDevices
  });
}
