import { expect, test } from '@playwright/test';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import {
  CITY_OBJECT_KIND_REGISTRY_ENTRIES,
  getCityObjectChildren,
  getCityObjectsByKind,
  isCityObjectIdValidForKind
} from '../../src/city/data-contracts/cityObjectRegistry';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { cityConfig } from '../../src/config/cityConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';

test('generated city object index is deterministic and resolves road children', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();

  expect(firstCity.objectIndex.objectIds).toEqual(secondCity.objectIndex.objectIds);
  expect(firstCity.objectIndex.duplicateIds).toEqual([]);
  expect(firstCity.objectIndex.countsByKind.lane).toBe(72);
  expect(firstCity.objectIndex.countsByKind.sidewalk).toBe(52);
  expect(firstCity.objectIndex.countsByKind['vertical-slice']).toBe(1);
  expect(firstCity.objectIndex.countsByKind['curb-zone']).toBe(50);
  expect(firstCity.objectIndex.countsByKind['tree-planting']).toBe(53);
  expect(firstCity.objectIndex.countsByKind['street-light']).toBe(12);
  expect(firstCity.objectIndex.countsByKind['street-furniture']).toBe(58);
  expect(firstCity.objectIndex.countsByKind.facade).toBe(45);
  expect(firstCity.objectIndex.countsByKind.constraint).toBe(11);
  expect(firstCity.objectIndex.countsByKind.asset).toBe(30);
  expect(CITY_OBJECT_KIND_REGISTRY_ENTRIES).toHaveLength(28);
  expect(new Set(CITY_OBJECT_KIND_REGISTRY_ENTRIES.map((entry) => entry.kind)).size).toBe(28);
  expect(firstCity.objectIndex.objectsById['slice-detailed-street-road-v-6']).toMatchObject({
    id: 'slice-detailed-street-road-v-6',
    kind: 'vertical-slice',
    parentId: 'road-v-6',
    ownerDomain: 'blueprint',
    lod: 'lod0'
  });
  expect(firstCity.objectIndex.objectsById['asset:road:asphalt:primitive']).toMatchObject({
    id: 'asset:road:asphalt:primitive',
    kind: 'asset',
    ownerDomain: 'rendering-handoff',
    lod: 'lod1'
  });
  expect(firstCity.objectIndex.objectsById['road-v-0-lane-0']).toMatchObject({
    id: 'road-v-0-lane-0',
    kind: 'lane',
    parentId: 'road-v-0',
    ownerDomain: 'mobility',
    lod: 'lod2'
  });
  expect(firstCity.objectIndex.childrenByParentId['road-v-0']).toEqual([
    'road-v-0-lane-0',
    'road-v-0-lane-1',
    'road-v-0-lane-2',
    'road-v-0-lane-3',
    'road-v-0-sidewalk-left',
    'road-v-0-sidewalk-right'
  ]);

  const [firstParcel] = firstCity.parcels;
  expect(firstParcel.parentId).toBe(firstParcel.blockId);
  expect(getCityObjectsByKind(firstCity.objectIndex, 'parcel')).toHaveLength(firstCity.parcels.length);
  expect(getCityObjectChildren(firstCity.objectIndex, firstParcel.blockId, 'parcel').map((parcel) => parcel.id)).toContain(
    firstParcel.id
  );
  expect(isCityObjectIdValidForKind('building', firstCity.buildings[0].id)).toBe(true);
});

