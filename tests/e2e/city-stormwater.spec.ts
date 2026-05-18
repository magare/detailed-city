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
  const drainedRoads = firstCity.roads.filter((road) => road.stormwaterDrainage);

  expect(firstCity.utilityNodes.filter((node) => node.utilityType === 'stormwater').map(getStormwaterNodeSignature)).toEqual(
    secondCity.utilityNodes.filter((node) => node.utilityType === 'stormwater').map(getStormwaterNodeSignature)
  );
  expect(firstCity.utilityEdges.filter((edge) => edge.utilityType === 'stormwater').map(getStormwaterEdgeSignature)).toEqual(
    secondCity.utilityEdges.filter((edge) => edge.utilityType === 'stormwater').map(getStormwaterEdgeSignature)
  );
  expect(drainedRoads).toHaveLength(firstCity.roads.length);
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
    roadsDrained: firstCity.roads.length
  });
  expect(firstCity.validation.issues.filter((issue) => issue.category === 'utility-coverage')).toEqual([]);
  expect(drainedRoads.every((road) => (road.stormwaterDrainage?.runoffPathEdgeIds.length ?? 0) > 0)).toBe(true);
});

test('stormwater validation catches broken drainage, receiving waterway, and edge metadata', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [firstRoad, ...remainingRoads] = city.roads;
  const outfall = city.utilityNodes.find((node) => node.stormwater?.equipmentKind === 'outfall');
  const stormwaterEdge = city.utilityEdges.find((edge) => edge.utilityType === 'stormwater' && edge.stormwater?.conveyanceKind === 'pipe');

  if (!firstRoad.stormwaterDrainage || !outfall?.stormwater || !stormwaterEdge?.stormwater) {
    throw new Error('Expected generated stormwater drainage, outfall, and pipe edge for invalid fixture.');
  }

  const invalidCity = {
    ...city,
    roads: [
      {
        ...firstRoad,
        stormwaterDrainage: {
          ...firstRoad.stormwaterDrainage,
          inletNodeIds: ['missing-stormwater-inlet'],
          runoffPathEdgeIds: ['missing-stormwater-runoff-edge'],
          lowPointNodeId: 'missing-low-point-node',
          detentionNodeId: 'missing-detention-node',
          outfallNodeId: 'missing-outfall-node',
          perviousAreaNodeIds: [],
          runoffCoefficient: 2
        }
      },
      ...remainingRoads
    ],
    utilityNodes: city.utilityNodes.map((node) =>
      node.id === outfall.id
        ? {
            ...node,
            stormwater: {
              ...outfall.stormwater!,
              receivingWaterwayId: 'missing-waterway'
            }
          }
        : node
    ),
    utilityEdges: city.utilityEdges.map((edge) =>
      edge.id === stormwaterEdge.id
        ? {
            ...edge,
            stormwater: {
              ...stormwaterEdge.stormwater!,
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
        id: `invalid-road-stormwater-drainage-${firstRoad.id}`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-utility-node-${outfall.id}-missing-receiving-waterway`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-utility-edge-${stormwaterEdge.id}-missing-pipe-diameter`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-utility-edge-${stormwaterEdge.id}-equipment-kind-mismatch`,
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
