import type { CityId } from './cityContracts';
import type { TrafficVehicleContract } from './cityContracts';

export type TrafficVehicleBehaviorState =
  | 'cruising'
  | 'accelerating'
  | 'braking'
  | 'stopped'
  | 'waiting'
  | 'yielding';

export interface TrafficVehicleLaneChangeState {
  kind: 'idle' | 'preparing' | 'changing-left' | 'changing-right' | 'aborted';
  currentLaneId: CityId;
  targetLaneId?: CityId;
  progress: number;
  cooldownSeconds: number;
  lateralOffsetMeters: number;
}

export interface TrafficVehicleSignalState {
  kind: 'uncontrolled' | 'clear' | 'stopping' | 'stopped-red' | 'stopped-stop' | 'stopped-yield' | 'proceeding';
  signalId?: CityId;
  waitTimeSeconds: number;
}

export interface TrafficVehicleRuntimeState {
  readonly vehicleId: CityId;
  currentRouteOffsetMeters: number;
  currentSpeedMetersPerSecond: number;
  targetSpeedMetersPerSecond: number;
  behaviorState: TrafficVehicleBehaviorState;
  stopTimerSeconds: number;
  lastStopZoneIndex: number | undefined;
  laneChangeState: TrafficVehicleLaneChangeState;
  signalState: TrafficVehicleSignalState;
  readonly replaySeed: string;
}

export interface TrafficRuntimeState {
  readonly vehicles: readonly TrafficVehicleRuntimeState[];
}

export interface TrafficRuntimeStateSource {
  readonly vehicles: readonly TrafficVehicleContract[];
}

function createIdleLaneChangeState(laneId: CityId): TrafficVehicleLaneChangeState {
  return {
    kind: 'idle',
    currentLaneId: laneId,
    targetLaneId: undefined,
    progress: 0,
    cooldownSeconds: 0,
    lateralOffsetMeters: 0
  };
}

function createUncontrolledSignalState(): TrafficVehicleSignalState {
  return {
    kind: 'uncontrolled',
    signalId: undefined,
    waitTimeSeconds: 0
  };
}

export function initializeTrafficVehicleRuntimeState(
  plan: Readonly<TrafficVehicleContract>
): TrafficVehicleRuntimeState {
  const vehicleId = plan.id;
  const seed = createDeterministicSeed(
    vehicleId,
    plan.roadId,
    plan.laneId,
    plan.routeOffsetMeters,
    plan.speed,
    plan.dynamics.preferredSpeedKph
  );

  return {
    vehicleId,
    currentRouteOffsetMeters: plan.routeOffsetMeters,
    currentSpeedMetersPerSecond: plan.speed,
    targetSpeedMetersPerSecond: plan.speed,
    behaviorState: 'cruising',
    stopTimerSeconds: 0,
    lastStopZoneIndex: undefined,
    laneChangeState: createIdleLaneChangeState(plan.laneId),
    signalState: createUncontrolledSignalState(),
    replaySeed: seed
  };
}

export function initializeTrafficRuntimeState(
  source: TrafficRuntimeStateSource
): TrafficRuntimeState {
  const vehicles = source.vehicles.map((plan) => initializeTrafficVehicleRuntimeState(plan));
  return { vehicles };
}

function createDeterministicSeed(...values: (string | number)[]): string {
  let hash = 0;
  const combined = values.join(':');

  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  return `seed:${Math.abs(hash).toString(36).padStart(8, '0')}`;
}
