import {
  DEFAULT_STREET_PROFILES,
  type CityId,
  type CityLodPolicy,
  type CityObjectKind,
  type RenderBinding,
  type ValidationIssue,
  type ValidationResult
} from '../cityContracts';
import { validateCityObjectRegistryIdentity } from '../cityObjectRegistry';
import { validateCityLodPolicy } from '../lodPolicy';
import { validateSourceMetadata } from '../sourceMetadata';
import type { CrossingPlan, IntersectionPlan, RoadSegment, TrafficPlan } from '../../../types/city';

export interface TrafficPlanValidationSource {
  readonly roads: readonly RoadSegment[];
  readonly crossings: readonly CrossingPlan[];
  readonly intersections: readonly IntersectionPlan[];
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

      if (!intersection || crossing?.intersectionId !== marking.intersectionId) {
        issues.push({
          id: `missing-lane-marking-intersection-${marking.id}`,
          severity: 'error',
          category: 'identifier',
          objectId: marking.id,
          message: `Crossing marking ${marking.id} must reference the crossing intersection.`
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

      if (profile && vehicle.speedLimitKph !== profile.designSpeedKph) {
        issues.push({
          id: `traffic-vehicle-speed-profile-mismatch-${vehicle.id}`,
          severity: 'error',
          category: 'simulation',
          objectId: vehicle.id,
          message: `Traffic vehicle ${vehicle.id} speed limit must come from street profile ${road.streetProfileId}.`
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
