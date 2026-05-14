import { expect, test } from '@playwright/test';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { cityConfig } from '../../src/config/cityConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';

test('cycling network is deterministic and connects lanes, parking, transit, and signals', () => {
  const first = new CityGenerator(cityConfig).generate();
  const second = new CityGenerator(cityConfig).generate();
  const firstSegment = first.bikeSegments[0];
  const firstParking = first.bikeParking[0];
  const firstEdge = first.bikeGraphEdges[0];

  expect(first.bikeSegments.map((segment) => [segment.id, segment.facilityKind, segment.bikeParkingIds.length])).toEqual(
    second.bikeSegments.map((segment) => [segment.id, segment.facilityKind, segment.bikeParkingIds.length])
  );
  expect(first.bikeGraphNodes.map((node) => [node.id, node.segmentId, node.nodeRole])).toEqual(
    second.bikeGraphNodes.map((node) => [node.id, node.segmentId, node.nodeRole])
  );
  expect(first.bikeParking.map((parking) => [parking.id, parking.segmentId, parking.capacity])).toEqual(
    second.bikeParking.map((parking) => [parking.id, parking.segmentId, parking.capacity])
  );

  expect(first.bikeSegments.length).toBeGreaterThan(20);
  expect(first.bikeGraphNodes.length).toBeGreaterThan(first.bikeSegments.length);
  expect(first.bikeGraphEdges.length).toBe(first.bikeSegments.length);
  expect(first.bikeParking.length).toBeGreaterThan(0);
  expect(first.bikeSignals.length).toBeGreaterThan(0);
  expect(first.bikeConflictZones.length).toBeGreaterThan(0);
  expect(first.bikeSegments.some((segment) => segment.facilityKind === 'protected-lane')).toBe(true);
  expect(first.bikeSegments.some((segment) => segment.facilityKind === 'painted-lane')).toBe(true);
  expect(first.bikeSegments.some((segment) => segment.facilityKind === 'cycle-track')).toBe(true);
  expect(first.bikeSegments.some((segment) => segment.connectsToTransit)).toBe(true);
  expect(first.objectIndex.countsByKind['bike-segment']).toBe(first.bikeSegments.length);
  expect(first.objectIndex.countsByKind['bike-parking']).toBe(first.bikeParking.length);
  expect(first.objectIndex.countsByKind['bike-conflict-zone']).toBe(first.bikeConflictZones.length);
  expect(first.validation.issues).toEqual([]);

  expect(firstSegment).toMatchObject({
    kind: 'bike-segment',
    ownerDomain: 'mobility',
    parentId: firstSegment.roadId,
    lod: expect.any(String),
    widthMeters: expect.any(Number)
  });
  expect(firstSegment.centerline.length).toBeGreaterThanOrEqual(2);
  expect(firstEdge).toMatchObject({
    kind: 'bike-graph-edge',
    ownerDomain: 'mobility',
    segmentId: firstSegment.id
  });
  expect(firstParking).toMatchObject({
    kind: 'bike-parking',
    ownerDomain: 'mobility',
    parentId: firstParking.streetFurnitureId,
    segmentId: expect.stringContaining('bike-segment-'),
    capacity: expect.any(Number)
  });
});

test('cycling validation rejects unsafe conflicts and broken graph references', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [segment, ...remainingSegments] = city.bikeSegments;
  const [edge, ...remainingEdges] = city.bikeGraphEdges;
  const [conflict, ...remainingConflicts] = city.bikeConflictZones;

  expect(segment).toBeDefined();
  expect(edge).toBeDefined();
  expect(conflict).toBeDefined();

  const invalidCity = {
    ...city,
    bikeSegments: [
      {
        ...segment,
        parentId: 'missing-road',
        widthMeters: 0
      },
      ...remainingSegments
    ],
    bikeGraphEdges: [
      {
        ...edge,
        fromNodeId: 'missing-node'
      },
      ...remainingEdges
    ],
    bikeConflictZones: [
      {
        ...conflict,
        severity: 'high' as const,
        mitigation: 'paint' as const
      },
      ...remainingConflicts
    ]
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: `invalid-bike-segment-road-${segment.id}`, category: 'graph' }),
      expect.objectContaining({ id: `invalid-bike-segment-geometry-${segment.id}`, category: 'geometry' }),
      expect.objectContaining({ id: `invalid-bike-graph-edge-${edge.id}`, category: 'graph' }),
      expect.objectContaining({ id: `unsafe-bike-conflict-mitigation-${conflict.id}`, category: 'graph' })
    ])
  );
});

test('browser diagnostics expose cycling counts, overlays, and debug text', async ({ page }) => {
  await page.goto('/?testMode=fast');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const diagnostics = await page.evaluate(() => ({
    validationPassed: window.cityDiagnostics?.validation.passed,
    objectCounts: window.cityDiagnostics?.objectCounts,
    indexedSegments: window.cityDiagnostics?.objectIndex.countsByKind['bike-segment'],
    indexedParking: window.cityDiagnostics?.objectIndex.countsByKind['bike-parking'],
    indexedConflicts: window.cityDiagnostics?.objectIndex.countsByKind['bike-conflict-zone'],
    cyclingOverlayFeatures: window.cityDiagnostics?.overlays.find((overlay) => overlay.id === 'cycling-network')?.featureCount,
    debugText: document.body.textContent
  }));

  expect(diagnostics.validationPassed).toBe(true);
  expect(diagnostics.objectCounts?.bikeSegments).toBeGreaterThan(20);
  expect(diagnostics.objectCounts?.protectedBikeSegments).toBeGreaterThan(0);
  expect(diagnostics.objectCounts?.cycleTrackSegments).toBeGreaterThan(0);
  expect(diagnostics.objectCounts?.paintedBikeSegments).toBeGreaterThan(0);
  expect(diagnostics.objectCounts?.bikeGraphNodes).toBeGreaterThan(diagnostics.objectCounts?.bikeSegments ?? 0);
  expect(diagnostics.objectCounts?.bikeGraphEdges).toBe(diagnostics.objectCounts?.bikeSegments);
  expect(diagnostics.objectCounts?.bikeParking).toBeGreaterThan(0);
  expect(diagnostics.objectCounts?.bikeParkingCapacity).toBeGreaterThan(diagnostics.objectCounts?.bikeParking ?? 0);
  expect(diagnostics.objectCounts?.bikeSignals).toBeGreaterThan(0);
  expect(diagnostics.objectCounts?.bikeConflictZones).toBeGreaterThan(0);
  expect(diagnostics.indexedSegments).toBe(diagnostics.objectCounts?.bikeSegments);
  expect(diagnostics.indexedParking).toBe(diagnostics.objectCounts?.bikeParking);
  expect(diagnostics.indexedConflicts).toBe(diagnostics.objectCounts?.bikeConflictZones);
  expect(diagnostics.cyclingOverlayFeatures).toBe(
    (diagnostics.objectCounts?.bikeSegments ?? 0) +
      (diagnostics.objectCounts?.bikeParking ?? 0) +
      (diagnostics.objectCounts?.bikeConflictZones ?? 0) +
      (diagnostics.objectCounts?.bikeSignals ?? 0)
  );
  expect(diagnostics.debugText).toContain('Cycling');
});
