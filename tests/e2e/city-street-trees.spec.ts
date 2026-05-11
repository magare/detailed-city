import { expect, test } from '@playwright/test';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { cityConfig } from '../../src/config/cityConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';

test('street trees are deterministic and attach to detailed street sidewalks', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const streetTrees = firstCity.trees.filter((tree) => tree.plantingContext === 'street');
  const parkTrees = firstCity.trees.filter((tree) => tree.plantingContext === 'park');
  const [firstStreetTree] = streetTrees;
  const parentSidewalk = firstCity.objectIndex.objectsById[firstStreetTree.sidewalkId ?? ''];

  expect(streetTrees.map((tree) => tree.id)).toEqual(
    secondCity.trees.filter((tree) => tree.plantingContext === 'street').map((tree) => tree.id)
  );
  expect(parkTrees).toHaveLength(29);
  expect(streetTrees).toHaveLength(24);
  expect(firstStreetTree).toMatchObject({
    id: 'street-tree-road-v-6-left-0',
    kind: 'tree-planting',
    ownerDomain: 'public-realm',
    parentId: 'road-v-6-sidewalk-left',
    plantingContext: 'street',
    sliceId: 'slice-detailed-street-road-v-6',
    roadId: 'road-v-6',
    sidewalkId: 'road-v-6-sidewalk-left',
    curbZoneId: 'curb-zone-road-v-6-left-segment-0-emergency',
    lod: 'lod3',
    treePit: {
      widthMeters: 1.4,
      lengthMeters: 3.2,
      surface: 'grate'
    },
    tags: {
      detailedStreetSliceId: 'slice-detailed-street-road-v-6',
      detailedStreetSliceRole: 'corridor-street-tree',
      corridorRoadId: 'road-v-6'
    }
  });
  expect(parentSidewalk).toMatchObject({
    kind: 'sidewalk',
    roadSegmentId: 'road-v-6'
  });
  expect(firstStreetTree.offsetFromRoadEdgeMeters).toBeLessThanOrEqual(
    parentSidewalk && parentSidewalk.kind === 'sidewalk' ? parentSidewalk.furnishingZoneMeters : 0
  );
  expect(firstCity.objectIndex.objectsById[firstStreetTree.id]).toEqual(firstStreetTree);
  expect(firstCity.validation.issues.filter((issue) => issue.objectId === firstStreetTree.id)).toEqual([]);
});

test('validation rejects street trees outside sidewalk furnishing zones', () => {
  const city = new CityGenerator(cityConfig).generate();
  const invalidTrees = city.trees.map((tree) =>
    tree.plantingContext === 'street'
      ? {
          ...tree,
          offsetFromRoadEdgeMeters: 99
        }
      : tree
  );
  const firstInvalidTree = invalidTrees.find((tree) => tree.plantingContext === 'street');
  const validation = validateGeneratedCity({
    ...city,
    trees: invalidTrees,
    objectIndex: createGeneratedCityObjectIndex({
      ...city,
      trees: invalidTrees
    })
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: `street-tree-outside-furnishing-zone-${firstInvalidTree?.id}`,
        severity: 'error',
        category: 'geometry',
        objectId: firstInvalidTree?.id
      })
    ])
  );
});
