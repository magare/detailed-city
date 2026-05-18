import { expect, test } from '@playwright/test';
import { validateTrafficPlan } from '../../src/city/data-contracts/validation/validateTrafficPlan';
import { cityConfig } from '../../src/config/cityConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('traffic vehicles reference lanes, route nodes, stop zones, profile speeds, and vehicle taxonomy', () => {
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
    speed: 9.44,
    speedLimitKph: 40,
    routeOffsetMeters: -253,
    route: {
      spawnNodeId: 'intersection-v0-h0',
      destinationNodeId: 'intersection-v0-h12',
      startOffsetMeters: -264,
      endOffsetMeters: 264,
      lengthMeters: 528
    },
    incidentHookIds: ['incident-hook:road-v-0:route-choice', 'incident-hook:road-v-0:stop-control'],
    vehicleClass: 'car',
    dimensions: {
      lengthMeters: 4.8,
      widthMeters: 2.05,
      heightMeters: 1.45,
      wheelbaseMeters: 2.8
    },
    passengerCapacity: 5,
    cargoCapacityKg: 500,
    behaviorProfile: {
      maxSpeedKph: 180,
      preferredSpeedFraction: 0.85,
      accelerationMetersPerSecondSq: 2.5,
      brakingMetersPerSecondSq: 4.5,
      comfortableDecelerationMetersPerSecondSq: 2.0,
      minFollowingDistanceMeters: 2.0,
      reactionTimeSeconds: 0.75,
      turnSpeedReduction: 0.6,
      stopToleranceMeters: 0.5
    },
    dynamics: {
      maxSpeedKph: 180,
      preferredSpeedKph: 34,
      accelerationMetersPerSecondSq: 2.5,
      brakingMetersPerSecondSq: 4.5,
      comfortableDecelerationMetersPerSecondSq: 2.0,
      minFollowingDistanceMeters: 2.0,
      reactionTimeSeconds: 0.75,
      turnSpeedKph: 20.4,
      stopToleranceMeters: 0.5
    },
    assetBindingId: 'binding:vehicle:traffic-car',
    visualVariantTags: ['sedan', 'hatchback', 'coupe']
  });
  expect(firstVehicle.route.nodeIds).toHaveLength(13);
  expect(firstVehicle.stopBehavior.stopZoneOffsetsMeters).toEqual([-220, -176, -132, -88, -44, 0, 44, 88, 132, 176, 220]);
  expect(firstVehicle.tags).toMatchObject({
    vehicleClass: 'car'
  });
  expect(detailedStreetVehicle).toMatchObject({
    roadId: 'road-v-6',
    laneId: 'road-v-6-lane-2',
    route: {
      spawnNodeId: 'intersection-v6-h12',
      destinationNodeId: 'intersection-v6-h0'
    },
    vehicleClass: expect.any(String),
    dimensions: expect.objectContaining({
      lengthMeters: expect.any(Number),
      widthMeters: expect.any(Number),
      heightMeters: expect.any(Number),
      wheelbaseMeters: expect.any(Number)
    }),
    behaviorProfile: expect.any(Object),
    assetBindingId: expect.any(String),
    visualVariantTags: expect.any(Array)
  });
  expect(validateTraffic(firstCity, firstTraffic).issues).toEqual([]);

  const generatedClasses = firstTraffic.vehicles.map((vehicle) => vehicle.vehicleClass);
  expect(generatedClasses).toEqual(['car', 'taxi', 'van', 'delivery-truck', 'car', 'taxi', 'van']);
  expect(generatedClasses).not.toContain('bus');
  expect(generatedClasses).not.toContain('heavy-truck');
  expect(generatedClasses).not.toContain('service-vehicle');
  expect(generatedClasses).not.toContain('emergency-vehicle');
  expect(generatedClasses).not.toContain('parked-vehicle');

  expect(firstTraffic.vehicles.every((vehicle) => Array.isArray(vehicle.visualVariantTags) && vehicle.visualVariantTags.length > 0)).toBe(true);
});

