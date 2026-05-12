import type { BuildingPlan, ConstraintPlan } from '../../types/city';
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

  const parcels = land.parcels
    .filter((parcel) => !blockedParcelIds.has(parcel.id))
    .map((parcel) => ({
      ...parcel,
      parcelConstraintIds: constraints
        .filter((constraint) => isPointInsidePolygon(parcel.center, constraint.boundary))
        .map((constraint) => constraint.id)
        .sort()
    }));
  const parcelIds = new Set(parcels.map((parcel) => parcel.id));
  const parcelsById = new Map(parcels.map((parcel) => [parcel.id, parcel]));

  return {
    ...land,
    zoningDistricts: land.zoningDistricts.map((zoning) => ({
      ...zoning,
      parcelIds: zoning.parcelIds.filter((parcelId) => parcelIds.has(parcelId))
    })),
    parcels,
    buildings: land.buildings
      .filter(
        (building) =>
          !blockedParcelIds.has(building.parcelId) &&
          !buildingBlockingConstraints.some((constraint) =>
            isPointInsidePolygon(getBuildingConstraintProbePoint(building), constraint.boundary)
          )
      )
      .map((building) => {
        const parcel = parcelsById.get(building.parcelId);
        const constraintIds = parcel?.parcelConstraintIds ?? building.footprintGrammar.constraintIds;

        return {
          ...building,
          footprintGrammar: {
            ...building.footprintGrammar,
            constraintIds,
            hazardConstrained: constraintIds.some((constraintId) => constraintId.includes('hazard'))
          }
        };
      })
  };
}

function getBuildingConstraintProbePoint(building: BuildingPlan): BuildingPlan['center'] {
  return {
    x: building.center.x - building.footprintGrammar.placementOffsetMeters.x,
    z: building.center.z - building.footprintGrammar.placementOffsetMeters.z
  };
}
