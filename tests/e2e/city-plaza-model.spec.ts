import { expect, test } from '@playwright/test';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { cityConfig } from '../../src/config/cityConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';

test('plaza zones are deterministic, indexed, and linked to civic plaza context', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();

  expect(firstCity.plazaZones.map((zone) => zone.id)).toEqual(secondCity.plazaZones.map((zone) => zone.id));
  expect(firstCity.plazaZones).toHaveLength(6);
  expect(firstCity.objectIndex.countsByKind['plaza-zone']).toBe(6);
  expect(firstCity.validation.issues.filter((issue) => issue.objectId?.startsWith('plaza-zone-'))).toEqual([]);
  expect(firstCity.plazaZones.map((zone) => zone.zoneKind).sort()).toEqual([
    'active-edge',
    'event',
    'hardscape',
    'paving',
    'seating',
    'shade'
  ]);
  expect(firstCity.plazaZones.every((zone) => zone.parentId === 'civic-plaza')).toBe(true);
  expect(firstCity.plazaZones.every((zone) => zone.connectedSidewalkIds.length === 2)).toBe(true);
  expect(firstCity.plazaZones.find((zone) => zone.zoneKind === 'event')).toMatchObject({
    eventCapacityPeople: 255,
    activeFrontageIds: expect.arrayContaining([
      'facade-active-frontage-building-6-7-1-1-road-v-6',
      'facade-active-frontage-building-6-6-1-1-road-v-6'
    ])
  });
});

test('plaza validation catches broken access, active-edge, event, feature, and binding references', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [eventZone, ...remainingZones] = city.plazaZones;
  const invalidZone = {
    ...eventZone,
    zoneKind: 'event' as const,
    connectedSidewalkIds: ['missing-sidewalk'],
    activeFrontageIds: ['missing-active-frontage'],
    parkFeatureIds: ['missing-park-feature'],
    eventCapacityPeople: 0,
    assetBindingId: 'missing-plaza-binding'
  };
  const invalidCity = {
    ...city,
    plazaZones: [invalidZone, ...remainingZones]
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: `plaza-zone-missing-sidewalk-${eventZone.id}-missing-sidewalk`,
        category: 'graph',
        objectId: eventZone.id
      }),
      expect.objectContaining({
        id: `plaza-zone-missing-active-frontage-${eventZone.id}-missing-active-frontage`,
        category: 'graph',
        objectId: eventZone.id
      }),
      expect.objectContaining({
        id: `plaza-zone-missing-event-capacity-${eventZone.id}`,
        category: 'graph',
        objectId: eventZone.id
      }),
      expect.objectContaining({
        id: `plaza-zone-missing-park-feature-${eventZone.id}-missing-park-feature`,
        category: 'graph',
        objectId: eventZone.id
      }),
      expect.objectContaining({
        id: `plaza-zone-missing-binding-${eventZone.id}`,
        category: 'asset',
        objectId: eventZone.id
      })
    ])
  );
});
