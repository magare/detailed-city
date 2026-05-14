import { expect, test } from '@playwright/test';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { cityConfig } from '../../src/config/cityConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';

test('transit stops and routes are deterministic and reference bus-capable streets', () => {
  const first = new CityGenerator(cityConfig).generate();
  const second = new CityGenerator(cityConfig).generate();
  const firstRoute = first.transitRoutes[0];
  const firstStop = first.transitStops[0];

  expect(first.transitStops.map((stop) => stop.id)).toEqual(second.transitStops.map((stop) => stop.id));
  expect(first.transitRoutes.map((route) => route.id)).toEqual(second.transitRoutes.map((route) => route.id));
  expect(first.transitStops.length).toBeGreaterThanOrEqual(8);
  expect(first.transitRoutes.length).toBeGreaterThanOrEqual(4);
  expect(firstRoute).toMatchObject({
    kind: 'transit-route',
    ownerDomain: 'mobility',
    mode: 'bus'
  });
  expect(firstRoute.stopIds.length).toBeGreaterThanOrEqual(2);
  expect(firstStop).toMatchObject({
    kind: 'transit-stop',
    ownerDomain: 'mobility',
    mode: 'bus',
    accessible: true,
    assetBindingId: 'binding:transit:bus-stop'
  });
  expect(first.objectIndex.countsByKind['transit-stop']).toBe(first.transitStops.length);
  expect(first.objectIndex.countsByKind['transit-route']).toBe(first.transitRoutes.length);
  expect(first.validation.issues).toEqual([]);
});

test('transit validation rejects stops on non-transit roads', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [stop, ...remainingStops] = city.transitStops;
  const localRoad = city.roads.find((road) => !road.transitEligible);

  expect(stop).toBeDefined();
  expect(localRoad).toBeDefined();

  const invalidCity = {
    ...city,
    transitStops: [
      {
        ...stop,
        roadId: localRoad!.id
      },
      ...remainingStops
    ]
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: `invalid-transit-stop-road-${stop.id}`, category: 'graph' })
    ])
  );
});

test('browser diagnostics expose transit network and rendered markers', async ({ page }) => {
  await page.goto('/?testMode=fast');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const diagnostics = await page.evaluate(() => ({
    validationPassed: window.cityDiagnostics?.validation.passed,
    objectCounts: window.cityDiagnostics?.objectCounts,
    transitStopsIndexed: window.cityDiagnostics?.objectIndex.countsByKind['transit-stop'],
    transitRoutesIndexed: window.cityDiagnostics?.objectIndex.countsByKind['transit-route'],
    pickableTransitStops: window.cityDiagnostics?.picking.countsByKind['transit-stop'],
    markerLayerPresent: Boolean(
      (window.cityApp as unknown as { city?: { group: { children: { name: string; children?: { name: string }[] }[] } } }).city?.group.children
        .flatMap((layer) => layer.children ?? [])
        .some((child) => child.name === 'TransitStopsAndRoutes')
    ),
    debugText: document.body.textContent
  }));

  expect(diagnostics.validationPassed).toBe(true);
  expect(diagnostics.objectCounts?.transitStops).toBeGreaterThanOrEqual(8);
  expect(diagnostics.objectCounts?.transitRoutes).toBeGreaterThanOrEqual(4);
  expect(diagnostics.objectCounts?.transitRouteStops).toBeGreaterThanOrEqual(diagnostics.objectCounts?.transitStops ?? 0);
  expect(diagnostics.transitStopsIndexed).toBe(diagnostics.objectCounts?.transitStops);
  expect(diagnostics.transitRoutesIndexed).toBe(diagnostics.objectCounts?.transitRoutes);
  expect(diagnostics.pickableTransitStops).toBe(diagnostics.objectCounts?.transitStops);
  expect(diagnostics.markerLayerPresent).toBe(true);
  expect(diagnostics.debugText).toContain('Transit');
});
