import {
  DEFAULT_STREET_PROFILES,
  DEFAULT_VEHICLE_PROFILES,
  type LaneContract,
  type LaneMarkingType,
  type RoadMarkingOrientation,
  type VehicleClass,
  type VehicleProfile
} from '../../city/data-contracts/cityContracts';
import { createProceduralSourceMetadata, createSimulatedSourceMetadata } from '../../city/data-contracts/sourceMetadata';
import type {
  CrossingPlan,
  IntersectionPlan,
  LaneMarkingPlan,
  RoadSegment,
  TrafficCalmingDevice,
  TrafficPlan,
  TrafficVehiclePlan
} from '../../types/city';

export interface TrafficPlanSource {
  readonly roads: readonly RoadSegment[];
  readonly crossings?: readonly CrossingPlan[];
  readonly intersections?: readonly IntersectionPlan[];
  readonly trafficCalmingDevices?: readonly TrafficCalmingDevice[];
}

const DASH_SPACING_METERS = 20;
const ZEBRA_STRIPE_COUNT = 5;
const MAX_TRAFFIC_VEHICLES = 7;
const STOP_BAR_APPROACH_CLEARANCE_METERS = 2.8;

const ORDINARY_ROAD_VEHICLE_CLASSES: readonly VehicleClass[] = ['car', 'taxi', 'van', 'delivery-truck'] as const;

const VEHICLE_PROFILES = DEFAULT_VEHICLE_PROFILES.filter((profile) =>
  ORDINARY_ROAD_VEHICLE_CLASSES.includes(profile.vehicleClass as VehicleClass)
) as readonly VehicleProfile[];

export class TrafficLaneGenerator {
  create(sourceOrRoads: TrafficPlanSource | readonly RoadSegment[]): TrafficPlan {
    const source: TrafficPlanSource = 'roads' in sourceOrRoads ? sourceOrRoads : { roads: sourceOrRoads };

    return {
      markings: this.createLaneMarkings(source),
      vehicles: this.createVehicles(source)
    };
  }

  private createLaneMarkings(source: TrafficPlanSource): TrafficPlan['markings'] {
    const roads = [...source.roads];
    const roadsById = new Map(roads.map((road) => [road.id, road]));
    const intersectionsById = new Map((source.intersections ?? []).map((intersection) => [intersection.id, intersection]));
    const detailedRoads = roads.filter((road) => road.tags?.detailedStreetSliceId);
    const crossingCandidates = source.crossings ?? [];
    const detailedCrossings = crossingCandidates.filter((crossing) => crossing.tags?.detailedStreetSliceId);
    const standaloneMidblockCrossings = crossingCandidates.filter((crossing) => crossing.crossingLocation === 'midblock');
    const selectedCrossings =
      detailedCrossings.length > 0
        ? [...detailedCrossings, ...standaloneMidblockCrossings]
        : crossingCandidates;

    return [
      ...this.createLaneDashes(roads),
      ...this.createTurnArrows(detailedRoads.length > 0 ? detailedRoads : roads),
      ...this.createCrossingMarkings(selectedCrossings, roadsById, intersectionsById)
    ];
  }

  private createLaneDashes(roads: readonly RoadSegment[]): LaneMarkingPlan[] {
    const markings: LaneMarkingPlan[] = [];

    for (const road of roads) {
      const dashCount = Math.floor(road.length / DASH_SPACING_METERS);

      for (let index = 0; index < dashCount; index += 1) {
        const offset = -road.length / 2 + index * DASH_SPACING_METERS + DASH_SPACING_METERS / 2;
        const center = translateAlongRoad(road, road.center, offset);

        markings.push(
          createMarking({
            id: `${road.id}-lane-dash-${index}`,
            parentId: road.id,
            roadId: road.id,
            center,
            orientation: road.orientation,
            size: { x: 0.42, z: 7.2 },
            markingType: 'lane-dash',
            surfaceMaterial: 'paint',
            assetBindingId: 'binding:road:lane-marking'
          })
        );
      }
    }

    return markings;
  }

