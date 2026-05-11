import { expect, test } from '@playwright/test';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { cityConfig } from '../../src/config/cityConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';

test('detailed street vertical slice is deterministic and filters corridor objects', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const [slice] = firstCity.verticalSlices;
  const road = firstCity.roads.find((candidate) => candidate.id === slice.corridorRoadId);
  const firstParcel = firstCity.parcels.find((parcel) => parcel.id === slice.parcelIds[0]);
  const firstBuilding = firstCity.buildings.find((building) => building.id === slice.buildingIds[0]);

  expect(firstCity.verticalSlices.map((candidate) => candidate.id)).toEqual(
    secondCity.verticalSlices.map((candidate) => candidate.id)
  );
  expect(slice).toMatchObject({
    id: 'slice-detailed-street-road-v-6',
    kind: 'vertical-slice',
    ownerDomain: 'blueprint',
    parentId: 'road-v-6',
    sliceKind: 'detailed-street',
    corridorRoadId: 'road-v-6',
    streetProfileId: 'grand-avenue',
    hierarchy: 'arterial',
    roadIds: ['road-v-6'],
    sidewalkIds: ['road-v-6-sidewalk-left', 'road-v-6-sidewalk-right']
  });
  expect(slice.crossStreetRoadIds).toHaveLength(cityConfig.gridSize + 1);
  expect(slice.intersectionIds).toHaveLength(cityConfig.gridSize + 1);
  expect(slice.crossingIds).toHaveLength((cityConfig.gridSize + 1) * 2);
  expect(slice.curbZoneIds).toHaveLength(50);
  expect(slice.sidewalkGraphNodeIds).toHaveLength((cityConfig.gridSize + 1) * 2);
  expect(slice.sidewalkGraphEdgeIds).toHaveLength(cityConfig.gridSize * 2 + (cityConfig.gridSize + 1) * 2);
  expect(slice.parcelIds.length).toBeGreaterThan(0);
  expect(slice.buildingIds.length).toBeGreaterThan(0);
  expect(slice.cameraTarget).toEqual({ x: road?.center.x, y: 14, z: road?.center.z });
  expect(Number.isFinite(slice.cameraPosition.x)).toBe(true);
  expect(Number.isFinite(slice.cameraPosition.y)).toBe(true);
  expect(Number.isFinite(slice.cameraPosition.z)).toBe(true);
  expect(firstCity.objectIndex.objectsById[slice.id]).toEqual(slice);
  expect(firstCity.objectIndex.childrenByParentId['road-v-6']).toContain(slice.id);
  expect(road?.tags?.detailedStreetSliceId).toBe(slice.id);
  expect(road?.sidewalks[0].tags?.detailedStreetSliceId).toBe(slice.id);
  expect(firstParcel?.tags?.detailedStreetSliceId).toBe(slice.id);
  expect(firstBuilding?.tags?.detailedStreetSliceId).toBe(slice.id);
  expect(firstCity.validation.issues.filter((issue) => issue.objectId === slice.id)).toEqual([]);
});

test('validation rejects detailed street slices with missing corridor references or tags', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [slice] = city.verticalSlices;
  const invalidCorridorCity = {
    ...city,
    verticalSlices: [
      {
        ...slice,
        corridorRoadId: 'missing-road',
        parentId: 'missing-road'
      }
    ]
  };
  const untaggedRoads = city.roads.map((road) =>
    road.id === slice.corridorRoadId
      ? {
          ...road,
          tags: {}
        }
      : road
  );
  const invalidTagCity = {
    ...city,
    roads: untaggedRoads
  };

  const invalidCorridorValidation = validateGeneratedCity({
    ...invalidCorridorCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCorridorCity)
  });
  const invalidTagValidation = validateGeneratedCity({
    ...invalidTagCity,
    objectIndex: createGeneratedCityObjectIndex(invalidTagCity)
  });

  expect(invalidCorridorValidation.passed).toBe(false);
  expect(invalidCorridorValidation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: `invalid-detailed-street-corridor-${slice.id}`,
        severity: 'error',
        category: 'identifier',
        objectId: slice.id
      })
    ])
  );
  expect(invalidTagValidation.passed).toBe(false);
  expect(invalidTagValidation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: `missing-slice-tag-${slice.id}-${slice.corridorRoadId}`,
        severity: 'error',
        category: 'identifier',
        objectId: slice.corridorRoadId
      })
    ])
  );
});
