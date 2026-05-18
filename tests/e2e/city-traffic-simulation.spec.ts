import { expect, test } from '@playwright/test';
import * as THREE from 'three';
import { TrafficSimulationSystem, type SimulatedVehicle } from '../../src/systems/traffic/TrafficSimulationSystem';
import type { TrafficVehicleRuntimeState } from '../../src/city/data-contracts/trafficRuntimeState';

function createTestVehicleRuntimeState(
  overrides: Partial<TrafficVehicleRuntimeState> = {}
): TrafficVehicleRuntimeState {
  return {
    vehicleId: 'test-vehicle',
    currentRouteOffsetMeters: -50,
    currentSpeedMetersPerSecond: 10,
    targetSpeedMetersPerSecond: 10,
    behaviorState: 'cruising',
    stopTimerSeconds: 0,
    lastStopZoneIndex: undefined,
    laneChangeState: {
      kind: 'idle',
      currentLaneId: 'test-lane',
      targetLaneId: undefined,
      progress: 0,
      cooldownSeconds: 0,
      lateralOffsetMeters: 0
    },
    signalState: {
      kind: 'uncontrolled',
      signalId: undefined,
      waitTimeSeconds: 0
    },
    replaySeed: 'seed:test',
    ...overrides
  };
}

function createSimulatedVehicle(overrides: Partial<SimulatedVehicle> = {}): SimulatedVehicle {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  return {
    mesh,
    axis: 'z',
    direction: 1,
    min: -100,
    max: 100,
    centerCoordinate: 0,
    fixedCoordinate: 50,
    stopZoneOffsetsMeters: [],
    stopDurationSeconds: 2,
    stopLookAheadMeters: 10,
    accelerationMetersPerSecondSq: 2,
    brakingMetersPerSecondSq: 4,
    stopToleranceMeters: 0.5,
    speedLimitMetersPerSecond: 20,
    runtime: createTestVehicleRuntimeState(),
    ...overrides
  };
}

test('traffic simulation system advances vehicles along their route', () => {
  const system = new TrafficSimulationSystem();
  const vehicle = createSimulatedVehicle();

  const initialOffset = vehicle.runtime.currentRouteOffsetMeters;
  expect(initialOffset).toBe(-50);

  system.addVehicles([vehicle]);
  system.update(1);

  expect(vehicle.runtime.currentRouteOffsetMeters).toBe(-40);
  expect(vehicle.runtime.currentSpeedMetersPerSecond).toBe(10);
  expect(vehicle.runtime.behaviorState).toBe('cruising');
  expect(vehicle.mesh.position.z).toBe(-40);
  expect(vehicle.mesh.position.x).toBe(50);
});

test('traffic simulation system wraps vehicle position at route bounds', () => {
  const system = new TrafficSimulationSystem();
  const vehicle = createSimulatedVehicle({
    runtime: createTestVehicleRuntimeState({ currentRouteOffsetMeters: 95 })
  });

  system.addVehicles([vehicle]);
  system.update(1);

  expect(vehicle.runtime.currentRouteOffsetMeters).toBeLessThanOrEqual(vehicle.max);
  expect(vehicle.runtime.lastStopZoneIndex).toBeUndefined();
});

test('traffic simulation system stops vehicle at stop zone', () => {
  const system = new TrafficSimulationSystem();
  const vehicle = createSimulatedVehicle({
    stopZoneOffsetsMeters: [0, 50],
    runtime: createTestVehicleRuntimeState({ currentRouteOffsetMeters: -5 })
  });

  system.addVehicles([vehicle]);
  system.update(1);

  expect(vehicle.runtime.currentRouteOffsetMeters).toBeCloseTo(-0.5, 1);
  expect(vehicle.runtime.currentSpeedMetersPerSecond).toBe(0);
  expect(vehicle.runtime.behaviorState).toBe('stopped');
  expect(vehicle.runtime.stopTimerSeconds).toBe(2);
  expect(vehicle.runtime.lastStopZoneIndex).toBe(0);
});

test('traffic simulation system counts down stop timer and resumes with acceleration', () => {
  const system = new TrafficSimulationSystem();
  const vehicle = createSimulatedVehicle({
    stopZoneOffsetsMeters: [0, 50],
    runtime: createTestVehicleRuntimeState({ currentRouteOffsetMeters: -5 })
  });

  system.addVehicles([vehicle]);

  system.update(1);
  expect(vehicle.runtime.stopTimerSeconds).toBe(2);
  expect(vehicle.runtime.behaviorState).toBe('stopped');

  system.update(1);
  expect(vehicle.runtime.stopTimerSeconds).toBe(1);
  expect(vehicle.runtime.behaviorState).toBe('stopped');

  // Timer reaches 0, but state remains 'stopped' until next update (early return from timer branch)
  system.update(1);
  expect(vehicle.runtime.stopTimerSeconds).toBe(0);
  expect(vehicle.runtime.behaviorState).toBe('stopped');

  // Next update resumes with acceleration (easing into motion)
  system.update(1);
  expect(vehicle.runtime.behaviorState).toBe('accelerating');
  expect(vehicle.runtime.currentSpeedMetersPerSecond).toBeCloseTo(2, 1);

  // Continue accelerating toward target speed
  system.update(1);
  expect(vehicle.runtime.behaviorState).toBe('accelerating');
  expect(vehicle.runtime.currentSpeedMetersPerSecond).toBeCloseTo(4, 1);

  system.update(4);
  expect(vehicle.runtime.behaviorState).toBe('cruising');
  expect(vehicle.runtime.currentSpeedMetersPerSecond).toBeCloseTo(10, 1);
});