  private createTurnArrows(roads: readonly RoadSegment[]): LaneMarkingPlan[] {
    return roads
      .filter((road) => road.laneCount >= 4)
      .flatMap((road) => {
        const arrowCount = Math.max(1, Math.floor(road.length / 120));

        return Array.from({ length: arrowCount }, (_, index) => {
          const alongOffset = -road.length / 2 + ((index + 1) * road.length) / (arrowCount + 1);
          const lane = road.lanes[index % road.lanes.length];
          const laneSide = index % 2 === 0 ? -1 : 1;
          const center = translateAcrossRoad(
            road,
            translateAlongRoad(road, road.center, alongOffset),
            laneSide * Math.min(road.widthMeters * 0.22, 3.8)
          );

          return createMarking({
            id: `${road.id}-turn-arrow-${index}`,
            parentId: lane?.id ?? road.id,
            roadId: road.id,
            laneId: lane?.id,
            center,
            orientation: road.orientation,
            size: { x: 2.1, z: 5.4 },
            markingType: 'turn-arrow',
            surfaceMaterial: 'paint',
            assetBindingId: 'binding:road:turn-arrow'
          });
        });
      });
  }

  private createCrossingMarkings(
    crossings: readonly CrossingPlan[],
    roadsById: ReadonlyMap<string, RoadSegment>,
    intersectionsById: ReadonlyMap<string, IntersectionPlan>
  ): LaneMarkingPlan[] {
    return crossings.flatMap((crossing) => {
      const road = roadsById.get(crossing.roadId);

      if (!road || (crossing.intersectionId && !intersectionsById.has(crossing.intersectionId))) {
        return [];
      }

      return [
        ...createZebraCrossingStripes(crossing, road),
        ...createStopBars(crossing, road),
        ...createTactilePaving(crossing, road),
        ...createRefugeIsland(crossing, road)
      ];
    });
  }

  private createVehicles(source: TrafficPlanSource): TrafficPlan['vehicles'] {
    const vehicles: TrafficPlan['vehicles'] = [];
    const selectedRoads = source.roads.filter((_, index) => index % 4 === 0).slice(0, MAX_TRAFFIC_VEHICLES);

    selectedRoads.forEach((road, index) => {
      const direction: 1 | -1 = index % 2 === 0 ? 1 : -1;
      const routeNodes = getRouteNodesForRoad(road, source.intersections ?? [], direction);

      if (routeNodes.length < 2) {
        return;
      }

      vehicles.push(
        createVehicle({
          road,
          routeNodes,
          crossings: source.crossings ?? [],
          trafficCalmingDevices: source.trafficCalmingDevices ?? [],
          index,
          direction
        })
      );
    });

    return vehicles;
  }
}

