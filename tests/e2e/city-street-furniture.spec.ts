import { expect, test } from '@playwright/test';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { cityConfig } from '../../src/config/cityConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';

test('street furniture is deterministic and uses detailed street placement zones', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const [firstFurniture] = firstCity.streetFurniture;
  const detailedStreetFurniture = firstCity.streetFurniture.filter((item) => item.placementContext === 'detailed-street');
  const citywideStreetFurniture = firstCity.streetFurniture.filter((item) => item.placementContext === 'citywide-street');
  const firstCitywideFurniture = citywideStreetFurniture[0];
  const furnitureCounts = countFurnitureByType(firstCity.streetFurniture);
  const parentSidewalk = firstCity.objectIndex.objectsById[firstFurniture.sidewalkId];

  expect(firstCity.streetFurniture.map((item) => item.id)).toEqual(secondCity.streetFurniture.map((item) => item.id));
  expect(firstCity.streetFurniture).toHaveLength(266);
  expect(detailedStreetFurniture).toHaveLength(58);
  expect(citywideStreetFurniture).toHaveLength(208);
  expect(furnitureCounts).toEqual({
    bench: 106,
    bin: 16,
    'bike-rack': 54,
    bollard: 17,
    'bus-shelter': 19,
    kiosk: 29,
    railing: 6,
    'regulatory-sign': 12,
    'street-name-sign': 4,
    'wayfinding-sign': 3
  });
  expect(firstFurniture).toMatchObject({
    id: 'street-furniture-road-v-6-left-0-bench',
    kind: 'street-furniture',
    ownerDomain: 'public-realm',
    parentId: 'road-v-6-sidewalk-left',
    placementContext: 'detailed-street',
    sliceId: 'slice-detailed-street-road-v-6',
    roadId: 'road-v-6',
    sidewalkId: 'road-v-6-sidewalk-left',
    curbZoneId: 'curb-zone-road-v-6-left-segment-0-emergency',
    furnitureType: 'bench',
    placementZone: 'furnishing-zone',
    assetBindingId: 'binding:street-furniture:bench',
    tags: {
      detailedStreetSliceId: 'slice-detailed-street-road-v-6',
      detailedStreetSliceRole: 'corridor-bench',
      corridorRoadId: 'road-v-6'
    }
  });
  expect(parentSidewalk).toMatchObject({
    kind: 'sidewalk',
    roadSegmentId: 'road-v-6'
  });
  expect(firstFurniture.offsetFromRoadEdgeMeters + firstFurniture.clearanceEnvelope.widthMeters / 2).toBeLessThanOrEqual(
    parentSidewalk && parentSidewalk.kind === 'sidewalk' ? parentSidewalk.furnishingZoneMeters : 0
  );
  expect(detailedStreetFurniture.find((item) => item.furnitureType === 'bus-shelter')).toMatchObject({
    curbZoneId: expect.stringContaining('bus-stop'),
    placementContext: 'detailed-street'
  });
  expect(firstCitywideFurniture).toMatchObject({
    id: 'street-furniture-road-v-0-left-2-bus-shelter',
    kind: 'street-furniture',
    ownerDomain: 'public-realm',
    parentId: 'road-v-0-sidewalk-left',
    placementContext: 'citywide-street',
    roadId: 'road-v-0',
    sidewalkId: 'road-v-0-sidewalk-left',
    furnitureType: 'bus-shelter',
    transitStopId: 'transit-stop-road-v-0-left-2',
    tags: {
      citywideFurniture: true,
      corridorRoadId: 'road-v-0',
      streetProfileId: 'grand-avenue'
    }
  });
  const citywideParentSidewalk = firstCity.objectIndex.objectsById[firstCitywideFurniture.sidewalkId];
  expect(firstCitywideFurniture.clearPathWidthMeters).toBeGreaterThanOrEqual(1.8);
  expect(firstCitywideFurniture.offsetFromRoadEdgeMeters + firstCitywideFurniture.clearanceEnvelope.widthMeters / 2)
    .toBeLessThanOrEqual(
      citywideParentSidewalk?.kind === 'sidewalk'
        ? citywideParentSidewalk.furnishingZoneMeters
        : 0
    );
  expect(firstCity.objectIndex.objectsById[firstFurniture.id]).toEqual(firstFurniture);
  expect(firstCity.objectIndex.objectsById[firstCitywideFurniture.id]).toEqual(firstCitywideFurniture);
  expect(firstCity.assetBindings).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: 'binding:street-furniture:bench',
        objectKind: 'street-furniture',
        fallbackGeometry: 'bench-boxes'
      }),
      expect.objectContaining({
        id: 'binding:street-furniture:wayfinding-sign',
        objectKind: 'street-furniture',
        fallbackGeometry: 'wayfinding-post-panel'
      }),
      expect.objectContaining({
        id: 'binding:street-furniture:railing',
        objectKind: 'street-furniture',
        fallbackGeometry: 'railing-bar'
      })
    ])
  );
  expect(firstCity.validation.issues.filter((issue) => issue.objectId === firstFurniture.id)).toEqual([]);
});

