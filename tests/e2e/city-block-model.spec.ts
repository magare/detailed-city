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

test('block model expansion is deterministic and parcels consume block envelopes', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(firstCity);
  const diagnostics = createCityDiagnostics(firstCity, traffic, renderConfig);
  const runtimeIndex = createGeneratedRuntimeObjectIndex(firstCity, traffic);
  const overlays = createCityOverlayDatasets(firstCity, runtimeIndex);

  expect(firstCity.blocks.map(getBlockSignature)).toEqual(secondCity.blocks.map(getBlockSignature));
  expect(firstCity.validation.issues.filter((issue) => issue.category === 'land')).toEqual([]);
  expect(firstCity.blocks.every((block) => block.buildableEnvelope.id === `${block.id}-buildable-envelope`)).toBe(true);
  expect(firstCity.blocks.every((block) => block.frontageClasses.length === 4)).toBe(true);
  expect(firstCity.blocks.every((block) => block.subdivisionConstraints.maxParcelCount > 0)).toBe(true);
  expect(firstCity.blocks.some((block) => block.alleys.length > 0)).toBe(true);
  expect(firstCity.blocks.some((block) => block.permeability === 'high')).toBe(true);
  expect(firstCity.blocks.some((block) => block.permeability === 'low')).toBe(true);

  for (const parcel of firstCity.parcels) {
    const block = firstCity.objectIndex.objectsById[parcel.blockId];
    expect(block?.kind).toBe('block');
    if (block?.kind === 'block') {
      expect(parcel.blockBuildableEnvelopeId).toBe(block.buildableEnvelope.id);
      expect(isPolygonWithinPolygonBounds(parcel.boundary, block.buildableEnvelope.boundary)).toBe(true);
    }
  }

  expect(diagnostics.blockModel).toMatchObject({
    total: firstCity.blocks.length,
    buildableEnvelopes: firstCity.blocks.length,
    frontageClasses: firstCity.blocks.length * 4
  });
  expect(diagnostics.blockModel.blocksWithInternalAccess).toBeGreaterThan(0);
  expect(diagnostics.blockModel.alleys).toBeGreaterThan(0);
  expect(diagnostics.blockModel.averagePermeabilityScore).toBeGreaterThan(0);
  expect(diagnostics.objectCounts.blockBuildableEnvelopes).toBe(firstCity.blocks.length);
  expect(diagnostics.objectCounts.blockFrontages).toBe(firstCity.blocks.length * 4);
  expect(overlays.find((overlay) => overlay.id === 'parcels')?.features[0].metadata).toMatchObject({
    blockBuildableEnvelopeId: expect.stringMatching(/^block-\d+-\d+-buildable-envelope$/)
  });
});

test('block validation catches invalid envelope, access, metrics, and parcel envelope references', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [firstBlock, ...remainingBlocks] = city.blocks;
  const [firstParcel, ...remainingParcels] = city.parcels;
  const invalidBlock = {
    ...firstBlock,
    buildableEnvelope: {
      ...firstBlock.buildableEnvelope,
      id: 'wrong-envelope-id',
      boundary: offsetPolygon(firstBlock.boundary, 1000, 1000)
    },
    frontageClasses: firstBlock.frontageClasses.slice(0, 2),
    internalAccess: {
      ...firstBlock.internalAccess,
      mode: 'alley' as const,
      accessIds: ['missing-access']
    },
    alleys: [],
    subdivisionConstraints: {
      ...firstBlock.subdivisionConstraints,
      maxParcelCount: 0
    },
    permeabilityMetrics: {
      ...firstBlock.permeabilityMetrics,
      score: 1.5,
      throughAccessCount: 42
    }
  };
  const invalidParcel = {
    ...firstParcel,
    blockBuildableEnvelopeId: 'missing-envelope'
  };
  const invalidCity = {
    ...city,
    blocks: [invalidBlock, ...remainingBlocks],
    parcels: [invalidParcel, ...remainingParcels]
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: `invalid-block-envelope-id-${firstBlock.id}`, category: 'land' }),
      expect.objectContaining({ id: `block-envelope-outside-boundary-${firstBlock.id}`, category: 'geometry' }),
      expect.objectContaining({ id: `invalid-block-frontage-classes-${firstBlock.id}`, category: 'land' }),
      expect.objectContaining({ id: `missing-block-internal-access-${firstBlock.id}`, category: 'land' }),
      expect.objectContaining({ id: `missing-block-access-reference-${firstBlock.id}-missing-access`, category: 'identifier' }),
      expect.objectContaining({ id: `invalid-block-subdivision-${firstBlock.id}`, category: 'land' }),
      expect.objectContaining({ id: `invalid-block-permeability-metrics-${firstBlock.id}`, category: 'land' }),
      expect.objectContaining({ id: `invalid-parcel-block-envelope-${firstParcel.id}`, category: 'land' })
    ])
  );
});

test('browser diagnostics expose block model counts in the debug panel', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const diagnostics = await page.evaluate(() => ({
    validationPassed: window.cityDiagnostics?.validation.passed,
    total: window.cityDiagnostics?.blockModel.total,
    buildableEnvelopes: window.cityDiagnostics?.blockModel.buildableEnvelopes,
    frontages: window.cityDiagnostics?.blockModel.frontageClasses,
    blocksWithInternalAccess: window.cityDiagnostics?.blockModel.blocksWithInternalAccess,
    debugText: document.querySelector('[data-city-debug-panel="true"]')?.textContent ?? ''
  }));

  expect(diagnostics.validationPassed).toBe(true);
  expect(diagnostics.total).toBeGreaterThan(0);
  expect(diagnostics.buildableEnvelopes).toBe(diagnostics.total);
  expect(diagnostics.frontages).toBe((diagnostics.total ?? 0) * 4);
  expect(diagnostics.blocksWithInternalAccess).toBeGreaterThan(0);
  expect(diagnostics.debugText).toContain('Blocks');
});

function createTraffic(city: ReturnType<CityGenerator['generate']>) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections
  });
}

function getBlockSignature(block: ReturnType<CityGenerator['generate']>['blocks'][number]) {
  return {
    id: block.id,
    envelopeId: block.buildableEnvelope.id,
    envelope: block.buildableEnvelope.boundary,
    frontageClasses: block.frontageClasses,
    internalAccess: block.internalAccess,
    alleys: block.alleys,
    subdivisionConstraints: block.subdivisionConstraints,
    permeabilityMetrics: block.permeabilityMetrics
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