function createVehicle(input: {
  readonly road: RoadSegment;
  readonly routeNodes: readonly IntersectionPlan[];
  readonly crossings: readonly CrossingPlan[];
  readonly trafficCalmingDevices: readonly TrafficCalmingDevice[];
  readonly index: number;
  readonly direction: 1 | -1;
}): TrafficVehiclePlan {
  const { road, routeNodes, crossings, trafficCalmingDevices, index, direction } = input;
  const lane = selectLane(road, direction, index);
  const laneOffsetMeters = getLaneCenterOffset(road, lane);
  const axis = road.orientation === 'horizontal' ? 'x' : 'z';
  const startOffsetMeters = getRoadOffsetMeters(road, routeNodes[0].center);
  const endOffsetMeters = getRoadOffsetMeters(road, routeNodes[routeNodes.length - 1].center);
  const min = Math.min(startOffsetMeters, endOffsetMeters);
  const max = Math.max(startOffsetMeters, endOffsetMeters);
  const routeLengthMeters = max - min;
  const seededOffset = (index * 37 + 11) % Math.max(1, Math.floor(routeLengthMeters));
  const routeOffsetMeters = roundMeters(direction === 1 ? min + seededOffset : max - seededOffset);
  const profile = getStreetProfile(road.streetProfileId);
  const speedLimitKph = getCalmedSpeedLimitKph(road, trafficCalmingDevices, profile.designSpeedKph);

  const vehicleProfile = selectVehicleProfile(index);
  const behavior = vehicleProfile.behavior;
  const unroundedPreferredSpeedKph = Math.min(speedLimitKph * behavior.preferredSpeedFraction, behavior.maxSpeedKph);
  const preferredSpeedKph = roundToTwoDecimals(unroundedPreferredSpeedKph);
  const turnSpeedKph = roundToTwoDecimals(preferredSpeedKph * behavior.turnSpeedReduction);
  const speed = roundMeters(unroundedPreferredSpeedKph / 3.6);
  const dimensions = vehicleProfile.dimensions;

  return {
    id: `traffic-vehicle-${index}`,
    kind: 'traffic-vehicle',
    ownerDomain: 'simulation',
    parentId: road.id,
    lod: 'lod2',
    roadId: road.id,
    laneId: lane.id,
    axis,
    direction,
    speed,
    speedLimitKph,
    routeOffsetMeters,
    position: getVehiclePosition(road, axis, routeOffsetMeters, laneOffsetMeters),
    size: axis === 'x' ? { x: dimensions.lengthMeters, z: dimensions.widthMeters } : { x: dimensions.widthMeters, z: dimensions.lengthMeters },
    min: roundMeters(min),
    max: roundMeters(max),
    route: {
      nodeIds: routeNodes.map((node) => node.id),
      spawnNodeId: routeNodes[0].id,
      destinationNodeId: routeNodes[routeNodes.length - 1].id,
      startOffsetMeters: roundMeters(startOffsetMeters),
      endOffsetMeters: roundMeters(endOffsetMeters),
      lengthMeters: roundMeters(routeLengthMeters)
    },
    stopBehavior: {
      stopZoneOffsetsMeters: getStopZoneOffsets(road, routeNodes, crossings, direction, dimensions.lengthMeters),
      stopDurationSeconds: road.hierarchy === 'arterial' ? 0.85 : 0.55,
      stopLookAheadMeters: behavior.stopToleranceMeters + 2.5
    },
    incidentHookIds: [`incident-hook:${road.id}:route-choice`, `incident-hook:${road.id}:stop-control`],
    vehicleClass: vehicleProfile.vehicleClass,
    dimensions,
    passengerCapacity: vehicleProfile.passengerCapacity,
    cargoCapacityKg: vehicleProfile.cargoCapacityKg,
    behaviorProfile: behavior,
    dynamics: {
      maxSpeedKph: behavior.maxSpeedKph,
      preferredSpeedKph,
      accelerationMetersPerSecondSq: behavior.accelerationMetersPerSecondSq,
      brakingMetersPerSecondSq: behavior.brakingMetersPerSecondSq,
      comfortableDecelerationMetersPerSecondSq: behavior.comfortableDecelerationMetersPerSecondSq,
      minFollowingDistanceMeters: behavior.minFollowingDistanceMeters,
      reactionTimeSeconds: behavior.reactionTimeSeconds,
      turnSpeedKph,
      stopToleranceMeters: behavior.stopToleranceMeters
    },
    assetBindingId: vehicleProfile.defaultAssetBindingId,
    visualVariantTags: vehicleProfile.visualVariantTags,
    metadata: createSimulatedSourceMetadata(`traffic-simulation:${road.id}:${index}`, 'traffic-route-seed'),
    tags: {
      roadId: road.id,
      laneId: lane.id,
      route: routeNodes.map((node) => node.id).join('>'),
      speedLimitKph,
      vehicleClass: vehicleProfile.vehicleClass
    }
  };
}

function getRouteNodesForRoad(
  road: RoadSegment,
  intersections: readonly IntersectionPlan[],
  direction: 1 | -1
): IntersectionPlan[] {
  const routeNodes = intersections
    .filter((intersection) => intersection.connectedRoadIds.includes(road.id))
    .sort((a, b) => getRoadOffsetMeters(road, a.center) - getRoadOffsetMeters(road, b.center));

  return direction === 1 ? routeNodes : routeNodes.reverse();
}

function selectLane(road: RoadSegment, direction: 1 | -1, vehicleIndex: number): LaneContract {
  const targetDirection = direction === 1 ? 'forward' : 'backward';
  const candidates = road.lanes.filter(
    (lane) =>
      lane.direction === targetDirection &&
      lane.allowedModes.includes('vehicle') &&
      lane.turnMovements.includes('through')
  );

  return (
    candidates[vehicleIndex % Math.max(1, candidates.length)] ??
    road.lanes.find((lane) => lane.allowedModes.includes('vehicle')) ??
    road.lanes[vehicleIndex % road.lanes.length]
  );
}

function getLaneCenterOffset(road: RoadSegment, selectedLane: LaneContract): number {
  const totalLaneWidth = road.lanes.reduce((sum, lane) => sum + lane.widthMeters, 0);
  let cursor = -totalLaneWidth / 2;

  for (const lane of road.lanes) {
    const center = cursor + lane.widthMeters / 2;

    if (lane.id === selectedLane.id) {
      return roundMeters(center);
    }

    cursor += lane.widthMeters;
  }

  return 0;
}