test('render asset catalog provides fallback coverage for current scene objects', () => {
  const city = new CityGenerator(cityConfig).generate();

  expect(city.assetCatalog).toHaveLength(30);
  expect(city.assetBindings).toHaveLength(30);
  expect(city.validation.issues.filter((issue) => issue.category === 'asset')).toEqual([]);
  expect(city.assetBindings).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: 'binding:road:asphalt',
        objectKind: 'road-segment',
        fallbackMaterial: 'asphalt',
        fallbackGeometry: 'road-segment-box'
      }),
      expect.objectContaining({
        id: 'binding:vehicle:traffic-car',
        objectKind: 'traffic-vehicle',
        fallbackMaterial: 'vehicleBody',
        fallbackGeometry: 'vehicle-box'
      }),
      expect.objectContaining({
        id: 'binding:street-furniture:bench',
        objectKind: 'street-furniture',
        fallbackMaterial: 'streetFurnitureWood',
        fallbackGeometry: 'bench-boxes'
      }),
      expect.objectContaining({
        id: 'binding:road:zebra-crossing',
        objectKind: 'lane-marking',
        fallbackMaterial: 'lanePaint',
        fallbackGeometry: 'crosswalk-stripe-plane'
      }),
      expect.objectContaining({
        id: 'binding:facade:storefront-window',
        objectKind: 'facade',
        fallbackMaterial: 'storefrontGlass',
        fallbackGeometry: 'storefront-window-box'
      })
    ])
  );
});

test('validation warns when a required render binding is missing', () => {
  const city = new CityGenerator(cityConfig).generate();
  const missingVehicleBindingCity = {
    ...city,
    assetBindings: city.assetBindings.filter((binding) => binding.id !== 'binding:vehicle:traffic-car')
  };
  const validation = validateGeneratedCity({
    ...missingVehicleBindingCity,
    objectIndex: createGeneratedCityObjectIndex(missingVehicleBindingCity)
  });

  expect(validation.passed).toBe(true);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: 'missing-render-binding-binding:vehicle:traffic-car',
        severity: 'warning',
        category: 'asset',
        objectId: 'binding:vehicle:traffic-car'
      })
    ])
  );
});

test('validation rejects duplicate child IDs and missing indexed parents', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [road] = city.roads;
  const [firstLane, secondLane] = road.lanes;
  const [firstTree, ...remainingTrees] = city.trees;
  const invalidRoad = {
    ...road,
    lanes: [firstLane, { ...secondLane, id: firstLane.id }]
  };
  const invalidCity = {
    ...city,
    roads: [invalidRoad, ...city.roads.slice(1)],
    trees: [
      {
        ...firstTree,
        id: 'orphan-tree',
        parentId: 'missing-park',
        parkId: 'missing-park'
      },
      ...remainingTrees
    ]
  };
  const indexedInvalidCity = {
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  };
  const validation = validateGeneratedCity(indexedInvalidCity);

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: `duplicate-id-${firstLane.id}`,
        category: 'identifier',
        objectId: firstLane.id
      }),
      expect.objectContaining({
        id: 'missing-parent-orphan-tree-missing-park',
        category: 'identifier',
        objectId: 'orphan-tree'
      })
    ])
  );
});

test('validation rejects object ID pattern and parent-kind registry violations', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [firstParcel, ...remainingParcels] = city.parcels;
  const invalidIdAndParentCity = {
    ...city,
    parcels: [
      {
        ...firstParcel,
        id: 'parcel bad id',
        parentId: firstParcel.districtId
      },
      ...remainingParcels
    ]
  };
  const invalidIdAndParentValidation = validateGeneratedCity({
    ...invalidIdAndParentCity,
    objectIndex: createGeneratedCityObjectIndex(invalidIdAndParentCity)
  });
  const missingParentCity = {
    ...city,
    parcels: [
      {
        ...firstParcel,
        parentId: undefined
      },
      ...remainingParcels
    ]
  };
  const missingParentValidation = validateGeneratedCity({
    ...missingParentCity,
    objectIndex: createGeneratedCityObjectIndex(missingParentCity)
  });

  expect(invalidIdAndParentValidation.passed).toBe(false);
  expect(invalidIdAndParentValidation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: 'invalid-id-pattern-parcel-parcel-bad-id',
        category: 'identifier',
        objectId: 'parcel bad id'
      }),
      expect.objectContaining({
        id: `invalid-parent-kind-parcel-bad-id-${firstParcel.districtId}`,
        category: 'identifier',
        objectId: 'parcel bad id'
      })
    ])
  );
  expect(missingParentValidation.passed).toBe(false);
  expect(missingParentValidation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: `missing-required-parent-${firstParcel.id}`,
        category: 'identifier',
        objectId: firstParcel.id
      })
    ])
  );
});
