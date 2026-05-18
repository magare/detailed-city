import {
  DEFAULT_STREET_PROFILES,
  DEFAULT_VEHICLE_PROFILES,
  type CityId,
  type CityLodPolicy,
  type CityObjectKind,
  type RenderBinding,
  type ValidationIssue,
  type ValidationResult,
  VEHICLE_CLASS_VALUES
} from '../cityContracts';
import { validateCityObjectRegistryIdentity } from '../cityObjectRegistry';
import { validateCityLodPolicy } from '../lodPolicy';
import { validateSourceMetadata } from '../sourceMetadata';
import type { CrossingPlan, IntersectionPlan, RoadSegment, TrafficCalmingDevice, TrafficPlan } from '../../../types/city';

export interface TrafficPlanValidationSource {
  readonly roads: readonly RoadSegment[];
  readonly crossings: readonly CrossingPlan[];
  readonly intersections: readonly IntersectionPlan[];
  readonly trafficCalmingDevices?: readonly TrafficCalmingDevice[];
  readonly assetBindings: readonly RenderBinding[];
  readonly traffic: TrafficPlan;
  readonly lodPolicy?: CityLodPolicy;
}

export function validateTrafficPlan(source: TrafficPlanValidationSource): ValidationResult {
  const issues: ValidationIssue[] = [];
  const roadsById = new Map(source.roads.map((road) => [road.id, road]));
  const crossingsById = new Map(source.crossings.map((crossing) => [crossing.id, crossing]));
  const intersectionsById = new Map(source.intersections.map((intersection) => [intersection.id, intersection]));
  const assetBindingsById = new Map(source.assetBindings.map((binding) => [binding.id, binding]));
  const lanesById = new Map(source.roads.flatMap((road) => road.lanes.map((lane) => [lane.id, lane])));
  const laneIds = new Set(lanesById.keys());
  const parentKindsById = createTrafficParentKindIndex(source.roads, source.crossings);

  if (source.lodPolicy) {
    issues.push(...validateCityLodPolicy(source.lodPolicy, [...source.traffic.markings, ...source.traffic.vehicles]));
  }

  for (const marking of source.traffic.markings) {
    issues.push(
      ...validateCityObjectRegistryIdentity(marking, {
        getParentKind: (parentId) => parentKindsById.get(parentId)
      }),
      ...validateSourceMetadata(marking)
    );

    const road = roadsById.get(marking.roadId);
    const crossing = marking.crossingId ? crossingsById.get(marking.crossingId) : undefined;
    const intersection = marking.intersectionId ? intersectionsById.get(marking.intersectionId) : undefined;
    const binding = assetBindingsById.get(marking.assetBindingId);

    if (!road) {
      issues.push({
        id: `missing-lane-marking-road-${marking.id}`,
        severity: 'error',
        category: 'identifier',
        objectId: marking.id,
        affectedPoint: marking.center,
        suggestedFix: `Create road ${marking.roadId} before validating ${marking.id}, or update the lane marking road reference.`,
        message: `Lane marking ${marking.id} references missing road ${marking.roadId}.`
      });
    }

    if (marking.laneId && !laneIds.has(marking.laneId)) {
      issues.push({
        id: `missing-lane-marking-lane-${marking.id}`,
        severity: 'error',
        category: 'identifier',
        objectId: marking.id,
        message: `Lane marking ${marking.id} references missing lane ${marking.laneId}.`
      });
    }

    if (isCrossingMarking(marking.markingType)) {
      if (!crossing || marking.parentId !== marking.crossingId) {
        issues.push({
          id: `missing-lane-marking-crossing-${marking.id}`,
          severity: 'error',
          category: 'identifier',
          objectId: marking.id,
          message: `Crossing marking ${marking.id} must reference its parent crossing.`
        });
      }

      if (crossing && crossing.roadId !== marking.roadId) {
        issues.push({
          id: `lane-marking-crossing-road-mismatch-${marking.id}`,
          severity: 'error',
          category: 'graph',
          objectId: marking.id,
          message: `Crossing marking ${marking.id} must use the same road as crossing ${crossing.id}.`
        });
      }

      if (
        crossing?.intersectionId &&
        (!intersection || crossing.intersectionId !== marking.intersectionId)
      ) {
        issues.push({
          id: `missing-lane-marking-intersection-${marking.id}`,
          severity: 'error',
          category: 'identifier',
          objectId: marking.id,
          message: `Crossing marking ${marking.id} must reference the crossing intersection.`
        });
      }

      if (crossing && !crossing.intersectionId && marking.intersectionId !== undefined) {
        issues.push({
          id: `unexpected-lane-marking-intersection-${marking.id}`,
          severity: 'error',
          category: 'identifier',
          objectId: marking.id,
          message: `Midblock crossing marking ${marking.id} must not reference an intersection.`
        });
      }
    } else if (marking.parentId !== marking.roadId && marking.parentId !== marking.laneId) {
      issues.push({
        id: `invalid-lane-marking-parent-${marking.id}`,
        severity: 'error',
        category: 'identifier',
        objectId: marking.id,
        message: `Road marking ${marking.id} must be parented to its road or lane.`
      });
    }

    if (
      !Number.isFinite(marking.center.x) ||
      !Number.isFinite(marking.center.z) ||
      marking.size.x <= 0 ||
      marking.size.z <= 0
    ) {
      issues.push({
        id: `invalid-lane-marking-geometry-${marking.id}`,
        severity: 'error',
        category: 'geometry',
        objectId: marking.id,
        affectedPoint: Number.isFinite(marking.center.x) && Number.isFinite(marking.center.z) ? marking.center : undefined,
        suggestedFix: 'Regenerate the lane marking center as finite local x/z coordinates and assign positive x/z dimensions.',
        message: 'Lane marking must have finite center coordinates and positive dimensions.'
      });
    }

    if (!binding || binding.objectKind !== 'lane-marking') {
      issues.push({
        id: `invalid-lane-marking-asset-binding-${marking.id}`,
        severity: 'error',
        category: 'asset',
        objectId: marking.id,
        message: `Lane marking ${marking.id} must reference a lane-marking render binding.`
      });
    }
  }

  for (const vehicle of source.traffic.vehicles) {
    issues.push(
      ...validateCityObjectRegistryIdentity(vehicle, {
        getParentKind: (parentId) => parentKindsById.get(parentId)
      }),
      ...validateSourceMetadata(vehicle)
    );

    const road = roadsById.get(vehicle.roadId);
    const lane = lanesById.get(vehicle.laneId);
    const routeNodeIds = new Set(vehicle.route.nodeIds);

    if (!road || vehicle.parentId !== vehicle.roadId) {
      issues.push({
        id: `missing-traffic-vehicle-road-${vehicle.id}`,
        severity: 'error',
        category: 'simulation',
        objectId: vehicle.id,
        affectedPoint: vehicle.position,
        suggestedFix: `Create road ${vehicle.roadId} before spawning ${vehicle.id}, or update the vehicle road/parent reference.`,
        message: `Traffic vehicle ${vehicle.id} must reference its parent road.`
      });
    }

    if (!lane || lane.roadSegmentId !== vehicle.roadId) {
      issues.push({
        id: `missing-traffic-vehicle-lane-${vehicle.id}`,
        severity: 'error',
        category: 'simulation',
        objectId: vehicle.id,
        message: `Traffic vehicle ${vehicle.id} must reference a lane on its parent road.`
      });
    } else if ((vehicle.direction === 1 && lane.direction !== 'forward') || (vehicle.direction === -1 && lane.direction !== 'backward')) {
      issues.push({
        id: `traffic-vehicle-lane-direction-mismatch-${vehicle.id}`,
        severity: 'error',
        category: 'simulation',
        objectId: vehicle.id,
        message: `Traffic vehicle ${vehicle.id} lane direction must match its route direction.`
      });
    } else if (!lane.allowedModes.includes('vehicle') || !lane.turnMovements.includes('through')) {
      issues.push({
        id: `traffic-vehicle-lane-mode-mismatch-${vehicle.id}`,
        severity: 'error',
        category: 'simulation',
        objectId: vehicle.id,
        message: `Traffic vehicle ${vehicle.id} must use a vehicle-through lane.`
      });
    }

    if (road) {
      const expectedAxis = road.orientation === 'horizontal' ? 'x' : 'z';
      const profile = DEFAULT_STREET_PROFILES.find((candidate) => candidate.id === road.streetProfileId);

      if (vehicle.axis !== expectedAxis) {
        issues.push({
          id: `traffic-vehicle-axis-mismatch-${vehicle.id}`,
          severity: 'error',
          category: 'simulation',
          objectId: vehicle.id,
          message: `Traffic vehicle ${vehicle.id} axis must match road orientation.`
        });
      }

      const expectedSpeedLimitKph = getExpectedVehicleSpeedLimitKph(
        road,
        profile?.designSpeedKph ?? vehicle.speedLimitKph,
        source.trafficCalmingDevices ?? []
      );

      if (vehicle.speedLimitKph !== expectedSpeedLimitKph) {
        issues.push({
          id: `traffic-vehicle-speed-profile-mismatch-${vehicle.id}`,
          severity: 'error',
          category: 'simulation',
          objectId: vehicle.id,
          message: `Traffic vehicle ${vehicle.id} speed limit must come from street profile ${road.streetProfileId} and traffic calming policy.`
        });
      }

      if (vehicle.speed > vehicle.speedLimitKph / 3.6 + 0.001) {
        issues.push({
          id: `traffic-vehicle-over-speed-limit-${vehicle.id}`,
          severity: 'error',
          category: 'simulation',
          objectId: vehicle.id,
          message: `Traffic vehicle ${vehicle.id} speed must not exceed its profile speed limit.`
        });
      }

      for (const offset of vehicle.stopBehavior.stopZoneOffsetsMeters) {
        if (offset < vehicle.min - 0.001 || offset > vehicle.max + 0.001) {
          issues.push({
            id: `traffic-vehicle-stop-zone-out-of-route-${vehicle.id}`,
            severity: 'error',
            category: 'simulation',
            objectId: vehicle.id,
            message: `Traffic vehicle ${vehicle.id} stop zones must stay within its route bounds.`
          });
        }
      }
    }

    if (vehicle.route.nodeIds.length < 2) {
      issues.push({
        id: `traffic-vehicle-route-too-short-${vehicle.id}`,
        severity: 'error',
        category: 'simulation',
        objectId: vehicle.id,
        message: `Traffic vehicle ${vehicle.id} must reference at least two route nodes.`
      });
    }

    if (
      vehicle.route.spawnNodeId !== vehicle.route.nodeIds[0] ||
      vehicle.route.destinationNodeId !== vehicle.route.nodeIds[vehicle.route.nodeIds.length - 1]
    ) {
      issues.push({
        id: `traffic-vehicle-route-endpoint-mismatch-${vehicle.id}`,
        severity: 'error',
        category: 'simulation',
        objectId: vehicle.id,
        message: `Traffic vehicle ${vehicle.id} spawn and destination nodes must match route endpoints.`
      });
    }

    for (const nodeId of vehicle.route.nodeIds) {
      const intersection = intersectionsById.get(nodeId);

      if (!intersection || !intersection.connectedRoadIds.includes(vehicle.roadId)) {
        issues.push({
          id: `traffic-vehicle-route-node-mismatch-${vehicle.id}-${nodeId}`,
          severity: 'error',
          category: 'simulation',
          objectId: vehicle.id,
          message: `Traffic vehicle ${vehicle.id} route node ${nodeId} must be an intersection on road ${vehicle.roadId}.`
        });
      }
    }

    if (routeNodeIds.size !== vehicle.route.nodeIds.length) {
      issues.push({
        id: `traffic-vehicle-duplicate-route-node-${vehicle.id}`,
        severity: 'error',
        category: 'simulation',
        objectId: vehicle.id,
        message: `Traffic vehicle ${vehicle.id} route nodes must be unique and ordered.`
      });
    }

    if (
      vehicle.route.lengthMeters <= 0 ||
      vehicle.min >= vehicle.max ||
      vehicle.routeOffsetMeters < vehicle.min - 0.001 ||
      vehicle.routeOffsetMeters > vehicle.max + 0.001 ||
      vehicle.stopBehavior.stopDurationSeconds < 0 ||
      vehicle.stopBehavior.stopLookAheadMeters <= 0 ||
      vehicle.incidentHookIds.length === 0
    ) {
      issues.push({
        id: `invalid-traffic-vehicle-route-${vehicle.id}`,
        severity: 'error',
        category: 'simulation',
        objectId: vehicle.id,
        affectedPoint: vehicle.position,
        suggestedFix: 'Regenerate route bounds, initial route offset, stop behavior, and incident hooks from the parent road route.',
        message: 'Traffic vehicle must have route bounds, an initial route offset, stop behavior, and incident hooks.'
      });
    }

    if (
      vehicle.size.x <= 0 ||
      vehicle.size.z <= 0 ||
      vehicle.speed < 0 ||
      !Number.isFinite(vehicle.position.x) ||
      !Number.isFinite(vehicle.position.z)
    ) {
      issues.push({
        id: `invalid-traffic-vehicle-geometry-${vehicle.id}`,
        severity: 'error',
        category: 'geometry',
        objectId: vehicle.id,
        affectedPoint: Number.isFinite(vehicle.position.x) && Number.isFinite(vehicle.position.z) ? vehicle.position : undefined,
        suggestedFix: 'Regenerate the vehicle with a finite position, positive footprint, and non-negative speed.',
        message: 'Traffic vehicle must have positive footprint and non-negative speed.'
      });
    }

    if (!VEHICLE_CLASS_VALUES.includes(vehicle.vehicleClass)) {
      issues.push({
        id: `invalid-traffic-vehicle-class-${vehicle.id}`,
        severity: 'error',
        category: 'simulation',
        objectId: vehicle.id,
        message: `Traffic vehicle ${vehicle.id} has unknown vehicle class ${vehicle.vehicleClass}.`
      });
    }

    if (
      vehicle.dimensions.lengthMeters <= 0 ||
      vehicle.dimensions.widthMeters <= 0 ||
      vehicle.dimensions.heightMeters <= 0 ||
      vehicle.dimensions.wheelbaseMeters <= 0 ||
      !Number.isFinite(vehicle.dimensions.lengthMeters) ||
      !Number.isFinite(vehicle.dimensions.widthMeters) ||
      !Number.isFinite(vehicle.dimensions.heightMeters) ||
      !Number.isFinite(vehicle.dimensions.wheelbaseMeters)
    ) {
      issues.push({
        id: `invalid-traffic-vehicle-dimensions-${vehicle.id}`,
        severity: 'error',
        category: 'geometry',
        objectId: vehicle.id,
        message: `Traffic vehicle ${vehicle.id} must have positive finite physical dimensions.`
      });
    }

    if (vehicle.dimensions.wheelbaseMeters > vehicle.dimensions.lengthMeters) {
      issues.push({
        id: `invalid-traffic-vehicle-wheelbase-${vehicle.id}`,
        severity: 'error',
        category: 'geometry',
        objectId: vehicle.id,
        message: `Traffic vehicle ${vehicle.id} wheelbase must not exceed vehicle length.`
      });
    }

    if (vehicle.passengerCapacity < 0 || !Number.isFinite(vehicle.passengerCapacity)) {
      issues.push({
        id: `invalid-traffic-vehicle-passenger-capacity-${vehicle.id}`,
        severity: 'error',
        category: 'simulation',
        objectId: vehicle.id,
        message: `Traffic vehicle ${vehicle.id} passenger capacity must be non-negative finite.`
      });
    }

    if (vehicle.cargoCapacityKg < 0 || !Number.isFinite(vehicle.cargoCapacityKg)) {
      issues.push({
        id: `invalid-traffic-vehicle-cargo-capacity-${vehicle.id}`,
        severity: 'error',
        category: 'simulation',
        objectId: vehicle.id,
        message: `Traffic vehicle ${vehicle.id} cargo capacity must be non-negative finite.`
      });
    }

    const behavior = vehicle.behaviorProfile;
    const isParkedVehicle = vehicle.vehicleClass === 'parked-vehicle';
    const behaviorHasNonFinite =
      !Number.isFinite(behavior.maxSpeedKph) ||
      !Number.isFinite(behavior.preferredSpeedFraction) ||
      !Number.isFinite(behavior.accelerationMetersPerSecondSq) ||
      !Number.isFinite(behavior.brakingMetersPerSecondSq) ||
      !Number.isFinite(behavior.comfortableDecelerationMetersPerSecondSq) ||
      !Number.isFinite(behavior.minFollowingDistanceMeters) ||
      !Number.isFinite(behavior.reactionTimeSeconds) ||
      !Number.isFinite(behavior.turnSpeedReduction) ||
      !Number.isFinite(behavior.stopToleranceMeters);

    if (behaviorHasNonFinite) {
      issues.push({
        id: `invalid-traffic-vehicle-behavior-profile-${vehicle.id}`,
        severity: 'error',
        category: 'simulation',
        objectId: vehicle.id,
        message: `Traffic vehicle ${vehicle.id} has non-finite behavior profile values.`
      });
    } else if (isParkedVehicle) {
      if (
        behavior.maxSpeedKph !== 0 ||
        behavior.preferredSpeedFraction !== 0 ||
        behavior.accelerationMetersPerSecondSq !== 0 ||
        behavior.brakingMetersPerSecondSq !== 0 ||
        behavior.comfortableDecelerationMetersPerSecondSq !== 0 ||
        behavior.minFollowingDistanceMeters !== 0 ||
        behavior.reactionTimeSeconds !== 0 ||
        behavior.turnSpeedReduction !== 0 ||
        behavior.stopToleranceMeters !== 0
      ) {
        issues.push({
          id: `invalid-traffic-vehicle-parked-behavior-${vehicle.id}`,
          severity: 'error',
          category: 'simulation',
          objectId: vehicle.id,
          message: `Traffic vehicle ${vehicle.id} parked class must have all zero behavior values.`
        });
      }
    } else {
      if (
        behavior.maxSpeedKph <= 0 ||
        behavior.preferredSpeedFraction <= 0 ||
        behavior.preferredSpeedFraction > 1 ||
        behavior.accelerationMetersPerSecondSq <= 0 ||
        behavior.brakingMetersPerSecondSq <= 0 ||
        behavior.comfortableDecelerationMetersPerSecondSq <= 0 ||
        behavior.minFollowingDistanceMeters < 0 ||
        behavior.reactionTimeSeconds < 0 ||
        behavior.turnSpeedReduction <= 0 ||
        behavior.turnSpeedReduction > 1 ||
        behavior.stopToleranceMeters < 0
      ) {
        issues.push({
          id: `invalid-traffic-vehicle-behavior-profile-${vehicle.id}`,
          severity: 'error',
          category: 'simulation',
          objectId: vehicle.id,
          message: `Traffic vehicle ${vehicle.id} has invalid behavior profile values.`
        });
      }
    }

    if (
      !Array.isArray(vehicle.visualVariantTags) ||
      vehicle.visualVariantTags.length === 0 ||
      vehicle.visualVariantTags.some((tag) => typeof tag !== 'string' || tag.trim().length === 0 || tag !== tag.trim())
    ) {
      issues.push({
        id: `invalid-traffic-vehicle-visual-variant-tags-${vehicle.id}`,
        severity: 'error',
        category: 'simulation',
        objectId: vehicle.id,
        message: `Traffic vehicle ${vehicle.id} must have a non-empty array of non-empty trimmed visual variant tags.`
      });
    }

    const binding = assetBindingsById.get(vehicle.assetBindingId);

    if (!binding || binding.objectKind !== 'traffic-vehicle') {
      issues.push({
        id: `invalid-traffic-vehicle-asset-binding-${vehicle.id}`,
        severity: 'error',
        category: 'asset',
        objectId: vehicle.id,
        message: `Traffic vehicle ${vehicle.id} must reference a traffic-vehicle render binding.`
      });
    }

    const expectedProfile = DEFAULT_VEHICLE_PROFILES.find((profile) => profile.vehicleClass === vehicle.vehicleClass);

    if (expectedProfile) {
      const expectedBehavior = expectedProfile.behavior;
      const actualBehavior = vehicle.behaviorProfile;

      if (
        actualBehavior.maxSpeedKph !== expectedBehavior.maxSpeedKph ||
        actualBehavior.preferredSpeedFraction !== expectedBehavior.preferredSpeedFraction ||
        actualBehavior.accelerationMetersPerSecondSq !== expectedBehavior.accelerationMetersPerSecondSq ||
        actualBehavior.brakingMetersPerSecondSq !== expectedBehavior.brakingMetersPerSecondSq ||
        actualBehavior.comfortableDecelerationMetersPerSecondSq !== expectedBehavior.comfortableDecelerationMetersPerSecondSq ||
        actualBehavior.minFollowingDistanceMeters !== expectedBehavior.minFollowingDistanceMeters ||
        actualBehavior.reactionTimeSeconds !== expectedBehavior.reactionTimeSeconds ||
        actualBehavior.turnSpeedReduction !== expectedBehavior.turnSpeedReduction ||
        actualBehavior.stopToleranceMeters !== expectedBehavior.stopToleranceMeters
      ) {
        issues.push({
          id: `traffic-vehicle-profile-mismatch-${vehicle.id}`,
          severity: 'error',
          category: 'simulation',
          objectId: vehicle.id,
          message: `Traffic vehicle ${vehicle.id} behavior profile must match the expected profile for class ${vehicle.vehicleClass}.`
        });
      }

      if (
        vehicle.dimensions.lengthMeters !== expectedProfile.dimensions.lengthMeters ||
        vehicle.dimensions.widthMeters !== expectedProfile.dimensions.widthMeters ||
        vehicle.dimensions.heightMeters !== expectedProfile.dimensions.heightMeters ||
        vehicle.dimensions.wheelbaseMeters !== expectedProfile.dimensions.wheelbaseMeters
      ) {
        issues.push({
          id: `traffic-vehicle-dimensions-mismatch-${vehicle.id}`,
          severity: 'error',
          category: 'simulation',
          objectId: vehicle.id,
          message: `Traffic vehicle ${vehicle.id} dimensions must match the expected profile for class ${vehicle.vehicleClass}.`
        });
      }

      if (
        vehicle.passengerCapacity !== expectedProfile.passengerCapacity ||
        vehicle.cargoCapacityKg !== expectedProfile.cargoCapacityKg
      ) {
        issues.push({
          id: `traffic-vehicle-capacity-mismatch-${vehicle.id}`,
          severity: 'error',
          category: 'simulation',
          objectId: vehicle.id,
          message: `Traffic vehicle ${vehicle.id} capacity must match the expected profile for class ${vehicle.vehicleClass}.`
        });
      }

      if (vehicle.assetBindingId !== expectedProfile.defaultAssetBindingId) {
        issues.push({
          id: `traffic-vehicle-asset-binding-mismatch-${vehicle.id}`,
          severity: 'error',
          category: 'asset',
          objectId: vehicle.id,
          message: `Traffic vehicle ${vehicle.id} asset binding must match the expected profile for class ${vehicle.vehicleClass}.`
        });
      }

      if (
        vehicle.visualVariantTags.length !== expectedProfile.visualVariantTags.length ||
        vehicle.visualVariantTags.some((tag, index) => tag !== expectedProfile.visualVariantTags[index])
      ) {
        issues.push({
          id: `traffic-vehicle-visual-variant-tags-mismatch-${vehicle.id}`,
          severity: 'error',
          category: 'simulation',
          objectId: vehicle.id,
          message: `Traffic vehicle ${vehicle.id} visual variant tags must match the expected profile for class ${vehicle.vehicleClass}.`
        });
      }
    }
  }

  return {
    passed: issues.every((issue) => issue.severity !== 'error'),
    issues
  };
}

