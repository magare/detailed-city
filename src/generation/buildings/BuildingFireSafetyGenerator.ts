import type {
  BuildingEntrance,
  BuildingFireSafetyProfile,
  BuildingPlan,
  CurbZone,
  ServiceAccessCorridor,
  UtilityNode
} from '../../types/city';
import type { BuildingFireSafetyRiskClass, CityId, Point2D } from '../../city/data-contracts/cityContracts';

export interface BuildingFireSafetyInput {
  readonly buildings: readonly BuildingPlan[];
  readonly buildingEntrances: readonly BuildingEntrance[];
  readonly curbZones: readonly CurbZone[];
  readonly utilityNodes: readonly UtilityNode[];
  readonly serviceAccessCorridors: readonly ServiceAccessCorridor[];
}

export class BuildingFireSafetyGenerator {
  create(input: BuildingFireSafetyInput): BuildingFireSafetyProfile[] {
    const entrancesByBuildingId = groupBy(input.buildingEntrances, (entrance) => entrance.buildingId);
    const hydrants = input.utilityNodes.filter((node) => node.waterSupply?.equipmentKind === 'hydrant');
    const fireLaneCurbZones = input.curbZones.filter(
      (curbZone) =>
        curbZone.management.fireLaneClearance &&
        (curbZone.curbUse === 'emergency' || curbZone.curbUse === 'no-stopping')
    );
    const fireLaneCurbZonesByRoadId = groupBy(fireLaneCurbZones, (curbZone) => curbZone.roadId);
    const serviceAccessCorridorsById = new Map(input.serviceAccessCorridors.map((corridor) => [corridor.id, corridor]));

    return input.buildings.flatMap((building) => {
      const hydrant = selectHydrant(building, hydrants);
      const entrances = entrancesByBuildingId.get(building.id) ?? [];

      if (!hydrant || entrances.length === 0) {
        return [];
      }

      const egressEntrances = getEgressEntrances(building, entrances);
      const emergencyAccessEntrances = getEmergencyAccessEntrances(building, entrances);
      const serviceAccessCorridorIds = uniqueIds([
        ...(building.serviceAccessCorridorIds ?? []),
        ...emergencyAccessEntrances.flatMap((entrance) => entrance.serviceAccessCorridorIds)
      ]);
      const fireLaneIds = selectFireLaneCurbZoneIds(building, fireLaneCurbZonesByRoadId, fireLaneCurbZones);
      const hydrantDistanceMeters = roundMeters(distance2D(building.center, hydrant.center));
      const hydrantReachMeters = roundMeters(Math.max(hydrant.waterSupply?.hydrantReachMeters ?? 90, hydrantDistanceMeters + 12));
      const riskClass = getRiskClass(building);
      const requiredExitCount = getRequiredExitCount(building, riskClass);
      const totalExitWidthMeters = roundMeters(
        egressEntrances.reduce((sum, entrance) => sum + entrance.door.clearWidthMeters, 0)
      );
      const refugeAreas = createRefugeAreas(building, riskClass);
      const serviceAccessProvided = serviceAccessCorridorIds.some((corridorId) => {
        const corridor = serviceAccessCorridorsById.get(corridorId);
        return corridor ? corridor.buildingIds.includes(building.id) : false;
      });

      return [
        {
          id: `building-fire-safety-${building.id}`,
          kind: 'building-fire-safety',
          ownerDomain: 'buildings',
          parentId: building.id,
          lod: 'lod4',
          buildingId: building.id,
          parcelId: building.parcelId,
          roadId: building.primaryFrontageRoadId,
          riskClass,
          hydrantNodeId: hydrant.id,
          hydrantDistanceMeters,
          hydrantReachMeters,
          hydrantWithinReach: hydrantDistanceMeters <= hydrantReachMeters,
          fireLaneCurbZoneIds: fireLaneIds,
          fireLaneClearance: fireLaneIds.length > 0,
          egressEntranceIds: egressEntrances.map((entrance) => entrance.id),
          emergencyAccessEntranceIds: emergencyAccessEntrances.map((entrance) => entrance.id),
          serviceAccessCorridorIds,
          egress: {
            requiredExitCount,
            providedExitCount: egressEntrances.length,
            totalExitWidthMeters,
            minExitSeparationMeters: roundMeters(getMinSeparationMeters(egressEntrances.map((entrance) => entrance.position))),
            exitCapacityPersons: Math.floor(totalExitWidthMeters * 82)
          },
          sprinkler: {
            required: isSprinklerRequired(building, riskClass),
            provided: Boolean(building.waterService?.serviceNodeId && building.waterService.pressureZoneId),
            waterServiceNodeId: building.waterService?.serviceNodeId ?? '',
            pressureZoneId: building.waterService?.pressureZoneId ?? '',
            estimatedFlowLitersPerSecond: roundMeters(building.waterService?.estimatedPeakLitersPerSecond ?? 0)
          },
          refugeAreas,
          emergencyAccess: {
            maxAccessDistanceMeters: roundMeters(getMaxAccessDistanceMeters(building, emergencyAccessEntrances)),
            serviceAccessProvided,
            fireLaneProvided: fireLaneIds.length > 0,
            hydrantReachProvided: hydrantDistanceMeters <= hydrantReachMeters
          }
        }
      ];
    });
  }
}

function getRiskClass(building: BuildingPlan): BuildingFireSafetyRiskClass {
  if (building.floorCount >= 14 || building.heightMeters >= 48) {
    return 'high-rise';
  }
  if (building.uses.includes('industrial') || building.uses.includes('utility')) {
    return 'industrial';
  }
  if (building.uses.some((use) => use === 'civic' || use === 'retail' || use === 'hospitality')) {
    return 'assembly';
  }
  if (building.floorCount >= 5 || building.heightMeters >= 18) {
    return 'mid-rise';
  }
  return 'low-rise';
}

