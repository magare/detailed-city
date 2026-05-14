import { expect, test } from '@playwright/test';
import { validateTrafficPlan } from '../../src/city/data-contracts/validation/validateTrafficPlan';
import { cityConfig } from '../../src/config/cityConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('traffic vehicles reference lanes, route nodes, stop zones, and profile speeds', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const firstTraffic = createTraffic(firstCity);
  const secondTraffic = createTraffic(secondCity);
  const [firstVehicle] = firstTraffic.vehicles;
  const detailedStreetVehicle = firstTraffic.vehicles.find((vehicle) => vehicle.roadId === 'road-v-6');

  expect(firstTraffic.vehicles.map((vehicle) => vehicle.id)).toEqual(
    secondTraffic.vehicles.map((vehicle) => vehicle.id)
  );
  expect(firstTraffic.vehicles).toHaveLength(7);
  expect(firstVehicle).toMatchObject({
    id: 'traffic-vehicle-0',
    roadId: 'road-v-0',
    laneId: 'road-v-0-lane-1',
    axis: 'z',
    direction: 1,
    speed: 6.89,
    speedLimitKph: 40,
    routeOffsetMeters: -253,
    route: {
      spawnNodeId: 'intersection-v0-h0',
      destinationNodeId: 'intersection-v0-h12',
      startOffsetMeters: -264,
      endOffsetMeters: 264,
      lengthMeters: 528
    },
    incidentHookIds: ['incident-hook:road-v-0:route-choice', 'incident-hook:road-v-0:stop-control']
  });
  expect(firstVehicle.route.nodeIds).toHaveLength(13);
  expect(firstVehicle.stopBehavior.stopZoneOffsetsMeters).toEqual([-220, -176, -132, -88, -44, 0, 44, 88, 132, 176, 220]);
  expect(detailedStreetVehicle).toMatchObject({
    roadId: 'road-v-6',
    laneId: 'road-v-6-lane-2',
    route: {
      spawnNodeId: 'intersection-v6-h12',
      destinationNodeId: 'intersection-v6-h0'
    }
  });
  expect(validateTraffic(firstCity, firstTraffic).issues).toEqual([]);
});

test('traffic validation rejects vehicles with invalid lane, route, speed, and hooks', () => {
  const city = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(city);
  const [vehicle] = traffic.vehicles;
  const invalidTraffic = {
    ...traffic,
    markings: traffic.markings.map((marking, index) =>
      index === 0
        ? {
            ...marking,
            id: 'lane marking bad id'
          }
        : marking
    ),
    vehicles: traffic.vehicles.map((candidate) =>
      candidate.id === vehicle.id
        ? {
            ...candidate,
            laneId: 'road-v-0-lane-2',
            speedLimitKph: 10,
            route: {
              ...candidate.route,
              nodeIds: ['intersection-v0-h0', 'intersection-v1-h0'],
              destinationNodeId: 'intersection-v1-h0'
            },
            stopBehavior: {
              ...candidate.stopBehavior,
              stopZoneOffsetsMeters: [999]
            },
            incidentHookIds: []
          }
        : candidate.id === 'traffic-vehicle-1'
          ? {
              ...candidate,
              id: 'traffic vehicle bad id'
            }
        : candidate
    )
  };
  const validation = validateTraffic(city, invalidTraffic);

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: `traffic-vehicle-lane-direction-mismatch-${vehicle.id}`,
        severity: 'error',
        category: 'simulation',
        objectId: vehicle.id
      }),
      expect.objectContaining({
        id: `traffic-vehicle-route-node-mismatch-${vehicle.id}-intersection-v1-h0`,
        severity: 'error',
        category: 'simulation',
        objectId: vehicle.id
      }),
      expect.objectContaining({
        id: `traffic-vehicle-speed-profile-mismatch-${vehicle.id}`,
        severity: 'error',
        category: 'simulation',
        objectId: vehicle.id
      }),
      expect.objectContaining({
        id: `invalid-traffic-vehicle-route-${vehicle.id}`,
        severity: 'error',
        category: 'simulation',
        objectId: vehicle.id
      }),
      expect.objectContaining({
        id: 'invalid-id-pattern-lane-marking-lane-marking-bad-id',
        severity: 'error',
        category: 'identifier',
        objectId: 'lane marking bad id'
      }),
      expect.objectContaining({
        id: 'invalid-id-pattern-traffic-vehicle-traffic-vehicle-bad-id',
        severity: 'error',
        category: 'identifier',
        objectId: 'traffic vehicle bad id'
      })
    ])
  );
});

test('browser traffic vehicles move along route offsets', async ({ page }) => {
  await page.goto('/?testMode=fast');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const sample = await page.evaluate(() => {
    const app = window.cityApp;
    const diagnostics = window.cityDiagnostics;
    const cityApp = app as unknown as { city?: { group: { getObjectByName(name: string): { position: { x: number; z: number } } | undefined } } };

    if (!app || !diagnostics) {
      return undefined;
    }

    const vehicle = diagnostics.objectIndex.objectsById['traffic-vehicle-0'];
    const mesh = cityApp.city?.group.getObjectByName('traffic-vehicle-0');

    if (!mesh) {
      return undefined;
    }

    const before = { x: mesh.position.x, z: mesh.position.z };

    return {
      vehicle,
      before
    };
  });

  expect(sample).toMatchObject({
    vehicle: {
      roadId: 'road-v-0',
      laneId: 'road-v-0-lane-1',
      route: {
        spawnNodeId: 'intersection-v0-h0',
        destinationNodeId: 'intersection-v0-h12'
      }
    }
  });
  const before = sample?.before ?? { x: 0, z: 0 };
  await expect
    .poll(
      () =>
        page.evaluate((start) => {
          const app = window.cityApp as unknown as {
            city?: { group: { getObjectByName(name: string): { position: { x: number; z: number } } | undefined } };
          };
          const mesh = app.city?.group.getObjectByName('traffic-vehicle-0');

          return mesh ? Math.abs(mesh.position.z - start.z) : 0;
        }, before),
      { timeout: 10_000 }
    )
    .toBeGreaterThan(1);
  const after = await page.evaluate(() => {
    const app = window.cityApp as unknown as {
      city?: { group: { getObjectByName(name: string): { position: { x: number; z: number } } | undefined } };
    };
    const mesh = app.city?.group.getObjectByName('traffic-vehicle-0');

    return mesh ? { x: mesh.position.x, z: mesh.position.z } : undefined;
  });

  expect(after?.x).toBeCloseTo(before.x, 5);
});

function createTraffic(city: ReturnType<CityGenerator['generate']>) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections
  });
}

function validateTraffic(
  city: ReturnType<CityGenerator['generate']>,
  traffic: ReturnType<TrafficLaneGenerator['create']>
) {
  return validateTrafficPlan({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections,
    assetBindings: city.assetBindings,
    traffic
  });
}