test('traffic validation rejects vehicles with invalid lane, route, speed, hooks, and taxonomy fields', () => {
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
            incidentHookIds: [],
            vehicleClass: 'invalid-class' as any,
            dimensions: {
              lengthMeters: -1,
              widthMeters: 0,
              heightMeters: 0,
              wheelbaseMeters: 10
            },
            passengerCapacity: -1,
            cargoCapacityKg: -1,
            behaviorProfile: {
              maxSpeedKph: 0,
              preferredSpeedFraction: 2,
              accelerationMetersPerSecondSq: 0,
              brakingMetersPerSecondSq: 0,
              comfortableDecelerationMetersPerSecondSq: 0,
              minFollowingDistanceMeters: -1,
              reactionTimeSeconds: -1,
              turnSpeedReduction: 2,
              stopToleranceMeters: -1
            },
            assetBindingId: 'binding:invalid:asset'
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
        id: `invalid-traffic-vehicle-class-${vehicle.id}`,
        severity: 'error',
        category: 'simulation',
        objectId: vehicle.id
      }),
      expect.objectContaining({
        id: `invalid-traffic-vehicle-dimensions-${vehicle.id}`,
        severity: 'error',
        category: 'geometry',
        objectId: vehicle.id
      }),
      expect.objectContaining({
        id: `invalid-traffic-vehicle-passenger-capacity-${vehicle.id}`,
        severity: 'error',
        category: 'simulation',
        objectId: vehicle.id
      }),
      expect.objectContaining({
        id: `invalid-traffic-vehicle-cargo-capacity-${vehicle.id}`,
        severity: 'error',
        category: 'simulation',
        objectId: vehicle.id
      }),
      expect.objectContaining({
        id: `invalid-traffic-vehicle-behavior-profile-${vehicle.id}`,
        severity: 'error',
        category: 'simulation',
        objectId: vehicle.id
      }),
      expect.objectContaining({
        id: `invalid-traffic-vehicle-asset-binding-${vehicle.id}`,
        severity: 'error',
        category: 'asset',
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

test('traffic validation rejects known class with mismatched profile, non-finite values, and invalid visual variant tags', () => {
  const city = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(city);
  const vehicle = traffic.vehicles.find((candidate) => candidate.id === 'traffic-vehicle-1')!;
  const mismatchedTraffic = {
    ...traffic,
    vehicles: traffic.vehicles.map((candidate) =>
      candidate.id === vehicle.id
        ? {
            ...candidate,
            vehicleClass: 'car' as const,
            dimensions: {
              lengthMeters: Number.NaN,
              widthMeters: Number.POSITIVE_INFINITY,
              heightMeters: 10,
              wheelbaseMeters: 5
            },
            passengerCapacity: Number.NEGATIVE_INFINITY,
            cargoCapacityKg: Number.NaN,
            behaviorProfile: {
              maxSpeedKph: Number.POSITIVE_INFINITY,
              preferredSpeedFraction: 0.5,
              accelerationMetersPerSecondSq: 2.5,
              brakingMetersPerSecondSq: 4.5,
              comfortableDecelerationMetersPerSecondSq: 2.0,
              minFollowingDistanceMeters: 2.0,
              reactionTimeSeconds: 0.75,
              turnSpeedReduction: 0.6,
              stopToleranceMeters: 0.5
            },
            assetBindingId: 'binding:vehicle:traffic-car',
            visualVariantTags: ['  ', '']
          }
        : candidate
    )
  };
  const validation = validateTraffic(city, mismatchedTraffic);

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: `traffic-vehicle-profile-mismatch-${vehicle.id}`,
        severity: 'error',
        category: 'simulation',
        objectId: vehicle.id
      }),
      expect.objectContaining({
        id: `traffic-vehicle-dimensions-mismatch-${vehicle.id}`,
        severity: 'error',
        category: 'simulation',
        objectId: vehicle.id
      }),
      expect.objectContaining({
        id: `traffic-vehicle-capacity-mismatch-${vehicle.id}`,
        severity: 'error',
        category: 'simulation',
        objectId: vehicle.id
      }),
      expect.objectContaining({
        id: `traffic-vehicle-visual-variant-tags-mismatch-${vehicle.id}`,
        severity: 'error',
        category: 'simulation',
        objectId: vehicle.id
      }),
      expect.objectContaining({
        id: `invalid-traffic-vehicle-dimensions-${vehicle.id}`,
        severity: 'error',
        category: 'geometry',
        objectId: vehicle.id
      }),
      expect.objectContaining({
        id: `invalid-traffic-vehicle-passenger-capacity-${vehicle.id}`,
        severity: 'error',
        category: 'simulation',
        objectId: vehicle.id
      }),
      expect.objectContaining({
        id: `invalid-traffic-vehicle-cargo-capacity-${vehicle.id}`,
        severity: 'error',
        category: 'simulation',
        objectId: vehicle.id
      }),
      expect.objectContaining({
        id: `invalid-traffic-vehicle-behavior-profile-${vehicle.id}`,
        severity: 'error',
        category: 'simulation',
        objectId: vehicle.id
      }),
      expect.objectContaining({
        id: `invalid-traffic-vehicle-visual-variant-tags-${vehicle.id}`,
        severity: 'error',
        category: 'simulation',
        objectId: vehicle.id
      })
    ])
  );
});

