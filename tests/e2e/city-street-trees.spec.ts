import { expect, test } from '@playwright/test';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { cityConfig } from '../../src/config/cityConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';

test('street trees are deterministic and attach to detailed street sidewalks', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const streetTrees = firstCity.trees.filter((tree) => tree.plantingContext === 'street');
  const detailedStreetTrees = streetTrees.filter((tree) => tree.sliceId === 'slice-detailed-street-road-v-6');
  const citywideStreetTrees = streetTrees.filter((tree) => tree.id.startsWith('citywide-tree-'));
  const parkTrees = firstCity.trees.filter((tree) => tree.plantingContext === 'park');
  const [firstStreetTree] = detailedStreetTrees;
  const firstCitywideTree = citywideStreetTrees.find((tree) => tree.id === 'citywide-tree-road-v-0-left-0');
  const parentSidewalk = firstCity.objectIndex.objectsById[firstStreetTree.sidewalkId ?? ''];

  expect(streetTrees.map((tree) => tree.id)).toEqual(
    secondCity.trees.filter((tree) => tree.plantingContext === 'street').map((tree) => tree.id)
  );
  expect(parkTrees).toHaveLength(29);
  expect(detailedStreetTrees).toHaveLength(24);
  expect(citywideStreetTrees).toHaveLength(92);
  expect(streetTrees).toHaveLength(116);
  expect(firstStreetTree).toMatchObject({
    id: 'street-tree-road-v-6-left-0',
    kind: 'tree-planting',
    ownerDomain: 'public-realm',
    parentId: 'road-v-6-sidewalk-left',
    plantingContext: 'street',
    plantingForm: 'street-tree',
    sliceId: 'slice-detailed-street-road-v-6',
    roadId: 'road-v-6',
    sidewalkId: 'road-v-6-sidewalk-left',
    curbZoneId: 'curb-zone-road-v-6-left-segment-0-emergency',
    lod: 'lod3',
    canopyClass: 'medium',
    canopySpreadMeters: 5.6,
    soilVolumeCubicMeters: 11.8,
    seasonalColor: 'autumn-gold',
    greenCorridorId: 'green-corridor-road-v-6',
    greenCorridorRole: 'shade-corridor',
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
  expect(firstCitywideTree).toMatchObject({
    id: 'citywide-tree-road-v-0-left-0',
    ownerDomain: 'public-realm',
    parentId: 'road-v-0-sidewalk-left',
    plantingContext: 'street',
    roadId: 'road-v-0',
    sidewalkId: 'road-v-0-sidewalk-left',
    greenCorridorRole: 'shade-corridor'
  });
  expect(firstCitywideTree?.treePit?.widthMeters).toBeLessThanOrEqual(
    firstCitywideTree
      ? (
          firstCity.objectIndex.objectsById[firstCitywideTree.sidewalkId ?? ''] as
            | { furnishingZoneMeters?: number }
            | undefined
        )?.furnishingZoneMeters ?? 0
      : 0
  );
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

test('validation rejects tree planting records without canopy, soil, and corridor metadata', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [firstTree, ...remainingTrees] = city.trees;
  const invalidTree = {
    ...firstTree,
    canopySpreadMeters: 0,
    soilVolumeCubicMeters: 0,
    greenCorridorId: '',
    heatMitigationScore: 1.5
  };
  const invalidCity = {
    ...city,
    trees: [invalidTree, ...remainingTrees]
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: `invalid-tree-canopy-${firstTree.id}`,
        category: 'geometry',
        objectId: firstTree.id
      }),
      expect.objectContaining({
        id: `invalid-tree-soil-volume-${firstTree.id}`,
        category: 'geometry',
        objectId: firstTree.id
      }),
      expect.objectContaining({
        id: `missing-tree-green-corridor-${firstTree.id}`,
        category: 'graph',
        objectId: firstTree.id
      }),
      expect.objectContaining({
        id: `invalid-tree-ecology-scores-${firstTree.id}`,
        category: 'config',
        objectId: firstTree.id
      })
    ])
  );
});
