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

  expect(vehicle.runtime.currentRouteOffsetMeters).toBeCloseTo(-1.8, 1);
  expect(vehicle.runtime.currentSpeedMetersPerSecond).toBe(0);
  expect(vehicle.runtime.behaviorState).toBe('stopped');
  expect(vehicle.runtime.stopTimerSeconds).toBe(2);
  expect(vehicle.runtime.lastStopZoneIndex).toBe(0);
});

test('traffic simulation system counts down stop timer and resumes', () => {
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

  // Next update resumes cruising
  system.update(1);
  expect(vehicle.runtime.behaviorState).toBe('cruising');
  expect(vehicle.runtime.currentSpeedMetersPerSecond).toBe(10);
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
