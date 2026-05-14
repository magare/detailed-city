import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('stormwater system drains roads and outfalls deterministically', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const diagnostics = createCityDiagnostics(firstCity, createTraffic(firstCity), renderConfig);
  const stormwaterNodes = firstCity.utilityNodes.filter((node) => node.utilityType === 'stormwater');
  const firstRoadDrainage = firstCity.roads[0].stormwaterDrainage;

  expect(stormwaterNodes.map(getStormwaterNodeSignature)).toEqual(
    secondCity.utilityNodes.filter((node) => node.utilityType === 'stormwater').map(getStormwaterNodeSignature)
  );
  expect(firstCity.utilityEdges.filter((edge) => edge.utilityType === 'stormwater').map(getStormwaterEdgeSignature)).toEqual(
    secondCity.utilityEdges.filter((edge) => edge.utilityType === 'stormwater').map(getStormwaterEdgeSignature)
  );
  expect(firstCity.roads.map((road) => road.stormwaterDrainage)).toEqual(secondCity.roads.map((road) => road.stormwaterDrainage));
  expect(diagnostics.stormwater).toMatchObject({
    nodes: 8,
    edges: 7,
    inlets: 2,
    drains: 1,
    bioswales: 1,
    detentionBasins: 1,
    culverts: 1,
    outfalls: 1,
    perviousAreas: 1,
    roadsDrained: firstCity.roads.length,
    hazardZonesReferenced: 2
  });
  expect(firstCity.validation.issues.filter((issue) => issue.category === 'utility-coverage')).toEqual([]);
  expect(firstRoadDrainage).toMatchObject({
    drainageCatchmentId: 'stormwater-catchment-downtown-river-primary',
    lowPointNodeId: 'utility-node-stormwater-inlet-road-v-6-north',
    detentionNodeId: 'utility-node-stormwater-detention-waterfront',
    perviousAreaNodeIds: ['utility-node-stormwater-pervious-plaza-strip', 'utility-node-stormwater-bioswale-detailed-street']
  });
  expect(firstRoadDrainage?.outfallNodeId).toMatch(/^utility-node-stormwater-outfall/);
  expect(firstRoadDrainage?.floodHazardZoneIds).toEqual(
    expect.arrayContaining(['hazard-zone-flood-plain-south-river-flood-plain'])
  );
  expect(diagnostics.stormwater.catchmentIds).toEqual(['stormwater-catchment-downtown-river-primary']);
  expect(diagnostics.stormwater.receivingWaterwayIds).toEqual(['south-river']);
});

test('stormwater validation catches missing road drainage, low points, outfalls, and edge metadata', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [firstRoad, secondRoad, ...remainingRoads] = city.roads;
  const firstInlet = city.utilityNodes.find((node) => node.stormwater?.equipmentKind === 'inlet');
  const firstOutfall = city.utilityNodes.find((node) => node.stormwater?.equipmentKind === 'outfall');
  const firstPipeEdge = city.utilityEdges.find((edge) => edge.stormwater?.conveyanceKind === 'pipe');
  if (!firstInlet?.stormwater || !firstOutfall?.stormwater || !firstPipeEdge?.stormwater || !secondRoad.stormwaterDrainage) {
    throw new Error('Expected generated stormwater nodes, road drainage, and pipe edge for invalid fixture.');
  }
  const inletStormwater = firstInlet.stormwater;
  const outfallStormwater = firstOutfall.stormwater;
  const edgeStormwater = firstPipeEdge.stormwater;
  const invalidSecondRoadDrainage = {
    ...secondRoad.stormwaterDrainage,
    lowPointNodeId: 'missing-stormwater-low-point',
    runoffPathEdgeIds: ['missing-stormwater-runoff-path'],
    runoffCoefficient: 2
  };
  const invalidCity = {
    ...city,
    roads: [
      {
        ...firstRoad,
        stormwaterDrainage: undefined
      },
      {
        ...secondRoad,
        stormwaterDrainage: invalidSecondRoadDrainage
      },
      ...remainingRoads
    ],
    utilityNodes: city.utilityNodes.map((node) =>
      node.id === firstInlet.id
        ? {
            ...node,
            stormwater: {
              ...inletStormwater,
              designStormMmPerHour: 0
            }
          }
        : node.id === firstOutfall.id
          ? {
              ...node,
              stormwater: {
                ...outfallStormwater,
                receivingWaterwayId: 'missing-waterway'
              }
            }
          : node
    ),
    utilityEdges: city.utilityEdges.map((edge) =>
      edge.id === firstPipeEdge.id
        ? {
            ...edge,
            stormwater: {
              ...edgeStormwater,
              pipeDiameterMm: 0,
              slopePercent: 0,
              capacityReservePercent: 0,
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
        id: `missing-road-stormwater-drainage-${firstRoad.id}`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-road-stormwater-drainage-${secondRoad.id}`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-utility-node-${firstInlet.id}-invalid-stormwater-capacity`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-utility-node-${firstOutfall.id}-missing-receiving-waterway`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-utility-edge-${firstPipeEdge.id}-invalid-stormwater-capacity`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-utility-edge-${firstPipeEdge.id}-missing-pipe-diameter`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-utility-edge-${firstPipeEdge.id}-equipment-kind-mismatch`,
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

function getStormwaterNodeSignature(node: ReturnType<CityGenerator['generate']>['utilityNodes'][number]) {
  return {
    id: node.id,
    nodeRole: node.nodeRole,
    center: node.center,
    parentId: node.parentId,
    capacity: node.capacity,
    outage: node.outage,
    connectedEdgeIds: node.connectedEdgeIds,
    stormwater: node.stormwater
  };
}

function getStormwaterEdgeSignature(edge: ReturnType<CityGenerator['generate']>['utilityEdges'][number]) {
  return {
    id: edge.id,
    edgeRole: edge.edgeRole,
    fromNodeId: edge.fromNodeId,
    toNodeId: edge.toNodeId,
    centerline: edge.centerline,
    capacity: edge.capacity,
    stormwater: edge.stormwater
  };
}