function getVehiclePosition(
  road: RoadSegment,
  axis: 'x' | 'z',
  routeOffsetMeters: number,
  laneOffsetMeters: number
): { x: number; z: number } {
  if (axis === 'x') {
    return {
      x: roundMeters(road.center.x + routeOffsetMeters),
      z: roundMeters(road.center.z + laneOffsetMeters)
    };
  }

  return {
    x: roundMeters(road.center.x + laneOffsetMeters),
    z: roundMeters(road.center.z + routeOffsetMeters)
  };
}

function getStopZoneOffsets(
  road: RoadSegment,
  routeNodes: readonly IntersectionPlan[],
  crossings: readonly CrossingPlan[],
  direction: 1 | -1,
  vehicleLengthMeters: number
): number[] {
  const routeOffsets = routeNodes.map((node) => getRoadOffsetMeters(road, node.center));
  const routeMin = Math.min(...routeOffsets);
  const routeMax = Math.max(...routeOffsets);
  const crossingOffsets = crossings
    .filter((crossing) => crossing.roadId === road.id)
    .filter((crossing) => {
      const crossingOffset = getRoadOffsetMeters(road, crossing.center);
      return crossingOffset > routeMin + 0.001 && crossingOffset < routeMax - 0.001;
    })
    .map(
      (crossing) =>
        getRoadOffsetMeters(road, crossing.center) -
        direction * (getStopBarApproachOffset(crossing) + vehicleLengthMeters / 2)
    );

  if (crossingOffsets.length > 0) {
    return uniqueRoundedNumbers(crossingOffsets).filter(
      (offset) => offset > routeMin + 0.001 && offset < routeMax - 0.001
    );
  }

  return routeNodes
    .slice(1, -1)
    .map((node) => roundMeters(getRoadOffsetMeters(road, node.center) - direction * (vehicleLengthMeters / 2)));
}

function getCalmedSpeedLimitKph(
  road: RoadSegment,
  trafficCalmingDevices: readonly TrafficCalmingDevice[],
  profileSpeedKph: number
): number {
  const roadDeviceSpeeds = trafficCalmingDevices
    .filter((device) => device.roadId === road.id)
    .map((device) => device.targetSpeedKph);

  return roadDeviceSpeeds.length > 0 ? Math.min(profileSpeedKph, ...roadDeviceSpeeds) : profileSpeedKph;
}

function uniqueRoundedNumbers(values: readonly number[]): number[] {
  return [...new Set(values.map(roundMeters))].sort((a, b) => a - b);
}

function getRoadOffsetMeters(road: RoadSegment, point: { x: number; z: number }): number {
  return road.orientation === 'vertical' ? point.z - road.center.z : point.x - road.center.x;
}

function getStreetProfile(streetProfileId: string) {
  return DEFAULT_STREET_PROFILES.find((profile) => profile.id === streetProfileId) ?? DEFAULT_STREET_PROFILES[0];
}

function createZebraCrossingStripes(crossing: CrossingPlan, road: RoadSegment): LaneMarkingPlan[] {
  const stripeSpacing = crossing.widthMeters / (ZEBRA_STRIPE_COUNT + 1);

  return Array.from({ length: ZEBRA_STRIPE_COUNT }, (_, stripeIndex) => {
    const stripeOffset = (stripeIndex - (ZEBRA_STRIPE_COUNT - 1) / 2) * stripeSpacing;

    return createMarking({
      id: `${crossing.id}-zebra-stripe-${stripeIndex}`,
      parentId: crossing.id,
      roadId: road.id,
      crossingId: crossing.id,
      intersectionId: crossing.intersectionId,
      center: translateAlongRoad(road, crossing.center, stripeOffset),
      orientation: getCrossingOrientation(road),
      size: { x: 0.42, z: Math.max(6, crossing.lengthMeters * 0.82) },
      markingType: 'zebra-crossing-stripe',
      surfaceMaterial: 'paint',
      assetBindingId: 'binding:road:zebra-crossing',
      stripeIndex
    });
  });
}

function createStopBars(crossing: CrossingPlan, road: RoadSegment): LaneMarkingPlan[] {
  const stopBarOffset = getStopBarApproachOffset(crossing);

  return [-stopBarOffset, stopBarOffset].map((offset, index) =>
    createMarking({
      id: `${crossing.id}-stop-bar-${index}`,
      parentId: crossing.id,
      roadId: road.id,
      crossingId: crossing.id,
      intersectionId: crossing.intersectionId,
      center: translateAlongRoad(road, crossing.center, offset),
      orientation: getCrossingOrientation(road),
      size: { x: 0.52, z: Math.max(6, road.widthMeters * 0.72) },
      markingType: 'stop-bar',
      surfaceMaterial: 'paint',
      assetBindingId: 'binding:road:stop-bar'
    })
  );
}

