import { expect, test } from '@playwright/test';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { cityConfig } from '../../src/config/cityConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';

test('generated intersections are deterministic and resolve connected roads', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const firstIntersection = firstCity.intersections[0];

  expect(firstCity.intersections).toHaveLength(169);
  expect(firstCity.intersections.map((intersection) => intersection.id)).toEqual(
    secondCity.intersections.map((intersection) => intersection.id)
  );
  expect(firstIntersection).toMatchObject({
    id: 'intersection-v0-h0',
    kind: 'intersection',
    ownerDomain: 'mobility',
    lod: 'lod2',
    connectedRoadIds: ['road-v-0', 'road-h-0'],
    hierarchyMix: ['arterial'],
    signalExpectation: 'signalized',
    controlType: 'traffic-signal',
    cornerRadiusMeters: 9,
    raisedJunction: false,
    grid: { x: 0, z: 0 },
    verticalRoadId: 'road-v-0',
    horizontalRoadId: 'road-h-0'
  });
  expect(firstIntersection.approachRules).toEqual([
    { roadId: 'road-v-0', control: 'signal', priority: 'shared' },
    { roadId: 'road-h-0', control: 'signal', priority: 'shared' }
  ]);
  expect(firstIntersection.turnConstraints).toEqual([
    { fromRoadId: 'road-v-0', toRoadId: 'road-h-0', allowedMovements: ['left', 'through', 'right'] },
    { fromRoadId: 'road-h-0', toRoadId: 'road-v-0', allowedMovements: ['left', 'through', 'right'] }
  ]);
  expect(firstIntersection.conflictPoints).toHaveLength(3);
  expect(firstIntersection.visibilitySplays).toEqual([
    { roadId: 'road-v-0', distanceMeters: 50, clearSightTriangleMeters: 12.8 },
    { roadId: 'road-h-0', distanceMeters: 50, clearSightTriangleMeters: 12.8 }
  ]);
  expect(firstCity.objectIndex.objectsById['intersection-v0-h0']).toEqual(firstIntersection);
  expect(firstCity.validation.issues.filter((issue) => issue.objectId === firstIntersection.id)).toEqual([]);
});

test('validation rejects intersections that reference missing roads', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [firstIntersection, ...remainingIntersections] = city.intersections;
  const invalidCity = {
    ...city,
    intersections: [
      {
        ...firstIntersection,
        connectedRoadIds: ['missing-road', firstIntersection.connectedRoadIds[1]]
      },
      ...remainingIntersections
    ]
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: 'missing-intersection-road-intersection-v0-h0-missing-road',
        severity: 'error',
        category: 'identifier',
        objectId: 'intersection-v0-h0'
      })
    ])
  );
});

test('validation rejects malformed intersection behavior policy', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [firstIntersection, ...remainingIntersections] = city.intersections;
  const invalidCity = {
    ...city,
    intersections: [
      {
        ...firstIntersection,
        controlType: 'uncontrolled' as const,
        approachRules: firstIntersection.approachRules.slice(0, 1),
        turnConstraints: [],
        conflictPoints: [{ ...firstIntersection.conflictPoints[0], id: '', point: { x: Number.NaN, z: 0 } }],
        visibilitySplays: [{ ...firstIntersection.visibilitySplays[0], distanceMeters: 0 }],
        cornerRadiusMeters: 0
      },
      ...remainingIntersections
    ]
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: 'intersection-control-mismatch-intersection-v0-h0', category: 'graph' }),
      expect.objectContaining({ id: 'missing-intersection-approach-rule-intersection-v0-h0-road-h-0', category: 'graph' }),
      expect.objectContaining({ id: 'invalid-intersection-approach-rule-intersection-v0-h0-road-v-0', category: 'graph' }),
      expect.objectContaining({ id: 'missing-intersection-behavior-intersection-v0-h0', category: 'graph' }),
      expect.objectContaining({ id: 'invalid-intersection-conflict-point-intersection-v0-h0-missing', category: 'geometry' }),
      expect.objectContaining({ id: 'invalid-intersection-visibility-splay-intersection-v0-h0-road-v-0', category: 'geometry' }),
      expect.objectContaining({ id: 'invalid-intersection-corner-radius-intersection-v0-h0', category: 'geometry' })
    ])
  );
});

test('browser diagnostics expose intersection behavior counts', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const diagnostics = await page.evaluate(() => ({
    validationPassed: window.cityDiagnostics?.validation.passed,
    intersectionBehavior: window.cityDiagnostics?.intersectionBehavior,
    objectCounts: window.cityDiagnostics?.objectCounts,
    debugText: document.body.textContent
  }));

  expect(diagnostics.validationPassed).toBe(true);
  expect(diagnostics.intersectionBehavior).toMatchObject({
    total: 169,
    signalized: expect.any(Number),
    stopControlled: expect.any(Number),
    raisedJunctions: expect.any(Number),
    conflictPoints: 507,
    turnConstraints: 338
  });
  expect(diagnostics.intersectionBehavior?.signalized).toBeGreaterThan(0);
  expect(diagnostics.intersectionBehavior?.raisedJunctions).toBeGreaterThan(0);
  expect(diagnostics.objectCounts).toMatchObject({
    signalizedIntersections: diagnostics.intersectionBehavior?.signalized,
    raisedJunctions: diagnostics.intersectionBehavior?.raisedJunctions,
    intersectionConflictPoints: 507
  });
  expect(diagnostics.debugText).toContain('Junctions');
});
