import { expect, test } from '@playwright/test';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { cityConfig } from '../../src/config/cityConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { isPointInsidePolygon } from '../../src/utils/geometry';
import type { CityConfig, GeneratedCity } from '../../src/types/city';

const REPRESENTATIVE_CONFIGS: readonly CityConfig[] = [
  cityConfig,
  {
    ...cityConfig,
    seed: `${cityConfig.seed}-lower-density`,
    density: {
      ...cityConfig.density,
      cityDensity: 0.58,
      treeDensity: 0.48
    }
  },
  {
    ...cityConfig,
    seed: `${cityConfig.seed}-dense`,
    density: {
      ...cityConfig.density,
      cityDensity: 0.86,
      propDensity: 0.8
    },
    building: {
      ...cityConfig.building,
      maxHeight: 104
    }
  }
];

test('city generator is reproducible for the same seed and config', () => {
  for (const config of REPRESENTATIVE_CONFIGS) {
    const firstCity = new CityGenerator(config).generate();
    const secondCity = new CityGenerator(config).generate();

    expect(getCitySignature(firstCity)).toEqual(getCitySignature(secondCity));
    expect(firstCity.validation.passed).toBe(true);
    expect(secondCity.validation.passed).toBe(true);
  }
});

test('representative generated configs preserve core relationship and metadata invariants', () => {
  for (const config of REPRESENTATIVE_CONFIGS) {
    const city = new CityGenerator(config).generate();

    expect(city.objectIndex.duplicateIds).toEqual([]);
    expect(city.validation.issues).toEqual([]);
    expect(city.buildings.every((building) => Boolean(city.objectIndex.objectsById[building.parcelId]))).toBe(true);
    expect(city.parcels.every((parcel) => Boolean(city.objectIndex.objectsById[parcel.blockId]))).toBe(true);
    expect(city.roads.every((road) => road.lanes.length > 0 && road.sidewalks.length > 0)).toBe(true);
    expect(city.utilityNodes.every((node) => node.metadata?.sourceType === 'procedural')).toBe(true);
    expect(city.buildings.every((building) => building.metadata?.sourceType === 'procedural')).toBe(true);
  }
});

test('generated tree centers stay out of road corridors and building footprints', () => {
  for (const config of REPRESENTATIVE_CONFIGS) {
    const city = new CityGenerator(config).generate();
    const roadConflicts = city.trees.flatMap((tree) =>
      city.roads.filter((road) => isPointInsideRoadCorridor(tree.center, road)).map((road) => `${tree.id}:${road.id}`)
    );
    const buildingConflicts = city.trees.flatMap((tree) =>
      city.buildings
        .filter((building) => isPointInsidePolygon(tree.center, building.footprint))
        .map((building) => `${tree.id}:${building.id}`)
    );

    expect(city.trees.length).toBeGreaterThan(250);
    expect(roadConflicts).toEqual([]);
    expect(buildingConflicts).toEqual([]);
  }
});

test('generated-city validation rejects invalid generated fixtures with stable categories', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [firstBuilding, ...remainingBuildings] = city.buildings;
  const [firstRoad, ...remainingRoads] = city.roads;
  const invalidCity = {
    ...city,
    roads: [
      {
        ...firstRoad,
        lanes: [],
        sidewalks: []
      },
      ...remainingRoads
    ],
    buildings: [
      {
        ...firstBuilding,
        parcelId: 'missing-parcel',
        metadata: undefined
      },
      ...remainingBuildings
    ]
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });
  const categories = new Set(validation.issues.map((issue) => issue.category));

  expect(validation.passed).toBe(false);
  expect(categories.has('graph')).toBe(true);
  expect(categories.has('identifier')).toBe(true);
  expect(categories.has('metadata')).toBe(true);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        category: 'graph',
        objectId: firstRoad.id
      }),
      expect.objectContaining({
        category: 'identifier',
        objectId: firstBuilding.id
      }),
      expect.objectContaining({
        category: 'metadata',
        objectId: firstBuilding.id
      })
    ])
  );
});

function getCitySignature(city: GeneratedCity): object {
  return {
    bounds: city.bounds,
    objectCounts: {
      roads: city.roads.length,
      intersections: city.intersections.length,
      crossings: city.crossings.length,
      blocks: city.blocks.length,
      parcels: city.parcels.length,
      buildings: city.buildings.length,
      utilityNodes: city.utilityNodes.length,
      utilityEdges: city.utilityEdges.length,
      assetInventoryRecords: city.assetInventoryRecords.length,
      maintenanceOperations: city.maintenanceOperations.length,
      sensors: city.sensors.length,
      indexedObjects: city.objectIndex.objectIds.length
    },
    firstIds: {
      roads: city.roads.slice(0, 5).map((road) => road.id),
      parcels: city.parcels.slice(0, 5).map((parcel) => parcel.id),
      buildings: city.buildings.slice(0, 5).map((building) => building.id),
      utilityNodes: city.utilityNodes.slice(0, 5).map((node) => node.id),
      sensors: city.sensors.slice(0, 5).map((sensor) => sensor.id)
    },
    validation: city.validation
  };
}

function isPointInsideRoadCorridor(
  point: { readonly x: number; readonly z: number },
  road: GeneratedCity['roads'][number]
): boolean {
  const halfWidth = road.widthMeters / 2 + 0.05;
  const halfLength = road.length / 2;

  if (road.orientation === 'vertical') {
    return Math.abs(point.x - road.center.x) <= halfWidth && Math.abs(point.z - road.center.z) <= halfLength;
  }

  return Math.abs(point.z - road.center.z) <= halfWidth && Math.abs(point.x - road.center.x) <= halfLength;
}
