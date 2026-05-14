import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex, createGeneratedRuntimeObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { createCityOverlayDatasets } from '../../src/city/rendering-handoff/overlays/overlayData';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';
import type { Polygon2D } from '../../src/city/data-contracts/cityContracts';

test('parcel model expansion is deterministic and drives building fit', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(firstCity);
  const diagnostics = createCityDiagnostics(firstCity, traffic, renderConfig);
  const runtimeIndex = createGeneratedRuntimeObjectIndex(firstCity, traffic);
  const overlays = createCityOverlayDatasets(firstCity, runtimeIndex);

  expect(firstCity.parcels.map(getParcelSignature)).toEqual(secondCity.parcels.map(getParcelSignature));
  expect(firstCity.validation.issues.filter((issue) => issue.category === 'land' || issue.category === 'zoning')).toEqual([]);
  expect(firstCity.parcels.every((parcel) => parcel.fit.buildableEnvelopeId === `${parcel.id}-buildable-envelope`)).toBe(true);
  expect(firstCity.parcels.every((parcel) => parcel.frontagePriority.length === parcel.frontageRoadIds.length)).toBe(true);
  expect(firstCity.parcels.some((parcel) => parcel.fit.canFitBuilding)).toBe(true);
  expect(firstCity.parcels.some((parcel) => parcel.frontagePriority.some((frontage) => frontage.priority === 'primary'))).toBe(true);
  expect(firstCity.parcels.some((parcel) => parcel.parcelConstraintIds.length > 0)).toBe(true);

  for (const building of firstCity.buildings) {
    const parcel = firstCity.objectIndex.objectsById[building.parcelId];
    expect(parcel?.kind).toBe('parcel');
    if (parcel?.kind === 'parcel') {
      expect(isPolygonWithinPolygonBounds(building.footprint, parcel.fit.buildableEnvelope)).toBe(true);
    }
  }

  expect(diagnostics.parcelModel).toMatchObject({
    total: firstCity.parcels.length,
    buildableEnvelopes: firstCity.parcels.length
  });
  expect(diagnostics.parcelModel.primaryFrontageParcels).toBeGreaterThan(0);
  expect(diagnostics.parcelModel.parcelsWithConstraints).toBeGreaterThan(0);
  expect(diagnostics.parcelModel.averageBuildableAreaSqM).toBeGreaterThan(0);
  expect(diagnostics.objectCounts.parcelBuildableEnvelopes).toBe(firstCity.parcels.length);
  expect(overlays.find((overlay) => overlay.id === 'parcels')?.features[0].metadata).toMatchObject({
    parcelBuildableEnvelopeId: expect.stringMatching(/^parcel-\d+-\d+-\d+-\d+-buildable-envelope$/),
    buildableAreaSqM: expect.any(Number),
    developmentStatus: expect.any(String)
  });
});

test('parcel validation catches invalid setbacks, rights, frontage, constraints, and fit', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [firstParcel, ...remainingParcels] = city.parcels;
  const invalidParcel = {
    ...firstParcel,
    setbacks: {
      ...firstParcel.setbacks,
      frontMeters: -1
    },
    fit: {
      ...firstParcel.fit,
      buildableEnvelopeId: 'wrong-envelope',
      buildableEnvelope: offsetPolygon(firstParcel.boundary, 1000, 1000)
    },
    lotSplit: {
      ...firstParcel.lotSplit,
      lotIndex: [99, 99] as const
    },
    developmentRights: {
      ...firstParcel.developmentRights,
      maxCoverageRatio: 2
    },
    frontagePriority: [],
    parcelConstraintIds: ['missing-constraint']
  };
  const invalidCity = {
    ...city,
    parcels: [invalidParcel, ...remainingParcels]
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: `invalid-parcel-setbacks-${firstParcel.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `invalid-parcel-envelope-id-${firstParcel.id}`, category: 'land' }),
      expect.objectContaining({ id: `parcel-envelope-outside-boundary-${firstParcel.id}`, category: 'geometry' }),
      expect.objectContaining({ id: `invalid-parcel-lot-split-${firstParcel.id}`, category: 'land' }),
      expect.objectContaining({ id: `invalid-parcel-development-rights-${firstParcel.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `missing-parcel-frontage-priority-${firstParcel.id}`, category: 'graph' }),
      expect.objectContaining({
        id: `missing-parcel-frontage-priority-road-${firstParcel.id}-${firstParcel.frontageRoadIds[0]}`,
        category: 'graph'
      }),
      expect.objectContaining({ id: `missing-parcel-constraint-${firstParcel.id}-missing-constraint`, category: 'land' })
    ])
  );
});

test('browser diagnostics expose parcel model counts in the debug panel', async ({ page }) => {
  await page.goto('/?testMode=fast');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const diagnostics = await page.evaluate(() => ({
    validationPassed: window.cityDiagnostics?.validation.passed,
    total: window.cityDiagnostics?.parcelModel.total,
    buildableEnvelopes: window.cityDiagnostics?.parcelModel.buildableEnvelopes,
    primaryFrontageParcels: window.cityDiagnostics?.parcelModel.primaryFrontageParcels,
    parcelsWithConstraints: window.cityDiagnostics?.parcelModel.parcelsWithConstraints,
    debugText: document.querySelector('[data-city-debug-panel="true"]')?.textContent ?? ''
  }));

  expect(diagnostics.validationPassed).toBe(true);
  expect(diagnostics.total).toBeGreaterThan(0);
  expect(diagnostics.buildableEnvelopes).toBe(diagnostics.total);
  expect(diagnostics.primaryFrontageParcels).toBeGreaterThan(0);
  expect(diagnostics.parcelsWithConstraints).toBeGreaterThan(0);
  expect(diagnostics.debugText).toContain('Parcels');
});

function createTraffic(city: ReturnType<CityGenerator['generate']>) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections
  });
}

function getParcelSignature(parcel: ReturnType<CityGenerator['generate']>['parcels'][number]) {
  return {
    id: parcel.id,
    setbacks: parcel.setbacks,
    lotSplit: parcel.lotSplit,
    developmentRights: parcel.developmentRights,
    frontagePriority: parcel.frontagePriority,
    parcelConstraintIds: parcel.parcelConstraintIds,
    fit: parcel.fit
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