test('traffic simulation system handles x-axis vehicles', () => {
  const system = new TrafficSimulationSystem();
  const vehicle = createSimulatedVehicle({
    axis: 'x',
    direction: -1,
    fixedCoordinate: 25,
    runtime: createTestVehicleRuntimeState({ currentRouteOffsetMeters: 50 })
  });

  system.addVehicles([vehicle]);
  system.update(1);

  expect(vehicle.runtime.currentRouteOffsetMeters).toBe(40);
  expect(vehicle.mesh.position.x).toBe(40);
  expect(vehicle.mesh.position.z).toBe(25);
});

test('traffic simulation system accelerates from rest toward target speed', () => {
  const system = new TrafficSimulationSystem();
  const vehicle = createSimulatedVehicle({
    accelerationMetersPerSecondSq: 2,
    brakingMetersPerSecondSq: 4,
    stopToleranceMeters: 0.5,
    speedLimitMetersPerSecond: 20,
    runtime: createTestVehicleRuntimeState({
      currentSpeedMetersPerSecond: 0,
      targetSpeedMetersPerSecond: 10
    })
  });

  system.addVehicles([vehicle]);
  system.update(1);

  expect(vehicle.runtime.currentSpeedMetersPerSecond).toBeCloseTo(2, 1);
  expect(vehicle.runtime.behaviorState).toBe('accelerating');

  system.update(1);
  expect(vehicle.runtime.currentSpeedMetersPerSecond).toBeCloseTo(4, 1);

  system.update(4);
  expect(vehicle.runtime.currentSpeedMetersPerSecond).toBeCloseTo(10, 1);
  expect(vehicle.runtime.behaviorState).toBe('cruising');
});

test('traffic simulation system clamps target speed to speed limit', () => {
  const system = new TrafficSimulationSystem();
  const vehicle = createSimulatedVehicle({
    accelerationMetersPerSecondSq: 2,
    brakingMetersPerSecondSq: 4,
    stopToleranceMeters: 0.5,
    speedLimitMetersPerSecond: 8,
    runtime: createTestVehicleRuntimeState({
      currentSpeedMetersPerSecond: 0,
      targetSpeedMetersPerSecond: 15
    })
  });

  system.addVehicles([vehicle]);
  system.update(5);

  expect(vehicle.runtime.currentSpeedMetersPerSecond).toBeCloseTo(8, 1);
  expect(vehicle.runtime.behaviorState).toBe('cruising');
});

test('traffic simulation system brakes before stop zone', () => {
  const system = new TrafficSimulationSystem();
  const vehicle = createSimulatedVehicle({
    accelerationMetersPerSecondSq: 3,
    brakingMetersPerSecondSq: 5,
    stopToleranceMeters: 1,
    speedLimitMetersPerSecond: 20,
    stopZoneOffsetsMeters: [0],
    stopLookAheadMeters: 15,
    runtime: createTestVehicleRuntimeState({
      currentRouteOffsetMeters: -10,
      currentSpeedMetersPerSecond: 10,
      targetSpeedMetersPerSecond: 10
    })
  });

  system.addVehicles([vehicle]);

  // Small tick: vehicle should brake before reaching stop point
  system.update(0.1);
  expect(vehicle.runtime.behaviorState).toBe('braking');
  expect(vehicle.runtime.currentSpeedMetersPerSecond).toBeLessThan(10);
  expect(vehicle.runtime.currentSpeedMetersPerSecond).toBeGreaterThan(0);
  expect(vehicle.runtime.currentRouteOffsetMeters).toBeGreaterThan(-10);
  expect(vehicle.runtime.currentRouteOffsetMeters).toBeLessThan(-1);

  // Continue small ticks until stopped
  let iterations = 0;
  while (vehicle.runtime.behaviorState !== 'stopped' && iterations < 200) {
    system.update(0.1);
    iterations += 1;
  }

  expect(vehicle.runtime.behaviorState).toBe('stopped');
  expect(vehicle.runtime.currentSpeedMetersPerSecond).toBe(0);
  expect(vehicle.runtime.currentRouteOffsetMeters).toBeCloseTo(-1, 0);
});

