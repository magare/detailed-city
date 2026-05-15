import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex, createGeneratedRuntimeObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { createCityOverlayDatasets } from '../../src/city/rendering-handoff/overlays/overlayData';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('administrative boundaries are deterministic, indexed, and attached to land objects', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(firstCity);
  const diagnostics = createCityDiagnostics(firstCity, traffic, renderConfig);
  const runtimeIndex = createGeneratedRuntimeObjectIndex(firstCity, traffic);
  const overlays = createCityOverlayDatasets(firstCity, runtimeIndex);

  expect(firstCity.administrativeBoundaries.map((boundary) => boundary.id)).toEqual(
    secondCity.administrativeBoundaries.map((boundary) => boundary.id)
  );
  expect(firstCity.administrativeBoundaries).toHaveLength(18);
  expect(firstCity.objectIndex.countsByKind['administrative-boundary']).toBe(18);
  expect(firstCity.validation.issues.filter((issue) => issue.category === 'land')).toEqual([]);
  expect(firstCity.objectIndex.objectsById['administrative-boundary-city-limit']).toMatchObject({
    id: 'administrative-boundary-city-limit',
    kind: 'administrative-boundary',
    ownerDomain: 'land',
    lod: 'lod0',
    boundaryKind: 'city-limit',
    jurisdictionLevel: 'city'
  });
  expect(firstCity.blocks.every((block) => block.administrativeBoundaryIds.length >= 3)).toBe(true);
  expect(firstCity.parcels.every((parcel) => parcel.administrativeBoundaryIds.length >= 3)).toBe(true);
  expect(firstCity.blocks[0]).toMatchObject({
    wardId: 'administrative-boundary-ward-southwest',
    neighborhoodId: 'administrative-boundary-neighborhood-waterfront'
  });
  expect(diagnostics.administrativeBoundaries).toMatchObject({
    total: 18,
    wards: 4,
    neighborhoods: 5,
    serviceAreas: 3,
    ownershipZones: 3,
    jurisdictionOverlays: 2,
    blocksWithBoundaryMembership: firstCity.blocks.length,
    parcelsWithBoundaryMembership: firstCity.parcels.length
  });
  expect(overlays.find((overlay) => overlay.id === 'administrative-boundaries')?.featureCount).toBe(18);
});

test('administrative boundary validation catches orphan land membership', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [firstBlock, ...remainingBlocks] = city.blocks;
  const [firstParcel, ...remainingParcels] = city.parcels;
  const invalidCity = {
    ...city,
    blocks: [
      {
        ...firstBlock,
        administrativeBoundaryIds: [],
        wardId: 'missing-ward',
        neighborhoodId: 'missing-neighborhood'
      },
      ...remainingBlocks
    ],
    parcels: [
      {
        ...firstParcel,
        administrativeBoundaryIds: ['missing-boundary'],
        wardId: 'missing-boundary',
        neighborhoodId: firstParcel.neighborhoodId
      },
      ...remainingParcels
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
        id: `missing-administrative-boundaries-${firstBlock.id}`,
        category: 'land',
        objectId: firstBlock.id
      }),
      expect.objectContaining({
        id: `invalid-ward-membership-${firstBlock.id}`,
        category: 'land',
        objectId: firstBlock.id
      }),
      expect.objectContaining({
        id: `missing-administrative-boundary-reference-missing-boundary-${firstParcel.id}`,
        category: 'land',
        objectId: firstParcel.id
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