function getStopBarApproachOffset(crossing: CrossingPlan): number {
  return crossing.widthMeters / 2 + STOP_BAR_APPROACH_CLEARANCE_METERS;
}

function createTactilePaving(crossing: CrossingPlan, road: RoadSegment): LaneMarkingPlan[] {
  const sidewalkOffset = road.widthMeters / 2 + 1.35;

  return [-sidewalkOffset, sidewalkOffset].map((offset, index) =>
    createMarking({
      id: `${crossing.id}-tactile-pad-${index}`,
      parentId: crossing.id,
      roadId: road.id,
      crossingId: crossing.id,
      intersectionId: crossing.intersectionId,
      center: translateAcrossRoad(road, crossing.center, offset),
      orientation: getCrossingOrientation(road),
      size: { x: 1.05, z: crossing.widthMeters + 0.8 },
      markingType: 'tactile-paving',
      surfaceMaterial: 'tactile',
      assetBindingId: 'binding:road:tactile-paving'
    })
  );
}

function createRefugeIsland(crossing: CrossingPlan, road: RoadSegment): LaneMarkingPlan[] {
  if (!crossing.hasRefugeIsland) {
    return [];
  }

  return [
    createMarking({
      id: `${crossing.id}-refuge-island`,
      parentId: crossing.id,
      roadId: road.id,
      crossingId: crossing.id,
      intersectionId: crossing.intersectionId,
      center: crossing.center,
      orientation: road.orientation,
      size: { x: 1.8, z: crossing.widthMeters + 1.6 },
      markingType: 'refuge-island',
      surfaceMaterial: 'raised-concrete',
      assetBindingId: 'binding:road:refuge-island'
    })
  ];
}

function createMarking(input: {
  readonly id: string;
  readonly parentId: string;
  readonly roadId: string;
  readonly laneId?: string;
  readonly crossingId?: string;
  readonly intersectionId?: string;
  readonly center: { x: number; z: number };
  readonly orientation: RoadMarkingOrientation;
  readonly size: { x: number; z: number };
  readonly markingType: LaneMarkingType;
  readonly surfaceMaterial: LaneMarkingPlan['surfaceMaterial'];
  readonly assetBindingId: string;
  readonly stripeIndex?: number;
}): LaneMarkingPlan {
  return {
    id: input.id,
    kind: 'lane-marking',
    ownerDomain: 'mobility',
    parentId: input.parentId,
    lod: input.markingType === 'tactile-paving' ? 'lod3' : 'lod2',
    roadId: input.roadId,
    laneId: input.laneId,
    crossingId: input.crossingId,
    intersectionId: input.intersectionId,
    center: {
      x: roundMeters(input.center.x),
      z: roundMeters(input.center.z)
    },
    orientation: input.orientation,
    size: {
      x: roundMeters(input.size.x),
      z: roundMeters(input.size.z)
    },
    markingType: input.markingType,
    surfaceMaterial: input.surfaceMaterial,
    assetBindingId: input.assetBindingId,
    stripeIndex: input.stripeIndex,
    metadata: createProceduralSourceMetadata(`traffic-marking:${input.id}`, 'traffic-lane-markings'),
    tags: {
      markingType: input.markingType,
      roadId: input.roadId,
      assetBindingId: input.assetBindingId
    }
  };
}

function translateAlongRoad(road: RoadSegment, center: { x: number; z: number }, offset: number): { x: number; z: number } {
  return road.orientation === 'vertical'
    ? { x: center.x, z: center.z + offset }
    : { x: center.x + offset, z: center.z };
}

function translateAcrossRoad(road: RoadSegment, center: { x: number; z: number }, offset: number): { x: number; z: number } {
  return road.orientation === 'vertical'
    ? { x: center.x + offset, z: center.z }
    : { x: center.x, z: center.z + offset };
}

function getCrossingOrientation(road: RoadSegment): RoadMarkingOrientation {
  return road.orientation === 'vertical' ? 'horizontal' : 'vertical';
}

function roundMeters(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

function selectVehicleProfile(vehicleIndex: number): VehicleProfile {
  const deterministicIndex = vehicleIndex % VEHICLE_PROFILES.length;
  return VEHICLE_PROFILES[deterministicIndex];
}
