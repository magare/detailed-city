import * as THREE from 'three';
import type { TrafficVehicleRuntimeState } from '../../city/data-contracts/trafficRuntimeState';
import type { Updatable } from '../../types/city';

export interface SimulatedVehicle {
  mesh: THREE.Mesh;
  axis: 'x' | 'z';
  direction: 1 | -1;
  min: number;
  max: number;
  centerCoordinate: number;
  fixedCoordinate: number;
  stopZoneOffsetsMeters: readonly number[];
  stopDurationSeconds: number;
  stopLookAheadMeters: number;
  runtime: TrafficVehicleRuntimeState;
}

export class TrafficSimulationSystem implements Updatable {
  private readonly vehicles: SimulatedVehicle[] = [];

  addVehicles(vehicles: readonly SimulatedVehicle[]): void {
    this.vehicles.push(...vehicles);
  }

  update(deltaSeconds: number): void {
    for (const vehicle of this.vehicles) {
      this.updateVehicle(vehicle, deltaSeconds);
    }
  }

  private updateVehicle(vehicle: SimulatedVehicle, deltaSeconds: number): void {
    const runtime = vehicle.runtime;

    if (runtime.stopTimerSeconds > 0) {
      runtime.stopTimerSeconds = Math.max(0, runtime.stopTimerSeconds - deltaSeconds);
      if (runtime.currentSpeedMetersPerSecond !== 0) {
        runtime.currentSpeedMetersPerSecond = 0;
        runtime.behaviorState = 'stopped';
      }
      return;
    }

    const stopZoneIndex = this.getUpcomingStopZoneIndex(vehicle);

    if (stopZoneIndex !== undefined) {
      const stopOffset = vehicle.stopZoneOffsetsMeters[stopZoneIndex];
      runtime.currentRouteOffsetMeters = stopOffset - vehicle.direction * 1.8;
      runtime.stopTimerSeconds = vehicle.stopDurationSeconds;
      runtime.lastStopZoneIndex = stopZoneIndex;
      runtime.currentSpeedMetersPerSecond = 0;
      runtime.behaviorState = 'stopped';
      this.applyVehiclePosition(vehicle);
      return;
    }

    const previousStoppedOffset =
      runtime.lastStopZoneIndex === undefined ? undefined : vehicle.stopZoneOffsetsMeters[runtime.lastStopZoneIndex];

    if (
      previousStoppedOffset !== undefined &&
      (previousStoppedOffset - runtime.currentRouteOffsetMeters) * vehicle.direction < -vehicle.stopLookAheadMeters
    ) {
      runtime.lastStopZoneIndex = undefined;
    }

    if (runtime.currentSpeedMetersPerSecond !== runtime.targetSpeedMetersPerSecond) {
      runtime.currentSpeedMetersPerSecond = runtime.targetSpeedMetersPerSecond;
    }

    runtime.currentRouteOffsetMeters += vehicle.direction * runtime.currentSpeedMetersPerSecond * deltaSeconds;

    if (runtime.currentRouteOffsetMeters > vehicle.max) {
      runtime.currentRouteOffsetMeters = vehicle.min;
      runtime.lastStopZoneIndex = undefined;
    } else if (runtime.currentRouteOffsetMeters < vehicle.min) {
      runtime.currentRouteOffsetMeters = vehicle.max;
      runtime.lastStopZoneIndex = undefined;
    }

    runtime.behaviorState = 'cruising';
    this.applyVehiclePosition(vehicle);
  }

  private getUpcomingStopZoneIndex(vehicle: SimulatedVehicle): number | undefined {
    for (let index = 0; index < vehicle.stopZoneOffsetsMeters.length; index += 1) {
      if (vehicle.runtime.lastStopZoneIndex === index) {
        continue;
      }

      const stopOffset = vehicle.stopZoneOffsetsMeters[index];
      const distanceMeters = (stopOffset - vehicle.runtime.currentRouteOffsetMeters) * vehicle.direction;

      if (distanceMeters >= 0 && distanceMeters <= vehicle.stopLookAheadMeters) {
        return index;
      }
    }

    return undefined;
  }

  private applyVehiclePosition(vehicle: SimulatedVehicle): void {
    const routeCoordinate = vehicle.centerCoordinate + vehicle.runtime.currentRouteOffsetMeters;

    if (vehicle.axis === 'x') {
      vehicle.mesh.position.x = routeCoordinate;
      vehicle.mesh.position.z = vehicle.fixedCoordinate;
    } else {
      vehicle.mesh.position.x = vehicle.fixedCoordinate;
      vehicle.mesh.position.z = routeCoordinate;
    }
  }
}
