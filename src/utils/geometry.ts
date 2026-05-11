import type { Point2D, Polygon2D } from '../city/data-contracts/cityContracts';

export interface AxisAlignedBounds2D {
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
}

export function rectanglePolygon(center: Point2D, size: { readonly x: number; readonly z: number }): Polygon2D {
  const halfX = size.x / 2;
  const halfZ = size.z / 2;

  return [
    { x: center.x - halfX, z: center.z - halfZ },
    { x: center.x + halfX, z: center.z - halfZ },
    { x: center.x + halfX, z: center.z + halfZ },
    { x: center.x - halfX, z: center.z + halfZ }
  ];
}

export function axisAlignedCenterline(
  center: Point2D,
  length: number,
  orientation: 'horizontal' | 'vertical'
): readonly [Point2D, Point2D] {
  const halfLength = length / 2;

  return orientation === 'vertical'
    ? [
        { x: center.x, z: center.z - halfLength },
        { x: center.x, z: center.z + halfLength }
      ]
    : [
        { x: center.x - halfLength, z: center.z },
        { x: center.x + halfLength, z: center.z }
      ];
}

export function getPolygonBounds(polygon: Polygon2D): AxisAlignedBounds2D {
  return {
    minX: Math.min(...polygon.map((point) => point.x)),
    maxX: Math.max(...polygon.map((point) => point.x)),
    minZ: Math.min(...polygon.map((point) => point.z)),
    maxZ: Math.max(...polygon.map((point) => point.z))
  };
}

export function isPointInsidePolygon(point: Point2D, polygon: Polygon2D): boolean {
  if (polygon.length < 3) {
    return false;
  }

  for (let index = 0; index < polygon.length; index += 1) {
    const start = polygon[index];
    const end = polygon[(index + 1) % polygon.length];

    if (isPointOnSegment(point, start, end)) {
      return true;
    }
  }

  let inside = false;

  for (let index = 0, previousIndex = polygon.length - 1; index < polygon.length; previousIndex = index, index += 1) {
    const current = polygon[index];
    const previous = polygon[previousIndex];
    const crossesRay =
      current.z > point.z !== previous.z > point.z &&
      point.x < ((previous.x - current.x) * (point.z - current.z)) / (previous.z - current.z) + current.x;

    if (crossesRay) {
      inside = !inside;
    }
  }

  return inside;
}

export function polygonsIntersect(left: Polygon2D, right: Polygon2D): boolean {
  if (left.length < 3 || right.length < 3 || !boundsOverlap(getPolygonBounds(left), getPolygonBounds(right))) {
    return false;
  }

  return (
    left.some((point) => isPointInsidePolygon(point, right)) ||
    right.some((point) => isPointInsidePolygon(point, left))
  );
}

function boundsOverlap(left: AxisAlignedBounds2D, right: AxisAlignedBounds2D): boolean {
  return left.minX <= right.maxX && left.maxX >= right.minX && left.minZ <= right.maxZ && left.maxZ >= right.minZ;
}

function isPointOnSegment(point: Point2D, start: Point2D, end: Point2D): boolean {
  const cross = (point.z - start.z) * (end.x - start.x) - (point.x - start.x) * (end.z - start.z);

  if (Math.abs(cross) > 0.000001) {
    return false;
  }

  const dot = (point.x - start.x) * (end.x - start.x) + (point.z - start.z) * (end.z - start.z);

  if (dot < -0.000001) {
    return false;
  }

  const lengthSquared = (end.x - start.x) ** 2 + (end.z - start.z) ** 2;

  return dot <= lengthSquared + 0.000001;
}
