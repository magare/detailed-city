import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';
import type { GeneratedCity, UtilityEdge, UtilityNode } from '../../src/types/city';

test('telecom network serves buildings and wireless coverage deterministically', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const diagnostics = createCityDiagnostics(firstCity, createTraffic(firstCity), renderConfig);
  const telecomNodes = firstCity.utilityNodes.filter((node) => node.utilityType === 'telecom');
  const firstBuilding = firstCity.buildings[0];
  const criticalBuildings = firstCity.buildings.filter(isCriticalFacilityBuilding);

  expect(telecomNodes.map(getTelecomNodeSignature)).toEqual(
    secondCity.utilityNodes.filter((node) => node.utilityType === 'telecom').map(getTelecomNodeSignature)
  );
  expect(firstCity.utilityEdges.filter((edge) => edge.utilityType === 'telecom').map(getTelecomEdgeSignature)).toEqual(
    secondCity.utilityEdges.filter((edge) => edge.utilityType === 'telecom').map(getTelecomEdgeSignature)
  );
  expect(firstCity.buildings.map((building) => building.telecomService)).toEqual(secondCity.buildings.map((building) => building.telecomService));
  expect(diagnostics.telecom).toMatchObject({
    nodes: 7,
    edges: 6,
    fiberHubs: 1,
    cabinets: 2,
    ductBanks: 1,
    cellSites: 1,
    antennas: 2,
    buildingsServed: firstCity.buildings.length,
    criticalBuildingsServed: criticalBuildings.length,
    totalCapacityMbps: 110600
  });
  expect(diagnostics.telecom.networkZoneIds).toEqual(['telecom-zone-downtown-primary']);
  expect(diagnostics.telecom.coverageAssumptionIds).toEqual(['telecom-coverage-assumption-downtown-primary']);
  expect(firstBuilding.telecomService).toMatchObject({
    serviceDropEdgeId: 'utility-edge-telecom-service-drop-downtown',
    networkZoneId: 'telecom-zone-downtown-primary',
    coverageNodeId: 'utility-node-telecom-antenna-rooftop-sector-east'
  });
  expect(firstBuilding.telecomService?.estimatedPeakMbps ?? 0).toBeGreaterThan(0);
  expect(telecomNodes.filter((node) => node.telecom?.equipmentKind === 'antenna').every((node) => (node.telecom?.coverageRadiusMeters ?? 0) > 0)).toBe(true);
  expect(firstCity.validation.issues).toEqual([]);
});

test('telecom validation catches uncovered buildings, critical facilities, and bad network metadata', () => {
  const city = new CityGenerator(cityConfig).generate();
  const firstBuilding = city.buildings[0];
  const firstCriticalBuilding = city.buildings.find(isCriticalFacilityBuilding);
  const firstAntenna = city.utilityNodes.find((node) => node.telecom?.equipmentKind === 'antenna');
  const firstTelecomEdge = city.utilityEdges.find((edge) => edge.utilityType === 'telecom');
  if (!firstCriticalBuilding?.telecomService || !firstAntenna?.telecom || !firstTelecomEdge?.telecom) {
    throw new Error('Expected generated telecom building service, antenna node, and telecom edge for invalid fixture.');
  }
  const antennaTelecom = firstAntenna.telecom;
  const edgeTelecom = firstTelecomEdge.telecom;
  const invalidCity: GeneratedCity = {
    ...city,
    buildings: city.buildings.map((building) =>
      building.id === firstBuilding.id
        ? {
            ...building,
            telecomService: undefined
          }
        : building.id === firstCriticalBuilding.id
          ? {
              ...building,
              telecomService: {
                ...building.telecomService!,
                redundancyTier: 'none'
              }
            }
          : building
    ),
    utilityNodes: city.utilityNodes.map((node) =>
      node.id === firstAntenna.id
        ? {
            ...node,
            capacity: {
              ...node.capacity,
              value: 0
            },
            telecom: {
              ...antennaTelecom,
              coverageRadiusMeters: 0,
              frequencyBandGhz: 0,
              backhaulNodeId: 'missing-telecom-backhaul'
            }
          }
        : node
    ),
    utilityEdges: city.utilityEdges.map((edge) =>
      edge.id === firstTelecomEdge.id
        ? {
            ...edge,
            capacity: {
              ...edge.capacity,
              value: 0
            },
            telecom: {
              ...edgeTelecom,
              fromEquipmentKind: 'antenna',
              fiberStrandCount: 0,
              ductCount: 0,
              latencyMs: 0
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
        id: `missing-building-telecom-service-${firstBuilding.id}`,
        severity: 'error',
        category: 'utility-coverage',
        objectId: firstBuilding.id
      }),
      expect.objectContaining({
        id: `critical-building-uncovered-telecom-${firstCriticalBuilding.id}`,
        severity: 'error',
        category: 'utility-coverage',
        objectId: firstCriticalBuilding.id
      }),
      expect.objectContaining({
        id: `invalid-utility-node-${firstAntenna.id}-invalid-telecom-capacity`,
        severity: 'error',
        category: 'utility-coverage',
        objectId: firstAntenna.id
      }),
      expect.objectContaining({
        id: `invalid-utility-node-${firstAntenna.id}-missing-wireless-coverage`,
        severity: 'error',
        category: 'utility-coverage',
        objectId: firstAntenna.id
      }),
      expect.objectContaining({
        id: `invalid-utility-edge-${firstTelecomEdge.id}-invalid-telecom-capacity`,
        severity: 'error',
        category: 'utility-coverage',
        objectId: firstTelecomEdge.id
      }),
      expect.objectContaining({
        id: `invalid-utility-edge-${firstTelecomEdge.id}-equipment-kind-mismatch`,
        severity: 'error',
        category: 'utility-coverage',
        objectId: firstTelecomEdge.id
      })
    ])
  );
});

function isCriticalFacilityBuilding(building: GeneratedCity['buildings'][number]): boolean {
  return building.uses.some((use) => use === 'civic' || use === 'education' || use === 'transport' || use === 'utility');
}

function getTelecomNodeSignature(node: UtilityNode) {
  return {
    id: node.id,
    parentId: node.parentId,
    center: node.center,
    role: node.nodeRole,
    telecom: node.telecom
  };
}

function getTelecomEdgeSignature(edge: UtilityEdge) {
  return {
    id: edge.id,
    fromNodeId: edge.fromNodeId,
    toNodeId: edge.toNodeId,
    lengthMeters: edge.lengthMeters,
    telecom: edge.telecom
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
