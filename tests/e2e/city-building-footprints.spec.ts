import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import type { Polygon2D } from '../../src/city/data-contracts/cityContracts';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('building footprint grammar is deterministic and drives massing footprints', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(firstCity);
  const diagnostics = createCityDiagnostics(firstCity, traffic, renderConfig);

  expect(firstCity.buildings.map(getFootprintSignature)).toEqual(secondCity.buildings.map(getFootprintSignature));
  expect(firstCity.validation.issues.filter((issue) => issue.id.includes('footprint-grammar'))).toEqual([]);
  expect(diagnostics.buildingFootprints.buildingsWithGrammar).toBe(firstCity.buildings.length);
  expect(diagnostics.buildingFootprints.grammarKinds).toBeGreaterThanOrEqual(4);
  expect(diagnostics.buildingFootprints.offsetFootprints).toBeGreaterThan(0);
  expect(diagnostics.buildingFootprints.podiums).toBeGreaterThan(0);
  expect(diagnostics.buildingFootprints.towers).toBeGreaterThan(0);
  expect(diagnostics.buildingFootprints.courtyards).toBeGreaterThan(0);
  expect(diagnostics.buildingFootprints.waterfrontSetbacks).toBeGreaterThan(0);

  for (const building of firstCity.buildings) {
    const parcel = firstCity.parcels.find((candidate) => candidate.id === building.parcelId);
    expect(parcel).toBeDefined();
    expect(building.footprintGrammar.parcelFitEnvelopeId).toBe(parcel?.fit.buildableEnvelopeId);
    expect(isPolygonWithinPolygonBounds(building.footprint, building.footprintGrammar.buildableEnvelope)).toBe(true);
    expect(building.footprintGrammar.groundCoverageRatio).toBeLessThanOrEqual(parcel!.maxCoverageRatio + 0.001);
  }

  const tower = firstCity.buildings.find((building) => building.footprintGrammar.kind === 'tower-on-podium');
  expect(tower?.footprintGrammar.podium).toBeDefined();
  expect(tower?.footprintGrammar.tower).toBeDefined();
  const courtyard = firstCity.buildings.find((building) => building.footprintGrammar.kind === 'courtyard');
  expect(courtyard?.footprintGrammar.courtyard).toMatchObject({ openToSky: true });
});

test('building footprint grammar validation rejects invalid envelope, coverage, and defaults', () => {
  const city = new CityGenerator(cityConfig).generate();
  const building = city.buildings.find((candidate) => candidate.footprintGrammar.kind === 'tower-on-podium');
  expect(building).toBeDefined();
  const invalidBuilding = {
    ...building!,
    footprintGrammar: {
      ...building!.footprintGrammar,
      grammarId: 'bad-footprint-grammar',
      parcelFitEnvelopeId: 'missing-envelope',
      buildableEnvelope: offsetPolygon(building!.footprintGrammar.buildableEnvelope, 500, 500),
      footprintAreaSqM: 1,
      groundCoverageRatio: 0.0001,
      envelopeCoverageRatio: 0.0001,
      placementOffsetMeters: { x: 999, z: 999 },
      podium: undefined,
      tower: undefined,
      constraintIds: []
    }
  };
  const invalidCity = {
    ...city,
    buildings: city.buildings.map((candidate) => (candidate.id === invalidBuilding.id ? invalidBuilding : candidate))
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: `invalid-building-footprint-grammar-kind-${building!.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `building-footprint-envelope-mismatch-${building!.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `building-footprint-coverage-mismatch-${building!.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `building-footprint-offset-mismatch-${building!.id}`, category: 'geometry' }),
      expect.objectContaining({ id: `missing-building-tower-podium-${building!.id}`, category: 'zoning' })
    ])
  );
});

test('browser diagnostics expose building footprint grammar counts', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const diagnostics = await page.evaluate(() => ({
    validationPassed: window.cityDiagnostics?.validation.passed,
    buildings: window.cityDiagnostics?.objectCounts.buildings,
    buildingsWithGrammar: window.cityDiagnostics?.buildingFootprints.buildingsWithGrammar,
    grammarKinds: window.cityDiagnostics?.buildingFootprints.grammarKinds,
    offsetFootprints: window.cityDiagnostics?.buildingFootprints.offsetFootprints,
    towers: window.cityDiagnostics?.buildingFootprints.towers,
    debugText: document.querySelector('[data-city-debug-panel="true"]')?.textContent ?? ''
  }));

  expect(diagnostics.validationPassed).toBe(true);
  expect(diagnostics.buildingsWithGrammar).toBe(diagnostics.buildings);
  expect(diagnostics.grammarKinds).toBeGreaterThanOrEqual(4);
  expect(diagnostics.offsetFootprints).toBeGreaterThan(0);
  expect(diagnostics.towers).toBeGreaterThan(0);
  expect(diagnostics.debugText).toContain('Footprints');
});

function createTraffic(city: ReturnType<CityGenerator['generate']>) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections,
    trafficCalmingDevices: city.trafficCalmingDevices
  });
}

function getFootprintSignature(building: ReturnType<CityGenerator['generate']>['buildings'][number]) {
  return {
    id: building.id,
    center: building.center,
    size: building.size,
    footprint: building.footprint,
    grammar: building.footprintGrammar
  };
}

function isPolygonWithinPolygonBounds(inner: Polygon2D, outer: Polygon2D): boolean {
  const innerBounds = getBounds(inner);
  const outerBounds = getBounds(outer);

  return (
    innerBounds.minX >= outerBounds.minX - 0.001 &&
    innerBounds.maxX <= outerBounds.maxX + 0.001 &&
    innerBounds.minZ >= outerBounds.minZ - 0.001 &&
    innerBounds.maxZ <= outerBounds.maxZ + 0.001
  );
}

function getBounds(boundary: Polygon2D) {
  return boundary.reduce(
    (bounds, point) => ({
      minX: Math.min(bounds.minX, point.x),
      maxX: Math.max(bounds.maxX, point.x),
      minZ: Math.min(bounds.minZ, point.z),
      maxZ: Math.max(bounds.maxZ, point.z)
    }),
    { minX: Number.POSITIVE_INFINITY, maxX: Number.NEGATIVE_INFINITY, minZ: Number.POSITIVE_INFINITY, maxZ: Number.NEGATIVE_INFINITY }
  );
}

function offsetPolygon(boundary: Polygon2D, x: number, z: number): Polygon2D {
  return boundary.map((point) => ({ x: point.x + x, z: point.z + z }));
}
