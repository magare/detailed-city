import { expect, test } from '@playwright/test';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { cityConfig } from '../../src/config/cityConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';

test('freight logistics are deterministic and link buildings to loading curbs and truck routes', () => {
  const first = new CityGenerator(cityConfig).generate();
  const second = new CityGenerator(cityConfig).generate();
  const firstDock = first.freightLoadingDocks[0];
  const firstRoute = first.freightRoutes[0];
  const firstAlley = first.serviceAlleys[0];

  expect(first.freightLoadingDocks.map((dock) => [dock.id, dock.buildingId, dock.curbZoneId, dock.linkedRouteIds.join(',')])).toEqual(
    second.freightLoadingDocks.map((dock) => [dock.id, dock.buildingId, dock.curbZoneId, dock.linkedRouteIds.join(',')])
  );
  expect(first.freightRoutes.map((route) => [route.id, route.routeKind, route.loadingDockIds.length])).toEqual(
    second.freightRoutes.map((route) => [route.id, route.routeKind, route.loadingDockIds.length])
  );
  expect(first.freightLoadingDocks.length).toBeGreaterThan(50);
  expect(first.freightRoutes.length).toBeGreaterThan(5);
  expect(first.serviceAlleys.length).toBeGreaterThan(0);
  expect(first.objectIndex.countsByKind['freight-loading-dock']).toBe(first.freightLoadingDocks.length);
  expect(first.objectIndex.countsByKind['freight-route']).toBe(first.freightRoutes.length);
  expect(first.objectIndex.countsByKind['service-alley']).toBe(first.serviceAlleys.length);
  expect(first.validation.issues).toEqual([]);

  expect(firstDock).toMatchObject({
    kind: 'freight-loading-dock',
    ownerDomain: 'mobility',
    curbZoneId: expect.stringContaining('curb-zone-'),
    loadingBays: expect.any(Number),
    warehouseLink: expect.any(Boolean)
  });
  expect(firstDock.parentId).toBe(firstDock.buildingId);
  expect(first.freightRoutes.some((route) => firstDock.linkedRouteIds.includes(route.id))).toBe(true);
  expect(firstRoute).toMatchObject({
    kind: 'freight-route',
    ownerDomain: 'mobility',
    allowedVehicleClasses: expect.arrayContaining(['cargo-van']),
    truckRestriction: expect.objectContaining({
      hazmatAllowed: false
    })
  });
  expect(firstRoute.roadIds.length).toBeGreaterThan(0);
  expect(firstRoute.laneIds.length).toBeGreaterThan(0);
  expect(firstRoute.loadingDockIds.length).toBeGreaterThan(0);
  expect(firstRoute.lastMileStopCount).toBeGreaterThanOrEqual(firstRoute.loadingDockIds.length);
  expect(firstAlley).toMatchObject({
    kind: 'service-alley',
    ownerDomain: 'mobility',
    accessControlled: true
  });
});

test('freight validation rejects broken dock, route, service alley, and delivery-window references', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [dock, ...remainingDocks] = city.freightLoadingDocks;
  const [route, ...remainingRoutes] = city.freightRoutes;
  const [alley, ...remainingAlleys] = city.serviceAlleys;

  expect(dock).toBeDefined();
  expect(route).toBeDefined();
  expect(alley).toBeDefined();

  const invalidDock = {
    ...dock,
    curbZoneId: city.curbZones.find((curbZone) => curbZone.curbUse !== 'loading')!.id,
    deliveryWindow: { ...dock.deliveryWindow, startHour: 8, endHour: 8 }
  };
  const invalidRoute = {
    ...route,
    roadIds: ['missing-road'],
    laneIds: ['missing-lane'],
    loadingDockIds: ['missing-dock'],
    truckRestriction: { ...route.truckRestriction, maxWeightTonnes: 0 },
    lastMileStopCount: 0
  };
  const invalidAlley = {
    ...alley,
    loadingDockIds: ['missing-dock'],
    widthMeters: 0
  };
  const invalidCity = {
    ...city,
    freightLoadingDocks: [invalidDock, ...remainingDocks],
    freightRoutes: [invalidRoute, ...remainingRoutes],
    serviceAlleys: [invalidAlley, ...remainingAlleys]
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: `invalid-freight-dock-curb-zone-${dock.id}`, category: 'graph' }),
      expect.objectContaining({ id: `invalid-freight-delivery-window-${dock.id}`, category: 'graph' }),
      expect.objectContaining({ id: `invalid-freight-route-road-${route.id}-missing-road`, category: 'graph' }),
      expect.objectContaining({ id: `invalid-freight-route-lane-${route.id}-missing-lane`, category: 'graph' }),
      expect.objectContaining({ id: `freight-route-dock-mismatch-${route.id}-missing-dock`, category: 'graph' }),
      expect.objectContaining({ id: `invalid-freight-route-restriction-${route.id}`, category: 'graph' }),
      expect.objectContaining({ id: `invalid-service-alley-road-${alley.id}`, category: 'graph' }),
      expect.objectContaining({ id: `service-alley-dock-mismatch-${alley.id}-missing-dock`, category: 'graph' })
    ])
  );
});
