import { expect, test } from '@playwright/test';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { cityConfig } from '../../src/config/cityConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';

test('curb zones are generated for the detailed street slice without crossing conflicts', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [slice] = city.verticalSlices;
  const firstNoStopping = city.curbZones.find((zone) => zone.id === 'curb-zone-road-v-6-left-intersection-0-no-stopping');
  const firstEmergency = city.curbZones.find((zone) => zone.id === 'curb-zone-road-v-6-left-segment-0-emergency');
  const curbUses = new Set(city.curbZones.map((zone) => zone.curbUse));

  expect(city.curbZones).toHaveLength(50);
  expect(slice.curbZoneIds).toHaveLength(50);
  expect(slice.curbZoneIds).toEqual(city.curbZones.map((zone) => zone.id));
  expect(curbUses).toEqual(new Set(['no-stopping', 'loading', 'ride-hail', 'bus-stop', 'emergency']));
  expect(firstNoStopping).toMatchObject({
    kind: 'curb-zone',
    ownerDomain: 'mobility',
    parentId: 'road-v-6-sidewalk-left',
    sliceId: slice.id,
    roadId: 'road-v-6',
    sidewalkId: 'road-v-6-sidewalk-left',
    side: 'left',
    curbUse: 'no-stopping',
    streetProfileId: 'grand-avenue',
    startMeters: 0,
    endMeters: 12,
    lengthMeters: 12,
    crossingClearanceMeters: 8
  });
  expect(firstEmergency).toMatchObject({
    parentId: 'road-v-6-sidewalk-left',
    curbUse: 'emergency',
    startMeters: 12,
    tags: {
      detailedStreetSliceId: slice.id,
      detailedStreetSliceRole: 'corridor-curb-zone',
      corridorRoadId: 'road-v-6'
    }
  });
  expect(city.objectIndex.objectsById[firstNoStopping?.id ?? '']).toEqual(firstNoStopping);
  expect(city.validation.issues.filter((issue) => issue.objectId === firstNoStopping?.id)).toEqual([]);
});

test('validation rejects overlapping curb zones and loading zones that block crossings', () => {
  const city = new CityGenerator(cityConfig).generate();
  const loadingZone = city.curbZones.find((zone) => zone.curbUse === 'loading');
  const [firstCurbZone, secondCurbZone] = city.curbZones;
  const overlappingCurbZones = city.curbZones.map((zone) =>
    zone.id === secondCurbZone.id
      ? {
          ...zone,
          startMeters: firstCurbZone.startMeters + 4,
          endMeters: firstCurbZone.endMeters + 4,
          lengthMeters: firstCurbZone.lengthMeters
        }
      : zone
  );
  const loadingBlockedCurbZones = city.curbZones.map((zone) =>
    zone.id === loadingZone?.id
      ? {
          ...zone,
          startMeters: 0,
          endMeters: 12,
          lengthMeters: 12
        }
      : zone
  );

  const overlapValidation = validateGeneratedCity({
    ...city,
    curbZones: overlappingCurbZones,
    objectIndex: createGeneratedCityObjectIndex({
      ...city,
      curbZones: overlappingCurbZones
    })
  });
  const loadingValidation = validateGeneratedCity({
    ...city,
    curbZones: loadingBlockedCurbZones,
    objectIndex: createGeneratedCityObjectIndex({
      ...city,
      curbZones: loadingBlockedCurbZones
    })
  });

  expect(overlapValidation.passed).toBe(false);
  expect(overlapValidation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: `curb-zone-overlap-${firstCurbZone.sidewalkId}-${firstCurbZone.id}-${secondCurbZone.id}`,
        severity: 'error',
        category: 'graph',
        objectId: secondCurbZone.id
      })
    ])
  );
  expect(loadingValidation.passed).toBe(false);
  expect(loadingValidation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: `curb-zone-blocks-crossing-${loadingZone?.id}-intersection-v6-h0`,
        severity: 'error',
        category: 'graph',
        objectId: loadingZone?.id
      })
    ])
  );
});
