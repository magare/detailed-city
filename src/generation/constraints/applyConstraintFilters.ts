import type { ConstraintPlan } from '../../types/city';
import type { GeneratedLandAndBuildings } from '../buildings/BuildingGenerator';
import { isPointInsidePolygon } from '../../utils/geometry';

export function applyConstraintFilters(
  land: GeneratedLandAndBuildings,
  constraints: readonly ConstraintPlan[]
): GeneratedLandAndBuildings {
  const blockedParcelIds = new Set<string>();
  const parcelBlockingConstraints = constraints.filter((constraint) =>
    constraint.prohibitedObjectKinds.includes('parcel')
  );
  const buildingBlockingConstraints = constraints.filter((constraint) =>
    constraint.prohibitedObjectKinds.includes('building')
  );

  for (const parcel of land.parcels) {
    if (parcelBlockingConstraints.some((constraint) => isPointInsidePolygon(parcel.center, constraint.boundary))) {
      blockedParcelIds.add(parcel.id);
    }
  }

  return {
    ...land,
    parcels: land.parcels.filter((parcel) => !blockedParcelIds.has(parcel.id)),
    buildings: land.buildings.filter(
      (building) =>
        !blockedParcelIds.has(building.parcelId) &&
        !buildingBlockingConstraints.some((constraint) => isPointInsidePolygon(building.center, constraint.boundary))
    )
  };
}