test('validation rejects citywide furniture that blocks clear paths, crossings, or transit rules', () => {
  const city = new CityGenerator(cityConfig).generate();
  const citywideBench = city.streetFurniture.find(
    (item) => item.placementContext === 'citywide-street' && item.furnitureType === 'bench'
  );
  const citywideShelter = city.streetFurniture.find(
    (item) => item.placementContext === 'citywide-street' && item.furnitureType === 'bus-shelter'
  );

  expect(citywideBench).toBeDefined();
  expect(citywideShelter).toBeDefined();

  const invalidStreetFurniture = city.streetFurniture.map((item) => {
    if (item.id === citywideBench?.id) {
      return {
        ...item,
        offsetFromRoadEdgeMeters: 99,
        crossingClearanceMeters: 999
      };
    }

    if (item.id === citywideShelter?.id) {
      return {
        ...item,
        transitStopId: undefined
      };
    }

    return item;
  });
  const validation = validateGeneratedCity({
    ...city,
    streetFurniture: invalidStreetFurniture,
    objectIndex: createGeneratedCityObjectIndex({
      ...city,
      streetFurniture: invalidStreetFurniture
    })
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: `street-furniture-blocks-clear-path-${citywideBench?.id}`,
        severity: 'error',
        category: 'geometry',
        objectId: citywideBench?.id
      }),
      expect.objectContaining({
        id: expect.stringContaining(`street-furniture-overlaps-crossing-clearance-${citywideBench?.id}`),
        severity: 'error',
        category: 'graph',
        objectId: citywideBench?.id
      }),
      expect.objectContaining({
        id: `bus-shelter-without-bus-stop-${citywideShelter?.id}`,
        severity: 'error',
        category: 'graph',
        objectId: citywideShelter?.id
      })
    ])
  );
});

test('validation rejects street furniture in clear paths and crossing clearances', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [clearPathIntrusion, crossingIntrusion] = city.streetFurniture;
  const firstIntersectionId = city.verticalSlices[0].intersectionIds[0];
  const invalidStreetFurniture = city.streetFurniture.map((item) => {
    if (item.id === clearPathIntrusion.id) {
      return {
        ...item,
        offsetFromRoadEdgeMeters: 99
      };
    }

    if (item.id === crossingIntrusion.id) {
      return {
        ...item,
        clearanceEnvelope: {
          ...item.clearanceEnvelope,
          lengthMeters: 80
        }
      };
    }

    return item;
  });
  const validation = validateGeneratedCity({
    ...city,
    streetFurniture: invalidStreetFurniture,
    objectIndex: createGeneratedCityObjectIndex({
      ...city,
      streetFurniture: invalidStreetFurniture
    })
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: `street-furniture-blocks-clear-path-${clearPathIntrusion.id}`,
        severity: 'error',
        category: 'geometry',
        objectId: clearPathIntrusion.id
      }),
      expect.objectContaining({
        id: `street-furniture-overlaps-crossing-clearance-${crossingIntrusion.id}-${firstIntersectionId}`,
        severity: 'error',
        category: 'graph',
        objectId: crossingIntrusion.id
      })
    ])
  );
});

function countFurnitureByType(
  streetFurniture: ReturnType<CityGenerator['generate']>['streetFurniture']
): Record<string, number> {
  return streetFurniture.reduce<Record<string, number>>((counts, item) => {
    counts[item.furnitureType] = (counts[item.furnitureType] ?? 0) + 1;
    return counts;
  }, {});
}
