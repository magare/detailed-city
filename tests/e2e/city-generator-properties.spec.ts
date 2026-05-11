import { expect, test } from '@playwright/test';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import type { RenderBinding } from '../../src/city/data-contracts/cityContracts';
import { assertAppConfigValid } from '../../src/app/cityValidationGate';
import { validateAppConfig } from '../../src/config/configSchema';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import type { CityConfig } from '../../src/types/city';

test('generator is reproducible for the same seed and config variants', () => {
  for (const config of createPropertyConfigs()) {
    assertAppConfigValid(validateAppConfig({ cityConfig: config, renderConfig }));

    const firstCity = new CityGenerator(config).generate();
    const secondCity = new CityGenerator(config).generate();

    expect(firstCity.validation.passed, `${config.seed} should generate a valid city`).toBe(true);
    expect(firstCity.validation.issues.filter((issue) => issue.severity === 'error')).toEqual([]);
    expect(firstCity.objectIndex.duplicateIds).toEqual([]);
    expect(firstCity.objectIndex.objectIds).toEqual(secondCity.objectIndex.objectIds);
    expect(firstCity.objectIndex.countsByKind).toEqual(secondCity.objectIndex.countsByKind);
    expect(createCitySignature(firstCity)).toEqual(createCitySignature(secondCity));
  }
});

test('generated city property invariants hold across deterministic config variants', () => {
  for (const config of createPropertyConfigs()) {
    const city = new CityGenerator(config).generate();
    const indexedCountByKind = Object.values(city.objectIndex.countsByKind).reduce((sum, count) => sum + count, 0);

    expect(indexedCountByKind).toBe(city.objectIndex.objectIds.length);
    expect(city.objectIndex.objectIds.length).toBeGreaterThan(1000);
    expect(city.objectIndex.countsByKind['road-segment']).toBe(city.roads.length);
    expect(city.objectIndex.countsByKind.parcel).toBe(city.parcels.length);
    expect(city.objectIndex.countsByKind.building).toBe(city.buildings.length);
    expect(city.roads.every((road) => road.lanes.length === road.laneCount)).toBe(true);
    expect(city.parcels.every((parcel) => city.objectIndex.objectsById[parcel.blockId]?.kind === 'block')).toBe(true);
    expect(city.buildings.every((building) => city.objectIndex.objectsById[building.parcelId]?.kind === 'parcel')).toBe(
      true
    );
    expect(city.trees.every((tree) => tree.metadata?.sourceType === 'procedural')).toBe(true);
    expect(city.assetCatalog.every((asset) => asset.metadata?.sourceType === 'procedural')).toBe(true);
  }
});

test('invalid generated fixture fails validation with expected categories', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [road, ...remainingRoads] = city.roads;
  const [firstLane, secondLane] = road.lanes;
  const [tree, ...remainingTrees] = city.trees;
  const [parcel, ...remainingParcels] = city.parcels;
  const [binding, ...remainingBindings] = city.assetBindings;
  const invalidRoad = {
    ...road,
    length: 0,
    lanes: [firstLane, { ...secondLane, id: firstLane.id }]
  };
  const invalidParcel = {
    ...parcel,
    frontageRoadIds: [],
    allowedUses: []
  };
  const invalidBinding: RenderBinding = {
    ...binding,
    id: 'binding:invalid:generator-fixture',
    objectKind: 'not-a-kind' as RenderBinding['objectKind']
  };
  const invalidCity = {
    ...city,
    roads: [invalidRoad, ...remainingRoads],
    trees: [{ ...tree, id: 'orphan-tree', parentId: 'missing-park', parkId: 'missing-park' }, ...remainingTrees],
    parcels: [invalidParcel, ...remainingParcels],
    assetBindings: [invalidBinding, ...remainingBindings]
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });
  const errorCategories = new Set(
    validation.issues.filter((issue) => issue.severity === 'error').map((issue) => issue.category)
  );

  expect(validation.passed).toBe(false);
  const expectedCategories = ['asset', 'geometry', 'graph', 'identifier', 'zoning'] as const;

  for (const category of expectedCategories) {
    expect(errorCategories.has(category), `expected ${category} validation failure`).toBe(true);
  }
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: `duplicate-id-${firstLane.id}`, category: 'identifier' }),
      expect.objectContaining({ id: `invalid-road-${road.id}`, category: 'geometry' }),
      expect.objectContaining({ id: `missing-frontage-${parcel.id}`, category: 'graph' }),
      expect.objectContaining({ id: `missing-allowed-uses-${parcel.id}`, category: 'zoning' }),
      expect.objectContaining({ id: 'invalid-render-binding-object-kind-binding:invalid:generator-fixture', category: 'asset' })
    ])
  );
});

function createPropertyConfigs(): CityConfig[] {
  return [
    cityConfig,
    {
      ...cityConfig,
      seed: 'property-seed-a',
      density: {
        cityDensity: 0.66,
        trafficDensity: 0.3,
        propDensity: 0.5,
        treeDensity: 0.7
      },
      districts: {
        ...cityConfig.districts,
        downtown: {
          ...cityConfig.districts.downtown,
          density: 0.9
        },
        waterfront: {
          ...cityConfig.districts.waterfront,
          heightBias: 0.5
        }
      }
    },
    {
      ...cityConfig,
      seed: 'property-seed-b',
      gridSize: 10,
      blockSize: 32,
      roadWidth: 7,
      waterwayWidth: 24,
      building: {
        minHeight: 6,
        maxHeight: 84,
        setback: 4
      },
      density: {
        cityDensity: 0.78,
        trafficDensity: 0.48,
        propDensity: 0.74,
        treeDensity: 0.58
      }
    }
  ];
}

function createCitySignature(city: ReturnType<CityGenerator['generate']>) {
  return {
    countsByKind: city.objectIndex.countsByKind,
    firstObjectIds: city.objectIndex.objectIds.slice(0, 24),
    lastObjectIds: city.objectIndex.objectIds.slice(-24),
    roadCenters: city.roads.slice(0, 4).map((road) => road.center),
    buildingHeights: city.buildings.slice(0, 12).map((building) => Number(building.heightMeters.toFixed(3))),
    validationIssueIds: city.validation.issues.map((issue) => issue.id)
  };
}