function createTrafficParentKindIndex(
  roads: readonly RoadSegment[],
  crossings: readonly CrossingPlan[]
): ReadonlyMap<CityId, CityObjectKind> {
  const parentKindsById = new Map<CityId, CityObjectKind>();

  for (const road of roads) {
    parentKindsById.set(road.id, road.kind);

    for (const lane of road.lanes) {
      parentKindsById.set(lane.id, lane.kind);
    }
  }

  for (const crossing of crossings) {
    parentKindsById.set(crossing.id, crossing.kind);
  }

  return parentKindsById;
}

function isCrossingMarking(markingType: TrafficPlan['markings'][number]['markingType']): boolean {
  return (
    markingType === 'zebra-crossing-stripe' ||
    markingType === 'stop-bar' ||
    markingType === 'tactile-paving' ||
    markingType === 'refuge-island'
  );
}

function getExpectedVehicleSpeedLimitKph(
  road: RoadSegment,
  profileSpeedKph: number,
  trafficCalmingDevices: readonly TrafficCalmingDevice[]
): number {
  const calmedSpeedLimits = trafficCalmingDevices
    .filter((device) => device.roadId === road.id)
    .map((device) => device.targetSpeedKph);

  return calmedSpeedLimits.length > 0 ? Math.min(profileSpeedKph, ...calmedSpeedLimits) : profileSpeedKph;
}
