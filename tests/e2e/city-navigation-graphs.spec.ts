import { expect, test } from '@playwright/test';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { cityConfig } from '../../src/config/cityConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';

const EXPECTED_MODES = ['bike', 'emergency', 'freight', 'pedestrian', 'service', 'transit', 'vehicle'];

test('navigation graphs are deterministic and expose route requests for every mode', () => {
  const first = new CityGenerator(cityConfig).generate();
  const second = new CityGenerator(cityConfig).generate();

  expect(first.navigationGraphNodes.map((node) => [node.id, node.mode, node.sourceObjectId])).toEqual(
    second.navigationGraphNodes.map((node) => [node.id, node.mode, node.sourceObjectId])
  );
  expect(first.navigationGraphEdges.map((edge) => [edge.id, edge.mode, edge.fromNodeId, edge.toNodeId])).toEqual(
    second.navigationGraphEdges.map((edge) => [edge.id, edge.mode, edge.fromNodeId, edge.toNodeId])
  );
  expect(first.navigationRoutes.map((route) => [route.id, route.mode, route.edgeIds.length])).toEqual(
    second.navigationRoutes.map((route) => [route.id, route.mode, route.edgeIds.length])
  );

  expect([...new Set(first.navigationRoutes.map((route) => route.mode))].sort()).toEqual(EXPECTED_MODES);
  expect(first.navigationGraphNodes.length).toBeGreaterThan(700);
  expect(first.navigationGraphEdges.length).toBeGreaterThan(900);
  expect(first.navigationRoutes).toHaveLength(7);
  expect(first.navigationRoutes.every((route) => route.edgeIds.length > 0 && route.nodeIds.length >= 2)).toBe(true);
  expect(first.navigationRoutes.some((route) => route.requestClass === 'agent')).toBe(true);
  expect(first.navigationRoutes.some((route) => route.requestClass === 'operation')).toBe(true);
  expect(first.navigationGraphEdges.some((edge) => edge.mode === 'pedestrian' && edge.accessible)).toBe(true);
  expect(first.navigationGraphEdges.some((edge) => edge.mode === 'bike' && edge.restrictions.includes('mixed-traffic-conflict'))).toBe(true);
  expect(first.navigationGraphEdges.some((edge) => edge.mode === 'freight' && edge.restrictions.some((restriction) => restriction.startsWith('max-')))).toBe(true);
  expect(first.objectIndex.countsByKind['navigation-graph-node']).toBe(first.navigationGraphNodes.length);
  expect(first.objectIndex.countsByKind['navigation-graph-edge']).toBe(first.navigationGraphEdges.length);
  expect(first.objectIndex.countsByKind['navigation-route']).toBe(first.navigationRoutes.length);
  expect(first.validation.issues).toEqual([]);
});

test('navigation validation rejects missing route nodes and broken edge endpoints', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [route, ...remainingRoutes] = city.navigationRoutes;
  const [edge, ...remainingEdges] = city.navigationGraphEdges;
  const [node, ...remainingNodes] = city.navigationGraphNodes;

  expect(route).toBeDefined();
  expect(edge).toBeDefined();
  expect(node).toBeDefined();

  const invalidCity = {
    ...city,
    navigationGraphNodes: [
      {
        ...node,
        sourceObjectId: 'missing-source'
      },
      ...remainingNodes
    ],
    navigationGraphEdges: [
      {
        ...edge,
        toNodeId: 'missing-node'
      },
      ...remainingEdges
    ],
    navigationRoutes: [
      {
        ...route,
        nodeIds: ['missing-node'],
        edgeIds: ['missing-edge']
      },
      ...remainingRoutes
    ]
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: `invalid-navigation-node-source-${node.id}`, category: 'graph' }),
      expect.objectContaining({ id: `invalid-navigation-edge-nodes-${edge.id}`, category: 'graph' }),
      expect.objectContaining({ id: `invalid-navigation-route-node-${route.id}-missing-node`, category: 'graph' }),
      expect.objectContaining({ id: `invalid-navigation-route-edge-${route.id}-missing-edge`, category: 'graph' })
    ])
  );
});
