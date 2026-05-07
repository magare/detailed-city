import type { Point2D, Polygon2D } from '../city/data-contracts/cityContracts';

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
