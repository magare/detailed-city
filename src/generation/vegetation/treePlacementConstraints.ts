import type { BuildingPlan, RoadSegment } from '../../types/city';
import { getPolygonBounds, isPointInsidePolygon } from '../../utils/geometry';

export interface TreePlacementAvoidance {
  readonly roads: readonly RoadSegment[];
  readonly buildings: readonly BuildingPlan[];
  readonly roadClearanceMeters?: number;
  readonly buildingClearanceMeters?: number;
}

export interface RoadCollision {
  readonly road: RoadSegment;
  readonly clearanceMeters: number;
}

const DEFAULT_ROAD_CLEARANCE_METERS = 0.65;
const DEFAULT_BUILDING_CLEARANCE_METERS = 0.85;

export function isTreeCenterClear(
  center: { readonly x: number; readonly z: number },
  avoidance: TreePlacementAvoidance
): boolean {
  return !getRoadCollision(center, avoidance) && !getBuildingCollision(center, avoidance);
}

export function getRoadCollision(
  center: { readonly x: number; readonly z: number },
  avoidance: TreePlacementAvoidance
): RoadCollision | undefined {
  const clearance = avoidance.roadClearanceMeters ?? DEFAULT_ROAD_CLEARANCE_METERS;

  for (const road of avoidance.roads) {
    if (isPointInsideRoadCorridor(center, road, clearance)) {
      return { road, clearanceMeters: clearance };
    }
  }

  return undefined;
}

export function getBuildingCollision(
  center: { readonly x: number; readonly z: number },
  avoidance: TreePlacementAvoidance
): BuildingPlan | undefined {
  const clearance = avoidance.buildingClearanceMeters ?? DEFAULT_BUILDING_CLEARANCE_METERS;

  for (const building of avoidance.buildings) {
    if (isPointInsidePolygon(center, building.footprint) || isPointNearBuildingBounds(center, building, clearance)) {
      return building;
    }
  }

  return undefined;
}

export function pushPointOutsideRoadCorridor(
  center: { readonly x: number; readonly z: number },
  collision: RoadCollision,
  extraClearanceMeters = 0
): { readonly x: number; readonly z: number } {
  const road = collision.road;
  const halfWidth = road.widthMeters / 2 + collision.clearanceMeters + extraClearanceMeters;

  if (road.orientation === 'vertical') {
    const sideSign = center.x < road.center.x ? -1 : 1;
    return {
      x: roundMeters(road.center.x + sideSign * halfWidth),
      z: center.z
    };
  }

  const sideSign = center.z < road.center.z ? -1 : 1;
  return {
    x: center.x,
    z: roundMeters(road.center.z + sideSign * halfWidth)
  };
}

function isPointInsideRoadCorridor(
  point: { readonly x: number; readonly z: number },
  road: RoadSegment,
  clearanceMeters: number
): boolean {
  const halfWidth = road.widthMeters / 2 + clearanceMeters;
  const halfLength = road.length / 2;

  if (road.orientation === 'vertical') {
    return Math.abs(point.x - road.center.x) <= halfWidth && Math.abs(point.z - road.center.z) <= halfLength;
  }

  return Math.abs(point.z - road.center.z) <= halfWidth && Math.abs(point.x - road.center.x) <= halfLength;
}

function isPointNearBuildingBounds(
  point: { readonly x: number; readonly z: number },
  building: BuildingPlan,
  clearanceMeters: number
): boolean {
  if (clearanceMeters <= 0) {
    return false;
  }

  const bounds = getPolygonBounds(building.footprint);
  const outsideX = point.x < bounds.minX ? bounds.minX - point.x : point.x > bounds.maxX ? point.x - bounds.maxX : 0;
  const outsideZ = point.z < bounds.minZ ? bounds.minZ - point.z : point.z > bounds.maxZ ? point.z - bounds.maxZ : 0;

  return outsideX <= clearanceMeters && outsideZ <= clearanceMeters;
}

function roundMeters(value: number): number {
  return Math.round(value * 100) / 100;
}