test('traffic simulation system uses stop tolerance for precise stopping', () => {
  const system = new TrafficSimulationSystem();
  const vehicle = createSimulatedVehicle({
    accelerationMetersPerSecondSq: 2,
    brakingMetersPerSecondSq: 4,
    stopToleranceMeters: 0.3,
    speedLimitMetersPerSecond: 20,
    stopZoneOffsetsMeters: [10],
    stopLookAheadMeters: 15,
    runtime: createTestVehicleRuntimeState({
      currentRouteOffsetMeters: 5,
      currentSpeedMetersPerSecond: 0,
      targetSpeedMetersPerSecond: 5
    })
  });

  system.addVehicles([vehicle]);

  while (vehicle.runtime.behaviorState !== 'stopped') {
    system.update(0.1);
    if (vehicle.runtime.currentRouteOffsetMeters > 20) break;
  }

  expect(vehicle.runtime.currentRouteOffsetMeters).toBeCloseTo(9.7, 0);
  expect(vehicle.runtime.currentSpeedMetersPerSecond).toBe(0);
});

test('traffic simulation system preserves wrap-around behavior with acceleration', () => {
  const system = new TrafficSimulationSystem();
  const vehicle = createSimulatedVehicle({
    accelerationMetersPerSecondSq: 2,
    brakingMetersPerSecondSq: 4,
    stopToleranceMeters: 0.5,
    speedLimitMetersPerSecond: 20,
    runtime: createTestVehicleRuntimeState({
      currentRouteOffsetMeters: 95,
      currentSpeedMetersPerSecond: 8,
      targetSpeedMetersPerSecond: 10
    })
  });

  system.addVehicles([vehicle]);
  system.update(1);

  expect(vehicle.runtime.currentRouteOffsetMeters).toBeLessThanOrEqual(vehicle.max);
  expect(vehicle.runtime.lastStopZoneIndex).toBeUndefined();

  if (vehicle.runtime.currentRouteOffsetMeters <= vehicle.max) {
    vehicle.runtime.currentRouteOffsetMeters = 98;
    system.update(1);

    expect(vehicle.runtime.currentRouteOffsetMeters).toBe(vehicle.min);
    expect(vehicle.runtime.lastStopZoneIndex).toBeUndefined();
  }
});

test('traffic simulation system brakes from excessive target speed', () => {
  const system = new TrafficSimulationSystem();
  const vehicle = createSimulatedVehicle({
    accelerationMetersPerSecondSq: 2,
    brakingMetersPerSecondSq: 5,
    stopToleranceMeters: 0.5,
    speedLimitMetersPerSecond: 15,
    runtime: createTestVehicleRuntimeState({
      currentSpeedMetersPerSecond: 10,
      targetSpeedMetersPerSecond: 5
    })
  });

  system.addVehicles([vehicle]);
  system.update(1);

  expect(vehicle.runtime.currentSpeedMetersPerSecond).toBeCloseTo(5, 1);
  expect(vehicle.runtime.behaviorState).toBe('braking');

  vehicle.runtime.targetSpeedMetersPerSecond = 20;
  vehicle.runtime.currentSpeedMetersPerSecond = 10;
  system.update(1);

  expect(vehicle.runtime.currentSpeedMetersPerSecond).toBeCloseTo(12, 1);
  expect(vehicle.runtime.behaviorState).toBe('accelerating');
});

test('traffic simulation system clamps existing over-limit runtime speed to speed limit', () => {
  const system = new TrafficSimulationSystem();
  const vehicle = createSimulatedVehicle({
    accelerationMetersPerSecondSq: 2,
    brakingMetersPerSecondSq: 5,
    stopToleranceMeters: 0.5,
    speedLimitMetersPerSecond: 8,
    runtime: createTestVehicleRuntimeState({
      currentRouteOffsetMeters: -50,
      currentSpeedMetersPerSecond: 30,
      targetSpeedMetersPerSecond: 30
    })
  });

  system.addVehicles([vehicle]);

  const initialOffset = vehicle.runtime.currentRouteOffsetMeters;
  expect(initialOffset).toBe(-50);
  expect(vehicle.runtime.currentSpeedMetersPerSecond).toBe(30);

  // First update: speed should be clamped to speed limit (8) before movement
  system.update(1);

  // Speed must not exceed speed limit
  expect(vehicle.runtime.currentSpeedMetersPerSecond).toBeLessThanOrEqual(8);
  // Behavior should reflect braking since we were clamped down
  expect(vehicle.runtime.behaviorState).toBe('braking');
  // Movement distance must be based on speed-limit-capped speed (at most 8 meters)
  expect(vehicle.runtime.currentRouteOffsetMeters).toBeLessThanOrEqual(-42);
  expect(vehicle.runtime.currentRouteOffsetMeters).toBeGreaterThan(-50);
});
