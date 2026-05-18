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
  accelerationMetersPerSecondSq: number;
  brakingMetersPerSecondSq: number;
  stopToleranceMeters: number;
  speedLimitMetersPerSecond: number;
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

    // Stop timer: if we're waiting at a stop, count down and stay stopped
    if (runtime.stopTimerSeconds > 0) {
      runtime.stopTimerSeconds = Math.max(0, runtime.stopTimerSeconds - deltaSeconds);
      if (runtime.currentSpeedMetersPerSecond !== 0) {
        runtime.currentSpeedMetersPerSecond = 0;
        runtime.behaviorState = 'stopped';
      }
      return;
    }

    // Clear lastStopZoneIndex if we've moved far enough past it (in the forward direction)
    const previousStoppedOffset =
      runtime.lastStopZoneIndex === undefined ? undefined : vehicle.stopZoneOffsetsMeters[runtime.lastStopZoneIndex];

    if (
      previousStoppedOffset !== undefined &&
      (previousStoppedOffset - runtime.currentRouteOffsetMeters) * vehicle.direction < -vehicle.stopLookAheadMeters
    ) {
      runtime.lastStopZoneIndex = undefined;
    }

    // Determine our desired speed based on speed limit and any upcoming stops
    const speedLimitCappedTargetSpeed = Math.min(runtime.targetSpeedMetersPerSecond, vehicle.speedLimitMetersPerSecond);
    let desiredSpeed = speedLimitCappedTargetSpeed;
    const upcomingStopIndex = this.getUpcomingStopZoneIndex(vehicle);
    let upcomingStopPoint: number | undefined;

    if (upcomingStopIndex !== undefined) {
      const stopOffset = vehicle.stopZoneOffsetsMeters[upcomingStopIndex];
      // Compute the deterministic stop point (offset adjusted by tolerance in opposite direction of travel)
      upcomingStopPoint = stopOffset - vehicle.direction * vehicle.stopToleranceMeters;
      // Positive distance to stop point along the vehicle's direction of travel
      const distanceToStopPoint = (upcomingStopPoint - runtime.currentRouteOffsetMeters) * vehicle.direction;

      // If we're at or past the stop point, stop immediately
      if (distanceToStopPoint <= 0) {
        runtime.currentRouteOffsetMeters = upcomingStopPoint;
        runtime.stopTimerSeconds = vehicle.stopDurationSeconds;
        runtime.lastStopZoneIndex = upcomingStopIndex;
        runtime.currentSpeedMetersPerSecond = 0;
        runtime.behaviorState = 'stopped';
        this.applyVehiclePosition(vehicle);
        return;
      }

      // Otherwise, compute stop-safe speed cap: sqrt(2 * braking * distance)
      // This is the maximum speed that allows stopping at the stop point
      if (distanceToStopPoint > 0) {
        const stopSafeSpeedCap = Math.sqrt(2 * vehicle.brakingMetersPerSecondSq * distanceToStopPoint);
        desiredSpeed = Math.min(desiredSpeed, stopSafeSpeedCap);
      }
    }

    // Now apply acceleration or braking toward desired speed
    const currentSpeed = runtime.currentSpeedMetersPerSecond;

    if (currentSpeed < desiredSpeed) {
      // Accelerate
      const accelerateAmount = vehicle.accelerationMetersPerSecondSq * deltaSeconds;
      runtime.currentSpeedMetersPerSecond = Math.min(desiredSpeed, currentSpeed + accelerateAmount);
      runtime.behaviorState = runtime.currentSpeedMetersPerSecond < desiredSpeed ? 'accelerating' : 'cruising';
    } else if (currentSpeed > desiredSpeed) {
      // Brake
      const brakeAmount = vehicle.brakingMetersPerSecondSq * deltaSeconds;
      runtime.currentSpeedMetersPerSecond = Math.max(desiredSpeed, currentSpeed - brakeAmount);
      runtime.behaviorState = 'braking';
    } else {
      // Cruising at desired speed
      runtime.behaviorState = desiredSpeed > 0 ? 'cruising' : 'stopped';
    }

    // Clamp current speed to speed limit to prevent movement over limit
    const speedBeforeClamp = runtime.currentSpeedMetersPerSecond;
    runtime.currentSpeedMetersPerSecond = Math.min(runtime.currentSpeedMetersPerSecond, vehicle.speedLimitMetersPerSecond);

    // If we clamped down from over limit, behavior is braking (unless we snapped to a stop)
    const wasClampedDown = speedBeforeClamp > vehicle.speedLimitMetersPerSecond;
    if (wasClampedDown && runtime.currentSpeedMetersPerSecond > 0) {
      runtime.behaviorState = 'braking';
    }

    // Before applying movement, prevent overshooting the stop point
    if (upcomingStopPoint !== undefined && runtime.currentSpeedMetersPerSecond > 0) {
      const plannedTravel = vehicle.direction * runtime.currentSpeedMetersPerSecond * deltaSeconds;
      const distanceToStopPoint = (upcomingStopPoint - runtime.currentRouteOffsetMeters) * vehicle.direction;

      // If travel would reach or pass the stop point, snap to it
      if (plannedTravel * vehicle.direction >= distanceToStopPoint) {
        runtime.currentRouteOffsetMeters = upcomingStopPoint;
        runtime.stopTimerSeconds = vehicle.stopDurationSeconds;
        runtime.lastStopZoneIndex = upcomingStopIndex;
        runtime.currentSpeedMetersPerSecond = 0;
        runtime.behaviorState = 'stopped';
        this.applyVehiclePosition(vehicle);
        return;
      }
    }

    // Apply normal movement
    runtime.currentRouteOffsetMeters += vehicle.direction * runtime.currentSpeedMetersPerSecond * deltaSeconds;

    // Wrap-around at route bounds
    if (runtime.currentRouteOffsetMeters > vehicle.max) {
      runtime.currentRouteOffsetMeters = vehicle.min;
      runtime.lastStopZoneIndex = undefined;
    } else if (runtime.currentRouteOffsetMeters < vehicle.min) {
      runtime.currentRouteOffsetMeters = vehicle.max;
      runtime.lastStopZoneIndex = undefined;
    }

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