test('traffic validation rejects visual variant tags with leading or trailing whitespace', () => {
  const city = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(city);
  const [vehicle] = traffic.vehicles;
  const invalidTagsTraffic = {
    ...traffic,
    vehicles: traffic.vehicles.map((candidate) =>
      candidate.id === vehicle.id
        ? {
            ...candidate,
            visualVariantTags: [' sedan ', 'hatchback', '  coupe  ']
          }
        : candidate
    )
  };
  const validation = validateTraffic(city, invalidTagsTraffic);

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: `invalid-traffic-vehicle-visual-variant-tags-${vehicle.id}`,
        severity: 'error',
        category: 'simulation',
        objectId: vehicle.id
      })
    ])
  );
});

test('traffic validation rejects invalid dynamics values', () => {
  const city = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(city);
  const [vehicle] = traffic.vehicles;
  const invalidDynamicsTraffic = {
    ...traffic,
    vehicles: traffic.vehicles.map((candidate) =>
      candidate.id === vehicle.id
        ? {
            ...candidate,
            dynamics: {
              maxSpeedKph: -1,
              preferredSpeedKph: 50,
              accelerationMetersPerSecondSq: 0,
              brakingMetersPerSecondSq: 1,
              comfortableDecelerationMetersPerSecondSq: 2,
              minFollowingDistanceMeters: -1,
              reactionTimeSeconds: -1,
              turnSpeedKph: 100,
              stopToleranceMeters: -0.1
            }
          }
        : candidate
    )
  };
  const validation = validateTraffic(city, invalidDynamicsTraffic);

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: `invalid-traffic-vehicle-dynamics-${vehicle.id}`,
        severity: 'error',
        category: 'simulation',
        objectId: vehicle.id
      }),
      expect.objectContaining({
        id: `traffic-vehicle-preferred-speed-exceeds-limit-${vehicle.id}`,
        severity: 'error',
        category: 'simulation',
        objectId: vehicle.id
      }),
      expect.objectContaining({
        id: `traffic-vehicle-turn-speed-exceeds-preferred-${vehicle.id}`,
        severity: 'error',
        category: 'simulation',
        objectId: vehicle.id
      })
    ])
  );
});

test('traffic validation rejects dynamics that do not match deterministic values from class profile', () => {
  const city = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(city);
  const [vehicle] = traffic.vehicles;
  const mismatchedDynamicsTraffic = {
    ...traffic,
    vehicles: traffic.vehicles.map((candidate) =>
      candidate.id === vehicle.id
        ? {
            ...candidate,
            dynamics: {
              maxSpeedKph: 180,
              preferredSpeedKph: 30,
              accelerationMetersPerSecondSq: 2.5,
              brakingMetersPerSecondSq: 4.5,
              comfortableDecelerationMetersPerSecondSq: 2.0,
              minFollowingDistanceMeters: 2.0,
              reactionTimeSeconds: 0.75,
              turnSpeedKph: 18,
              stopToleranceMeters: 0.5
            }
          }
        : candidate
    )
  };
  const validation = validateTraffic(city, mismatchedDynamicsTraffic);

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: `traffic-vehicle-dynamics-mismatch-${vehicle.id}`,
        severity: 'error',
        category: 'simulation',
        objectId: vehicle.id
      })
    ])
  );
});

test('traffic validation rejects non-finite dynamics values', () => {
  const city = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(city);
  const [vehicle] = traffic.vehicles;
  const nonFiniteDynamicsTraffic = {
    ...traffic,
    vehicles: traffic.vehicles.map((candidate) =>
      candidate.id === vehicle.id
        ? {
            ...candidate,
            dynamics: {
              maxSpeedKph: Number.NaN,
              preferredSpeedKph: Infinity,
              accelerationMetersPerSecondSq: 2.5,
              brakingMetersPerSecondSq: 4.5,
              comfortableDecelerationMetersPerSecondSq: 2.0,
              minFollowingDistanceMeters: 2.0,
              reactionTimeSeconds: 0.75,
              turnSpeedKph: 20.4,
              stopToleranceMeters: 0.5
            }
          }
        : candidate
    )
  };
  const validation = validateTraffic(city, nonFiniteDynamicsTraffic);

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: `invalid-traffic-vehicle-dynamics-${vehicle.id}`,
        severity: 'error',
        category: 'simulation',
        objectId: vehicle.id
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
    intersections: city.intersections,
    trafficCalmingDevices: city.trafficCalmingDevices
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
    trafficCalmingDevices: city.trafficCalmingDevices,
    assetBindings: city.assetBindings,
    traffic
  });
}
