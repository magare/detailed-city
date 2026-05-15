import { expect, test } from '@playwright/test';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { cityConfig } from '../../src/config/cityConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';

test('parking and curb management is deterministic across detailed and citywide streets', () => {
  const first = new CityGenerator(cityConfig).generate();
  const second = new CityGenerator(cityConfig).generate();
  const citywideParkingZone = first.curbZones.find(
    (curbZone) =>
      curbZone.managementContext === 'citywide' &&
      curbZone.curbUse === 'parking' &&
      curbZone.management.pricing === 'metered'
  );
  const detailedZone = first.curbZones.find((curbZone) => curbZone.managementContext === 'detailed-street');

  expect(first.curbZones.map((curbZone) => [curbZone.id, curbZone.managementContext, curbZone.curbUse])).toEqual(
    second.curbZones.map((curbZone) => [curbZone.id, curbZone.managementContext, curbZone.curbUse])
  );
  expect(first.curbZones.filter((curbZone) => curbZone.managementContext === 'detailed-street')).toHaveLength(50);
  expect(first.curbZones.filter((curbZone) => curbZone.managementContext === 'citywide').length).toBeGreaterThan(100);
  expect(first.curbZones.some((curbZone) => curbZone.curbUse === 'loading')).toBe(true);
  expect(first.curbZones.some((curbZone) => curbZone.curbUse === 'ride-hail')).toBe(true);
  expect(first.curbZones.some((curbZone) => curbZone.curbUse === 'bus-stop')).toBe(true);
  expect(first.curbZones.some((curbZone) => curbZone.curbUse === 'emergency')).toBe(true);
  expect(first.objectIndex.countsByKind['curb-zone']).toBe(first.curbZones.length);

  expect(detailedZone).toMatchObject({
    ownerDomain: 'mobility',
    managementContext: 'detailed-street'
  });
  expect(detailedZone?.sliceId).toBeDefined();
  expect(citywideParkingZone).toMatchObject({
    kind: 'curb-zone',
    ownerDomain: 'mobility',
    managementContext: 'citywide',
    curbUse: 'parking',
    management: {
      pricing: 'metered',
      enforcement: 'patrol',
      maxStayMinutes: 120,
      disabledSpaces: 1,
      fireLaneClearance: true,
      transitStopClearance: true
    }
  });
  expect(citywideParkingZone?.parentId).toBe(citywideParkingZone?.sidewalkId);
  expect(citywideParkingZone?.sliceId).toBeUndefined();
});

test('curb management validation rejects invalid parking, fire-lane, transit, and loading policies', () => {
  const city = new CityGenerator(cityConfig).generate();
  const parkingZone = city.curbZones.find((curbZone) => curbZone.curbUse === 'parking');
  const emergencyZone = city.curbZones.find((curbZone) => curbZone.curbUse === 'emergency');
  const busZone = city.curbZones.find((curbZone) => curbZone.curbUse === 'bus-stop');
  const loadingZone = city.curbZones.find((curbZone) => curbZone.curbUse === 'loading');

  expect(parkingZone).toBeDefined();
  expect(emergencyZone).toBeDefined();
  expect(busZone).toBeDefined();
  expect(loadingZone).toBeDefined();

  const invalidCity = {
    ...city,
    curbZones: city.curbZones.map((curbZone) => {
      if (curbZone.id === parkingZone!.id) {
        return { ...curbZone, management: { ...curbZone.management, disabledSpaces: -1 } };
      }
      if (curbZone.id === emergencyZone!.id) {
        return { ...curbZone, management: { ...curbZone.management, fireLaneClearance: false } };
      }
      if (curbZone.id === busZone!.id) {
        return { ...curbZone, management: { ...curbZone.management, transitStopClearance: false } };
      }
      if (curbZone.id === loadingZone!.id) {
        return { ...curbZone, management: { ...curbZone.management, loadingDockAccess: false } };
      }
      return curbZone;
    })
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: `invalid-curb-zone-disabled-spaces-${parkingZone!.id}`, category: 'graph' }),
      expect.objectContaining({ id: `curb-zone-blocks-fire-lane-${emergencyZone!.id}`, category: 'graph' }),
      expect.objectContaining({ id: `curb-zone-blocks-transit-stop-${busZone!.id}`, category: 'graph' }),
      expect.objectContaining({ id: `curb-zone-missing-loading-access-${loadingZone!.id}`, category: 'graph' })
    ])
  );
});