function getRequiredExitCount(building: BuildingPlan, riskClass: BuildingFireSafetyRiskClass): number {
  if (riskClass === 'high-rise' || riskClass === 'assembly' || riskClass === 'industrial') {
    return 3;
  }
  return building.floorCount >= 3 ? 2 : 1;
}

function isSprinklerRequired(building: BuildingPlan, riskClass: BuildingFireSafetyRiskClass): boolean {
  return riskClass !== 'low-rise' || building.floorCount >= 4 || building.heightMeters >= 15;
}

function createRefugeAreas(
  building: BuildingPlan,
  riskClass: BuildingFireSafetyRiskClass
): BuildingFireSafetyProfile['refugeAreas'] {
  if (riskClass === 'low-rise') {
    return [];
  }

  const refugeCount = riskClass === 'high-rise' ? Math.max(1, Math.floor(building.floorCount / 6)) : 1;
  const footprintArea = building.size.x * building.size.z;

  return Array.from({ length: refugeCount }, (_, index) => {
    const level = Math.min(building.floorCount, Math.max(2, 2 + index * 6));
    return {
      id: `building-fire-safety-${building.id}-refuge-${index + 1}`,
      level,
      position: {
        x: roundMeters(building.center.x + (index % 2 === 0 ? building.size.x * 0.12 : -building.size.x * 0.12)),
        z: roundMeters(building.center.z + (index % 2 === 0 ? building.size.z * 0.12 : -building.size.z * 0.12))
      },
      areaSqM: roundMeters(Math.max(16, footprintArea * 0.035)),
      capacityPersons: Math.max(8, Math.floor(footprintArea * 0.035 * 0.65))
    };
  });
}

function selectHydrant(building: BuildingPlan, hydrants: readonly UtilityNode[]): UtilityNode | undefined {
  const preferredHydrant = hydrants.find((hydrant) => hydrant.id === building.waterService?.nearestHydrantNodeId);
  if (preferredHydrant) {
    return preferredHydrant;
  }

  return hydrants
    .map((hydrant) => ({ hydrant, distance: distance2D(building.center, hydrant.center) }))
    .sort((a, b) => a.distance - b.distance)[0]?.hydrant;
}

function getEgressEntrances(
  building: BuildingPlan,
  entrances: readonly BuildingEntrance[]
): readonly BuildingEntrance[] {
  const entranceIds = new Set([
    ...building.publicEntranceIds,
    ...(building.serviceEntranceIds ?? []),
    ...(building.loadingEntranceIds ?? [])
  ]);
  return entrances.filter((entrance) => entranceIds.has(entrance.id) && entrance.door.clearWidthMeters > 0);
}

function getEmergencyAccessEntrances(
  building: BuildingPlan,
  entrances: readonly BuildingEntrance[]
): readonly BuildingEntrance[] {
  const serviceEntranceIds = new Set([...(building.serviceEntranceIds ?? []), ...(building.loadingEntranceIds ?? [])]);
  const serviceEntrances = entrances.filter((entrance) => serviceEntranceIds.has(entrance.id));
  return serviceEntrances.length > 0 ? serviceEntrances : entrances.filter((entrance) => building.publicEntranceIds.includes(entrance.id));
}

function selectFireLaneCurbZoneIds(
  building: BuildingPlan,
  fireLaneCurbZonesByRoadId: ReadonlyMap<CityId, readonly CurbZone[]>,
  allFireLaneCurbZones: readonly CurbZone[]
): CityId[] {
  const primaryRoadZones = fireLaneCurbZonesByRoadId.get(building.primaryFrontageRoadId) ?? [];
  const candidates = primaryRoadZones.length > 0 ? primaryRoadZones : allFireLaneCurbZones;

  return candidates
    .map((curbZone) => ({ curbZone, distance: distance2D(building.center, curbZone.center) }))
    .sort((a, b) => a.distance - b.distance || a.curbZone.id.localeCompare(b.curbZone.id))
    .slice(0, 2)
    .map((candidate) => candidate.curbZone.id);
}

function getMinSeparationMeters(points: readonly Point2D[]): number {
  if (points.length < 2) {
    return 0;
  }

  let minDistance = Number.POSITIVE_INFINITY;

  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      minDistance = Math.min(minDistance, distance2D(points[i], points[j]));
    }
  }

  return minDistance === Number.POSITIVE_INFINITY ? 0 : minDistance;
}

function getMaxAccessDistanceMeters(building: BuildingPlan, entrances: readonly BuildingEntrance[]): number {
  if (entrances.length === 0) {
    return 0;
  }

  return Math.max(...entrances.map((entrance) => distance2D(building.center, entrance.position)));
}

function groupBy<T>(
  values: readonly T[],
  getKey: (value: T) => CityId
): ReadonlyMap<CityId, readonly T[]> {
  const groups = new Map<CityId, T[]>();

  for (const value of values) {
    const key = getKey(value);
    groups.set(key, [...(groups.get(key) ?? []), value]);
  }

  return groups;
}

function uniqueIds(ids: readonly CityId[]): CityId[] {
  return [...new Set(ids)].sort();
}

function distance2D(start: Point2D, end: Point2D): number {
  return Math.hypot(end.x - start.x, end.z - start.z);
}

function roundMeters(value: number): number {
  return Number(value.toFixed(2));
}
